import { formatNumber } from '@/lib/utils/year-month';

interface KpiBigCardProps {
  label: string;
  count: number;
  rate: number;
  subLabel: string;
  subValue: number;
}

export function KpiBigCard({ label, count, rate, subLabel, subValue }: KpiBigCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      {/* Pink badge label */}
      <div className="mb-3">
        <span className="inline-block rounded bg-[#F76FAB] px-3 py-1 text-xs font-bold text-white">
          {label}
        </span>
      </div>

      {/* Two-column: count | rate */}
      <div className="grid grid-cols-2 items-end gap-2">
        <div className="border-r border-gray-100 pr-4">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-light text-gray-800">{formatNumber(count)}</span>
            <span className="text-sm text-gray-500">件</span>
          </div>
        </div>
        <div className="pl-4 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-light text-gray-800">{rate}</span>
            <span className="text-sm text-gray-500">%</span>
          </div>
          <div className="mt-1 text-[10px] text-gray-400">
            {subLabel}：{formatNumber(subValue)}
          </div>
        </div>
      </div>
    </div>
  );
}

interface KpiSmallCardProps {
  label: string;
  count: number;
}

export function KpiSmallCard({ label, count }: KpiSmallCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2">
        <span className="inline-block rounded bg-[#F76FAB] px-2.5 py-0.5 text-[11px] font-bold text-white">
          {label}
        </span>
      </div>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-3xl font-light text-gray-800">{formatNumber(count)}</span>
        <span className="text-xs text-gray-500">件</span>
      </div>
    </div>
  );
}
