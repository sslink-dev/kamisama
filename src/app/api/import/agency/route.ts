import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { isCurrentUserAdmin, refreshMaterializedViews } from '@/lib/data/repository';

/**
 * 決定論的 ID 生成 (同じ入力 → 同じ ID)
 * count ベースだとチャンク並列実行時に read-replica 遅延で重複 ID が出て
 * upsert で FK 違反が起きるため、ハッシュベースに統一。
 */
function makeStoreId(code: string): string {
  return 'st-' + createHash('sha1').update(code).digest('hex').slice(0, 12);
}
function makeCompanyId(name: string): string {
  return 'co-' + createHash('sha1').update(name).digest('hex').slice(0, 12);
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 汎用代理店インポート API
 * パーサーごとに異なる形式の metrics を受け取り、
 * companies / stores / monthly_metrics に書き込む。
 *
 * パフォーマンス最適化:
 * - companies / stores の SELECT を関連名/コードのみに絞る
 * - upsert はすべて bulk (1 upsert で多数行)
 * - batch size 1000 (Postgres の通信往復削減)
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

const BATCH_SIZE = 1000;

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
    /** チャンク分割アップロード時の最初のチャンクか (省略時は単発扱い=true) */
    isFirst?: boolean;
    /** チャンク分割アップロード時の最後のチャンクか (省略時は単発扱い=true) */
    isLast?: boolean;
    /** import_batches に記録する総件数 (chunked のとき isLast でのみ使用) */
    totalRows?: number;
    /**
     * 同一 (店舗,月) が DB に既存の場合の挙動:
     * - 'replace' (既定): ファイルの値で上書き (スナップショット用)
     * - 'add'           : DB の既存値に加算 (週次バラバラ/差分のみ用)
     * いずれの場合も「ファイルに無い月」は触らない。
     */
    mergeMode?: 'replace' | 'add';
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const { agencyId, agencyName, fileName, metrics, sheetsProcessed, storeCodePrefix } = body;
  const isFirst = body.isFirst !== false;
  const isLast = body.isLast !== false;
  const totalRows = body.totalRows ?? metrics.length;
  const mergeMode: 'replace' | 'add' = body.mergeMode === 'add' ? 'add' : 'replace';
  if (!metrics || metrics.length === 0) {
    return NextResponse.json({ error: '有効なデータが見つかりませんでした' }, { status: 400 });
  }

  const db = getAdminSupabaseClient();
  const insertErrors: string[] = [];

  try {
    // 1. agency upsert (1 query)
    await db.from('agencies').upsert({ id: agencyId, name: agencyName }, { onConflict: 'id' });

    // ============================================
    // 2. COMPANIES — INSERT (DO NOTHING) → SELECT で権威 map を構築
    // ============================================
    // race condition (read-replica 遅延) で SELECT が既存行を見落としても、
    // INSERT(ignoreDuplicates) なら既存行を破壊しない。SELECT を後で行えば確実。
    const companyNames = [...new Set(metrics.map(m => m.companyName))];

    const companyCandidates = companyNames.map(name => ({
      id: makeCompanyId(name),
      name,
      agency_id: agencyId,
    }));
    for (let i = 0; i < companyCandidates.length; i += BATCH_SIZE) {
      const { error } = await db
        .from('companies')
        .upsert(companyCandidates.slice(i, i + BATCH_SIZE), {
          onConflict: 'name',
          ignoreDuplicates: true,    // 既存があれば何もしない
        });
      if (error) insertErrors.push(`companies[${i}]: ${error.message}`);
    }

    // 権威ある companyMap を構築 (DB に実在する id のみ)
    const companyMap = new Map<string, string>();
    for (let i = 0; i < companyNames.length; i += 500) {
      const chunk = companyNames.slice(i, i + 500);
      const { data } = await db.from('companies').select('id, name').in('name', chunk);
      (data || []).forEach((c: { id: string; name: string }) => {
        companyMap.set(c.name, c.id);
      });
    }

    // ============================================
    // 3. STORES — INSERT (DO NOTHING) → SELECT で権威 map → 任意で UPDATE
    // ============================================
    const storeByCode = new Map<string, GenericMetric>();
    for (const m of metrics) {
      const code = makeCode(m, storeCodePrefix);
      if (!storeByCode.has(code)) storeByCode.set(code, m);
    }
    const allCodes = [...storeByCode.keys()];

    // 候補を生成 (新規分のみ INSERT される)
    const storeCandidates = [...storeByCode.entries()].map(([code, m]) => ({
      id: makeStoreId(code),
      code, name: m.storeName,
      agency_id: agencyId, agency_name: agencyName,
      company_id: companyMap.get(m.companyName) || null,
      company_name: m.companyName,
      unit: m.area || null,
      is_ng: false, is_priority: false, is_priority_q3: false,
    }));
    for (let i = 0; i < storeCandidates.length; i += BATCH_SIZE) {
      const { error } = await db
        .from('stores')
        .upsert(storeCandidates.slice(i, i + BATCH_SIZE), {
          onConflict: 'code',
          ignoreDuplicates: true,    // 既存があれば何もしない (id 書き換え防止)
        });
      if (error) insertErrors.push(`stores_new[${i}]: ${error.message}`);
    }

    // 権威ある storeCodeToId を構築 (DB に実在する id のみ)
    const storeCodeToId = new Map<string, string>();
    for (let i = 0; i < allCodes.length; i += 500) {
      const chunk = allCodes.slice(i, i + 500);
      const { data } = await db.from('stores').select('id, code').in('code', chunk);
      (data || []).forEach((s: { id: string; code: string }) => {
        storeCodeToId.set(s.code, s.id);
      });
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

    // ADD モード: 既存値を SELECT して metricAgg に加算
    if (mergeMode === 'add' && metricAgg.size > 0) {
      const targetStoreIds = [...new Set([...metricAgg.keys()].map(k => k.split('__')[0]))];
      const targetMonths = [...new Set([...metricAgg.keys()].map(k => k.split('__')[1]))];

      for (let i = 0; i < targetStoreIds.length; i += 200) {
        const storeChunk = targetStoreIds.slice(i, i + 200);
        const { data } = await db
          .from('monthly_metrics')
          .select('store_id, year_month, referrals, connections, brokerage')
          .in('store_id', storeChunk)
          .in('year_month', targetMonths);
        (data || []).forEach((row: { store_id: string; year_month: string; referrals: number; connections: number; brokerage: number }) => {
          const key = `${row.store_id}__${row.year_month}`;
          const incoming = metricAgg.get(key);
          if (incoming) {
            incoming.refs += row.referrals || 0;
            incoming.conns += row.connections || 0;
            incoming.brks += row.brokerage || 0;
          }
        });
      }
    }

    const metricRows = [...metricAgg.entries()].map(([key, d]) => {
      const [storeId, yearMonth] = key.split('__');
      return {
        store_id: storeId, year_month: yearMonth,
        referrals: d.refs, connections: d.conns, brokerage: d.brks,
        // 成約率 = 成約 / 取次
        referral_rate: d.refs > 0 ? Math.round((d.brks / d.refs) * 10000) / 10000 : null,
        target_referrals: 0,
      };
    });

    // upsert は常に「合算済み値で上書き」(REPLACE モードと同じ動作)
    // ADD モードの場合は既に metricAgg に既存値が加算済み
    for (let i = 0; i < metricRows.length; i += BATCH_SIZE) {
      const { error } = await db
        .from('monthly_metrics')
        .upsert(metricRows.slice(i, i + BATCH_SIZE), { onConflict: 'store_id,year_month' });
      if (error) insertErrors.push(`metrics[${i}]: ${error.message}`);
    }

    // 5. batch + refresh は isLast チャンクでのみ実行
    if (isLast) {
      await db.from('import_batches').insert({
        id: `${agencyId}_${Date.now()}`,
        file_name: fileName,
        import_type: agencyId.replace('ag-', ''),
        sheet_name: (sheetsProcessed || []).join(', ') || agencyName,
        row_count: totalRows,
        imported_by: user.id,
      });

      // 6. refresh (best-effort)
      try { await refreshMaterializedViews(); } catch { insertErrors.push('マテビューリフレッシュに失敗(データは保存済み)'); }
    }

    return NextResponse.json({
      ok: true,
      sheetsProcessed,
      companyCount: companyNames.length,
      storeCount: storeByCode.size,
      metricsCount: metricRows.length,
      insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
    }, { status: 500 });
  }
}

function makeCode(m: GenericMetric, prefix: string): string {
  if (m.storeCode) return `${prefix}-${m.storeCode}`;
  if (m.storeId) return `${prefix}-${m.storeId}`;
  const base = `${m.companyName}_${m.storeName}`.replace(/[\s　]/g, '').slice(0, 40);
  return `${prefix}-${base}`;
}
