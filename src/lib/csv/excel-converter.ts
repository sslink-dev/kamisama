import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { CSV_HEADERS } from './constants';

const HISTORICAL_MONTHS = [
  { ym: '2404', refCol: 18, brkCol: 19, rateCol: 20 },
  { ym: '2405', refCol: 21, brkCol: 22, rateCol: 23 },
  { ym: '2406', refCol: 24, brkCol: 25, rateCol: 26 },
  { ym: '2407', refCol: 27, brkCol: 28, rateCol: 29 },
  { ym: '2408', refCol: 30, brkCol: 31, rateCol: 32 },
  { ym: '2409', refCol: 33, brkCol: 34, rateCol: 35 },
  { ym: '2410', refCol: 36, brkCol: 37, rateCol: 38 },
  { ym: '2411', refCol: 39, brkCol: 40, rateCol: 41 },
  { ym: '2412', refCol: 42, brkCol: 43, rateCol: 44 },
  { ym: '2501', refCol: 45, brkCol: 46, rateCol: 47 },
  { ym: '2502', refCol: 48, brkCol: 49, rateCol: 50 },
  { ym: '2503', refCol: 51, brkCol: 52, rateCol: 53 },
];

const FUTURE_MONTHS = [
  { ym: '2504', refCol: 55, targetCol: 69 },
  { ym: '2505', refCol: 56, targetCol: 70 },
  { ym: '2506', refCol: 57, targetCol: 71 },
  { ym: '2507', refCol: 58, targetCol: 72 },
  { ym: '2508', refCol: 59, targetCol: 73 },
  { ym: '2509', refCol: 60, targetCol: 74 },
  { ym: '2510', refCol: 61, targetCol: 75 },
  { ym: '2511', refCol: 62, targetCol: 76 },
  { ym: '2512', refCol: 63, targetCol: 77 },
  { ym: '2601', refCol: 64, targetCol: 78 },
  { ym: '2602', refCol: 65, targetCol: 79 },
  { ym: '2603', refCol: 66, targetCol: 80 },
];

function toNum(v: unknown): number {
  if (v === '' || v === undefined || v === null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : Math.round(n);
}

function toRate(v: unknown): string {
  if (v === '' || v === undefined || v === null) return '';
  const n = Number(v);
  if (isNaN(n)) return '';
  return String(Math.round(n * 10000) / 10000);
}

export interface ConvertResult {
  csv: string;
  storeCount: number;
  rowCount: number;
  sheetName: string;
}

export function convertExcelToCsv(arrayBuffer: ArrayBuffer): ConvertResult {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  // Try to find 新神 sheet, fall back to first sheet
  const sheetName = wb.SheetNames.includes('新神') ? '新神' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
  const dataRows = allRows.slice(1).filter(r => r[0] !== '' && r[0] !== undefined);

  const csvRows: string[][] = [];

  dataRows.forEach(r => {
    const code = String(r[1] || '');
    const name = String(r[4] || '');
    if (!code || !name) return;

    const isNg = r[5] === 'NG' ? '1' : '0';
    const rank = String(r[16] || r[15] || r[14] || '');

    const storeFields = [
      code,
      name,
      String(r[2] || ''),  // agencyName
      String(r[3] || ''),  // companyName
      String(r[13] || ''), // unit
      rank,
      String(r[12] || ''), // companyFlag
      isNg,
      String(r[7] || ''),  // ngReason
      String(r[6] || ''),  // ngMonth
      (r[8] === true || r[8] === 'TRUE') ? '1' : '0',  // isPriority
      (r[9] === true || r[9] === 'TRUE') ? '1' : '0',  // isPriorityQ3
    ];

    // Historical months
    for (const m of HISTORICAL_MONTHS) {
      const ref = toNum(r[m.refCol]);
      const brk = toNum(r[m.brkCol]);
      const rate = toRate(r[m.rateCol]);
      if (ref === 0 && brk === 0 && rate === '') continue;
      csvRows.push([...storeFields, m.ym, String(ref), String(brk), rate, '0']);
    }

    // Future months
    for (const m of FUTURE_MONTHS) {
      const ref = toNum(r[m.refCol]);
      const target = toNum(r[m.targetCol]);
      if (ref === 0 && target === 0) continue;
      csvRows.push([...storeFields, m.ym, String(ref), '0', '', String(target)]);
    }

    // If no metrics at all, still include one row
    const hasMetrics = HISTORICAL_MONTHS.some(m => toNum(r[m.refCol]) > 0 || toNum(r[m.brkCol]) > 0)
      || FUTURE_MONTHS.some(m => toNum(r[m.refCol]) > 0 || toNum(r[m.targetCol]) > 0);
    if (!hasMetrics) {
      csvRows.push([...storeFields, '', '', '', '', '']);
    }
  });

  const uniqueCodes = new Set(csvRows.map(r => r[0]));

  return {
    csv: Papa.unparse({ fields: [...CSV_HEADERS], data: csvRows }),
    storeCount: uniqueCodes.size,
    rowCount: csvRows.length,
    sheetName,
  };
}

export function getSheetNames(arrayBuffer: ArrayBuffer): string[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  return wb.SheetNames;
}
