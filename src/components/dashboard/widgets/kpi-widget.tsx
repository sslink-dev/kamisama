import { KpiCards } from '@/components/dashboard/kpi-cards';
import { getKpiSummary } from '@/lib/data/repository';
import { getLatestMonth, formatYearMonthLong } from '@/lib/utils/year-month';
import type { Widget } from '@/lib/data/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function KpiWidget({
  widget,
  historicalMonths,
}: {
  widget: Widget;
  historicalMonths: string[];
}) {
  const month = widget.config.month || getLatestMonth(historicalMonths);
  const kpi = await getKpiSummary(month);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-600">
          {widget.config.title || 'KPIサマリー'}
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({formatYearMonthLong(month)})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <KpiCards
          totalReferrals={kpi.totalReferrals}
          referralRate={kpi.referralRate}
          targetAchievementRate={kpi.targetAchievementRate}
          activeStoreCount={kpi.activeStoreCount}
          totalTargetReferrals={kpi.totalTargetReferrals}
          totalBrokerage={kpi.totalBrokerage}
        />
      </CardContent>
    </Card>
  );
}
