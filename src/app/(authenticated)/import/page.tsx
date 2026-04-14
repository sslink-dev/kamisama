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
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { parseCsv, validateHeaders, type ParseResult } from '@/lib/csv/parser';
import { importToSupabase, type ImportResult } from '@/lib/csv/importer';
import { generateEmptyTemplate, exportAllData, downloadCsv } from '@/lib/csv/exporter';
import { convertExcelToCsv, type ConvertResult } from '@/lib/csv/excel-converter';

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
        <Tabs defaultValue="import">
          <TabsList>
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
