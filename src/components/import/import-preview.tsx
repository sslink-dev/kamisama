'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ParseResult } from '@/lib/csv/parser';

interface ImportPreviewProps {
  result: ParseResult;
}

export function ImportPreview({ result }: ImportPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="合計行数" value={result.totalRows} />
        <StatCard label="店舗数" value={result.stores.length} color="text-blue-600" />
        <StatCard label="メトリクス数" value={result.metrics.length} color="text-green-600" />
        <StatCard label="エラー" value={result.errors.length} color={result.errors.length > 0 ? 'text-red-600' : 'text-gray-400'} />
      </div>

      {result.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-red-600">エラー ({result.errors.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-40 overflow-auto text-sm">
              {result.errors.slice(0, 20).map((e, i) => (
                <div key={i} className="text-red-600">
                  行{e.row}: {e.message}
                </div>
              ))}
              {result.errors.length > 20 && (
                <div className="mt-1 text-gray-500">他 {result.errors.length - 20}件...</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">店舗プレビュー (先頭10件)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>コード</TableHead>
                  <TableHead>店舗名</TableHead>
                  <TableHead>代理店</TableHead>
                  <TableHead>ユニット</TableHead>
                  <TableHead>ランク</TableHead>
                  <TableHead>NG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.stores.slice(0, 10).map(s => (
                  <TableRow key={s.code}>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="text-sm">{s.name}</TableCell>
                    <TableCell className="text-sm">{s.agencyName}</TableCell>
                    <TableCell className="text-sm">{s.unit || '-'}</TableCell>
                    <TableCell>
                      {s.rank ? <Badge variant="outline">{s.rank}</Badge> : '-'}
                    </TableCell>
                    <TableCell>
                      {s.isNg ? <Badge variant="destructive">NG</Badge> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className={`text-xl font-bold ${color || ''}`}>{value.toLocaleString()}</div>
        <p className="text-xs text-gray-500">{label}</p>
      </CardContent>
    </Card>
  );
}
