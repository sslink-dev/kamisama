import { AgencyChart } from '@/components/dashboard/agency-chart';
import { getAgencySummaries } from '@/lib/data/repository';
import { getLatestMonth } from '@/lib/utils/year-month';
import type { Widget } from '@/lib/data/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function AgencyWidget({
  widget,
  historicalMonths,
}: {
  widget: Widget;
  historicalMonths: string[];
}) {
  const month = widget.config.month || getLatestMonth(historicalMonths);
  const summaries = await getAgencySummaries(month);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-600">
          {widget.config.title || '代理店ランキング'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AgencyChart data={summaries} />
      </CardContent>
    </Card>
  );
}
