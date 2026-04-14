import Link from 'next/link';
import { getAgencySummaries, getStoresWithLatestMetrics } from '@/lib/data/repository';
import { getLatestMonth } from '@/lib/utils/year-month';
import { formatNumber, formatPercent } from '@/lib/utils/year-month';
import type { Widget } from '@/lib/data/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function RankingWidget({
  widget,
  historicalMonths,
}: {
  widget: Widget;
  historicalMonths: string[];
}) {
  const limit = widget.config.limit || 10;
  const rankingType = widget.config.rankingType || 'agency_by_referrals';
  const month = widget.config.month || getLatestMonth(historicalMonths);

  let rows: { label: string; value: string; sub?: string; href?: string }[] = [];
  let title = widget.config.title || '';

  if (rankingType === 'agency_by_referrals') {
    title = title || '代理店 取次数 TOP';
    const summaries = await getAgencySummaries(month);
    rows = summaries
      .filter(s => s.totalReferrals > 0)
      .sort((a, b) => b.totalReferrals - a.totalReferrals)
      .slice(0, limit)
      .map(s => ({
        label: s.agencyName,
        value: formatNumber(s.totalReferrals),
        sub: `取次率 ${formatPercent(s.avgReferralRate)}`,
      }));
  } else if (rankingType === 'store_by_referrals') {
    title = title || '店舗 取次数 TOP';
    const stores = await getStoresWithLatestMetrics(undefined, month);
    rows = stores
      .filter(s => !s.isNg && (s.latestMetrics?.referrals ?? 0) > 0)
      .sort((a, b) => (b.latestMetrics?.referrals ?? 0) - (a.latestMetrics?.referrals ?? 0))
      .slice(0, limit)
      .map(s => ({
        label: s.name,
        value: formatNumber(s.latestMetrics?.referrals ?? 0),
        sub: s.agencyName,
        href: `/stores/${s.id}`,
      }));
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400">データがありません</p>
        ) : (
          <ol className="space-y-2">
            {rows.map((r, i) => {
              const Body = (
                <div className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-gray-50">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{r.label}</div>
                      {r.sub && <div className="truncate text-xs text-gray-500">{r.sub}</div>}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-blue-600">{r.value}</div>
                </div>
              );
              return (
                <li key={i}>
                  {r.href ? <Link href={r.href}>{Body}</Link> : Body}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
