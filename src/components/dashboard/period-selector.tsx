'use client';

import { ChevronDown } from 'lucide-react';
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
    <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-2 shadow-sm">
      <span className="text-xs font-bold text-gray-500">期間</span>
      <div className="relative">
        <select
          value={current}
          onChange={handleChange}
          className="appearance-none border-0 bg-transparent pr-5 text-sm font-bold text-gray-700 focus:outline-none"
        >
          {months.length === 0 && <option value="">-</option>}
          {months.map(m => (
            <option key={m} value={m}>{formatYearMonth(m)}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
      </div>
    </div>
  );
}
