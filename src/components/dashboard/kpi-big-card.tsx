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

      {/* 数字行: items-baseline で件と % の baseline を左右で揃える */}
      <div className="relative">
        {/* center vertical divider — 全高に伸びる */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-100"
        />

        <div className="grid grid-cols-2 items-baseline gap-4">
          {/* LEFT: count + 件 */}
          <div className="flex items-baseline justify-center gap-1 pr-4">
            <span className="text-[44px] font-bold leading-none text-gray-800">
              {formatNumber(count)}
            </span>
            <span className="text-sm font-bold text-gray-500">件</span>
          </div>

          {/* RIGHT: rate + % (上段、ベースライン揃え用) */}
          <div className="flex items-baseline justify-center gap-1 pl-2">
            <span className="text-[44px] font-bold leading-none text-gray-800">
              {rate}
            </span>
            <span className="text-sm font-bold text-gray-500">%</span>
          </div>
        </div>

        {/* 右下のサブテキスト (左カラムには空セルを入れて右だけに表示) */}
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div />
          <div className="pr-1 text-right text-[10px] font-semibold text-gray-400">
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
