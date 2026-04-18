import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import { getStoreById, getMetricsByStore } from '@/lib/data/repository';
import { StoreMetricsChart } from './store-metrics-chart';

export const dynamic = 'force-dynamic';

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await getStoreById(id);
  if (!store) notFound();

  const metrics = await getMetricsByStore(id);

  // TODO: 訪問履歴 (visits) は今後 DB 化。ここではダミーデータでデザインを再現
  const visits = [
    {
      date: '2026.01.23',
      visitors: [{ name: '田中 太郎' }],
      tags: ['実績共有', '初回挨拶'],
      log: '',
      highlighted: false,
    },
    {
      date: '2026.01.22',
      visitors: [{ name: '山田 一郎' }, { name: '佐藤 花子' }],
      tags: ['勉強会'],
      purposes: ['勉強会', 'インターネット回線基礎'],
      log: '',
      highlighted: true,
    },
  ];
  const selectedVisit = visits.find(v => v.highlighted) || visits[0];

  return (
    <div className="space-y-5 px-8 py-6">
      <Link href="/stores" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#F76FAB]">
        <ArrowLeft className="h-4 w-4" /> 店舗一覧に戻る
      </Link>

      {/* Top row: 店舗情報 + 月次推移 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2fr]">
        {/* 店舗情報 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3">
            <span className="inline-block rounded bg-[#F76FAB] px-3 py-1 text-xs font-bold text-white">
              店舗情報
            </span>
          </div>
          <dl className="divide-y divide-gray-100 text-sm">
            <Row label="コード" value={store.code} />
            <Row label="代理店" value={store.agencyName} />
            <Row label="企業名" value={store.companyName} />
            <Row label="ユニット" value={store.unit || '-'} />
            <Row label="ランク" value={store.rank || '-'} />
            <div className="flex items-center justify-between py-2.5">
              <span className="text-gray-500">NG状態</span>
              {store.isNg ? (
                <span className="rounded bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">NG</span>
              ) : (
                <span className="rounded bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">アクティブ</span>
              )}
            </div>
            <Row label="重点" value={store.isPriority ? 'YES' : '-'} />
          </dl>
        </div>

        {/* 月次推移 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3">
            <span className="inline-block rounded bg-[#F76FAB] px-3 py-1 text-xs font-bold text-white">
              月次推移
            </span>
          </div>
          <StoreMetricsChart metrics={metrics} />
        </div>
      </div>

      {/* Bottom row: 訪問履歴 + 訪問詳細 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 訪問履歴 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4">
            <span className="inline-block rounded bg-[#F76FAB] px-3 py-1 text-xs font-bold text-white">
              訪問履歴
            </span>
          </div>
          <div className="space-y-3">
            {visits.map((v, idx) => (
              <div
                key={idx}
                className={
                  'rounded-xl border p-4 ' +
                  (v.highlighted ? 'border-[#F76FAB] bg-pink-50/30' : 'border-gray-100 bg-white')
                }
              >
                <div className="mb-3 text-sm font-medium text-gray-700">{v.date}</div>
                {v.visitors.map((vis, vi) => (
                  <div key={vi} className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                      <User className="h-4 w-4" />
                    </span>
                    <span className="text-sm text-gray-700">{vis.name}</span>
                    {vi === 0 && v.tags && (
                      <div className="ml-auto flex gap-1.5">
                        {v.tags.map(t => (
                          <span key={t} className="rounded bg-blue-50 px-2.5 py-0.5 text-xs text-blue-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 訪問詳細 */}
        <div className="rounded-2xl bg-pink-50/40 p-5 shadow-sm">
          <div className="mb-4">
            <span className="inline-block rounded bg-[#F76FAB] px-3 py-1 text-xs font-bold text-white">
              訪問詳細
            </span>
          </div>
          {selectedVisit && (
            <dl className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <dt className="w-20 text-gray-600">訪問日</dt>
                <dd className="text-gray-800">{selectedVisit.date}</dd>
              </div>
              <div className="flex items-start gap-3">
                <dt className="w-20 text-gray-600">訪問者</dt>
                <dd className="flex flex-wrap gap-3">
                  {selectedVisit.visitors.map((v, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                        <User className="h-4 w-4" />
                      </span>
                      <span className="text-gray-700">{v.name}</span>
                    </span>
                  ))}
                </dd>
              </div>
              <div className="flex items-start gap-3">
                <dt className="w-20 text-gray-600">訪問目的</dt>
                <dd className="flex flex-wrap items-center gap-3">
                  {(selectedVisit.purposes || selectedVisit.tags || []).map((p, i) => (
                    i === 0 ? (
                      <span key={i} className="rounded bg-blue-50 px-2.5 py-1 text-xs text-blue-600">{p}</span>
                    ) : (
                      <span key={i} className="text-blue-600 underline">{p}</span>
                    )
                  ))}
                </dd>
              </div>
              <div className="flex items-start gap-3">
                <dt className="w-20 text-gray-600">応対ログ</dt>
                <dd className="flex-1">
                  <div className="min-h-[80px] rounded-lg border border-gray-100 bg-white p-3 text-gray-700">
                    {selectedVisit.log || ''}
                  </div>
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
