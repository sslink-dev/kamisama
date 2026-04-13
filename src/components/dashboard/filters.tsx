'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Agency } from '@/lib/data/types';
import { formatYearMonthLong } from '@/lib/utils/year-month';

interface DashboardFiltersProps {
  agencies: Agency[];
  months: string[];
  units: string[];
  currentMonth: string;
  currentAgency: string;
  currentUnit: string;
}

export function DashboardFilters({
  agencies,
  months,
  units,
  currentMonth,
  currentAgency,
  currentUnit,
}: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={currentMonth} onValueChange={v => updateParam('month', v ?? 'all')}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="期間を選択" />
        </SelectTrigger>
        <SelectContent>
          {months.map(m => (
            <SelectItem key={m} value={m}>
              {formatYearMonthLong(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentAgency} onValueChange={v => updateParam('agency', v ?? 'all')}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="代理店" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全代理店</SelectItem>
          {agencies.map(a => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentUnit} onValueChange={v => updateParam('unit', v ?? 'all')}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="ユニット" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全ユニット</SelectItem>
          {units.map(u => (
            <SelectItem key={u} value={u}>
              {u}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
