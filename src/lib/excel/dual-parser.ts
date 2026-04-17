/**
 * DUAL Excel パーサー
 * シート「進捗状況」: col0=パートナーID, col1=パートナー名, col2=店舗ID, col3=店舗名
 * col4=紹介数(取次), col5=有効数, col7=通電数
 * 月はファイル名 or row1 "○月紹介状況" から取得
 */
import * as XLSX from 'xlsx';

export interface DualMetric {
  companyName: string;
  storeName: string;
  storeId: string;
  yearMonth: string;
  referrals: number;
  connections: number; // 通電数
  effective: number;   // 有効数
}

export interface DualParseResult {
  metrics: DualMetric[];
  yearMonth: string;
  companyCount: number;
  storeCount: number;
  errors: { row: number; message: string }[];
}

function detectYearMonth(wb: XLSX.WorkBook, fileName: string): string {
  // row1 から "○月紹介状況" を読む
  const ws = wb.Sheets['進捗状況'];
  if (ws) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, range: { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } } });
    const r1 = rows[0] as unknown as unknown[];
    if (r1) {
      for (const c of r1) {
        const m = String(c || '').match(/(\d{1,2})月/);
        if (m) {
          // ファイル名から年を推定
          const yearMatch = fileName.match(/20(\d{2})/);
          const yy = yearMatch ? yearMatch[1] : '26';
          return yy + String(parseInt(m[1])).padStart(2, '0');
        }
      }
    }
  }
  // フォールバック: ファイル名から
  const fm = fileName.match(/(\d{1,2})月/);
  const ym = fileName.match(/20(\d{2})/);
  if (fm) return (ym ? ym[1] : '26') + String(parseInt(fm[1])).padStart(2, '0');
  return '2603';
}

export function parseDualExcel(buffer: ArrayBuffer, fileName: string = ''): DualParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const errors: { row: number; message: string }[] = [];

  if (!wb.SheetNames.includes('進捗状況')) {
    return { metrics: [], yearMonth: '', companyCount: 0, storeCount: 0, errors: [{ row: 0, message: '「進捗状況」シートが見つかりません' }] };
  }

  const yearMonth = detectYearMonth(wb, fileName);
  const ws = wb.Sheets['進捗状況'];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
  const metrics: DualMetric[] = [];
  const companies = new Set<string>();
  const stores = new Set<string>();

  // データ行は row3 のヘッダ行の後 (row4+)
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row || row.length < 8) continue;

    const companyName = String(row[1] || '').trim();
    const storeId = String(row[2] || '').trim();
    const storeName = String(row[3] || '').trim();
    if (!companyName || !storeName) continue;

    const referrals = typeof row[4] === 'number' ? Math.round(row[4]) : parseInt(String(row[4] || '0')) || 0;
    const effective = typeof row[5] === 'number' ? Math.round(row[5]) : parseInt(String(row[5] || '0')) || 0;
    const connections = typeof row[7] === 'number' ? Math.round(row[7]) : parseInt(String(row[7] || '0')) || 0;

    // 全部 0 の行はスキップ
    if (referrals === 0 && effective === 0 && connections === 0) continue;

    companies.add(companyName);
    stores.add(storeId);
    metrics.push({ companyName, storeName, storeId, yearMonth, referrals, connections, effective });
  }

  return { metrics, yearMonth, companyCount: companies.size, storeCount: stores.size, errors };
}
