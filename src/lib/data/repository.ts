import { supabase } from '@/lib/supabase/client';
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
  const { data } = await supabase.from('agencies').select('*').order('name');
  return (data || []) as Agency[];
}

// --- Stores ---
export async function getStores(filters?: StoreFilters): Promise<Store[]> {
  let query = supabase.from('stores').select('*');

  if (filters?.agencyId) query = query.eq('agency_id', filters.agencyId);
  if (filters?.unit) query = query.eq('unit', filters.unit);
  if (filters?.rank) query = query.eq('rank', filters.rank);
  if (filters?.isNg !== undefined) query = query.eq('is_ng', filters.isNg);
  if (filters?.companyFlag) query = query.eq('company_flag', filters.companyFlag);
  if (filters?.search) {
    const q = `%${filters.search}%`;
    query = query.or(`name.ilike.${q},code.ilike.${q},company_name.ilike.${q}`);
  }

  const { data } = await query.order('number');
  return (data || []).map(toStore);
}

export async function getStoreById(id: string): Promise<Store | undefined> {
  const { data } = await supabase.from('stores').select('*').eq('id', id).single();
  return data ? toStore(data) : undefined;
}

export async function getStoresWithLatestMetrics(
  filters?: StoreFilters,
  yearMonth?: string
): Promise<StoreWithMetrics[]> {
  const stores = await getStores(filters);
  if (!yearMonth || stores.length === 0) return stores;

  const storeIds = stores.map(s => s.id);
  // Fetch metrics in batches (Supabase has URL length limits)
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
  const { data } = await supabase
    .from('monthly_metrics')
    .select('*')
    .eq('store_id', storeId)
    .order('year_month');
  return (data || []).map(toMetric);
}

export async function getMonthlyTrends(filters?: StoreFilters): Promise<MonthlyTrend[]> {
  // If filters, get filtered store IDs first
  let storeIdFilter: string[] | null = null;
  if (filters && Object.keys(filters).length > 0) {
    const stores = await getStores(filters);
    storeIdFilter = stores.map(s => s.id);
    if (storeIdFilter.length === 0) return [];
  }

  // Fetch all metrics (or filtered)
  let allMetrics: Metric[] = [];
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
    // Fetch all - paginate since there are 52k+ rows
    let from = 0;
    const pageSize = 5000;
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

  // Aggregate by month
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
  const agencies = await getAgencies();
  const { data: storesData } = await supabase.from('stores').select('id, agency_id, is_ng');
  const stores = storesData || [];

  // Get metrics
  let metricsQuery = supabase.from('monthly_metrics').select('store_id, referrals, brokerage, referral_rate, target_referrals');
  if (yearMonth) metricsQuery = metricsQuery.eq('year_month', yearMonth);

  const allMetrics: Record<string, unknown>[] = [];
  let from = 0;
  const pageSize = 5000;
  while (true) {
    let q = supabase.from('monthly_metrics').select('store_id, referrals, brokerage, target_referrals');
    if (yearMonth) q = q.eq('year_month', yearMonth);
    const { data } = await q.range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    allMetrics.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // Build store->agency map
  const storeAgencyMap = new Map(stores.map((s: Record<string, unknown>) => [s.id as string, s.agency_id as string]));

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
  const { data } = await supabase
    .from('monthly_metrics')
    .select('year_month')
    .order('year_month');
  if (!data) return [];
  return [...new Set(data.map((d: Record<string, unknown>) => d.year_month as string))];
}

export async function getUnits(): Promise<string[]> {
  const { data } = await supabase.from('stores').select('unit').not('unit', 'is', null);
  if (!data) return [];
  return [...new Set(data.map((d: Record<string, unknown>) => d.unit as string))];
}

export async function getRanks(): Promise<string[]> {
  const { data } = await supabase.from('stores').select('rank').not('rank', 'is', null);
  if (!data) return [];
  return [...new Set(data.map((d: Record<string, unknown>) => d.rank as string))];
}

export async function getCompanyFlags(): Promise<string[]> {
  const { data } = await supabase.from('stores').select('company_flag').not('company_flag', 'is', null);
  if (!data) return [];
  return [...new Set(data.map((d: Record<string, unknown>) => d.company_flag as string))];
}

export async function getNgReasons(): Promise<string[]> {
  const { data } = await supabase.from('stores').select('ng_reason').not('ng_reason', 'is', null);
  if (!data) return [];
  return [...new Set(data.map((d: Record<string, unknown>) => d.ng_reason as string))];
}

export async function getKpiSummary(yearMonth: string) {
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
