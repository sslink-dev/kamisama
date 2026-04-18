'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { AgencySummary } from '@/lib/data/types';

interface Props {
  data: AgencySummary[];
}

export function AgencyComparisonChart({ data }: Props) {
  const chartData = data
    .slice(0, 15)
    .map(d => ({
      name: d.agencyName.length > 8 ? d.agencyName.slice(0, 8) + '…' : d.agencyName,
      取次数: d.totalReferrals,
      通電数: d.totalConnections,
      成約数: d.totalBrokerage,
    }))
    .reverse();

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" fontSize={11} tick={{ fill: '#6b7280' }} />
          <YAxis type="category" dataKey="name" fontSize={11} width={80} tick={{ fill: '#6b7280' }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="取次数" fill="#1f3a8a" radius={[0, 3, 3, 0]} />
          <Bar dataKey="通電数" fill="#60a5fa" radius={[0, 3, 3, 0]} />
          <Bar dataKey="成約数" fill="#F76FAB" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
