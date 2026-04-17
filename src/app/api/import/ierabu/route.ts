import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { isCurrentUserAdmin, refreshMaterializedViews } from '@/lib/data/repository';
import type { IerabuMetric } from '@/lib/excel/ierabu-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const AGENCY_ID = 'ag-ierabu';
const AGENCY_NAME = 'いえらぶ';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  let body: {
    fileName: string;
    metrics: IerabuMetric[];
    sheetsProcessed: string[];
    companyCount: number;
    storeCount: number;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const { metrics, fileName, sheetsProcessed, companyCount, storeCount } = body;
  if (!metrics || metrics.length === 0) {
    return NextResponse.json({ error: '有効なデータが見つかりませんでした' }, { status: 400 });
  }

  const db = getAdminSupabaseClient();
  const insertErrors: string[] = [];

  // 1. agency
  await db.from('agencies').upsert({ id: AGENCY_ID, name: AGENCY_NAME }, { onConflict: 'name' });

  // 2. companies
  const companyNames = [...new Set(metrics.map(m => m.companyName))];
  const { data: existingCompanies } = await db.from('companies').select('id, name');
  const companyMap = new Map<string, string>(
    (existingCompanies || []).map((c: { id: string; name: string }) => [c.name, c.id])
  );
  let nextCo = (existingCompanies || []).length + 1;
  for (const name of companyNames) {
    if (!companyMap.has(name)) {
      const id = `co-${String(nextCo++).padStart(4, '0')}`;
      await db.from('companies').upsert({ id, name, agency_id: AGENCY_ID }, { onConflict: 'name' });
      companyMap.set(name, id);
    }
  }

  // 3. stores — code でユニーク化 (同一 GroupID の重複を排除)
  const { data: existingStores } = await db.from('stores').select('id, code');
  const storeCodeToId = new Map<string, string>(
    (existingStores || []).map((s: { id: string; code: string }) => [s.code, s.id])
  );
  let nextSt = (existingStores || []).length + 1;

  // code → store row のマップ (重複排除)
  const codeToRow = new Map<string, { m: IerabuMetric; code: string }>();
  for (const m of metrics) {
    const code = `IER-${m.groupId}`;
    if (!codeToRow.has(code)) codeToRow.set(code, { m, code });
  }

  const storeRows = [...codeToRow.values()].map(({ m, code }) => {
    let id = storeCodeToId.get(code);
    if (!id) {
      id = `st-${String(nextSt++).padStart(5, '0')}`;
      storeCodeToId.set(code, id);
    }
    return {
      id, code, name: m.storeName,
      agency_id: AGENCY_ID, agency_name: AGENCY_NAME,
      company_id: companyMap.get(m.companyName) || null,
      company_name: m.companyName,
      unit: m.prefecture,
      is_ng: false, is_priority: false, is_priority_q3: false,
    };
  });

  for (let i = 0; i < storeRows.length; i += 500) {
    const { error } = await db.from('stores').upsert(storeRows.slice(i, i + 500), { onConflict: 'code' });
    if (error) insertErrors.push(`stores: ${error.message}`);
  }

  // 4. monthly_metrics
  const metricAgg = new Map<string, number>();
  for (const m of metrics) {
    const code = `IER-${m.groupId}`;
    const storeId = storeCodeToId.get(code);
    if (!storeId) continue;
    const mk = `${storeId}__${m.yearMonth}`;
    metricAgg.set(mk, (metricAgg.get(mk) || 0) + m.referrals);
  }

  const metricRows = [...metricAgg.entries()].map(([key, referrals]) => {
    const [storeId, yearMonth] = key.split('__');
    return {
      store_id: storeId, year_month: yearMonth,
      referrals, connections: 0, brokerage: 0,
      referral_rate: null, target_referrals: 0,
    };
  });

  for (let i = 0; i < metricRows.length; i += 500) {
    const { error } = await db.from('monthly_metrics').upsert(metricRows.slice(i, i + 500), { onConflict: 'store_id,year_month' });
    if (error) insertErrors.push(`metrics: ${error.message}`);
  }

  // 5. batch
  await db.from('import_batches').insert({
    id: `ierabu_${Date.now()}`,
    file_name: fileName,
    import_type: 'ierabu',
    sheet_name: sheetsProcessed.join(', '),
    row_count: metrics.length,
    imported_by: user.id,
  });

  // 6. refresh
  try { await refreshMaterializedViews(); } catch { insertErrors.push('マテビューリフレッシュに失敗'); }

  return NextResponse.json({
    ok: true, sheetsProcessed, companyCount, storeCount,
    metricsCount: metricRows.length,
    insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
  });
}
