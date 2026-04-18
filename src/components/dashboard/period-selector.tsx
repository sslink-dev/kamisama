'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { formatYearMonth } from '@/lib/utils/year-month';

interface Props {
  months: string[];
  current: string;
}

export function PeriodSelector({ months, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(params);
    next.set('month', e.target.value);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
      <span className="text-xs text-gray-500">期間</span>
      <select
        value={current}
        onChange={handleChange}
        className="border-0 bg-transparent text-sm text-gray-700 focus:outline-none"
      >
        {months.length === 0 && <option value="">-</option>}
        {months.map(m => (
          <option key={m} value={m}>{formatYearMonth(m)}</option>
        ))}
      </select>
    </div>
  );
}
