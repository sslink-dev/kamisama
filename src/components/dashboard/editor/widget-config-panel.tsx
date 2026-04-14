'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import type { Widget, WidgetSize } from '@/lib/data/types';
import { formatYearMonthLong } from '@/lib/utils/year-month';
import { WIDGET_TYPE_LABELS } from '@/components/dashboard/widgets/widget-labels';

const NONE = '__NONE__';

interface Props {
  widget: Widget;
  agencies: { id: string; name: string }[];
  units: string[];
  historicalMonths: string[];
  onChange: (next: Partial<Widget>) => void;
  onClose: () => void;
}

export function WidgetConfigPanel({
  widget,
  agencies,
  units,
  historicalMonths,
  onChange,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setConfig = (patch: Partial<Widget['config']>) => {
    onChange({ config: { ...widget.config, ...patch } });
  };

  const showMonth = ['kpi_summary', 'agency_chart', 'ranking_list'].includes(widget.type);
  const showAgencyUnit = ['trend_chart', 'target_chart'].includes(widget.type);
  const showLimit = widget.type === 'ranking_list';
  const showRankingType = widget.type === 'ranking_list';

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30" onClick={onClose}>
      <Card className="m-4 w-full max-w-sm overflow-auto" onClick={e => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">ウィジェット設定</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">タイプ</label>
            <div className="rounded bg-gray-50 px-3 py-2 text-sm">
              {WIDGET_TYPE_LABELS[widget.type]}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">タイトル</label>
            <Input
              value={widget.config.title || ''}
              onChange={e => setConfig({ title: e.target.value })}
              placeholder={WIDGET_TYPE_LABELS[widget.type]}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">サイズ</label>
            <Select
              value={widget.size}
              onValueChange={v => onChange({ size: (v ?? 'full') as WidgetSize })}
            >
              <SelectTrigger>
                <SelectValue>
                  {v => v === 'third' ? '1/3 幅' : v === 'half' ? '2/3 幅' : '全幅'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="third">1/3 幅</SelectItem>
                <SelectItem value="half">2/3 幅</SelectItem>
                <SelectItem value="full">全幅</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showMonth && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">対象月</label>
              <Select
                value={widget.config.month || NONE}
                onValueChange={v => setConfig({ month: v === NONE ? undefined : (v ?? undefined) })}
              >
                <SelectTrigger>
                  <SelectValue>
                    {v => (v && v !== NONE ? formatYearMonthLong(v as string) : '最新月（自動）')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>最新月（自動）</SelectItem>
                  {historicalMonths.map(m => (
                    <SelectItem key={m} value={m}>{formatYearMonthLong(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showAgencyUnit && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">代理店フィルタ</label>
                <Select
                  value={widget.config.agencyId || NONE}
                  onValueChange={v => setConfig({ agencyId: v === NONE ? undefined : (v ?? undefined) })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {v => {
                        if (!v || v === NONE) return '全代理店';
                        const a = agencies.find(a => a.id === v);
                        return a?.name || '代理店';
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>全代理店</SelectItem>
                    {agencies.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">ユニットフィルタ</label>
                <Select
                  value={widget.config.unit || NONE}
                  onValueChange={v => setConfig({ unit: v === NONE ? undefined : (v ?? undefined) })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {v => !v || v === NONE ? '全ユニット' : (v as string)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>全ユニット</SelectItem>
                    {units.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {showRankingType && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">ランキング種類</label>
              <Select
                value={widget.config.rankingType || 'agency_by_referrals'}
                onValueChange={v => setConfig({
                  rankingType: (v as 'agency_by_referrals' | 'store_by_referrals') || 'agency_by_referrals',
                })}
              >
                <SelectTrigger>
                  <SelectValue>
                    {v => v === 'store_by_referrals' ? '店舗 取次数 TOP' : '代理店 取次数 TOP'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency_by_referrals">代理店 取次数 TOP</SelectItem>
                  <SelectItem value="store_by_referrals">店舗 取次数 TOP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {showLimit && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">表示件数</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={widget.config.limit ?? 10}
                onChange={e => setConfig({ limit: Number(e.target.value) || 10 })}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
