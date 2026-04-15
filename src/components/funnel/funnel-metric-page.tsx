import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAgencySummaries, getAvailableMonths, getMonthlyTrends, getKpiSummary } from '@/lib/data/repository';
import { formatNumber, formatYearMonthLong } from '@/lib/utils/year-month';
import type { FunnelMetric } from '@/lib/data/types';
import { FunnelTrendChart } from './funnel-trend-chart';
import { FunnelAgencyBar } from './funnel-agency-bar';

export interface FunnelPageConfig {
  metric: FunnelMetric;
  title: string;
  /** サマリーカードの色テーマ (tailwind) */
  color: 'blue' | 'amber' | 'emerald';
  description: string;
}

const COLOR_MAP: Record<FunnelPageConfig['color'], { bg: string; text: string; stroke: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    stroke: '#3b82f6' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   stroke: '#f59e0b' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', stroke: '#10b981' },
};

const METRIC_ACCESS: Record<FunnelMetric, {
  trend: 'totalReferrals' | 'totalConnections' | 'totalBrokerage';
  agency: 'totalReferrals' | 'totalConnections' | 'totalBrokerage';
  kpi: 'totalReferrals' | 'totalConnections' | 'totalBrokerage';
}> = {
  referrals:   { trend: 'totalReferrals',   agency: 'totalReferrals',   kpi: 'totalReferrals' },
  connections: { trend: 'totalConnections', agency: 'totalConnections', kpi: 'totalConnections' },
  brokerage:   { trend: 'totalBrokerage',   agency: 'totalBrokerage',   kpi: 'totalBrokerage' },
};

export async function FunnelMetricPage({ metric, title, color, description }: FunnelPageConfig) {
  const [summaries, trends, months] = await Promise.all([
    getAgencySummaries(),
    getMonthlyTrends(),
    getAvailableMonths(),
  ]);

  const access = METRIC_ACCESS[metric];
  const theme = COLOR_MAP[color];

  const latestMonth = months[months.length - 1];
  const latestKpi = latestMonth ? await getKpiSummary(latestMonth) : null;
  const latestValue = latestKpi ? latestKpi[access.kpi] : 0;

  // トレンド: 表示対象の月次推移
  const historicalTrends = trends.filter(t => t.yearMonth <= '2503');

  // 前月比
  const prevMonthValue = historicalTrends.length >= 2
    ? historicalTrends[historicalTrends.length - 2][access.trend]
    : 0;
  const currentMonthValue = historicalTrends.length >= 1
    ? historicalTrends[historicalTrends.length - 1][access.trend]
    : 0;
  const momDelta = currentMonthValue - prevMonthValue;
  const momRate = prevMonthValue > 0 ? (momDelta / prevMonthValue) * 100 : 0;

  // 代理店ランキング (指標値で降順)
  const rankedAgencies = [...summaries]
    .sort((a, b) => b[access.agency] - a[access.agency]);

  // 全期間合計
  const totalSum = summaries.reduce((sum, s) => sum + s[access.agency], 0);

  return (
    <>
      <Header title={title} />
      <div className="space-y-6 p-6">
        {/* 説明 */}
        <div className={`rounded-lg border ${theme.bg} p-3 text-sm ${theme.text}`}>
          {description}
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-500">
                {latestMonth ? `${formatYearMonthLong(latestMonth)} の${title}` : `最新月の${title}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${theme.text}`}>
                {formatNumber(latestValue)}
              </div>
              {latestMonth && (
                <div className="mt-1 text-xs text-gray-500">件 · 全代理店合計</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-500">前月比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${momDelta > 0 ? 'text-green-600' : momDelta < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {momDelta >= 0 ? '+' : ''}{formatNumber(momDelta)}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                ({momRate >= 0 ? '+' : ''}{momRate.toFixed(1)}%)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-gray-500">全期間累計</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {formatNumber(totalSum)}
              </div>
              <div className="mt-1 text-xs text-gray-500">件 · 対象代理店数 {summaries.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* 月次推移 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">月次推移</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelTrendChart data={historicalTrends} dataKey={access.trend} color={theme.stroke} label={title} />
          </CardContent>
        </Card>

        {/* 代理店ランキング (棒) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">代理店別 (累計)</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelAgencyBar
              data={rankedAgencies.slice(0, 15).map(a => ({
                name: a.agencyName,
                value: a[access.agency],
              }))}
              color={theme.stroke}
              label={title}
            />
          </CardContent>
        </Card>

        {/* 店舗テーブル = 代理店サマリテーブル (フィルタ: 対象指標) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">代理店ランキング</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">順位</TableHead>
                  <TableHead>代理店名</TableHead>
                  <TableHead className="text-right">店舗数</TableHead>
                  <TableHead className="text-right">アクティブ</TableHead>
                  <TableHead className="text-right">{title}</TableHead>
                  <TableHead className="text-right">全体に占める割合</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedAgencies.map((s, i) => {
                  const v = s[access.agency];
                  const pct = totalSum > 0 ? (v / totalSum) * 100 : 0;
                  return (
                    <TableRow key={s.agencyId} className="hover:bg-gray-50">
                      <TableCell className="text-gray-500">#{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.agencyName}</TableCell>
                      <TableCell className="text-right">{formatNumber(s.storeCount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(s.activeStoreCount)}</TableCell>
                      <TableCell className={`text-right font-medium ${theme.text}`}>
                        {formatNumber(v)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-gray-500">
                        {pct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
