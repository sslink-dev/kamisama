import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { getStoreById, getMetricsByStore } from '@/lib/data/repository';
import { StoreMetricsChart } from './store-metrics-chart';

const rankColors: Record<string, string> = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-red-100 text-red-800',
  NG: 'bg-gray-100 text-gray-800',
};

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = getStoreById(id);
  if (!store) notFound();

  const metrics = getMetricsByStore(id);

  return (
    <>
      <Header title={store.name} />
      <div className="space-y-6 p-6">
        <Link href="/stores">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> 店舗一覧に戻る
          </Button>
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">店舗情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="コード" value={store.code} />
              <InfoRow label="代理店" value={store.agencyName} />
              <InfoRow label="企業名" value={store.companyName} />
              <InfoRow label="ユニット" value={store.unit || '-'} />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">ランク</span>
                {store.rank ? (
                  <Badge variant="outline" className={rankColors[store.rank] || ''}>
                    {store.rank}
                  </Badge>
                ) : (
                  <span className="text-sm">-</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">NG状態</span>
                {store.isNg ? (
                  <Badge variant="destructive">NG</Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    アクティブ
                  </Badge>
                )}
              </div>
              {store.ngReason && <InfoRow label="NG理由" value={store.ngReason} />}
              {store.ngMonth && <InfoRow label="NG月" value={store.ngMonth} />}
              {store.companyFlag && <InfoRow label="企業フラグ" value={store.companyFlag} />}
              <InfoRow label="重点" value={store.isPriority ? 'YES' : '-'} />
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <StoreMetricsChart metrics={metrics} />
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
