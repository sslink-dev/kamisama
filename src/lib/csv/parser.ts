import Papa from 'papaparse';
import { CSV_HEADERS, type CsvRow } from './constants';

export interface ParsedStore {
  code: string;
  name: string;
  agencyName: string;
  companyName: string;
  unit: string;
  rank: string;
  companyFlag: string;
  isNg: boolean;
  ngReason: string;
  ngMonth: string;
  isPriority: boolean;
  isPriorityQ3: boolean;
}

export interface ParsedMetric {
  storeCode: string;
  yearMonth: string;
  referrals: number;
  brokerage: number;
  referralRate: number | null;
  targetReferrals: number;
}

export interface ParseResult {
  stores: ParsedStore[];
  metrics: ParsedMetric[];
  errors: { row: number; message: string }[];
  totalRows: number;
}

export function parseCsv(csvText: string): ParseResult {
  const { data, errors: parseErrors } = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const stores = new Map<string, ParsedStore>();
  const metrics: ParsedMetric[] = [];
  const errors: { row: number; message: string }[] = [];

  parseErrors.forEach(e => {
    errors.push({ row: e.row ?? 0, message: e.message });
  });

  data.forEach((row, index) => {
    const rowNum = index + 2; // 1-indexed + header

    const code = (row['店舗コード'] || '').trim();
    if (!code) {
      errors.push({ row: rowNum, message: '店舗コードが空です' });
      return;
    }

    const storeName = (row['店舗名'] || '').trim();
    if (!storeName) {
      errors.push({ row: rowNum, message: '店舗名が空です' });
      return;
    }

    // Store master (deduplicated by code)
    if (!stores.has(code)) {
      stores.set(code, {
        code,
        name: storeName,
        agencyName: (row['代理店名'] || '').trim(),
        companyName: (row['企業名'] || '').trim(),
        unit: (row['ユニット'] || '').trim(),
        rank: (row['ランク'] || '').trim(),
        companyFlag: (row['企業フラグ'] || '').trim(),
        isNg: row['NG状態'] === '1',
        ngReason: (row['NG理由'] || '').trim(),
        ngMonth: (row['NG月'] || '').trim(),
        isPriority: row['重点'] === '1',
        isPriorityQ3: row['3Q重点'] === '1',
      });
    }

    // Metrics
    const yearMonth = (row['年月'] || '').trim();
    if (yearMonth && /^\d{4}$/.test(yearMonth)) {
      metrics.push({
        storeCode: code,
        yearMonth,
        referrals: Math.round(Number(row['取次数']) || 0),
        brokerage: Math.round(Number(row['仲介数']) || 0),
        referralRate: row['取次率'] ? Number(row['取次率']) || null : null,
        targetReferrals: Math.round(Number(row['目標取次数']) || 0),
      });
    }
  });

  return {
    stores: [...stores.values()],
    metrics,
    errors,
    totalRows: data.length,
  };
}

export function validateHeaders(csvText: string): { valid: boolean; missing: string[] } {
  const firstLine = csvText.split('\n')[0];
  const headers = firstLine.split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''));
  const missing = CSV_HEADERS.filter(h => !headers.includes(h));
  return { valid: missing.length === 0, missing };
}
