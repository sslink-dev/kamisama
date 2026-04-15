import { unstable_cache } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import type {
  Agency, Store, Metric, StoreFilters,
  AgencySummary, MonthlyTrend, StoreWithMetrics,
  Widget, UserRole, UserRoleRow,
} from './types';

// キャッシュ期間 (秒): データは手動インポート時のみ変わるので長めでOK
const CACHE_TTL = 300; // 5分

/**
 * マテリアライズドビューを最新化し、Next.jsキャッシュも破棄。
 * CSVインポート等、データ更新後に呼び出す。
 */
export async function refreshMaterializedViews(): Promise<void> {
  const supabase = getAdminSupabaseClient();
  await supabase.rpc('refresh_all_views');
  // Next.jsキャッシュ無効化 (同じタグのunstable_cacheをクリア)
  const { revalidateTag } = await import('next/cache');
  revalidateTag('metrics', 'max');
  revalidateTag('stores', 'max');
  revalidateTag('companies', 'max');
  revalidateTag('agencies', 'max');
}

// --- DB row to app type converters ---
function toStore(row: Record<string, unknown>): Store {
  return {
    id: row.id as string,
    number: row.number as number,
    code: row.code as string,
    agencyId: row.agency_id as string | null,
    agencyName: row.agency_name as string,
    companyId: row.company_id as string | null,
    companyName: row.company_name as string,
    name: row.name as string,
    isNg: row.is_ng as boolean,
    ngMonth: row.ng_month as string | null,
    ngReason: row.ng_reason as string | null,
    isPriority: row.is_priority as boolean,
    isPriorityQ3: row.is_priority_q3 as boolean,
    addedMonth: row.added_month as string | null,
    roundRestart: row.round_restart as string | null,
    companyFlag: row.company_flag as string | null,
    unit: row.unit as string | null,
    rank: row.rank as string | null,
  };
}

function toMetric(row: Record<string, unknown>): Metric {
  return {
    storeId: row.store_id as string,
    yearMonth: row.year_month as string,
    referrals: row.referrals as number,
    connections: (row.connections as number) ?? 0,
    brokerage: row.brokerage as number,
    referralRate: row.referral_rate as number | null,
    targetReferrals: row.target_referrals as number,
  };
}

// --- Agencies (cached) ---
export const getAgencies = unstable_cache(
  async (): Promise<Agency[]> => {
    const supabase = getAdminSupabaseClient();
    const { data } = await supabase.from('agencies').select('*').order('name');
    return (data || []) as Agency[];
  },
  ['agencies'],
  { revalidate: CACHE_TTL, tags: ['agencies'] }
);

// --- Stores ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStoreFilters(query: any, filters?: StoreFilters): any {
  if (filters?.agencyId) query = query.eq('agency_id', filters.agencyId);
  if (filters?.unit) query = query.eq('unit', filters.unit);
  if (filters?.rank) query = query.eq('rank', filters.rank);
  if (filters?.isNg !== undefined) query = query.eq('is_ng', filters.isNg);
  if (filters?.companyFlag) query = query.eq('company_flag', filters.companyFlag);
  if (filters?.ngReason) query = query.eq('ng_reason', filters.ngReason);
  if (filters?.isPriority) query = query.eq('is_priority', true);
  if (filters?.isPriorityQ3) query = query.eq('is_priority_q3', true);
  if (filters?.companyId) query = query.eq('company_id', filters.companyId);
  if (filters?.search) {
    const q = `%${filters.search}%`;
    query = query.or(`name.ilike.${q},code.ilike.${q},company_name.ilike.${q}`);
  }
  return query;
}

export async function getStores(filters?: StoreFilters): Promise<Store[]> {
  const supabase = await createServerSupabaseClient();
  const allData: Record<string, unknown>[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let query = supabase.from('stores').select('*');
    query = applyStoreFilters(query, filters);
    const { data } = await query.order('number').range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData.map(toStore);
}

export async function getStoreById(id: string): Promise<Store | undefined> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('stores').select('*').eq('id', id).single();
  return data ? toStore(data) : undefined;
}

export async function getStoresWithLatestMetrics(
  filters?: StoreFilters,
  yearMonth?: string
): Promise<StoreWithMetrics[]> {
  const stores = await getStores(filters);
  if (!yearMonth || stores.length === 0) return stores;

  const supabase = await createServerSupabaseClient();
  const storeIds = stores.map(s => s.id);
  const allMetrics: Metric[] = [];
  for (let i = 0; i < storeIds.length; i += 200) {
    const batch = storeIds.slice(i, i + 200);
    const { data } = await supabase
      .from('monthly_metrics')
      .select('*')
      .in('store_id', batch)
      .eq('year_month', yearMonth);
    if (data) allMetrics.push(...data.map(toMetric));
  }

  const metricsMap = new Map(allMetrics.map(m => [m.storeId, m]));
  return stores.map(store => ({
    ...store,
    latestMetrics: metricsMap.get(store.id),
  }));
}

// --- Metrics ---
export async function getMetricsByStore(storeId: string): Promise<Metric[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('monthly_metrics')
    .select('*')
    .eq('store_id', storeId)
    .order('year_month');
  return (data || []).map(toMetric);
}

const getAllMonthlyTrendsCached = unstable_cache(
  async (): Promise<MonthlyTrend[]> => {
    const supabase = getAdminSupabaseClient();
    const { data } = await supabase
      .from('v_monthly_trends')
      .select('*')
      .order('year_month');
    return (data || []).map((d: Record<string, unknown>) => ({
      yearMonth: d.year_month as string,
      totalReferrals: d.total_referrals as number,
      totalConnections: (d.total_connections as number) ?? 0,
      totalBrokerage: d.total_brokerage as number,
      avgReferralRate: Number(d.avg_referral_rate) || 0,
      totalTargetReferrals: d.total_target_referrals as number,
      storeCount: d.store_count as number,
    }));
  },
  ['monthly_trends_all'],
  { revalidate: CACHE_TTL, tags: ['metrics'] }
);

export async function getMonthlyTrends(filters?: StoreFilters): Promise<MonthlyTrend[]> {
  // フィルタなしはキャッシュから返却
  if (!filters || Object.keys(filters).length === 0) {
    return getAllMonthlyTrendsCached();
  }

  const supabase = await createServerSupabaseClient();

  // フィルタありの場合: 該当店舗のメトリクスを個別集計
  const stores = await getStores(filters);
  const storeIds = stores.map(s => s.id);
  if (storeIds.length === 0) return [];

  const allMetrics: Metric[] = [];
  for (let i = 0; i < storeIds.length; i += 200) {
    const batch = storeIds.slice(i, i + 200);
    const { data } = await supabase
      .from('monthly_metrics')
      .select('*')
      .in('store_id', batch);
    if (data) allMetrics.push(...data.map(toMetric));
  }

  const monthMap = new Map<string, { refs: number; cons: number; brk: number; rates: number[]; targets: number; count: number }>();
  allMetrics.forEach(m => {
    const entry = monthMap.get(m.yearMonth) || { refs: 0, cons: 0, brk: 0, rates: [], targets: 0, count: 0 };
    entry.refs += m.referrals;
    entry.cons += m.connections;
    entry.brk += m.brokerage;
    if (m.referralRate !== null) entry.rates.push(m.referralRate);
    entry.targets += m.targetReferrals;
    entry.count++;
    monthMap.set(m.yearMonth, entry);
  });

  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, data]) => ({
      yearMonth,
      totalReferrals: data.refs,
      totalConnections: data.cons,
      totalBrokerage: data.brk,
      avgReferralRate: data.rates.length > 0
        ? Math.round((data.rates.reduce((a, b) => a + b, 0) / data.rates.length) * 10000) / 10000
        : 0,
      totalTargetReferrals: data.targets,
      storeCount: data.count,
    }));
}

// --- Agency Summaries (cached) ---
const getAgencySummariesByMonthCached = unstable_cache(
  async (yearMonth: string): Promise<AgencySummary[]> => {
    const supabase = getAdminSupabaseClient();
    const { data } = await supabase.rpc('get_agency_summaries_by_month', { p_year_month: yearMonth });
    return (data || []).map((d: Record<string, unknown>) => ({
      agencyId: d.agency_id as string,
      agencyName: d.agency_name as string,
      storeCount: d.store_count as number,
      activeStoreCount: d.active_store_count as number,
      ngStoreCount: d.ng_store_count as number,
      totalReferrals: d.total_referrals as number,
      totalConnections: (d.total_connections as number) ?? 0,
      totalBrokerage: d.total_brokerage as number,
      avgReferralRate: Number(d.avg_referral_rate) || 0,
      totalTargetReferrals: d.total_target_referrals as number,
      targetAchievementRate: Number(d.target_achievement_rate) || 0,
    }));
  },
  ['agency_summaries_by_month'],
  { revalidate: CACHE_TTL, tags: ['metrics'] }
);

const getAgencySummariesTotalCached = unstable_cache(
  async (): Promise<AgencySummary[]> => {
    const supabase = getAdminSupabaseClient();
    const { data } = await supabase.from('v_agency_totals').select('*');
    return (data || []).map((d: Record<string, unknown>) => ({
      agencyId: d.agency_id as string,
      agencyName: d.agency_name as string,
      storeCount: d.store_count as number,
      activeStoreCount: d.active_store_count as number,
      ngStoreCount: d.ng_store_count as number,
      totalReferrals: d.total_referrals as number,
      totalConnections: (d.total_connections as number) ?? 0,
      totalBrokerage: d.total_brokerage as number,
      avgReferralRate: Number(d.avg_referral_rate) || 0,
      totalTargetReferrals: d.total_target_referrals as number,
      targetAchievementRate: Number(d.target_achievement_rate) || 0,
    }));
  },
  ['agency_summaries_total'],
  { revalidate: CACHE_TTL, tags: ['metrics', 'stores'] }
);

export async function getAgencySummaries(yearMonth?: string): Promise<AgencySummary[]> {
  return yearMonth ? getAgencySummariesByMonthCached(yearMonth) : getAgencySummariesTotalCached();
}

// --- Utility (cached) ---
export const getAvailableMonths = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = getAdminSupabaseClient();
    const { data } = await supabase
      .from('v_monthly_trends')
      .select('year_month')
      .order('year_month');
    return (data || []).map(d => (d as Record<string, unknown>).year_month as string);
  },
  ['available_months'],
  { revalidate: CACHE_TTL, tags: ['metrics'] }
);

const getDistinctStoreColumn = unstable_cache(
  async (column: string): Promise<string[]> => {
    const supabase = getAdminSupabaseClient();
    const values = new Set<string>();
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from('stores')
        .select(column)
        .not(column, 'is', null)
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      data.forEach(d => {
        const v = (d as unknown as Record<string, unknown>)[column] as string;
        if (v) values.add(v);
      });
      if (data.length < 1000) break;
      from += 1000;
    }
    return [...values].sort();
  },
  ['distinct_store_column'],
  { revalidate: CACHE_TTL, tags: ['stores'] }
);

export async function getUnits(): Promise<string[]> {
  return getDistinctStoreColumn('unit');
}

export async function getRanks(): Promise<string[]> {
  return getDistinctStoreColumn('rank');
}

export async function getCompanyFlags(): Promise<string[]> {
  return getDistinctStoreColumn('company_flag');
}

export async function getNgReasons(): Promise<string[]> {
  return getDistinctStoreColumn('ng_reason');
}

export const getCompanies = unstable_cache(
  async (): Promise<{ id: string; name: string }[]> => {
    const supabase = getAdminSupabaseClient();
    const all: { id: string; name: string }[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      all.push(...(data as { id: string; name: string }[]));
      if (data.length < 1000) break;
      from += 1000;
    }
    return all;
  },
  ['companies'],
  { revalidate: CACHE_TTL, tags: ['companies'] }
);

export const getKpiSummary = unstable_cache(
  async (yearMonth: string) => {
    const supabase = getAdminSupabaseClient();
    const { data } = await supabase.rpc('get_kpi_summary', { p_year_month: yearMonth });
    const row = (data && data[0]) || {};
    return {
      totalReferrals: (row.total_referrals as number) || 0,
      totalConnections: (row.total_connections as number) || 0,
      totalBrokerage: (row.total_brokerage as number) || 0,
      referralRate: Number(row.referral_rate) || 0,
      targetAchievementRate: Number(row.target_achievement_rate) || 0,
      totalTargetReferrals: (row.total_target_referrals as number) || 0,
      activeStoreCount: (row.active_store_count as number) || 0,
      storesWithData: (row.stores_with_data as number) || 0,
    };
  },
  ['kpi_summary'],
  { revalidate: CACHE_TTL, tags: ['metrics'] }
);

// ================================
// Dashboard Layout & User Roles
// ================================

// --- 現在ログインユーザーのロール ---
// 読み取りは admin client でバイパス (RLS で空行が返る事故を防ぐ)
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const serverClient = await createServerSupabaseClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return null;
  const admin = getAdminSupabaseClient();
  const { data } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  return (data?.role as UserRole) ?? 'user';
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  return (await getCurrentUserRole()) === 'admin';
}

// --- 全ユーザーのロール一覧 (管理コンソール用) ---
export async function getAllUserRoles(): Promise<UserRoleRow[]> {
  const supabase = getAdminSupabaseClient();
  // auth.users は通常の select では取れないので admin client を使用
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const users = authUsers?.users || [];

  const { data: roles } = await supabase.from('user_roles').select('*');
  const roleMap = new Map<string, UserRoleRow>(
    (roles || []).map((r: Record<string, unknown>) => [r.user_id as string, r as unknown as UserRoleRow])
  );

  return users.map(u => {
    const existing = roleMap.get(u.id);
    return existing || {
      user_id: u.id,
      email: u.email || '',
      role: 'user' as UserRole,
      created_at: u.created_at || '',
      updated_at: u.created_at || '',
    };
  });
}

// --- ロール更新 (admin client 経由で RLS バイパス。Server Action 経由で呼ぶこと) ---
export async function upsertUserRole(userId: string, role: UserRole): Promise<void> {
  const supabase = getAdminSupabaseClient();
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const email = authUser?.user?.email || '';
  await supabase.from('user_roles').upsert({
    user_id: userId,
    email,
    role,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

// --- ダッシュボードレイアウト取得 ---
// 読み取りは admin client でバイパス (RLS で空行が返る事故を防ぐ。全員閲覧可の共有設定)
export async function getDashboardLayout(): Promise<Widget[]> {
  const supabase = getAdminSupabaseClient();
  const { data } = await supabase
    .from('dashboard_layout')
    .select('widgets')
    .eq('id', 'default')
    .maybeSingle();
  if (!data) return [];
  return (data.widgets as Widget[]) || [];
}

// --- ダッシュボードレイアウト保存 (admin 専用、Server Action 経由) ---
export async function saveDashboardLayout(widgets: Widget[]): Promise<void> {
  const supabase = getAdminSupabaseClient();
  const serverClient = await createServerSupabaseClient();
  const { data: { user } } = await serverClient.auth.getUser();

  await supabase.from('dashboard_layout').upsert({
    id: 'default',
    widgets,
    updated_at: new Date().toISOString(),
    updated_by: user?.id || null,
  }, { onConflict: 'id' });
}
