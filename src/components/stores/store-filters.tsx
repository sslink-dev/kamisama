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

interface StoreFiltersProps {
  agencies: Agency[];
  units: string[];
  ranks: string[];
}

export function StoreFilters({ agencies, units, ranks }: StoreFiltersProps) {
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
      router.push(`/stores?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={searchParams.get('agency') || 'all'}
        onValueChange={v => updateParam('agency', v ?? 'all')}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="代理店" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全代理店</SelectItem>
          {agencies.map(a => (
            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('unit') || 'all'}
        onValueChange={v => updateParam('unit', v ?? 'all')}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="ユニット" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全ユニット</SelectItem>
          {units.map(u => (
            <SelectItem key={u} value={u}>{u}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('rank') || 'all'}
        onValueChange={v => updateParam('rank', v ?? 'all')}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="ランク" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全ランク</SelectItem>
          {ranks.map(r => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('ng') || 'all'}
        onValueChange={v => updateParam('ng', v ?? 'all')}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="NG状態" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全て</SelectItem>
          <SelectItem value="active">アクティブ</SelectItem>
          <SelectItem value="ng">NGのみ</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
