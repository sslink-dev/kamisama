import type { Widget } from '@/lib/data/types';
import { KpiWidget } from './kpi-widget';
import { TrendWidget } from './trend-widget';
import { AgencyWidget } from './agency-widget';
import { TargetWidget } from './target-widget';
import { NgPieWidget } from './ng-pie-widget';
import { RankingWidget } from './ranking-widget';

export { WIDGET_TYPE_LABELS } from './widget-labels';

interface WidgetRendererProps {
  widget: Widget;
  historicalMonths: string[];
}

export async function WidgetRenderer({ widget, historicalMonths }: WidgetRendererProps) {
  switch (widget.type) {
    case 'kpi_summary':
      return <KpiWidget widget={widget} historicalMonths={historicalMonths} />;
    case 'trend_chart':
      return <TrendWidget widget={widget} />;
    case 'agency_chart':
      return <AgencyWidget widget={widget} historicalMonths={historicalMonths} />;
    case 'target_chart':
      return <TargetWidget widget={widget} />;
    case 'ng_pie':
      return <NgPieWidget widget={widget} />;
    case 'ranking_list':
      return <RankingWidget widget={widget} historicalMonths={historicalMonths} />;
    default:
      return <div className="p-4 text-sm text-red-600">未知のウィジェット: {widget.type}</div>;
  }
}
