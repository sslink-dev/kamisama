import type { Widget } from '@/lib/data/types';

export const WIDGET_TYPE_LABELS: Record<Widget['type'], string> = {
  kpi_summary: 'KPIサマリー',
  trend_chart: '月次推移チャート',
  agency_chart: '代理店ランキングチャート',
  target_chart: '目標 vs 実績',
  ng_pie: 'NG理由の内訳',
  ranking_list: 'ランキング',
};
