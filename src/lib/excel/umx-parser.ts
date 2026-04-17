/**
 * UMX Excel パーサー
 * シート「不動産リスト連携進捗」: col0=会社名, col1=店舗名
 * row0 に Excel日付シリアル → 月を特定。3列ずつ(送客数,キャッチ数,キャッチ率)
 * 送客数(偶数列 5,8,11...) = 取次数
 */
import * as XLSX from 'xlsx';

export interface UmxMetric {
  companyName: string;
  storeName: string;
  yearMonth: string;
  referrals: number;
}

export interface UmxParseResult {
  metrics: UmxMetric[];
  companyCount: number;
  storeCount: number;
  errors: { row: number; message: string }[];
}

interface MonthCol {
  col: number;
  yearMonth: string;
}

function excelSerialToYYMM(serial: number): string {
  const d = new Date((serial - 25569) * 86400000);
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return yy + mm;
}

export function parseUmxExcel(buffer: ArrayBuffer): UmxParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const errors: { row: number; message: string }[] = [];
  const sheetName = '不動産リスト連携進捗';

  if (!wb.SheetNames.includes(sheetName)) {
    return { metrics: [], companyCount: 0, storeCount: 0, errors: [{ row: 0, message: '「不動産リスト連携進捗」シートが見つかりません' }] };
  }

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });

  // row0 から月列を検出 (Excel日付シリアル > 40000)
  const headerRow = rows[0] as unknown as unknown[];
  const monthCols: MonthCol[] = [];
  if (headerRow) {
    for (let j = 5; j < headerRow.length; j++) {
      const v = headerRow[j];
      if (typeof v === 'number' && v > 40000) {
        monthCols.push({ col: j, yearMonth: excelSerialToYYMM(v) });
      }
    }
  }

  if (monthCols.length === 0) {
    return { metrics: [], companyCount: 0, storeCount: 0, errors: [{ row: 0, message: '月ヘッダ（日付シリアル）が見つかりません' }] };
  }

  const metrics: UmxMetric[] = [];
  const companies = new Set<string>();
  const stores = new Set<string>();

  // row2+ がデータ
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row) continue;

    const companyName = String(row[0] || '').trim();
    const storeName = String(row[1] || '').trim();
    if (!companyName && !storeName) continue;

    const displayCompany = companyName || storeName;
    const displayStore = storeName || companyName;

    for (const mc of monthCols) {
      // 送客数 = mc.col (3列のうち最初)
      const val = row[mc.col];
      const num = typeof val === 'number' ? Math.round(val) : parseInt(String(val || '0')) || 0;
      if (num <= 0) continue;

      metrics.push({
        companyName: displayCompany,
        storeName: displayStore,
        yearMonth: mc.yearMonth,
        referrals: num,
      });
    }

    companies.add(displayCompany);
    stores.add(`${displayCompany}_${displayStore}`);
  }

  return { metrics, companyCount: companies.size, storeCount: stores.size, errors };
}
