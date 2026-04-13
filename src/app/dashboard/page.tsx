import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { AgencyChart } from '@/components/dashboard/agency-chart';
import { TargetChart } from '@/components/dashboard/target-chart';
import { Filters } from '@/components/dashboard/filters';
import {
  getKpiSummary,
  getMonthlyTrends,
  getAgencySummaries,
  getAgencies,
  getAvailableMonths,
  getUnits,
} from '@/lib/data/repository';
import { getLatestMonth } from '@/lib/utils/year-month';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; agency?: string; unit?: string }>;
}) {
  const params = await searchParams;
  const months = getAvailableMonths();
  const historicalMonths = months.filter(m => m <= '2503');
  const selectedMonth = params.month || getLatestMonth(historicalMonths);
  const selectedAgency = params.agency || 'all';
  const selectedUnit = params.unit || 'all';

  const filters = {
    ...(selectedAgency !== 'all' ? { agencyId: selectedAgency } : {}),
    ...(selectedUnit !== 'all' ? { unit: selectedUnit } : {}),
  };

  const kpi = getKpiSummary(selectedMonth);
  const trends = getMonthlyTrends(Object.keys(filters).length > 0 ? filters : undefined)
    .filter(t => t.yearMonth <= '2503');
  const agencySummaries = getAgencySummaries(selectedMonth);

  return (
    <>
      <Header title="ダッシュボード" />
      <div className="space-y-6 p-6">
        <Suspense fallback={null}>
          <Filters
            agencies={getAgencies()}
            months={historicalMonths}
            units={getUnits()}
            currentMonth={selectedMonth}
            currentAgency={selectedAgency}
            currentUnit={selectedUnit}
          />
        </Suspense>

        <KpiCards
          totalReferrals={kpi.totalReferrals}
          referralRate={kpi.referralRate}
          targetAchievementRate={kpi.targetAchievementRate}
          activeStoreCount={kpi.activeStoreCount}
          totalTargetReferrals={kpi.totalTargetReferrals}
          totalBrokerage={kpi.totalBrokerage}
        />

        <TrendChart data={trends} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AgencyChart data={agencySummaries} />
          <TargetChart data={getMonthlyTrends(Object.keys(filters).length > 0 ? filters : undefined)} />
        </div>
      </div>
    </>
  );
}
