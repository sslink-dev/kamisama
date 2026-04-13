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
import { getStores, getNgReasons } from '@/lib/data/repository';
import { NgReasonChart } from './ng-reason-chart';

export default function NgPage() {
  const ngStores = getStores({ isNg: true });
  const reasons = getNgReasons();

  const reasonCounts = reasons.map(reason => ({
    reason,
    count: ngStores.filter(s => s.ngReason === reason).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <>
      <Header title="NG店舗管理" />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{ngStores.length}</div>
              <p className="text-sm text-gray-500">NG店舗数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{reasons.length}</div>
              <p className="text-sm text-gray-500">NG理由の種類</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {reasonCounts[0]?.reason || '-'}
              </div>
              <p className="text-sm text-gray-500">最多NG理由 ({reasonCounts[0]?.count || 0}件)</p>
            </CardContent>
          </Card>
        </div>

        <NgReasonChart data={reasonCounts} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">NG店舗一覧 ({ngStores.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>コード</TableHead>
                    <TableHead>店舗名</TableHead>
                    <TableHead>代理店</TableHead>
                    <TableHead>ユニット</TableHead>
                    <TableHead>NG理由</TableHead>
                    <TableHead>NG月</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ngStores.slice(0, 200).map(store => (
                    <TableRow key={store.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{store.code}</TableCell>
                      <TableCell>{store.name}</TableCell>
                      <TableCell>{store.agencyName}</TableCell>
                      <TableCell>{store.unit || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          {store.ngReason || '不明'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{store.ngMonth || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {ngStores.length > 200 && (
                <p className="mt-4 text-center text-sm text-gray-500">
                  先頭200件を表示中 (全{ngStores.length}件)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
