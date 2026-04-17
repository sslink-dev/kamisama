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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Metric } from '@/lib/data/types';
import { formatYearMonth } from '@/lib/utils/year-month';

interface StoreMetricsChartProps {
  metrics: Metric[];
}

export function StoreMetricsChart({ metrics }: StoreMetricsChartProps) {
  const chartData = metrics
    .map(m => ({
      label: formatYearMonth(m.yearMonth),
      referrals: m.referrals,
      brokerage: m.brokerage,
      referralRate: m.referralRate !== null ? Math.round(m.referralRate * 1000) / 10 : null,
      target: m.targetReferrals || null,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">月次推移</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">メトリクスデータがありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">月次推移</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" fontSize={11} tick={{ fill: '#6b7280' }} />
              <YAxis yAxisId="left" fontSize={11} tick={{ fill: '#6b7280' }} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: '#6b7280' }} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="brokerage" name="仲介数" fill="#93c5fd" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="left" dataKey="referrals" name="取次数" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" dataKey="referralRate" name="取次率(%)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
