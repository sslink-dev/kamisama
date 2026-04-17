import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAgencySummaries, getAvailableMonths } from '@/lib/data/repository';
import { formatPercent, formatNumber, formatYearMonthLong } from '@/lib/utils/year-month';
import { AgencyComparisonChart } from './agency-comparison-chart';
import { MonthSelector } from './month-selector';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function AgenciesPage({ searchParams }: Props) {
  const params = await searchParams;
  const months = await getAvailableMonths();
  const selectedMonth = params.month || undefined; // undefined = 全期間

  const summaries = (await getAgencySummaries(selectedMonth))
    .sort((a, b) => b.totalReferrals - a.totalReferrals);

  const periodLabel = selectedMonth
    ? formatYearMonthLong(selectedMonth)
    : '全期間累計';

  return (
    <>
      <Header title="企業分析" />
      <div className="space-y-6 p-6">
        {/* 月選択 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-500">
            対象期間: <span className="font-medium text-gray-900">{periodLabel}</span>
          </div>
          <MonthSelector months={months} current={selectedMonth} />
        </div>

        <AgencyComparisonChart data={summaries} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">企業サマリ ({periodLabel})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>企業名</TableHead>
                  <TableHead className="text-right">店舗数</TableHead>
                  <TableHead className="text-right">アクティブ</TableHead>
                  <TableHead className="text-right">NG</TableHead>
                  <TableHead className="text-right">取次数</TableHead>
                  <TableHead className="text-right">通電数</TableHead>
                  <TableHead className="text-right">成約数</TableHead>
                  <TableHead className="text-right">成約率</TableHead>
                  <TableHead className="text-right">目標達成率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500">
                      データがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  summaries.map(s => {
                    const contractRate = s.totalReferrals > 0
                      ? s.totalBrokerage / s.totalReferrals
                      : 0;
                    return (
                      <TableRow key={s.agencyId} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{s.agencyName}</TableCell>
                        <TableCell className="text-right">{s.storeCount}</TableCell>
                        <TableCell className="text-right">{s.activeStoreCount}</TableCell>
                        <TableCell className="text-right">
                          {s.ngStoreCount > 0 && (
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              {s.ngStoreCount}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(s.totalReferrals)}</TableCell>
                        <TableCell className="text-right">{formatNumber(s.totalConnections)}</TableCell>
                        <TableCell className="text-right">{formatNumber(s.totalBrokerage)}</TableCell>
                        <TableCell className="text-right">{formatPercent(contractRate)}</TableCell>
                        <TableCell className="text-right">
                          <span className={
                            s.targetAchievementRate >= 1 ? 'text-green-600 font-medium' :
                            s.targetAchievementRate >= 0.8 ? 'text-yellow-600' :
                            s.targetAchievementRate > 0 ? 'text-red-600' : 'text-gray-400'
                          }>
                            {s.totalTargetReferrals > 0 ? formatPercent(s.targetAchievementRate) : '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
