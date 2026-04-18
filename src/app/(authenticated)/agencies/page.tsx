import { getAgencySummaries, getAvailableMonths } from '@/lib/data/repository';
import { CANONICAL_AGENCIES } from '@/lib/data/canonical-agencies';
import type { AgencySummary } from '@/lib/data/types';
import { formatPercent, formatNumber } from '@/lib/utils/year-month';
import { AgencyComparisonChart } from './agency-comparison-chart';
import { PeriodSelector } from '@/components/dashboard/period-selector';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ month?: string }>;
}

function emptySummary(agencyId: string, agencyName: string): AgencySummary {
  return {
    agencyId,
    agencyName,
    storeCount: 0,
    activeStoreCount: 0,
    ngStoreCount: 0,
    totalReferrals: 0,
    totalConnections: 0,
    totalBrokerage: 0,
    avgReferralRate: 0,
    totalTargetReferrals: 0,
    targetAchievementRate: 0,
  };
}

export default async function AgenciesPage({ searchParams }: Props) {
  const params = await searchParams;
  const months = await getAvailableMonths();
  const selectedMonth = params.month || undefined;

  const fetched = await getAgencySummaries(selectedMonth);
  const fetchedMap = new Map(fetched.map(s => [s.agencyId, s]));

  // 正規 11 代理店すべてを表示 (データが無い代理店も 0 件で行を出す)
  const summaries: AgencySummary[] = CANONICAL_AGENCIES.map(a =>
    fetchedMap.get(a.id) ?? emptySummary(a.id, a.name)
  );

  return (
    <div className="space-y-5 px-8 py-6">
      {/* Section: 代理店比較 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <h2 className="text-base font-extrabold tracking-[0.3em] text-gray-700">代理店比較</h2>
            <span className="text-sm tracking-[0.2em] text-gray-500">取次 / 通電 / 成約</span>
          </div>
          <PeriodSelector months={months} current={selectedMonth || ''} />
        </div>

        <div className="grid grid-cols-[180px_1fr] gap-0 border-t border-gray-100 pt-3">
          {/* Agency name list */}
          <ul className="space-y-3 border-r border-gray-100 py-2 pr-2 text-sm text-gray-700">
            {summaries.map(s => (
              <li key={s.agencyId} className="truncate" title={s.agencyName}>
                {s.agencyName}
              </li>
            ))}
          </ul>

          {/* Chart area */}
          <div className="pl-4">
            <AgencyComparisonChart data={summaries} />
            <div className="mt-3 flex items-center justify-end gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#1f3a8a]" />取次数
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#60a5fa]" />通電数
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-[#F76FAB]" />成約数
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section: 代理店一覧 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-extrabold tracking-[0.3em] text-gray-700">代理店一覧</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm text-gray-500">
                <th className="py-3 pl-3 font-normal">代理店名</th>
                <th className="py-3 font-normal">取次数</th>
                <th className="py-3 font-normal">通電数</th>
                <th className="py-3 font-normal">成約数</th>
                <th className="py-3 font-normal">成約率</th>
                <th className="py-3 font-normal">店舗数</th>
                <th className="py-3 pr-3 font-normal">アクティブ</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map(s => {
                const contractRate = s.totalReferrals > 0
                  ? s.totalBrokerage / s.totalReferrals : 0;
                return (
                  <tr key={s.agencyId} className="border-b border-gray-50 text-sm hover:bg-pink-50/30">
                    <td className="py-3 pl-3 font-bold text-gray-800">{s.agencyName}</td>
                    <td className="py-3 text-gray-700">{formatNumber(s.totalReferrals)}</td>
                    <td className="py-3 text-gray-700">{formatNumber(s.totalConnections)}</td>
                    <td className="py-3 text-gray-700">{formatNumber(s.totalBrokerage)}</td>
                    <td className="py-3 text-gray-700">{formatPercent(contractRate)}</td>
                    <td className="py-3 text-gray-700">{s.storeCount}</td>
                    <td className="py-3 pr-3 text-gray-700">{s.activeStoreCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
