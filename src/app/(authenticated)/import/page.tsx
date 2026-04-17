'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/import/file-dropzone';
import { ImportPreview } from '@/components/import/import-preview';
import { ImportProgress } from '@/components/import/import-progress';
import { LoadingOverlay } from '@/components/layout/loading-overlay';
import { Download, Upload, FileSpreadsheet, Zap } from 'lucide-react';
import type { UnextParseResult } from '@/lib/excel/unext-parser';
import type { HousemateParseResult } from '@/lib/excel/housemate-parser';
import type { RensaParseResult } from '@/lib/excel/rensa-parser';
import type { IerabuParseResult } from '@/lib/excel/ierabu-parser';
import { parseCsv, validateHeaders, type ParseResult } from '@/lib/csv/parser';
import { importToSupabase, type ImportResult } from '@/lib/csv/importer';
import { generateEmptyTemplate, exportAllData, downloadCsv } from '@/lib/csv/exporter';
import { convertExcelToCsv, type ConvertResult } from '@/lib/csv/excel-converter';

interface UnextImportResult {
  ok: boolean;
  batchId?: string;
  sheetName?: string;
  totalRows?: number;
  insertedCount?: number;
  staffCount?: number;
  parseErrors?: { row: number; message: string }[];
  insertErrors?: string[];
  error?: string;
}

export default function ImportPage() {
  // CSV Import state
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progressStep, setProgressStep] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  // Excel convert state
  const [convertResult, setConvertResult] = useState<ConvertResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // U-NEXT import state
  const [unextImporting, setUnextImporting] = useState(false);
  const [unextResult, setUnextResult] = useState<UnextImportResult | null>(null);
  const [unextFileName, setUnextFileName] = useState<string | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // --- CSV Import ---
  const handleCsvFile = useCallback((file: File) => {
    setParseResult(null);
    setHeaderError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const validation = validateHeaders(text);
      if (!validation.valid) {
        setHeaderError(`必須カラムが不足しています: ${validation.missing.join(', ')}`);
        return;
      }
      const result = parseCsv(text);
      setParseResult(result);
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const handleImport = useCallback(async () => {
    if (!parseResult) return;
    setIsImporting(true);
    setImportResult(null);

    const result = await importToSupabase(
      parseResult.stores,
      parseResult.metrics,
      (step, current, total) => {
        setProgressStep(step);
        setProgressCurrent(current);
        setProgressTotal(total);
      }
    );

    setImportResult(result);
    setIsImporting(false);
  }, [parseResult]);

  // --- Excel Convert ---
  const handleExcelFile = useCallback((file: File) => {
    setConvertResult(null);
    setIsConverting(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const result = convertExcelToCsv(buffer);
      setConvertResult(result);
      setIsConverting(false);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // --- Agency Excel Import (U-NEXT / ハウスメイト 自動判別) ---
  const handleUnextFile = useCallback(async (file: File) => {
    setUnextResult(null);
    setUnextFileName(file.name);
    setUnextImporting(true);

    try {
      const buffer = await file.arrayBuffer();

      // シート名を先読みして代理店フォーマットを判別
      const XLSX = await import('xlsx');
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', bookSheets: true });
      const sheetNames: string[] = wb.SheetNames;
      const isIerabu = sheetNames.includes('いえらぶMaster') || sheetNames.includes('リスト外店舗');
      const isRensa = sheetNames.includes('連携実績') || sheetNames.includes('エイブル実績_グローバル');
      const isHousemate = sheetNames.some(n => n.includes('ユニット別'));
      const isUnext = sheetNames.includes('元データ') || sheetNames.includes('データ貼付');

      if (isIerabu) {
        // --- いえらぶ ---
        const parsed = await new Promise<IerabuParseResult>((resolve, reject) => {
          const worker = new Worker(new URL('@/lib/excel/ierabu-worker', import.meta.url));
          worker.onmessage = (e: MessageEvent<IerabuParseResult>) => { resolve(e.data); worker.terminate(); };
          worker.onerror = (e) => { reject(new Error(e.message || 'Worker error')); worker.terminate(); };
          worker.postMessage(buffer, [buffer]);
        });

        if (parsed.metrics.length === 0) {
          setUnextResult({ ok: false, error: '有効なデータが見つかりませんでした' });
          return;
        }

        const res = await fetch('/api/import/ierabu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name, metrics: parsed.metrics,
            sheetsProcessed: parsed.sheetsProcessed,
            companyCount: parsed.companyCount, storeCount: parsed.storeCount,
          }),
        });
        const data = await res.json();
        setUnextResult({
          ok: data.ok,
          sheetName: `いえらぶ (${parsed.sheetsProcessed.join(', ')})`,
          totalRows: parsed.metrics.length,
          insertedCount: data.metricsCount,
          staffCount: 0, error: data.error, insertErrors: data.insertErrors,
        });

      } else if (isRensa) {
        // --- レンサ ---
        const parsed = await new Promise<RensaParseResult>((resolve, reject) => {
          const worker = new Worker(new URL('@/lib/excel/rensa-worker', import.meta.url));
          worker.onmessage = (e: MessageEvent<RensaParseResult>) => { resolve(e.data); worker.terminate(); };
          worker.onerror = (e) => { reject(new Error(e.message || 'Worker error')); worker.terminate(); };
          worker.postMessage(buffer, [buffer]);
        });

        if (parsed.metrics.length === 0) {
          setUnextResult({ ok: false, error: '有効なデータが見つかりませんでした' });
          return;
        }

        const res = await fetch('/api/import/rensa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            metrics: parsed.metrics,
            sheetsProcessed: parsed.sheetsProcessed,
            companyCount: parsed.companyCount,
            storeCount: parsed.storeCount,
          }),
        });
        const data = await res.json();
        setUnextResult({
          ok: data.ok,
          sheetName: `レンサ (${parsed.sheetsProcessed.join(', ')})`,
          totalRows: parsed.metrics.length,
          insertedCount: data.metricsCount,
          staffCount: 0,
          error: data.error,
          insertErrors: data.insertErrors,
        });

      } else if (isHousemate) {
        // --- ハウスメイト ---
        const parsed = await new Promise<HousemateParseResult>((resolve, reject) => {
          const worker = new Worker(new URL('@/lib/excel/housemate-worker', import.meta.url));
          worker.onmessage = (e: MessageEvent<HousemateParseResult>) => { resolve(e.data); worker.terminate(); };
          worker.onerror = (e) => { reject(new Error(e.message || 'Worker error')); worker.terminate(); };
          worker.postMessage(buffer, [buffer]);
        });

        if (parsed.metrics.length === 0) {
          setUnextResult({ ok: false, error: '有効なデータが見つかりませんでした' });
          return;
        }

        const res = await fetch('/api/import/housemate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            metrics: parsed.metrics,
            sheetsProcessed: parsed.sheetsProcessed,
            storeCount: parsed.storeCount,
          }),
        });
        const data = await res.json();
        setUnextResult({
          ok: data.ok,
          sheetName: `ハウスメイト (${parsed.sheetsProcessed.length}シート)`,
          totalRows: parsed.metrics.length,
          insertedCount: data.metricsCount,
          staffCount: 0,
          error: data.error,
          insertErrors: data.insertErrors,
        });

      } else if (isUnext) {
        // --- U-NEXT ---
        const parsed = await new Promise<UnextParseResult>((resolve, reject) => {
          const worker = new Worker(new URL('@/lib/excel/unext-worker', import.meta.url));
          worker.onmessage = (e: MessageEvent<UnextParseResult>) => { resolve(e.data); worker.terminate(); };
          worker.onerror = (e) => { reject(new Error(e.message || 'Worker error')); worker.terminate(); };
          worker.postMessage(buffer, [buffer]);
        });

        if (parsed.transactions.length === 0) {
          setUnextResult({ ok: false, error: '有効なデータが見つかりませんでした', parseErrors: parsed.errors.slice(0, 20) });
          return;
        }

        const CHUNK = 3000;
        const all = parsed.transactions;
        const batchId = `unext_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        let totalInserted = 0;
        let staffCount = 0;
        const allErrors: string[] = [];

        for (let i = 0; i < all.length; i += CHUNK) {
          const chunk = all.slice(i, i + CHUNK);
          const res = await fetch('/api/import/unext', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              batchId, fileName: file.name, sheetName: parsed.sheetName,
              transactions: chunk, totalRows: parsed.totalRows,
              isFirst: i === 0, isLast: i + CHUNK >= all.length,
            }),
          });
          const data = await res.json();
          if (!res.ok) { setUnextResult({ ok: false, error: data.error || `チャンク ${i} でエラー` }); return; }
          totalInserted += data.insertedCount || 0;
          staffCount = data.staffCount || staffCount;
          if (data.insertErrors) allErrors.push(...data.insertErrors);
        }

        setUnextResult({
          ok: true, batchId, sheetName: `U-NEXT: ${parsed.sheetName}`,
          totalRows: parsed.totalRows, insertedCount: totalInserted, staffCount,
          parseErrors: parsed.errors.slice(0, 20),
          insertErrors: allErrors.length > 0 ? allErrors : undefined,
        });

      } else {
        setUnextResult({ ok: false, error: '対応する代理店フォーマットが見つかりませんでした。U-NEXT（「元データ」シート）またはハウスメイト（「ユニット別」シート）の Excel を選択してください。' });
      }
    } catch (e) {
      setUnextResult({ ok: false, error: e instanceof Error ? e.message : '通信エラー' });
    } finally {
      setUnextImporting(false);
    }
  }, []);

  // --- Export ---
  const handleDownloadTemplate = useCallback(() => {
    const csv = generateEmptyTemplate();
    downloadCsv(csv, 'kamisama_template.csv');
  }, []);

  const handleExportAll = useCallback(async () => {
    setIsExporting(true);
    const csv = await exportAllData();
    downloadCsv(csv, `kamisama_export_${new Date().toISOString().slice(0, 10)}.csv`);
    setIsExporting(false);
  }, []);

  return (
    <>
      <Header title="データ管理" />
      <LoadingOverlay
        show={unextImporting}
        fullscreen
        message="代理店 Excel を解析・取込中..."
      />
      <LoadingOverlay
        show={isImporting}
        fullscreen
        message={progressStep || 'インポート中...'}
      />
      <LoadingOverlay
        show={isConverting}
        fullscreen
        message="Excel を変換中..."
      />
      <LoadingOverlay
        show={isExporting}
        fullscreen
        message="エクスポート中..."
      />
      <div className="p-6">
        <Tabs defaultValue="agency">
          <TabsList>
            <TabsTrigger value="agency">
              <Zap className="mr-2 h-4 w-4" />
              代理店Excel取込
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="mr-2 h-4 w-4" />
              CSVインポート
            </TabsTrigger>
            <TabsTrigger value="convert">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel変換
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="mr-2 h-4 w-4" />
              エクスポート
            </TabsTrigger>
          </TabsList>

          {/* Agency Excel Import Tab */}
          <TabsContent value="agency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">代理店 Excel 取込</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  代理店の Excel ファイルをドロップしてください。フォーマットを自動判別して取り込みます。
                </p>
                <div className="grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded border p-2">
                    <span className="font-medium text-blue-700">U-NEXT</span>: 「元データ」シートから取次・通電・成約を抽出
                  </div>
                  <div className="rounded border p-2">
                    <span className="font-medium text-green-700">ハウスメイト</span>: 年間シートから店舗別月次取次数を抽出
                  </div>
                  <div className="rounded border p-2">
                    <span className="font-medium text-amber-700">レンサ</span>: 連携実績 + エイブル実績から取次数を抽出
                  </div>
                  <div className="rounded border p-2">
                    <span className="font-medium text-purple-700">いえらぶ</span>: Master + リスト外から○月データ列を抽出
                  </div>
                </div>
                <FileDropzone
                  accept=".xlsx,.xls"
                  label="代理店 Excel をドラッグ&ドロップ"
                  description="U-NEXT / ハウスメイト を自動判別 (.xlsx)"
                  onFile={handleUnextFile}
                />

                {unextImporting && (
                  <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <div className="text-sm text-blue-800">
                      <div className="font-medium">{unextFileName} を解析・取込中...</div>
                      <div className="text-xs text-blue-600">大きなファイルは数十秒かかる場合があります</div>
                    </div>
                  </div>
                )}

                {unextResult && !unextResult.ok && (
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                    <div className="font-medium">取込エラー</div>
                    <div>{unextResult.error}</div>
                    {unextResult.parseErrors && unextResult.parseErrors.length > 0 && (
                      <ul className="mt-2 list-disc pl-4 text-xs">
                        {unextResult.parseErrors.map((e, i) => (
                          <li key={i}>行{e.row}: {e.message}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {unextResult?.ok && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-green-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-green-800">✅ 取込完了 — ダッシュボードに即時反映済み</div>
                        <a href="/dashboard" className="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800">
                          ダッシュボードを見る →
                        </a>
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-green-700 sm:grid-cols-4">
                        <div>
                          <div className="text-xs text-green-600">シート</div>
                          <div className="font-medium">{unextResult.sheetName}</div>
                        </div>
                        <div>
                          <div className="text-xs text-green-600">取込件数</div>
                          <div className="font-medium">{unextResult.insertedCount?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-green-600">元データ行数</div>
                          <div className="font-medium">{unextResult.totalRows?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-green-600">担当者数</div>
                          <div className="font-medium">{unextResult.staffCount?.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                    {unextResult.insertErrors && unextResult.insertErrors.length > 0 && (
                      <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                        <div className="font-medium">一部警告:</div>
                        {unextResult.insertErrors.map((e, i) => <div key={i}>{e}</div>)}
                      </div>
                    )}

                    {unextResult.parseErrors && unextResult.parseErrors.length > 0 && (
                      <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                        <div className="font-medium">スキップされた行 ({unextResult.parseErrors.length}件):</div>
                        <ul className="mt-1 list-disc pl-4">
                          {unextResult.parseErrors.slice(0, 10).map((e, i) => (
                            <li key={i}>行{e.row}: {e.message}</li>
                          ))}
                          {unextResult.parseErrors.length > 10 && (
                            <li>...他 {unextResult.parseErrors.length - 10} 件</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CSV Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CSVファイルのインポート</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FileDropzone
                  accept=".csv"
                  label="CSVファイルをドラッグ&ドロップ"
                  description="または クリックしてファイルを選択 (.csv)"
                  onFile={handleCsvFile}
                />

                {headerError && (
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                    {headerError}
                  </div>
                )}

                {parseResult && (
                  <>
                    <ImportPreview result={parseResult} />
                    <Button
                      onClick={handleImport}
                      disabled={isImporting || parseResult.stores.length === 0}
                      className="w-full"
                      size="lg"
                    >
                      {isImporting ? 'インポート中...' : `インポート実行 (${parseResult.stores.length}店舗 / ${parseResult.metrics.length}メトリクス)`}
                    </Button>
                  </>
                )}

                {(isImporting || importResult) && (
                  <ImportProgress
                    step={progressStep}
                    current={progressCurrent}
                    total={progressTotal}
                    isComplete={!isImporting}
                    result={importResult}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Excel Convert Tab */}
          <TabsContent value="convert" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Excel → CSV 変換</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  Excelファイル（神様の神.xlsx等）をアプリ用CSVフォーマットに変換します。
                  変換後のCSVは「CSVインポート」タブで取り込めます。
                </p>
                <FileDropzone
                  accept=".xlsx,.xls"
                  label=".xlsx ファイルをドラッグ&ドロップ"
                  description="または クリックしてファイルを選択"
                  onFile={handleExcelFile}
                />

                {isConverting && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    変換中...
                  </div>
                )}

                {convertResult && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-green-50 p-4">
                      <p className="text-sm font-medium text-green-800">変換完了</p>
                      <p className="text-sm text-green-700">
                        シート「{convertResult.sheetName}」から {convertResult.storeCount.toLocaleString()}店舗 / {convertResult.rowCount.toLocaleString()}行 を変換しました
                      </p>
                    </div>
                    <Button
                      onClick={() => downloadCsv(convertResult.csv, `kamisama_converted_${new Date().toISOString().slice(0, 10)}.csv`)}
                      size="lg"
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      CSVをダウンロード
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">データエクスポート</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-medium">空テンプレート</h3>
                    <p className="mb-3 text-xs text-gray-500">
                      ヘッダー行のみのCSVテンプレート。新規データの入力用。
                    </p>
                    <Button onClick={handleDownloadTemplate} variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      テンプレートをダウンロード
                    </Button>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-medium">既存データ全件</h3>
                    <p className="mb-3 text-xs text-gray-500">
                      Supabase上の全データをCSV形式でダウンロード。
                    </p>
                    <Button onClick={handleExportAll} variant="outline" className="w-full" disabled={isExporting}>
                      <Download className="mr-2 h-4 w-4" />
                      {isExporting ? 'エクスポート中...' : '全データをエクスポート'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
