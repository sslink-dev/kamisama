'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { formatYearMonthLong } from '@/lib/utils/year-month';

interface Props {
  months: string[];
  current?: string;
}

export function MonthSelector({ months, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (v === '__ALL__') {
      params.delete('month');
    } else {
      params.set('month', v);
    }
    router.push(`/agencies?${params.toString()}`);
  };

  return (
    <select
      value={current || '__ALL__'}
      onChange={handleChange}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="__ALL__">全期間累計</option>
      {[...months].reverse().map(m => (
        <option key={m} value={m}>{formatYearMonthLong(m)}</option>
      ))}
    </select>
  );
}
