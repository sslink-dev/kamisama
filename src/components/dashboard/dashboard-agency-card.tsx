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
} from 'recharts';
import type { AgencySummary } from '@/lib/data/types';

interface Props {
  data: AgencySummary[];
}

export function DashboardAgencyCard({ data }: Props) {
  const chartData = data.map(d => ({
    name: d.agencyName,
    取次数: d.totalReferrals,
    通電数: d.totalConnections,
    成約数: d.totalBrokerage,
  }));

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3">
        <span className="inline-block rounded bg-[#F76FAB] px-3 py-1 text-xs font-bold text-white">
          代理店比較
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" fontSize={10} tick={{ fill: '#6b7280' }} />
            <YAxis fontSize={11} tick={{ fill: '#6b7280' }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="取次数" fill="#1f3a8a" radius={[3, 3, 0, 0]} />
            <Bar dataKey="通電数" fill="#60a5fa" radius={[3, 3, 0, 0]} />
            <Bar dataKey="成約数" fill="#F76FAB" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
