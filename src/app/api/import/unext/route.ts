import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { isCurrentUserAdmin } from '@/lib/data/repository';
import { parseUnextExcel, type ParsedTransaction } from '@/lib/excel/unext-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 認証 + admin チェック
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = await isCurrentUserAdmin();
  if (!admin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  // multipart/form-data からファイル取得
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 });

  const buffer = await file.arrayBuffer();

  // Excel パース
  const result = parseUnextExcel(buffer);
  if (result.transactions.length === 0) {
    return NextResponse.json({
      error: '有効なデータが見つかりませんでした',
      sheetName: result.sheetName,
      parseErrors: result.errors.slice(0, 20),
    }, { status: 400 });
  }

  // admin client で DB 書込 (RLS bypass)
  const db = getAdminSupabaseClient();
  const batchId = `unext_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // 1. バッチ登録
  const { error: batchError } = await db.from('import_batches').insert({
    id: batchId,
    file_name: file.name,
    import_type: 'unext',
    sheet_name: result.sheetName,
    row_count: result.transactions.length,
    imported_by: user.id,
  });
  if (batchError) {
    return NextResponse.json({ error: `バッチ登録失敗: ${batchError.message}` }, { status: 500 });
  }

  // 2. トランザクション INSERT (500件ずつバッチ)
  let insertedCount = 0;
  const insertErrors: string[] = [];
  const txns = result.transactions;

  for (let i = 0; i < txns.length; i += 500) {
    const chunk = txns.slice(i, i + 500).map((t, j) => ({
      id: `${batchId}_${i + j}`,
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
      insertErrors.push(`バッチ${i}: ${error.message}`);
    } else {
      insertedCount += chunk.length;
    }
  }

  // 3. staff テーブルに UPSERT
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
    const chunk = staffRows.slice(i, i + 500);
    await db.from('staff').upsert(chunk, { onConflict: 'agency_name,code' });
  }

  // 4. agencies / stores / monthly_metrics を集計 & UPSERT
  await syncToLegacyTables(db, txns);

  // 5. マテビューリフレッシュ
  try {
    await db.rpc('refresh_all_views');
  } catch {
    insertErrors.push('マテビューリフレッシュに失敗（データは保存済み）');
  }

  return NextResponse.json({
    ok: true,
    batchId,
    sheetName: result.sheetName,
    totalRows: result.totalRows,
    insertedCount,
    staffCount: staffRows.length,
    parseErrors: result.errors.slice(0, 20),
    insertErrors,
  });
}

/**
 * referral_transactions の集計結果を
 * 既存の agencies / stores / monthly_metrics にも反映する。
 * これにより既存のダッシュボード・ウィジェットがそのまま動く。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncToLegacyTables(db: any, txns: ParsedTransaction[]) {
  // --- agencies ---
  const agencyNames = [...new Set(txns.map(t => t.agencyName))];
  const { data: existingAgencies } = await db.from('agencies').select('id, name');
  const agencyMap = new Map<string, string>(
    (existingAgencies || []).map((a: { id: string; name: string }) => [a.name, a.id])
  );
  let nextAgencyNum = (existingAgencies || []).length + 1;

  for (const name of agencyNames) {
    if (!agencyMap.has(name)) {
      const id = `ag-${String(nextAgencyNum++).padStart(3, '0')}`;
      await db.from('agencies').upsert({ id, name }, { onConflict: 'name' });
      agencyMap.set(name, id);
    }
  }

  // --- stores ---
  const storeKeys = new Map<string, ParsedTransaction>();
  for (const t of txns) {
    const key = t.storeCode;
    if (!storeKeys.has(key)) storeKeys.set(key, t);
  }

  const { data: existingStores } = await db.from('stores').select('id, code');
  const storeCodeToId = new Map<string, string>(
    (existingStores || []).map((s: { id: string; code: string }) => [s.code, s.id])
  );
  let nextStoreNum = (existingStores || []).length + 1;

  const storeRows = [...storeKeys.values()].map(t => {
    let id = storeCodeToId.get(t.storeCode);
    if (!id) {
      id = `st-${String(nextStoreNum++).padStart(5, '0')}`;
      storeCodeToId.set(t.storeCode, id);
    }
    return {
      id,
      code: t.storeCode,
      name: t.storeName,
      agency_id: agencyMap.get(t.agencyName) || null,
      agency_name: t.agencyName,
      company_id: null,
      company_name: t.agencyName,
      unit: t.department,
      is_ng: false,
      is_priority: false,
      is_priority_q3: false,
    };
  });

  for (let i = 0; i < storeRows.length; i += 500) {
    await db.from('stores').upsert(storeRows.slice(i, i + 500), { onConflict: 'code' });
  }

  // --- monthly_metrics ---
  // 店舗×月で集計
  const metricMap = new Map<string, { refs: number; conns: number; brks: number }>();
  for (const t of txns) {
    const storeId = storeCodeToId.get(t.storeCode);
    if (!storeId) continue;
    const key = `${storeId}__${t.yearMonth}`;
    const entry = metricMap.get(key) || { refs: 0, conns: 0, brks: 0 };
    entry.refs++;
    if (t.isConnected) entry.conns++;
    if (t.isContracted) entry.brks++;
    metricMap.set(key, entry);
  }

  const metricRows = [...metricMap.entries()].map(([key, data]) => {
    const [storeId, yearMonth] = key.split('__');
    return {
      store_id: storeId,
      year_month: yearMonth,
      referrals: data.refs,
      connections: data.conns,
      brokerage: data.brks,
      referral_rate: data.refs > 0 ? Math.round((data.brks / data.refs) * 10000) / 10000 : null,
      target_referrals: 0,
    };
  });

  for (let i = 0; i < metricRows.length; i += 500) {
    await db.from('monthly_metrics').upsert(metricRows.slice(i, i + 500), {
      onConflict: 'store_id,year_month',
    });
  }
}
