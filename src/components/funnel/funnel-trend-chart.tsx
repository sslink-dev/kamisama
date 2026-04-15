'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { MonthlyTrend } from '@/lib/data/types';
import { formatYearMonthShort, formatNumber } from '@/lib/utils/year-month';

interface Props {
  data: MonthlyTrend[];
  dataKey: 'totalReferrals' | 'totalConnections' | 'totalBrokerage';
  color: string;
  label: string;
}

export function FunnelTrendChart({ data, dataKey, color, label }: Props) {
  const chartData = data.map(d => ({
    label: formatYearMonthShort(d.yearMonth),
    value: d[dataKey],
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
          <Tooltip formatter={(v) => [formatNumber(Number(v)), label] as [string, string]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name={label}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
