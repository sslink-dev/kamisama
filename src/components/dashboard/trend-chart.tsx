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
import type { MonthlyTrend } from '@/lib/data/types';
import { formatYearMonth } from '@/lib/utils/year-month';

interface TrendChartProps {
  data: MonthlyTrend[];
}

export function TrendChart({ data }: TrendChartProps) {
  const chartData = data.map(d => ({
    ...d,
    label: formatYearMonth(d.yearMonth),
    referralRatePct: Math.round(d.avgReferralRate * 1000) / 10,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">月次推移 - 取次数 / 仲介数</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" fontSize={11} tick={{ fill: '#6b7280' }} />
              <YAxis yAxisId="left" fontSize={11} tick={{ fill: '#6b7280' }} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: '#6b7280' }} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value, name) => {
                  if (name === '取次率') return [`${value}%`, name];
                  return [Number(value).toLocaleString(), name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="totalBrokerage" name="仲介数" fill="#93c5fd" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="left" dataKey="totalReferrals" name="取次数" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              {chartData.some(d => d.totalTargetReferrals > 0) && (
                <Line yAxisId="left" dataKey="totalTargetReferrals" name="目標" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              )}
              <Line yAxisId="right" dataKey="referralRatePct" name="取次率" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
