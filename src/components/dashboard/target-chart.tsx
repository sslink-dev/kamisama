'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlyTrend } from '@/lib/data/types';
import { formatYearMonth } from '@/lib/utils/year-month';

interface TargetChartProps {
  data: MonthlyTrend[];
}

export function TargetChart({ data }: TargetChartProps) {
  const chartData = data
    .filter(d => d.totalTargetReferrals > 0)
    .map(d => ({
      label: formatYearMonth(d.yearMonth),
      actual: d.totalReferrals,
      target: d.totalTargetReferrals,
      gap: d.totalReferrals - d.totalTargetReferrals,
      achievement: d.totalTargetReferrals > 0
        ? Math.round((d.totalReferrals / d.totalTargetReferrals) * 100)
        : 0,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">目標 vs 実績</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">目標データがありません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">目標 vs 実績</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" fontSize={11} tick={{ fill: '#6b7280' }} />
              <YAxis fontSize={11} tick={{ fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value, name) => [Number(value).toLocaleString(), name]}
                labelFormatter={(label) => `${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0} stroke="#000" />
              <Bar dataKey="target" name="目標" fill="#fbbf24" radius={[2, 2, 0, 0]} />
              <Bar dataKey="actual" name="実績" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
