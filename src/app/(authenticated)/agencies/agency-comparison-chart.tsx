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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AgencySummary } from '@/lib/data/types';

interface AgencyComparisonChartProps {
  data: AgencySummary[];
}

export function AgencyComparisonChart({ data }: AgencyComparisonChartProps) {
  const chartData = data
    .filter(d => d.totalReferrals > 0)
    .slice(0, 15)
    .map(d => ({
      name: d.agencyName.length > 10 ? d.agencyName.slice(0, 10) + '...' : d.agencyName,
      fullName: d.agencyName,
      referrals: d.totalReferrals,
      connections: d.totalConnections,
      brokerage: d.totalBrokerage,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">企業比較 - 取次 / 通電 / 成約</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="name" fontSize={11} width={120} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="referrals" name="取次数" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="connections" name="通電数" fill="#f59e0b" radius={[0, 3, 3, 0]} />
              <Bar dataKey="brokerage" name="成約数" fill="#10b981" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
