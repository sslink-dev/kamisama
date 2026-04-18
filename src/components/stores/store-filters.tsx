'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { Agency } from '@/lib/data/types';

interface StoreClientFiltersProps {
  agencies: Agency[];
  units: string[];
  ranks: string[];
  flags: string[];
  reasons: string[];
  companies: { id: string; name: string }[];
}

const ALL = '__ALL__';

export function StoreClientFilters({
  agencies, units, ranks, flags, reasons, companies,
}: StoreClientFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === ALL || !value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/stores?${params.toString()}`);
    },
    [router, searchParams]
  );

  const resetAll = useCallback(() => {
    router.push('/stores');
  }, [router]);

  const agencyMap = useMemo(() => new Map(agencies.map(a => [a.id, a.name])), [agencies]);
  const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c.name])), [companies]);

  const hasAnyFilter = Array.from(searchParams.keys()).length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <Select
        value={searchParams.get('agency') ?? undefined}
        onValueChange={v => updateParam('agency', v ?? ALL)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="代理店 (全て)">
            {v => (v && v !== ALL ? agencyMap.get(v as string) || '代理店' : '代理店 (全て)')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全代理店</SelectItem>
          {agencies.map(a => (
            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('unit') ?? undefined}
        onValueChange={v => updateParam('unit', v ?? ALL)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="ユニット (全て)">
            {v => (v && v !== ALL ? (v as string) : 'ユニット (全て)')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全ユニット</SelectItem>
          {units.map(u => (
            <SelectItem key={u} value={u}>{u}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('rank') ?? undefined}
        onValueChange={v => updateParam('rank', v ?? ALL)}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="ランク (全て)">
            {v => (v && v !== ALL ? (v as string) : 'ランク (全て)')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全ランク</SelectItem>
          {ranks.map(r => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('flag') ?? undefined}
        onValueChange={v => updateParam('flag', v ?? ALL)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="企業フラグ (全て)">
            {v => (v && v !== ALL ? (v as string) : '企業フラグ (全て)')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全企業フラグ</SelectItem>
          {flags.map(f => (
            <SelectItem key={f} value={f}>{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('ng') ?? undefined}
        onValueChange={v => updateParam('ng', v ?? ALL)}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="NG状態">
            {v => v === 'ng' ? 'NGのみ' : v === 'active' ? 'アクティブ' : 'NG状態'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全て</SelectItem>
          <SelectItem value="active">アクティブ</SelectItem>
          <SelectItem value="ng">NGのみ</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('reason') ?? undefined}
        onValueChange={v => updateParam('reason', v ?? ALL)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="NG理由 (全て)">
            {v => (v && v !== ALL ? (v as string) : 'NG理由 (全て)')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>全NG理由</SelectItem>
          {reasons.map(r => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('priority') ?? undefined}
        onValueChange={v => updateParam('priority', v ?? ALL)}
      >
        <SelectTrigger className="w-28">
          <SelectValue placeholder="重点">
            {v => v === '1' ? '重点のみ' : '重点'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>重点全て</SelectItem>
          <SelectItem value="1">重点のみ</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('priorityQ3') ?? undefined}
        onValueChange={v => updateParam('priorityQ3', v ?? ALL)}
      >
        <SelectTrigger className="w-28">
          <SelectValue placeholder="3Q重点">
            {v => v === '1' ? '3Q重点のみ' : '3Q重点'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>3Q全て</SelectItem>
          <SelectItem value="1">3Q重点のみ</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('company') ?? undefined}
        onValueChange={v => updateParam('company', v ?? ALL)}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="企業名 (全て)">
            {v => (v && v !== ALL ? companyMap.get(v as string) || '企業名' : '企業名 (全て)')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value={ALL}>全企業</SelectItem>
          {companies.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasAnyFilter && (
        <Button variant="outline" size="sm" onClick={resetAll}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          リセット
        </Button>
      )}
    </div>
  );
}
