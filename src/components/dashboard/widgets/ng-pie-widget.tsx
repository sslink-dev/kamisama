import { getStores, getNgReasons } from '@/lib/data/repository';
import type { Widget } from '@/lib/data/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NgReasonChart } from '@/app/(authenticated)/ng/ng-reason-chart';

export async function NgPieWidget({ widget }: { widget: Widget }) {
  const [ngStores, reasons] = await Promise.all([
    getStores({ isNg: true }),
    getNgReasons(),
  ]);

  const reasonCounts = reasons
    .map(reason => ({
      reason,
      count: ngStores.filter(s => s.ngReason === reason).length,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-600">
          {widget.config.title || 'NG理由の内訳'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <NgReasonChart data={reasonCounts} />
      </CardContent>
    </Card>
  );
}
