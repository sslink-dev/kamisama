import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { isCurrentUserAdmin, refreshMaterializedViews } from '@/lib/data/repository';
import { type ParsedTransaction } from '@/lib/excel/unext-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * クライアントが 3000 件ずつチャンク分割して送信する。
 * isFirst=true のチャンクでバッチ登録、isLast=true のチャンクで集計連携。
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = await isCurrentUserAdmin();
  if (!admin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  let body: {
    batchId: string;
    fileName: string;
    sheetName: string;
    transactions: ParsedTransaction[];
    totalRows: number;
    isFirst: boolean;
    isLast: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { batchId, transactions: txns, fileName, sheetName, totalRows, isFirst, isLast } = body;
  if (!txns || txns.length === 0) {
    return NextResponse.json({ error: 'empty chunk' }, { status: 400 });
  }

  const db = getAdminSupabaseClient();
  const insertErrors: string[] = [];

  // 最初のチャンクでバッチ登録 + agency upsert
  if (isFirst) {
    // 代理店マスタを upsert (legacy DB に ag-unext が無いケースに備える)
    await db.from('agencies').upsert(
      { id: 'ag-unext', name: 'U-NEXT' },
      { onConflict: 'id' }
    );

    const { error: batchError } = await db.from('import_batches').insert({
      id: batchId,
      file_name: fileName || 'unknown.xlsx',
      import_type: 'unext',
      sheet_name: sheetName,
      row_count: totalRows,
      imported_by: user.id,
    });
    if (batchError) {
      return NextResponse.json({ error: `バッチ登録失敗: ${batchError.message}` }, { status: 500 });
    }
  }

  // トランザクション INSERT (500件ずつ)
  let insertedCount = 0;
  const chunkOffset = Date.now(); // ユニーク ID 用
  for (let i = 0; i < txns.length; i += 500) {
    const chunk = txns.slice(i, i + 500).map((t, j) => ({
      id: `${batchId}_${chunkOffset}_${i + j}`,
      import_batch_id: batchId,
      agency_name: t.agencyName,
      inquiry_date: t.inquiryDate,
      store_code: t.storeCode,
      store_name: t.storeName,
      staff_code: t.staffCode,
      staff_name: t.staffName,
      department: t.department,
      ng_reason: t.ngReason,
      call_status: t.callStatus,
      service_type: t.serviceType,
      year_month: t.yearMonth,
      is_connected: t.isConnected,
      is_contracted: t.isContracted,
    }));

    const { error } = await db.from('referral_transactions').insert(chunk);
    if (error) {
      insertErrors.push(`insert ${i}: ${error.message}`);
    } else {
      insertedCount += chunk.length;
    }
  }

  // staff UPSERT (毎チャンクで実行、upsert なので冪等)
  const staffMap = new Map<string, ParsedTransaction>();
  for (const t of txns) {
    if (t.staffCode && t.staffCode !== '不明') {
      const key = `${t.agencyName}__${t.staffCode}`;
      if (!staffMap.has(key)) staffMap.set(key, t);
    }
  }
  const staffRows = [...staffMap.entries()].map(([, t]) => ({
    id: `staff_${t.agencyName}_${t.staffCode}`,
    agency_name: t.agencyName,
    code: t.staffCode!,
    name: t.staffName || '不明',
    store_code: t.storeCode,
    department: t.department,
    updated_at: new Date().toISOString(),
  }));
  for (let i = 0; i < staffRows.length; i += 500) {
    await db.from('staff').upsert(staffRows.slice(i, i + 500), { onConflict: 'agency_name,code' });
  }

  // 最後のチャンクで集計テーブル連携 + マテビューリフレッシュ
  if (isLast) {
    // 全トランザクションを DB から読んで集計
    await syncLegacyFromDb(db, batchId);

    try {
      await refreshMaterializedViews();
    } catch {
      insertErrors.push('マテビューリフレッシュに失敗（データは保存済み）');
    }
  }

  return NextResponse.json({
    ok: true,
    insertedCount,
    staffCount: staffRows.length,
    insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
  });
}

/**
 * DB 上の referral_transactions を集計して
 * companies / stores / monthly_metrics を同期する。
 *
 * 階層: agencies (U-NEXT) → companies (エイブル等) → stores → monthly_metrics
 * referral_transactions.agency_name = 企業名 (エイブル/ピタットハウス等)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncLegacyFromDb(db: any, batchId: string, agencyId: string = 'ag-unext') {
  interface TxRow {
    agency_name: string; // = 企業名
    store_code: string;
    store_name: string;
    department: string | null;
    year_month: string;
    is_connected: boolean;
    is_contracted: boolean;
  }
  const allTxns: TxRow[] = [];
  let from = 0;
  while (true) {
    const { data } = await db
      .from('referral_transactions')
      .select('agency_name, store_code, store_name, department, year_month, is_connected, is_contracted')
      .eq('import_batch_id', batchId)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    allTxns.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  if (allTxns.length === 0) return;

  // --- companies (企業) ---
  const companyNames = [...new Set(allTxns.map(t => t.agency_name))];
  const { data: existingCompanies } = await db.from('companies').select('id, name');
  const companyMap = new Map<string, string>(
    (existingCompanies || []).map((c: { id: string; name: string }) => [c.name, c.id])
  );
  let nextCompanyNum = (existingCompanies || []).length + 1;
  for (const name of companyNames) {
    if (!companyMap.has(name)) {
      const id = `co-${String(nextCompanyNum++).padStart(4, '0')}`;
      await db.from('companies').upsert(
        { id, name, agency_id: agencyId },
        { onConflict: 'name' }
      );
      companyMap.set(name, id);
    }
  }

  // --- stores ---
  const storeKeys = new Map<string, TxRow>();
  for (const t of allTxns) {
    if (!storeKeys.has(t.store_code)) storeKeys.set(t.store_code, t);
  }
  const { data: existingStores } = await db.from('stores').select('id, code');
  const storeCodeToId = new Map<string, string>(
    (existingStores || []).map((s: { id: string; code: string }) => [s.code, s.id])
  );
  let nextStoreNum = (existingStores || []).length + 1;
  const storeRows = [...storeKeys.values()].map(t => {
    let id = storeCodeToId.get(t.store_code);
    if (!id) {
      id = `st-${String(nextStoreNum++).padStart(5, '0')}`;
      storeCodeToId.set(t.store_code, id);
    }
    return {
      id, code: t.store_code, name: t.store_name,
      agency_id: agencyId,
      agency_name: 'U-NEXT',
      company_id: companyMap.get(t.agency_name) || null,
      company_name: t.agency_name,
      unit: t.department, is_ng: false, is_priority: false, is_priority_q3: false,
    };
  });
  for (let i = 0; i < storeRows.length; i += 500) {
    await db.from('stores').upsert(storeRows.slice(i, i + 500), { onConflict: 'code' });
  }

  // --- monthly_metrics ---
  const metricMap = new Map<string, { refs: number; conns: number; brks: number }>();
  for (const t of allTxns) {
    const storeId = storeCodeToId.get(t.store_code);
    if (!storeId) continue;
    const key = `${storeId}__${t.year_month}`;
    const entry = metricMap.get(key) || { refs: 0, conns: 0, brks: 0 };
    entry.refs++;
    if (t.is_connected) entry.conns++;
    if (t.is_contracted) entry.brks++;
    metricMap.set(key, entry);
  }
  const metricRows = [...metricMap.entries()].map(([key, data]) => {
    const [storeId, yearMonth] = key.split('__');
    return {
      store_id: storeId, year_month: yearMonth,
      referrals: data.refs, connections: data.conns, brokerage: data.brks,
      referral_rate: data.refs > 0 ? Math.round((data.brks / data.refs) * 10000) / 10000 : null,
      target_referrals: 0,
    };
  });
  for (let i = 0; i < metricRows.length; i += 500) {
    await db.from('monthly_metrics').upsert(metricRows.slice(i, i + 500), { onConflict: 'store_id,year_month' });
  }
}
