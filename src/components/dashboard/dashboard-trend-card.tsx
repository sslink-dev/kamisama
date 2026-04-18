'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { MonthlyTrend } from '@/lib/data/types';
import { formatYearMonth } from '@/lib/utils/year-month';

interface Props {
  data: MonthlyTrend[];
}

export function DashboardTrendCard({ data }: Props) {
  const chartData = data.map(d => ({
    label: formatYearMonth(d.yearMonth),
    取次: d.totalReferrals,
    通電: d.totalConnections,
    成約: d.totalBrokerage,
  }));

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3">
        <span className="inline-block rounded bg-[#F76FAB] px-3 py-1 text-xs font-bold text-white">
          月次推移
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" fontSize={11} tick={{ fill: '#6b7280' }} />
            <YAxis fontSize={11} tick={{ fill: '#6b7280' }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="取次" stroke="#1f3a8a" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="通電" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="成約" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
