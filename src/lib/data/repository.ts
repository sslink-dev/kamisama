import { supabase } from '../supabase';
import type {
  Agency, Store, Metric, StoreFilters,
  AgencySummary, MonthlyTrend, StoreWithMetrics,
} from './types';

// --- Internal DB row types (snake_case) ---

interface StoreRow {
  id: string;
  number: number;
  code: string;
  agency_id: string | null;
  agency_name: string;
  company_id: string | null;
  company_name: string;
  name: string;
  is_ng: boolean;
  ng_month: string | null;
  ng_reason: string | null;
  is_priority: boolean;
  is_priority_q3: boolean;
  added_month: string | null;
  round_restart: string | null;
  company_flag: string | null;
  unit: string | null;
  rank: string | null;
}

interface MetricRow {
  store_id: string;
  year_month: string;
  referrals: number;
  brokerage: number;
  referral_rate: number | null;
  target_referrals: number;
}

// --- Mappers ---

function toStore(r: StoreRow): Store {
  return {
    id: r.id,
    number: r.number,
    code: r.code,
    agencyId: r.agency_id,
    agencyName: r.agency_name,
    companyId: r.company_id,
    companyName: r.company_name,
    name: r.name,
    isNg: r.is_ng,
    ngMonth: r.ng_month,
    ngReason: r.ng_reason,
    isPriority: r.is_priority,
    isPriorityQ3: r.is_priority_q3,
    addedMonth: r.added_month,
    roundRestart: r.round_restart,
    companyFlag: r.company_flag,
    unit: r.unit,
    rank: r.rank,
  };
}

function toMetric(r: MetricRow): Metric {
  return {
    storeId: r.store_id,
    yearMonth: r.year_month,
    referrals: r.referrals,
    brokerage: r.brokerage,
    referralRate: r.referral_rate,
    targetReferrals: r.target_referrals,
  };
}

// --- Pagination helper (handles Supabase 1000-row default limit) ---

const PAGE_SIZE = 1000;

async function fetchAll<T>(
  buildQuery: (offset: number, limit: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await buildQuery(offset, PAGE_SIZE);
    if (error) throw new Error(`Supabase query error: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

// --- Agencies ---

export async function getAgencies(): Promise<Agency[]> {
  const { data, error } = await supabase.from('agencies').select('id, name');
  if (error) throw new Error(`Failed to fetch agencies: ${error.message}`);
  return data as Agency[];
}

// --- Stores ---

export async function getStores(filters?: StoreFilters): Promise<Store[]> {
  const rows = await fetchAll<StoreRow>((offset, limit) => {
    let q = supabase.from('stores').select('*');
    if (filters?.agencyId) q = q.eq('agency_id', filters.agencyId);
    if (filters?.unit) q = q.eq('unit', filters.unit);
    if (filters?.rank) q = q.eq('rank', filters.rank);
    if (filters?.isNg !== undefined) q = q.eq('is_ng', filters.isNg);
    if (filters?.companyFlag) q = q.eq('company_flag', filters.companyFlag);
    if (filters?.search) {
      const term = `%${filters.search}%`;
      q = q.or(`name.ilike.${term},code.ilike.${term},company_name.ilike.${term}`);
    }
    return q.range(offset, offset + limit - 1);
  });
  return rows.map(toStore);
}

export async function getStoreById(id: string): Promise<Store | undefined> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch store: ${error.message}`);
  return data ? toStore(data as StoreRow) : undefined;
}

export async function getStoresWithLatestMetrics(
  filters?: StoreFilters,
  yearMonth?: string,
): Promise<StoreWithMetrics[]> {
  const stores = await getStores(filters);
  if (stores.length === 0) return [];

  // Fetch metrics — filter by yearMonth when available for efficiency
  const metricRows = await fetchAll<MetricRow>((offset, limit) => {
    let q = supabase.from('metrics').select('*');
    if (yearMonth) q = q.eq('year_month', yearMonth);
    return q.range(offset, offset + limit - 1);
  });

  const metricsByStore = new Map<string, Metric[]>();
  for (const row of metricRows) {
    const m = toMetric(row);
    const arr = metricsByStore.get(m.storeId) || [];
    arr.push(m);
    metricsByStore.set(m.storeId, arr);
  }

  return stores.map(store => {
    const storeMetrics = metricsByStore.get(store.id) || [];
    let latest: Metric | undefined;
    if (yearMonth) {
      latest = storeMetrics.find(m => m.yearMonth === yearMonth);
    } else {
      latest = storeMetrics
        .filter(m => m.referrals > 0 || m.brokerage > 0)
        .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))[0];
    }
    return { ...store, latestMetrics: latest };
  });
}

// --- Metrics ---

export async function getMetricsByStore(storeId: string): Promise<Metric[]> {
  const rows = await fetchAll<MetricRow>((offset, limit) =>
    supabase.from('metrics').select('*')
      .eq('store_id', storeId)
      .order('year_month', { ascending: true })
      .range(offset, offset + limit - 1),
  );
  return rows.map(toMetric);
}

// --- Monthly Trends (via RPC) ---

export async function getMonthlyTrends(filters?: StoreFilters): Promise<MonthlyTrend[]> {
  const { data, error } = await supabase.rpc('get_monthly_trends', {
    p_agency_id: filters?.agencyId ?? null,
    p_unit: filters?.unit ?? null,
    p_rank: filters?.rank ?? null,
    p_is_ng: filters?.isNg ?? null,
    p_company_flag: filters?.companyFlag ?? null,
  });
  if (error) throw new Error(`Failed to fetch monthly trends: ${error.message}`);

  return (data || []).map((row: {
    year_month: string;
    total_referrals: number;
    total_brokerage: number;
    avg_referral_rate: number;
    total_target_referrals: number;
    store_count: number;
  }) => ({
    yearMonth: row.year_month,
    totalReferrals: row.total_referrals,
    totalBrokerage: row.total_brokerage,
    avgReferralRate: row.avg_referral_rate,
    totalTargetReferrals: row.total_target_referrals,
    storeCount: row.store_count,
  }));
}

// --- Agency Summaries (via RPC) ---

export async function getAgencySummaries(yearMonth?: string): Promise<AgencySummary[]> {
  const { data, error } = await supabase.rpc('get_agency_summaries', {
    p_year_month: yearMonth ?? null,
  });
  if (error) throw new Error(`Failed to fetch agency summaries: ${error.message}`);

  return (data || []).map((row: {
    agency_id: string;
    agency_name: string;
    store_count: number;
    active_store_count: number;
    ng_store_count: number;
    total_referrals: number;
    total_brokerage: number;
    avg_referral_rate: number;
    total_target_referrals: number;
    target_achievement_rate: number;
  }) => ({
    agencyId: row.agency_id,
    agencyName: row.agency_name,
    storeCount: row.store_count,
    activeStoreCount: row.active_store_count,
    ngStoreCount: row.ng_store_count,
    totalReferrals: row.total_referrals,
    totalBrokerage: row.total_brokerage,
    avgReferralRate: row.avg_referral_rate,
    totalTargetReferrals: row.total_target_referrals,
    targetAchievementRate: row.target_achievement_rate,
  }));
}

// --- Utility (via RPC) ---

export async function getAvailableMonths(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_available_months');
  if (error) throw new Error(`Failed to fetch available months: ${error.message}`);
  return data ?? [];
}

export async function getUnits(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_units');
  if (error) throw new Error(`Failed to fetch units: ${error.message}`);
  return data ?? [];
}

export async function getRanks(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_ranks');
  if (error) throw new Error(`Failed to fetch ranks: ${error.message}`);
  return data ?? [];
}

export async function getCompanyFlags(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_company_flags');
  if (error) throw new Error(`Failed to fetch company flags: ${error.message}`);
  return data ?? [];
}

export async function getNgReasons(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_ng_reasons');
  if (error) throw new Error(`Failed to fetch ng reasons: ${error.message}`);
  return data ?? [];
}

// --- KPI Summary (via RPC) ---

export async function getKpiSummary(yearMonth: string) {
  const { data, error } = await supabase.rpc('get_kpi_summary', {
    p_year_month: yearMonth,
  });
  if (error) throw new Error(`Failed to fetch KPI summary: ${error.message}`);

  const row = (data && data[0]) || {
    total_referrals: 0,
    total_brokerage: 0,
    referral_rate: 0,
    target_achievement_rate: 0,
    total_target_referrals: 0,
    active_store_count: 0,
    stores_with_data: 0,
  };

  return {
    totalReferrals: row.total_referrals as number,
    totalBrokerage: row.total_brokerage as number,
    referralRate: row.referral_rate as number,
    targetAchievementRate: row.target_achievement_rate as number,
    totalTargetReferrals: row.total_target_referrals as number,
    activeStoreCount: row.active_store_count as number,
    storesWithData: row.stores_with_data as number,
  };
}
