import { TargetChart } from '@/components/dashboard/target-chart';
import { getMonthlyTrends } from '@/lib/data/repository';
import type { Widget } from '@/lib/data/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function TargetWidget({ widget }: { widget: Widget }) {
  const filters = {
    ...(widget.config.agencyId ? { agencyId: widget.config.agencyId } : {}),
    ...(widget.config.unit ? { unit: widget.config.unit } : {}),
  };
  const hasFilters = Object.keys(filters).length > 0;
  const trends = await getMonthlyTrends(hasFilters ? filters : undefined);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-600">
          {widget.config.title || '目標 vs 実績'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TargetChart data={trends} />
      </CardContent>
    </Card>
  );
}
