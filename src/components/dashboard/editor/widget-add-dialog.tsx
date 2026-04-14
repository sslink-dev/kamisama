'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, BarChart3, LineChart, PieChart, TrendingUp, Trophy, Target } from 'lucide-react';
import type { WidgetType } from '@/lib/data/types';

const TYPES: { type: WidgetType; label: string; desc: string; Icon: typeof BarChart3 }[] = [
  { type: 'kpi_summary', label: 'KPIサマリー', desc: '取次数・取次率・目標達成率などの主要指標', Icon: BarChart3 },
  { type: 'trend_chart', label: '月次推移チャート', desc: '取次数・仲介数・取次率の月次トレンド', Icon: LineChart },
  { type: 'agency_chart', label: '代理店ランキングチャート', desc: '代理店別の取次数を横棒グラフで表示', Icon: TrendingUp },
  { type: 'target_chart', label: '目標 vs 実績', desc: '月別の目標達成状況を比較', Icon: Target },
  { type: 'ng_pie', label: 'NG理由の内訳', desc: 'NG店舗の理由別分布を円グラフで表示', Icon: PieChart },
  { type: 'ranking_list', label: 'ランキング', desc: '代理店 or 店舗の TOP N リスト', Icon: Trophy },
];

interface Props {
  onClose: () => void;
  onAdd: (type: WidgetType) => void;
}

export function WidgetAddDialog({ onClose, onAdd }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">ウィジェットを追加</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TYPES.map(({ type, label, desc, Icon }) => (
              <button
                key={type}
                onClick={() => onAdd(type)}
                className="flex items-start gap-3 rounded-lg border p-3 text-left hover:border-blue-500 hover:bg-blue-50"
                type="button"
              >
                <div className="rounded-lg bg-blue-100 p-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="mt-0.5 text-xs text-gray-500">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
