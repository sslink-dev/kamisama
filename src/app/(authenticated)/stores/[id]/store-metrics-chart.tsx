'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { Metric } from '@/lib/data/types';
import { formatYearMonth } from '@/lib/utils/year-month';

interface StoreMetricsChartProps {
  metrics: Metric[];
}

export function StoreMetricsChart({ metrics }: StoreMetricsChartProps) {
  const chartData = metrics.map(m => ({
    label: formatYearMonth(m.yearMonth),
    brokerage: m.brokerage,
    referrals: m.referrals,
    rate: m.referralRate !== null ? Math.round(m.referralRate * 1000) / 10 : null,
  }));

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm font-semibold text-gray-500">
        メトリクスデータがありません
      </p>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" fontSize={10} tick={{ fill: '#6b7280' }} />
          <YAxis yAxisId="left" fontSize={11} tick={{ fill: '#6b7280' }} />
          <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: '#6b7280' }} domain={[0, 100]} unit="%" />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="brokerage" name="仲介数" fill="#bfdbfe" radius={[2, 2, 0, 0]} />
          <Bar yAxisId="left" dataKey="referrals" name="取次数" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Line yAxisId="right" dataKey="rate" name="取次率(%)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
