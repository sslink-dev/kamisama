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
    <div className="rounded-2xl bg-white px-6 py-5 shadow-sm">
      {/* Pink badge label */}
      <div className="mb-4">
        <span className="inline-flex items-center justify-center rounded-md bg-[#F76FAB] px-3 py-1 text-xs font-extrabold tracking-wide text-white">
          {label}
        </span>
      </div>

      {/* Two-column: count | rate */}
      <div className="grid grid-cols-2 items-end gap-4">
        <div className="flex items-baseline justify-center gap-1 border-r border-gray-100 pr-4">
          <span className="text-[44px] font-bold leading-none text-gray-800">
            {formatNumber(count)}
          </span>
          <span className="text-sm font-bold text-gray-500">件</span>
        </div>
        <div className="pl-2 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-[44px] font-bold leading-none text-gray-800">{rate}</span>
            <span className="text-sm font-bold text-gray-500">%</span>
          </div>
          <div className="mt-2 text-right text-[10px] font-semibold text-gray-400">
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
    <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
      <div className="mb-2">
        <span className="inline-flex items-center justify-center rounded-md bg-[#F76FAB] px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-white">
          {label}
        </span>
      </div>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-3xl font-bold leading-none text-gray-800">{formatNumber(count)}</span>
        <span className="text-xs font-bold text-gray-500">件</span>
      </div>
    </div>
  );
}
