'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { Agency } from '@/lib/data/types';

interface ActiveFilterChipsProps {
  agencies: Agency[];
  companies: { id: string; name: string }[];
}

export function ActiveFilterChips({ agencies, companies }: ActiveFilterChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const removeParam = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      router.push(`/stores?${params.toString()}`);
    },
    [router, searchParams]
  );

  const chips: { key: string; label: string; value: string }[] = [];

  const agency = searchParams.get('agency');
  if (agency) {
    const a = agencies.find(x => x.id === agency);
    chips.push({ key: 'agency', label: '代理店', value: a?.name || agency });
  }
  const unit = searchParams.get('unit');
  if (unit) chips.push({ key: 'unit', label: 'ユニット', value: unit });

  const rank = searchParams.get('rank');
  if (rank) chips.push({ key: 'rank', label: 'ランク', value: rank });

  const flag = searchParams.get('flag');
  if (flag) chips.push({ key: 'flag', label: '企業フラグ', value: flag });

  const ng = searchParams.get('ng');
  if (ng) chips.push({ key: 'ng', label: 'NG状態', value: ng === 'ng' ? 'NGのみ' : 'アクティブ' });

  const reason = searchParams.get('reason');
  if (reason) chips.push({ key: 'reason', label: 'NG理由', value: reason });

  const priority = searchParams.get('priority');
  if (priority === '1') chips.push({ key: 'priority', label: '重点', value: '重点のみ' });

  const priorityQ3 = searchParams.get('priorityQ3');
  if (priorityQ3 === '1') chips.push({ key: 'priorityQ3', label: '3Q重点', value: '3Q重点のみ' });

  const company = searchParams.get('company');
  if (company) {
    const c = companies.find(x => x.id === company);
    chips.push({ key: 'company', label: '企業', value: c?.name || company });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500">適用中のフィルター:</span>
      {chips.map(chip => (
        <Badge
          key={chip.key}
          variant="outline"
          className="gap-1 bg-blue-50 pr-1 text-blue-700 hover:bg-blue-100"
        >
          <span className="text-[10px] text-blue-500">{chip.label}:</span>
          <span>{chip.value}</span>
          <button
            onClick={() => removeParam(chip.key)}
            className="ml-0.5 rounded p-0.5 hover:bg-blue-200"
            aria-label={`${chip.label}フィルターを削除`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
