import Link from 'next/link';
import { Edit } from 'lucide-react';
import {
  getKpiSummary,
  getAvailableMonths,
  getAgencies,
  getMonthlyTrends,
  getAgencySummaries,
  isCurrentUserAdmin,
  getStoresWithLatestMetrics,
} from '@/lib/data/repository';
import { KpiBigCard, KpiSmallCard } from '@/components/dashboard/kpi-big-card';
import { DashboardTrendCard } from '@/components/dashboard/dashboard-trend-card';
import { DashboardAgencyCard } from '@/components/dashboard/dashboard-agency-card';
import { PeriodSelector } from '@/components/dashboard/period-selector';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { month: monthParam } = await searchParams;
  const months = await getAvailableMonths();
  const currentMonth = monthParam || months[months.length - 1] || '';

  const [kpi, agencies, trends, agencySummaries, isAdmin, stores] = await Promise.all([
    getKpiSummary(currentMonth),
    getAgencies(),
    getMonthlyTrends(),
    getAgencySummaries(currentMonth),
    isCurrentUserAdmin(),
    getStoresWithLatestMetrics(),
  ]);

  // ファネル: 取次 → 通電 → 成約 (DB に「仲介」列なし)
  // 取次の上位指標は「目標」のみ。成約率/通電率は取次に対する比率。
  const targetAchievementPct = kpi.totalTargetReferrals > 0
    ? Math.round((kpi.totalReferrals / kpi.totalTargetReferrals) * 100)
    : null;
  const connectionRatePct = kpi.totalReferrals > 0
    ? Math.round((kpi.totalConnections / kpi.totalReferrals) * 100)
    : null;
  const brokerageRatePct = kpi.totalReferrals > 0
    ? Math.round((kpi.totalBrokerage / kpi.totalReferrals) * 100)
    : null;

  const roundStoreCount = stores.filter(s => !s.isNg).length;
  const agencyCount = agencies.length;

  // Recent 12 months for trend chart
  const recentTrends = trends.slice(-12);

  return (
    <div className="px-8 py-6">
      {/* Top bar: edit + period selector */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/dashboard/edit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-pink-200 bg-white px-3 py-1.5 text-xs font-medium text-[#F76FAB] hover:bg-pink-50"
            >
              <Edit className="h-3.5 w-3.5" />
              編集
            </Link>
          )}
        </div>
        <PeriodSelector months={months} current={currentMonth} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* LEFT COLUMN: 3 big KPI cards + 2 small */}
        <div className="space-y-5">
          <KpiBigCard
            label="取次"
            count={kpi.totalReferrals}
            rate={targetAchievementPct}
            subLabel="目標"
            subValue={kpi.totalTargetReferrals || null}
          />
          <KpiBigCard
            label="通電"
            count={kpi.totalConnections}
            rate={connectionRatePct}
            subLabel="取次数"
            subValue={kpi.totalReferrals}
          />
          <KpiBigCard
            label="成約"
            count={kpi.totalBrokerage}
            rate={brokerageRatePct}
            subLabel="取次数"
            subValue={kpi.totalReferrals}
          />
          <div className="grid grid-cols-2 gap-5">
            <KpiSmallCard label="ラウンド店舗" count={roundStoreCount} />
            <KpiSmallCard label="代理店" count={agencyCount} />
          </div>
        </div>

        {/* RIGHT COLUMN: 2 chart cards */}
        <div className="space-y-5">
          <DashboardTrendCard data={recentTrends} />
          <DashboardAgencyCard data={agencySummaries.slice(0, 6)} />
        </div>
      </div>
    </div>
  );
}
