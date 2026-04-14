import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import Link from 'next/link';
import {
  getDashboardLayout,
  getAvailableMonths,
  isCurrentUserAdmin,
} from '@/lib/data/repository';
import { WidgetRenderer } from '@/components/dashboard/widgets/widget-renderer';
import { WidgetWrapper } from '@/components/dashboard/widgets/widget-wrapper';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [widgets, months, isAdmin] = await Promise.all([
    getDashboardLayout(),
    getAvailableMonths(),
    isCurrentUserAdmin(),
  ]);
  const historicalMonths = months.filter(m => m <= '2503');

  return (
    <>
      <Header title="ダッシュボード" />
      <div className="p-6">
        {isAdmin && (
          <div className="mb-4 flex justify-end">
            <Link href="/dashboard/edit">
              <Button variant="outline" size="sm">
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                編集
              </Button>
            </Link>
          </div>
        )}

        {widgets.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-sm text-gray-500">
            ダッシュボードが設定されていません。
            {isAdmin && (
              <div className="mt-3">
                <Link href="/dashboard/edit">
                  <Button size="sm">設定を始める</Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {widgets.map(widget => (
              <WidgetWrapper key={widget.id} widget={widget}>
                <WidgetRenderer widget={widget} historicalMonths={historicalMonths} />
              </WidgetWrapper>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
