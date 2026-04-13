import type {
  Agency, Store, Metric, StoreFilters,
  AgencySummary, MonthlyTrend, StoreWithMetrics,
} from './types';

import agenciesData from '../../../data/agencies.json';
import storesData from '../../../data/stores.json';
import metricsData from '../../../data/metrics.json';

const agencies: Agency[] = agenciesData as Agency[];
const stores: Store[] = storesData as Store[];
const metrics: Metric[] = metricsData as Metric[];

// Precompute indexes
const metricsByStore = new Map<string, Metric[]>();
metrics.forEach(m => {
  const arr = metricsByStore.get(m.storeId) || [];
  arr.push(m);
  metricsByStore.set(m.storeId, arr);
});

const storeById = new Map<string, Store>();
stores.forEach(s => storeById.set(s.id, s));

// --- Agencies ---
export function getAgencies(): Agency[] {
  return agencies;
}

// --- Stores ---
export function getStores(filters?: StoreFilters): Store[] {
  let result = stores;
  if (!filters) return result;

  if (filters.agencyId) {
    result = result.filter(s => s.agencyId === filters.agencyId);
  }
  if (filters.unit) {
    result = result.filter(s => s.unit === filters.unit);
  }
  if (filters.rank) {
    result = result.filter(s => s.rank === filters.rank);
  }
  if (filters.isNg !== undefined) {
    result = result.filter(s => s.isNg === filters.isNg);
  }
  if (filters.companyFlag) {
    result = result.filter(s => s.companyFlag === filters.companyFlag);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.companyName.toLowerCase().includes(q)
    );
  }
  return result;
}

export function getStoreById(id: string): Store | undefined {
  return storeById.get(id);
}

export function getStoresWithLatestMetrics(filters?: StoreFilters, yearMonth?: string): StoreWithMetrics[] {
  const filteredStores = getStores(filters);
  return filteredStores.map(store => {
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
export function getMetricsByStore(storeId: string): Metric[] {
  return (metricsByStore.get(storeId) || []).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

export function getMonthlyTrends(filters?: StoreFilters): MonthlyTrend[] {
  const filteredStoreIds = new Set(getStores(filters).map(s => s.id));
  const monthMap = new Map<string, { refs: number; brk: number; rates: number[]; targets: number; count: number }>();

  metrics.forEach(m => {
    if (!filteredStoreIds.has(m.storeId)) return;
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
export function getAgencySummaries(yearMonth?: string): AgencySummary[] {
  return agencies.map(agency => {
    const agencyStores = stores.filter(s => s.agencyId === agency.id);
    const storeIds = new Set(agencyStores.map(s => s.id));

    let relevantMetrics: Metric[];
    if (yearMonth) {
      relevantMetrics = metrics.filter(m => storeIds.has(m.storeId) && m.yearMonth === yearMonth);
    } else {
      relevantMetrics = metrics.filter(m => storeIds.has(m.storeId));
    }

    const totalRefs = relevantMetrics.reduce((s, m) => s + m.referrals, 0);
    const totalBrk = relevantMetrics.reduce((s, m) => s + m.brokerage, 0);
    const totalTarget = relevantMetrics.reduce((s, m) => s + m.targetReferrals, 0);

    return {
      agencyId: agency.id,
      agencyName: agency.name,
      storeCount: agencyStores.length,
      activeStoreCount: agencyStores.filter(s => !s.isNg).length,
      ngStoreCount: agencyStores.filter(s => s.isNg).length,
      totalReferrals: totalRefs,
      totalBrokerage: totalBrk,
      avgReferralRate: totalBrk > 0 ? Math.round((totalRefs / totalBrk) * 10000) / 10000 : 0,
      totalTargetReferrals: totalTarget,
      targetAchievementRate: totalTarget > 0 ? Math.round((totalRefs / totalTarget) * 10000) / 10000 : 0,
    };
  });
}

// --- Utility ---
export function getAvailableMonths(): string[] {
  return [...new Set(metrics.map(m => m.yearMonth))].sort();
}

export function getUnits(): string[] {
  return [...new Set(stores.map(s => s.unit).filter(Boolean))] as string[];
}

export function getRanks(): string[] {
  return [...new Set(stores.map(s => s.rank).filter(Boolean))] as string[];
}

export function getCompanyFlags(): string[] {
  return [...new Set(stores.map(s => s.companyFlag).filter(Boolean))] as string[];
}

export function getNgReasons(): string[] {
  return [...new Set(stores.map(s => s.ngReason).filter(Boolean))] as string[];
}

export function getKpiSummary(yearMonth: string) {
  const monthMetrics = metrics.filter(m => m.yearMonth === yearMonth);
  const totalRefs = monthMetrics.reduce((s, m) => s + m.referrals, 0);
  const totalBrk = monthMetrics.reduce((s, m) => s + m.brokerage, 0);
  const totalTarget = monthMetrics.reduce((s, m) => s + m.targetReferrals, 0);
  const activeStores = stores.filter(s => !s.isNg).length;

  return {
    totalReferrals: totalRefs,
    totalBrokerage: totalBrk,
    referralRate: totalBrk > 0 ? Math.round((totalRefs / totalBrk) * 10000) / 10000 : 0,
    targetAchievementRate: totalTarget > 0 ? Math.round((totalRefs / totalTarget) * 10000) / 10000 : 0,
    totalTargetReferrals: totalTarget,
    activeStoreCount: activeStores,
    storesWithData: monthMetrics.length,
  };
}
