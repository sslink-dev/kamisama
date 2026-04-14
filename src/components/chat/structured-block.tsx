'use client';

/**
 * AI 応答内の特殊コードフェンスを解釈してチャート/テーブルに変換するレンダラ。
 * 対応:
 *   ```chart:line  { data, xKey, series, title? }
 *   ```chart:bar   { data, xKey, series, title? }
 *   ```chart:pie   { data, title? }    (data: [{name,value}])
 *   ```table       { headers, rows, title? }
 */
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

interface Series {
  key: string;
  color?: string;
  label?: string;
}

export function StructuredBlock({ language, content }: { language: string; content: string }) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return (
      <pre className="overflow-x-auto rounded bg-red-50 p-2 text-xs text-red-700">
        無効な JSON: {content.slice(0, 200)}
      </pre>
    );
  }

  const data = parsed as Record<string, unknown>;
  const title = data.title as string | undefined;

  if (language === 'chart:line') {
    return <LineBlock title={title} data={data.data as Record<string, unknown>[]} xKey={data.xKey as string} series={(data.series as Series[]) || []} />;
  }
  if (language === 'chart:bar') {
    return <BarBlock title={title} data={data.data as Record<string, unknown>[]} xKey={data.xKey as string} series={(data.series as Series[]) || []} />;
  }
  if (language === 'chart:pie') {
    return <PieBlock title={title} data={data.data as { name: string; value: number }[]} />;
  }
  if (language === 'table') {
    return <TableBlock title={title} headers={(data.headers as string[]) || []} rows={(data.rows as (string | number)[][]) || []} />;
  }
  return null;
}

function ChartFrame({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="my-2 rounded-lg border bg-white p-3">
      {title && <div className="mb-2 text-xs font-medium text-gray-700">{title}</div>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {children as any}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LineBlock({ title, data, xKey, series }: { title?: string; data: Record<string, unknown>[]; xKey: string; series: Series[] }) {
  if (!Array.isArray(data) || data.length === 0) return <Empty title={title} />;
  return (
    <ChartFrame title={title}>
      <LineChart data={data} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label || s.key}
            stroke={s.color || PIE_COLORS[i % PIE_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

function BarBlock({ title, data, xKey, series }: { title?: string; data: Record<string, unknown>[]; xKey: string; series: Series[] }) {
  if (!Array.isArray(data) || data.length === 0) return <Empty title={title} />;
  return (
    <ChartFrame title={title}>
      <BarChart data={data} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} interval={0} angle={data.length > 6 ? -30 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 60 : 30} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label || s.key}
            fill={s.color || PIE_COLORS[i % PIE_COLORS.length]}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

function PieBlock({ title, data }: { title?: string; data: { name: string; value: number }[] }) {
  if (!Array.isArray(data) || data.length === 0) return <Empty title={title} />;
  return (
    <ChartFrame title={title}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 11 }}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartFrame>
  );
}

function TableBlock({ title, headers, rows }: { title?: string; headers: string[]; rows: (string | number)[][] }) {
  if (!headers.length) return <Empty title={title} />;
  return (
    <div className="my-2 overflow-x-auto rounded-lg border bg-white">
      {title && <div className="border-b bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700">{title}</div>}
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-gray-700">
                  {typeof cell === 'number' ? cell.toLocaleString('ja-JP') : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ title }: { title?: string }) {
  return (
    <div className="my-2 rounded-lg border bg-gray-50 p-3 text-xs text-gray-500">
      {title || 'データなし'}
    </div>
  );
}
