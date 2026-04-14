export interface Agency {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
  agencyId: string | null;
}

export interface Store {
  id: string;
  number: number;
  code: string;
  agencyId: string | null;
  agencyName: string;
  companyId: string | null;
  companyName: string;
  name: string;
  isNg: boolean;
  ngMonth: string | null;
  ngReason: string | null;
  isPriority: boolean;
  isPriorityQ3: boolean;
  addedMonth: string | null;
  roundRestart: string | null;
  companyFlag: string | null;
  unit: string | null;
  rank: string | null;
}

export interface Metric {
  storeId: string;
  yearMonth: string;
  referrals: number;
  brokerage: number;
  referralRate: number | null;
  targetReferrals: number;
}

export interface StoreWithMetrics extends Store {
  latestMetrics?: Metric;
}

export interface AgencySummary {
  agencyId: string;
  agencyName: string;
  storeCount: number;
  activeStoreCount: number;
  ngStoreCount: number;
  totalReferrals: number;
  totalBrokerage: number;
  avgReferralRate: number;
  totalTargetReferrals: number;
  targetAchievementRate: number;
}

export interface MonthlyTrend {
  yearMonth: string;
  totalReferrals: number;
  totalBrokerage: number;
  avgReferralRate: number;
  totalTargetReferrals: number;
  storeCount: number;
}

export interface StoreFilters {
  agencyId?: string;
  unit?: string;
  rank?: string;
  isNg?: boolean;
  companyFlag?: string;
  ngReason?: string;
  isPriority?: boolean;
  isPriorityQ3?: boolean;
  companyId?: string;
  search?: string;
}
