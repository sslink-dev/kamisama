'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AgencySummary } from '@/lib/data/types';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#6366f1',
];

interface AgencyChartProps {
  data: AgencySummary[];
}

export function AgencyChart({ data }: AgencyChartProps) {
  const sorted = [...data]
    .filter(d => d.totalReferrals > 0)
    .sort((a, b) => b.totalReferrals - a.totalReferrals)
    .slice(0, 15);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">代理店別 取次数ランキング</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" fontSize={11} tick={{ fill: '#6b7280' }} />
              <YAxis
                type="category"
                dataKey="agencyName"
                fontSize={11}
                width={140}
                tick={{ fill: '#374151' }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value) => [Number(value).toLocaleString(), '取次数']}
              />
              <Bar dataKey="totalReferrals" radius={[0, 4, 4, 0]}>
                {sorted.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
