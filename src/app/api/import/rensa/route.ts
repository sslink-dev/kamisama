import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { isCurrentUserAdmin } from '@/lib/data/repository';
import type { RensaMetric } from '@/lib/excel/rensa-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const AGENCY_ID = 'ag-rensa';
const AGENCY_NAME = 'レンサ';

/**
 * レンサ Excel のパース結果を受け取り DB に書き込む。
 * 連携実績: 会社名が企業、店舗名が店舗
 * エイブル実績: エイブル企業の店舗コード付き
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  let body: {
    fileName: string;
    metrics: RensaMetric[];
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

  // 1. agency: レンサ
  await db.from('agencies').upsert({ id: AGENCY_ID, name: AGENCY_NAME }, { onConflict: 'name' });

  // 2. companies: 会社名ごとに作成
  const companyNames = [...new Set(metrics.map(m => m.companyName))];
  const { data: existingCompanies } = await db.from('companies').select('id, name');
  const companyMap = new Map<string, string>(
    (existingCompanies || []).map((c: { id: string; name: string }) => [c.name, c.id])
  );
  let nextCompanyNum = (existingCompanies || []).length + 1;
  for (const name of companyNames) {
    if (!companyMap.has(name)) {
      const id = `co-${String(nextCompanyNum++).padStart(4, '0')}`;
      await db.from('companies').upsert({ id, name, agency_id: AGENCY_ID }, { onConflict: 'name' });
      companyMap.set(name, id);
    }
  }

  // 3. stores: 店舗名 (or 店舗コード) ごとに作成
  // レンサの店舗コードは REN-{会社名hash}-{店舗名hash} で衝突回避
  const { data: existingStores } = await db.from('stores').select('id, code');
  const storeCodeToId = new Map<string, string>(
    (existingStores || []).map((s: { id: string; code: string }) => [s.code, s.id])
  );
  let nextStoreNum = (existingStores || []).length + 1;

  // 各メトリックの店舗を事前に登録
  const storeKeys = new Map<string, RensaMetric>();
  for (const m of metrics) {
    const code = makeStoreCode(m);
    if (!storeKeys.has(code)) storeKeys.set(code, m);
  }

  const storeRows = [...storeKeys.entries()].map(([code, m]) => {
    let id = storeCodeToId.get(code);
    if (!id) {
      id = `st-${String(nextStoreNum++).padStart(5, '0')}`;
      storeCodeToId.set(code, id);
    }
    return {
      id, code, name: m.storeName,
      agency_id: AGENCY_ID, agency_name: AGENCY_NAME,
      company_id: companyMap.get(m.companyName) || null,
      company_name: m.companyName,
      unit: m.area,
      is_ng: false, is_priority: false, is_priority_q3: false,
    };
  });
  for (let i = 0; i < storeRows.length; i += 500) {
    const { error } = await db.from('stores').upsert(storeRows.slice(i, i + 500), { onConflict: 'code' });
    if (error) insertErrors.push(`stores: ${error.message}`);
  }

  // 4. monthly_metrics: 同一店舗×月の合算
  const metricAgg = new Map<string, number>();
  for (const m of metrics) {
    const code = makeStoreCode(m);
    const storeId = storeCodeToId.get(code);
    if (!storeId) continue;
    const key = `${storeId}__${m.yearMonth}`;
    metricAgg.set(key, (metricAgg.get(key) || 0) + m.referrals);
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

  // 5. バッチ登録
  await db.from('import_batches').insert({
    id: `rensa_${Date.now()}`,
    file_name: fileName,
    import_type: 'rensa',
    sheet_name: sheetsProcessed.join(', '),
    row_count: metrics.length,
    imported_by: user.id,
  });

  // 6. マテビューリフレッシュ
  try { await db.rpc('refresh_all_views'); } catch { insertErrors.push('マテビューリフレッシュに失敗'); }

  return NextResponse.json({
    ok: true, sheetsProcessed, companyCount, storeCount,
    metricsCount: metricRows.length,
    insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
  });
}

function makeStoreCode(m: RensaMetric): string {
  if (m.storeCode) return `REN-${m.storeCode}`;
  // 店舗コードがない場合は会社名+店舗名からコードを生成
  const base = `${m.companyName}_${m.storeName}`.replace(/[^\w\u3000-\u9FFF]/g, '');
  return `REN-${base.slice(0, 40)}`;
}
