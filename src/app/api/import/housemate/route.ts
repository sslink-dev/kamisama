import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { isCurrentUserAdmin } from '@/lib/data/repository';
import type { HousemateMetric } from '@/lib/excel/housemate-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const AGENCY_ID = 'ag-housemate';
const AGENCY_NAME = 'ハウスメイト';
const COMPANY_ID = 'co-housemate';

/**
 * ハウスメイト Excel のパース結果を受け取り DB に書き込む。
 * 階層: agencies(ハウスメイト) → companies(ハウスメイト) → stores → monthly_metrics
 * ハウスメイトは代理店=企業が同一なので company も1つ。
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const admin = await isCurrentUserAdmin();
  if (!admin) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  let body: {
    fileName: string;
    metrics: HousemateMetric[];
    sheetsProcessed: string[];
    storeCount: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { metrics, fileName, sheetsProcessed, storeCount } = body;
  if (!metrics || metrics.length === 0) {
    return NextResponse.json({ error: '有効なデータが見つかりませんでした' }, { status: 400 });
  }

  const db = getAdminSupabaseClient();
  const insertErrors: string[] = [];

  // 1. agency: ハウスメイト
  await db.from('agencies').upsert({ id: AGENCY_ID, name: AGENCY_NAME }, { onConflict: 'name' });

  // 2. company: ハウスメイト (代理店 = 企業が同一)
  await db.from('companies').upsert(
    { id: COMPANY_ID, name: AGENCY_NAME, agency_id: AGENCY_ID },
    { onConflict: 'name' }
  );

  // 3. stores を upsert
  const storeKeys = new Map<string, HousemateMetric>();
  for (const m of metrics) {
    if (!storeKeys.has(m.storeCode)) storeKeys.set(m.storeCode, m);
  }
  const { data: existingStores } = await db.from('stores').select('id, code');
  const storeCodeToId = new Map<string, string>(
    (existingStores || []).map((s: { id: string; code: string }) => [s.code, s.id])
  );
  let nextNum = (existingStores || []).length + 1;

  const storeRows = [...storeKeys.values()].map(m => {
    // ハウスメイト店舗コードにプレフィックスを付けて U-NEXT と衝突しないようにする
    const code = `HM-${m.storeCode}`;
    let id = storeCodeToId.get(code);
    if (!id) {
      id = `st-${String(nextNum++).padStart(5, '0')}`;
      storeCodeToId.set(code, id);
    }
    // 元のコードもマッピング (後で metrics lookup 用)
    storeCodeToId.set(m.storeCode, id);
    return {
      id, code, name: m.storeName,
      agency_id: AGENCY_ID, agency_name: AGENCY_NAME,
      company_id: COMPANY_ID, company_name: AGENCY_NAME,
      unit: m.unit || null,
      is_ng: false, is_priority: false, is_priority_q3: false,
    };
  });
  for (let i = 0; i < storeRows.length; i += 500) {
    const { error } = await db.from('stores').upsert(storeRows.slice(i, i + 500), { onConflict: 'code' });
    if (error) insertErrors.push(`stores: ${error.message}`);
  }

  // 4. monthly_metrics を upsert (取次数のみ、通電/成約は 0)
  const metricRows = metrics.map(m => {
    const storeId = storeCodeToId.get(m.storeCode) || storeCodeToId.get(`HM-${m.storeCode}`);
    if (!storeId) return null;
    return {
      store_id: storeId,
      year_month: m.yearMonth,
      referrals: m.referrals,
      connections: 0,
      brokerage: 0,
      referral_rate: null,
      target_referrals: 0,
    };
  }).filter(Boolean);

  for (let i = 0; i < metricRows.length; i += 500) {
    const { error } = await db.from('monthly_metrics').upsert(
      metricRows.slice(i, i + 500),
      { onConflict: 'store_id,year_month' }
    );
    if (error) insertErrors.push(`metrics ${i}: ${error.message}`);
  }

  // 5. バッチ登録
  await db.from('import_batches').insert({
    id: `housemate_${Date.now()}`,
    file_name: fileName,
    import_type: 'housemate',
    sheet_name: sheetsProcessed.join(', '),
    row_count: metrics.length,
    imported_by: user.id,
  });

  // 6. マテビューリフレッシュ
  try {
    await db.rpc('refresh_all_views');
  } catch {
    insertErrors.push('マテビューリフレッシュに失敗');
  }

  return NextResponse.json({
    ok: true,
    sheetsProcessed,
    storeCount,
    metricsCount: metricRows.length,
    insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
  });
}
