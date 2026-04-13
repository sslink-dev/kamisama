import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

export default function ImportPage() {
  return (
    <>
      <Header title="データ取込" />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Excelファイルのインポート</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12">
              <Upload className="mb-4 h-12 w-12 text-gray-400" />
              <p className="mb-2 text-lg font-medium text-gray-900">
                Excelファイルをドラッグ&ドロップ
              </p>
              <p className="text-sm text-gray-500">
                または クリックしてファイルを選択
              </p>
              <p className="mt-4 text-xs text-gray-400">
                .xlsx 形式のみ対応 (最大25MB)
              </p>
              <p className="mt-2 text-xs text-amber-600">
                この機能は今後のアップデートで実装予定です
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
