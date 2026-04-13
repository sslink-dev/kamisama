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
import { getMonthlyTrends } from '@/lib/data/repository';
import { formatYearMonthLong, formatNumber, formatPercent } from '@/lib/utils/year-month';

export const dynamic = 'force-dynamic';

export default async function TargetsPage() {
  const trends = (await getMonthlyTrends()).filter(t => t.totalTargetReferrals > 0);

  return (
    <>
      <Header title="目標管理" />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">月別 目標 vs 実績</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>月</TableHead>
                  <TableHead className="text-right">目標取次数</TableHead>
                  <TableHead className="text-right">実績取次数</TableHead>
                  <TableHead className="text-right">差分</TableHead>
                  <TableHead className="text-right">達成率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trends.map(t => {
                  const gap = t.totalReferrals - t.totalTargetReferrals;
                  const achievement = t.totalTargetReferrals > 0
                    ? t.totalReferrals / t.totalTargetReferrals
                    : 0;
                  return (
                    <TableRow key={t.yearMonth}>
                      <TableCell className="font-medium">
                        {formatYearMonthLong(t.yearMonth)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(t.totalTargetReferrals)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(t.totalReferrals)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {gap >= 0 ? '+' : ''}{formatNumber(gap)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          achievement >= 1 ? 'bg-green-100 text-green-800' :
                          achievement >= 0.8 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {formatPercent(achievement)}
                        </span>
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
