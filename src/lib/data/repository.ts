import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  Agency, Store, Metric, StoreFilters,
  AgencySummary, MonthlyTrend, StoreWithMetrics,
} from './types';

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
    brokerage: row.brokerage as number,
    referralRate: row.referral_rate as number | null,
    targetReferrals: row.target_referrals as number,
  };
}

// --- Agencies ---
export async function getAgencies(): Promise<Agency[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('agencies').select('*').order('name');
  return (data || []) as Agency[];
}

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

export async function getMonthlyTrends(filters?: StoreFilters): Promise<MonthlyTrend[]> {
  let storeIdFilter: string[] | null = null;
  if (filters && Object.keys(filters).length > 0) {
    const stores = await getStores(filters);
    storeIdFilter = stores.map(s => s.id);
    if (storeIdFilter.length === 0) return [];
  }

  const supabase = await createServerSupabaseClient();
  const allMetrics: Metric[] = [];
  if (storeIdFilter) {
    for (let i = 0; i < storeIdFilter.length; i += 200) {
      const batch = storeIdFilter.slice(i, i + 200);
      const { data } = await supabase
        .from('monthly_metrics')
        .select('*')
        .in('store_id', batch);
      if (data) allMetrics.push(...data.map(toMetric));
    }
  } else {
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data } = await supabase
        .from('monthly_metrics')
        .select('*')
        .range(from, from + pageSize - 1);
      if (!data || data.length === 0) break;
      allMetrics.push(...data.map(toMetric));
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  const monthMap = new Map<string, { refs: number; brk: number; rates: number[]; targets: number; count: number }>();
  allMetrics.forEach(m => {
    const entry = monthMap.get(m.yearMonth) || { refs: 0, brk: 0, rates: [], targets: 0, count: 0 };
    entry.refs += m.referrals;
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
      totalBrokerage: data.brk,
      avgReferralRate: data.rates.length > 0
        ? Math.round((data.rates.reduce((a, b) => a + b, 0) / data.rates.length) * 10000) / 10000
        : 0,
      totalTargetReferrals: data.targets,
      storeCount: data.count,
    }));
}

// --- Agency Summaries ---
export async function getAgencySummaries(yearMonth?: string): Promise<AgencySummary[]> {
  const supabase = await createServerSupabaseClient();
  const agencies = await getAgencies();
  const stores: Record<string, unknown>[] = [];
  let stFrom = 0;
  while (true) {
    const { data } = await supabase.from('stores').select('id, agency_id, is_ng').range(stFrom, stFrom + 999);
    if (!data || data.length === 0) break;
    stores.push(...data);
    if (data.length < 1000) break;
    stFrom += 1000;
  }

  const allMetrics: Record<string, unknown>[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let q = supabase.from('monthly_metrics').select('store_id, referrals, brokerage, target_referrals');
    if (yearMonth) q = q.eq('year_month', yearMonth);
    const { data } = await q.range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    allMetrics.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return agencies.map(agency => {
    const agencyStores = stores.filter((s: Record<string, unknown>) => s.agency_id === agency.id);
    const storeIds = new Set(agencyStores.map((s: Record<string, unknown>) => s.id as string));

    const relevantMetrics = allMetrics.filter(m => storeIds.has(m.store_id as string));
    const totalRefs = relevantMetrics.reduce((s, m) => s + (m.referrals as number), 0);
    const totalBrk = relevantMetrics.reduce((s, m) => s + (m.brokerage as number), 0);
    const totalTarget = relevantMetrics.reduce((s, m) => s + (m.target_referrals as number), 0);

    return {
      agencyId: agency.id,
      agencyName: agency.name,
      storeCount: agencyStores.length,
      activeStoreCount: agencyStores.filter((s: Record<string, unknown>) => !s.is_ng).length,
      ngStoreCount: agencyStores.filter((s: Record<string, unknown>) => s.is_ng).length,
      totalReferrals: totalRefs,
      totalBrokerage: totalBrk,
      avgReferralRate: totalBrk > 0 ? Math.round((totalRefs / totalBrk) * 10000) / 10000 : 0,
      totalTargetReferrals: totalTarget,
      targetAchievementRate: totalTarget > 0 ? Math.round((totalRefs / totalTarget) * 10000) / 10000 : 0,
    };
  });
}

// --- Utility ---
export async function getAvailableMonths(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const months = new Set<string>();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await supabase
      .from('monthly_metrics')
      .select('year_month')
      .range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    data.forEach(d => months.add((d as Record<string, unknown>).year_month as string));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return [...months].sort();
}

async function getDistinctStoreColumn(column: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
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
}

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

export async function getCompanies(): Promise<{ id: string; name: string }[]> {
  const supabase = await createServerSupabaseClient();
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
}

export async function getKpiSummary(yearMonth: string) {
  const supabase = await createServerSupabaseClient();
  const { data: metricsData } = await supabase
    .from('monthly_metrics')
    .select('referrals, brokerage, target_referrals')
    .eq('year_month', yearMonth);

  const metrics = metricsData || [];
  const totalRefs = metrics.reduce((s, m) => s + (m.referrals as number), 0);
  const totalBrk = metrics.reduce((s, m) => s + (m.brokerage as number), 0);
  const totalTarget = metrics.reduce((s, m) => s + (m.target_referrals as number), 0);

  const { count } = await supabase
    .from('stores')
    .select('*', { count: 'exact', head: true })
    .eq('is_ng', false);

  return {
    totalReferrals: totalRefs,
    totalBrokerage: totalBrk,
    referralRate: totalBrk > 0 ? Math.round((totalRefs / totalBrk) * 10000) / 10000 : 0,
    targetAchievementRate: totalTarget > 0 ? Math.round((totalRefs / totalTarget) * 10000) / 10000 : 0,
    totalTargetReferrals: totalTarget,
    activeStoreCount: count || 0,
    storesWithData: metrics.length,
  };
}
