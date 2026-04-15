'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatNumber } from '@/lib/utils/year-month';

interface Props {
  data: { name: string; value: number }[];
  color: string;
  label: string;
}

export function FunnelAgencyBar({ data, color, label }: Props) {
  if (data.length === 0) {
    return <div className="py-12 text-center text-sm text-gray-500">データがありません</div>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 60, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            angle={-30}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
          <Tooltip formatter={(v) => [formatNumber(Number(v)), label] as [string, string]} />
          <Bar dataKey="value" fill={color} name={label} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
