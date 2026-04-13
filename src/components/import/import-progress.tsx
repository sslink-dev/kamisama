'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { ImportResult } from '@/lib/csv/importer';

interface ImportProgressProps {
  step: string;
  current: number;
  total: number;
  isComplete: boolean;
  result: ImportResult | null;
}

export function ImportProgress({ step, current, total, isComplete, result }: ImportProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="pt-6">
        {!isComplete ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm font-medium">{step}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {current.toLocaleString()} / {total.toLocaleString()}
            </p>
          </div>
        ) : result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.errors.length === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              <span className="text-sm font-medium">
                インポート完了
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>代理店: <span className="font-medium">{result.agenciesCreated}</span> 件作成</div>
              <div>企業: <span className="font-medium">{result.companiesCreated}</span> 件作成</div>
              <div>店舗: <span className="font-medium">{result.storesUpserted}</span> 件更新</div>
              <div>メトリクス: <span className="font-medium">{result.metricsUpserted}</span> 件更新</div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-2 max-h-32 overflow-auto rounded bg-red-50 p-2 text-xs text-red-700">
                {result.errors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
