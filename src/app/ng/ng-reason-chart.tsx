'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#6366f1',
  '#14b8a6', '#e11d48', '#7c3aed', '#0ea5e9', '#d946ef',
  '#ea580c', '#65a30d', '#0891b2', '#a855f7', '#f43f5e',
];

interface NgReasonChartProps {
  data: { reason: string; count: number }[];
}

export function NgReasonChart({ data }: NgReasonChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">NG理由の内訳</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="reason"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ strokeWidth: 1 }}
                fontSize={10}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value) => [`${value}件`, 'NG店舗数']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
