import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { isCurrentUserAdmin, refreshMaterializedViews } from '@/lib/data/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 汎用代理店インポート API
 * パーサーごとに異なる形式の metrics を受け取り、
 * companies / stores / monthly_metrics に書き込む。
 */
interface GenericMetric {
  companyName: string;
  storeName: string;
  storeCode?: string | null;
  storeId?: string | null;
  area?: string | null;
  yearMonth: string;
  referrals: number;
  connections?: number;
  brokerage?: number;
  effective?: number;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  let body: {
    agencyId: string;
    agencyName: string;
    fileName: string;
    metrics: GenericMetric[];
    sheetsProcessed?: string[];
    storeCodePrefix: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const { agencyId, agencyName, fileName, metrics, sheetsProcessed, storeCodePrefix } = body;
  if (!metrics || metrics.length === 0) {
    return NextResponse.json({ error: '有効なデータが見つかりませんでした' }, { status: 400 });
  }

  const db = getAdminSupabaseClient();
  const insertErrors: string[] = [];

  // 1. agency
  await db.from('agencies').upsert({ id: agencyId, name: agencyName }, { onConflict: 'name' });

  // 2. companies — 代理店=企業が同一の場合もある
  const companyNames = [...new Set(metrics.map(m => m.companyName))];
  const { data: existingCompanies } = await db.from('companies').select('id, name');
  const companyMap = new Map<string, string>(
    (existingCompanies || []).map((c: { id: string; name: string }) => [c.name, c.id])
  );
  let nextCo = (existingCompanies || []).length + 1;
  for (const name of companyNames) {
    if (!companyMap.has(name)) {
      const id = `co-${String(nextCo++).padStart(4, '0')}`;
      await db.from('companies').upsert({ id, name, agency_id: agencyId }, { onConflict: 'name' });
      companyMap.set(name, id);
    }
  }

  // 3. stores — storeCode or storeId or prefix+companyName_storeName
  const { data: existingStores } = await db.from('stores').select('id, code');
  const storeCodeToId = new Map<string, string>(
    (existingStores || []).map((s: { id: string; code: string }) => [s.code, s.id])
  );
  let nextSt = (existingStores || []).length + 1;

  // code でユニーク化
  const storeByCode = new Map<string, GenericMetric>();
  for (const m of metrics) {
    const code = makeCode(m, storeCodePrefix);
    if (!storeByCode.has(code)) storeByCode.set(code, m);
  }

  const storeRows = [...storeByCode.entries()].map(([code, m]) => {
    let id = storeCodeToId.get(code);
    if (!id) {
      id = `st-${String(nextSt++).padStart(5, '0')}`;
      storeCodeToId.set(code, id);
    }
    return {
      id, code, name: m.storeName,
      agency_id: agencyId, agency_name: agencyName,
      company_id: companyMap.get(m.companyName) || null,
      company_name: m.companyName,
      unit: m.area || null,
      is_ng: false, is_priority: false, is_priority_q3: false,
    };
  });

  for (let i = 0; i < storeRows.length; i += 500) {
    const { error } = await db.from('stores').upsert(storeRows.slice(i, i + 500), { onConflict: 'code' });
    if (error) insertErrors.push(`stores: ${error.message}`);
  }

  // 4. monthly_metrics — 同一 store×month を合算
  const metricAgg = new Map<string, { refs: number; conns: number; brks: number }>();
  for (const m of metrics) {
    const code = makeCode(m, storeCodePrefix);
    const storeId = storeCodeToId.get(code);
    if (!storeId) continue;
    const key = `${storeId}__${m.yearMonth}`;
    const prev = metricAgg.get(key) || { refs: 0, conns: 0, brks: 0 };
    prev.refs += m.referrals || 0;
    prev.conns += m.connections || 0;
    prev.brks += m.brokerage || 0;
    metricAgg.set(key, prev);
  }

  const metricRows = [...metricAgg.entries()].map(([key, d]) => {
    const [storeId, yearMonth] = key.split('__');
    return {
      store_id: storeId, year_month: yearMonth,
      referrals: d.refs, connections: d.conns, brokerage: d.brks,
      referral_rate: d.refs > 0 ? Math.round((d.brks / d.refs) * 10000) / 10000 : null,
      target_referrals: 0,
    };
  });

  for (let i = 0; i < metricRows.length; i += 500) {
    const { error } = await db.from('monthly_metrics').upsert(metricRows.slice(i, i + 500), { onConflict: 'store_id,year_month' });
    if (error) insertErrors.push(`metrics: ${error.message}`);
  }

  // 5. batch
  await db.from('import_batches').insert({
    id: `${agencyId}_${Date.now()}`,
    file_name: fileName,
    import_type: agencyId.replace('ag-', ''),
    sheet_name: (sheetsProcessed || []).join(', ') || agencyName,
    row_count: metrics.length,
    imported_by: user.id,
  });

  // 6. refresh
  try { await refreshMaterializedViews(); } catch { insertErrors.push('マテビューリフレッシュに失敗'); }

  return NextResponse.json({
    ok: true,
    sheetsProcessed,
    companyCount: companyNames.length,
    storeCount: storeByCode.size,
    metricsCount: metricRows.length,
    insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
  });
}

function makeCode(m: GenericMetric, prefix: string): string {
  if (m.storeCode) return `${prefix}-${m.storeCode}`;
  if (m.storeId) return `${prefix}-${m.storeId}`;
  const base = `${m.companyName}_${m.storeName}`.replace(/[\s　]/g, '').slice(0, 40);
  return `${prefix}-${base}`;
}
