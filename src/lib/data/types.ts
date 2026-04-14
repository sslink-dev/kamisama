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

// === Dashboard widgets ===
export type WidgetType =
  | 'kpi_summary'
  | 'trend_chart'
  | 'agency_chart'
  | 'target_chart'
  | 'ng_pie'
  | 'ranking_list';

export type WidgetSize = 'third' | 'half' | 'full';

export interface WidgetConfig {
  title?: string;
  month?: string;
  agencyId?: string;
  unit?: string;
  limit?: number;
  chartStyle?: 'line' | 'bar';
  rankingType?: 'agency_by_referrals' | 'store_by_referrals' | 'ng_reasons';
}

export interface Widget {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  config: WidgetConfig;
}

export interface DashboardLayoutRow {
  id: string;
  widgets: Widget[];
  updated_at: string;
  updated_by: string | null;
}

// === User roles ===
export type UserRole = 'admin' | 'user';

export interface UserRoleRow {
  user_id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
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
