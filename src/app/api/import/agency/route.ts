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
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  const { agencyId, agencyName, fileName, metrics, sheetsProcessed, storeCodePrefix } = body;
  const isFirst = body.isFirst !== false;
  const isLast = body.isLast !== false;
  const totalRows = body.totalRows ?? metrics.length;
  if (!metrics || metrics.length === 0) {
    return NextResponse.json({ error: '有効なデータが見つかりませんでした' }, { status: 400 });
  }

  const db = getAdminSupabaseClient();
  const insertErrors: string[] = [];

  try {
    // 1. agency upsert (1 query)
    await db.from('agencies').upsert({ id: agencyId, name: agencyName }, { onConflict: 'id' });

    // 2. companies — bulk upsert (関連分のみ SELECT)
    const companyNames = [...new Set(metrics.map(m => m.companyName))];
    const { data: existingCompanies } = await db
      .from('companies')
      .select('id, name')
      .in('name', companyNames);
    const companyMap = new Map<string, string>(
      (existingCompanies || []).map((c: { id: string; name: string }) => [c.name, c.id])
    );

    // 新規 company は決定論的 ID を生成
    const newCompanies: { id: string; name: string; agency_id: string }[] = [];
    for (const name of companyNames) {
      if (!companyMap.has(name)) {
        const id = makeCompanyId(name);
        newCompanies.push({ id, name, agency_id: agencyId });
        companyMap.set(name, id);
      }
    }
    if (newCompanies.length > 0) {
      const { error } = await db.from('companies').upsert(newCompanies, { onConflict: 'name' });
      if (error) insertErrors.push(`companies: ${error.message}`);
    }

    // 3. stores — INSERT (新規) と UPDATE (既存 by id) を分離して FK 違反を防ぐ
    const storeByCode = new Map<string, GenericMetric>();
    for (const m of metrics) {
      const code = makeCode(m, storeCodePrefix);
      if (!storeByCode.has(code)) storeByCode.set(code, m);
    }
    const allCodes = [...storeByCode.keys()];

    // 関連 code のみ SELECT して既存 ID を取得
    const storeCodeToId = new Map<string, string>();
    for (let i = 0; i < allCodes.length; i += 500) {
      const chunk = allCodes.slice(i, i + 500);
      const { data } = await db.from('stores').select('id, code').in('code', chunk);
      (data || []).forEach((s: { id: string; code: string }) => {
        storeCodeToId.set(s.code, s.id);
      });
    }

    const newStoreRows: Record<string, unknown>[] = [];
    const updateStoreRows: Record<string, unknown>[] = [];
    for (const [code, m] of storeByCode.entries()) {
      const baseFields = {
        code, name: m.storeName,
        agency_id: agencyId, agency_name: agencyName,
        company_id: companyMap.get(m.companyName) || null,
        company_name: m.companyName,
        unit: m.area || null,
      };
      const existingId = storeCodeToId.get(code);
      if (existingId) {
        // upsert by id: id が conflict key なので ID は絶対に書き換わらない
        updateStoreRows.push({ id: existingId, ...baseFields });
      } else {
        const id = makeStoreId(code);
        storeCodeToId.set(code, id);
        newStoreRows.push({
          id, ...baseFields,
          is_ng: false, is_priority: false, is_priority_q3: false,
        });
      }
    }

    // 新規: INSERT (id は事前生成されているので衝突しない限り成功)
    for (let i = 0; i < newStoreRows.length; i += BATCH_SIZE) {
      const { error } = await db
        .from('stores')
        .upsert(newStoreRows.slice(i, i + BATCH_SIZE), { onConflict: 'code' });
      if (error) insertErrors.push(`stores_new[${i}]: ${error.message}`);
    }
    // 既存: UPDATE (onConflict='id' なので id は触れず、他フィールドのみ更新)
    for (let i = 0; i < updateStoreRows.length; i += BATCH_SIZE) {
      const { error } = await db
        .from('stores')
        .upsert(updateStoreRows.slice(i, i + BATCH_SIZE), { onConflict: 'id' });
      if (error) insertErrors.push(`stores_upd[${i}]: ${error.message}`);
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
        // 成約率 = 成約 / 取次
        referral_rate: d.refs > 0 ? Math.round((d.brks / d.refs) * 10000) / 10000 : null,
        target_referrals: 0,
      };
    });

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
