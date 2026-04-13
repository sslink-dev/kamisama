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
import { getAgencySummaries } from '@/lib/data/repository';
import { formatPercent, formatNumber } from '@/lib/utils/year-month';
import { AgencyComparisonChart } from './agency-comparison-chart';

export const dynamic = 'force-dynamic';

export default async function AgenciesPage() {
  const summaries = (await getAgencySummaries())
    .sort((a, b) => b.totalReferrals - a.totalReferrals);

  return (
    <>
      <Header title="代理店分析" />
      <div className="space-y-6 p-6">
        <AgencyComparisonChart data={summaries} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">代理店サマリ (全期間累計)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>代理店名</TableHead>
                  <TableHead className="text-right">店舗数</TableHead>
                  <TableHead className="text-right">アクティブ</TableHead>
                  <TableHead className="text-right">NG</TableHead>
                  <TableHead className="text-right">取次数</TableHead>
                  <TableHead className="text-right">仲介数</TableHead>
                  <TableHead className="text-right">取次率</TableHead>
                  <TableHead className="text-right">目標達成率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map(s => (
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
                    <TableCell className="text-right">{formatNumber(s.totalBrokerage)}</TableCell>
                    <TableCell className="text-right">{formatPercent(s.avgReferralRate)}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
