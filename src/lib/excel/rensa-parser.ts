/**
 * レンサ Excel パーサー
 * 対象シート:
 *   ① 連携実績 — 日本人通常 + グローバル通常 + グローバル入国前 を合算 → 取次数
 *   ② エイブル実績_グローバル — 2026列の数値のみ取次数として取得
 */
import * as XLSX from 'xlsx';

export interface RensaMetric {
  companyName: string;
  storeName: string;
  storeCode: string | null; // エイブル実績のみ店舗コードあり
  area: string | null;
  yearMonth: string; // YYMM
  referrals: number;
  source: 'renkei' | 'able_global'; // どのシート由来か
}

export interface RensaParseResult {
  metrics: RensaMetric[];
  sheetsProcessed: string[];
  companyCount: number;
  storeCount: number;
  errors: { sheet: string; row: number; message: string }[];
}

// 連携実績の列マッピング
// 日本人通常: 2024→col13-24, 2025→col26-37, 2026→col39-45
// グローバル通常: 2024→col48-59, 2025→col61-72, 2026→col74-77
// グローバル入国前: 2024→col80-91, 2025→col93-104, 2026→col106-109
interface YearBlock {
  year: number;
  startCol: number;
  months: number; // 何月分あるか
}

const RENKEI_NIHON: YearBlock[] = [
  { year: 2024, startCol: 13, months: 12 },
  { year: 2025, startCol: 26, months: 12 },
  { year: 2026, startCol: 39, months: 7 },
];
const RENKEI_GLOBAL: YearBlock[] = [
  { year: 2024, startCol: 48, months: 12 },
  { year: 2025, startCol: 61, months: 12 },
  { year: 2026, startCol: 74, months: 4 },
];
const RENKEI_NYUKOKU: YearBlock[] = [
  { year: 2024, startCol: 80, months: 12 },
  { year: 2025, startCol: 93, months: 12 },
  { year: 2026, startCol: 106, months: 4 },
];

// エイブル実績_グローバルの列マッピング (2026列のみ)
const ABLE_2026_START = 32; // 列32 = 2026年1月
const ABLE_2026_MONTHS = 4; // 1-4月

function toYYMM(year: number, month: number): string {
  return String(year).slice(2) + String(month).padStart(2, '0');
}

function getNum(row: unknown[], col: number): number {
  const v = row[col];
  if (v === null || v === undefined || v === '') return 0;
  return typeof v === 'number' ? Math.round(v) : parseInt(String(v)) || 0;
}

function parseRenkeiSheet(ws: XLSX.WorkSheet, errors: { sheet: string; row: number; message: string }[]): RensaMetric[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
  const metrics: RensaMetric[] = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row || row.length < 5) continue;

    const col0 = String(row[0] || '').trim();
    // 「除外」行はスキップ
    if (col0 === '除外') continue;
    // 空行・ヘッダスキップ
    const companyName = String(row[2] || '').trim();
    if (!companyName || companyName === '会社名') continue;

    const storeName = String(row[3] || '').trim();
    const displayName = storeName || companyName;
    const area = String(row[8] || '').trim() || null;

    // 3カテゴリの月別データを合算
    const allBlocks = [RENKEI_NIHON, RENKEI_GLOBAL, RENKEI_NYUKOKU];
    // year+month → 合算値
    const monthTotals = new Map<string, number>();

    for (const blocks of allBlocks) {
      for (const block of blocks) {
        for (let m = 0; m < block.months; m++) {
          const val = getNum(row, block.startCol + m);
          if (val === 0) continue;
          const key = toYYMM(block.year, m + 1);
          monthTotals.set(key, (monthTotals.get(key) || 0) + val);
        }
      }
    }

    for (const [yearMonth, referrals] of monthTotals) {
      if (referrals <= 0) continue;
      metrics.push({
        companyName,
        storeName: displayName,
        storeCode: null,
        area,
        yearMonth,
        referrals,
        source: 'renkei',
      });
    }
  }

  return metrics;
}

function parseAbleGlobalSheet(ws: XLSX.WorkSheet, errors: { sheet: string; row: number; message: string }[]): RensaMetric[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
  const metrics: RensaMetric[] = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row || row.length < 10) continue;

    const storeCode = String(row[8] || '').trim();
    const storeName = String(row[9] || '').trim();
    if (!storeCode || !storeName) continue;

    const department = String(row[2] || '').trim();
    const area = String(row[6] || '').trim() || null;

    // 2026年の月別データのみ (列32-35 = 1-4月)
    for (let m = 0; m < ABLE_2026_MONTHS; m++) {
      const val = getNum(row, ABLE_2026_START + m);
      if (val <= 0) continue;
      metrics.push({
        companyName: 'エイブル',
        storeName,
        storeCode,
        area: area || department || null,
        yearMonth: toYYMM(2026, m + 1),
        referrals: val,
        source: 'able_global',
      });
    }
  }

  return metrics;
}

export function parseRensaExcel(buffer: ArrayBuffer): RensaParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const errors: { sheet: string; row: number; message: string }[] = [];
  let allMetrics: RensaMetric[] = [];
  const sheetsProcessed: string[] = [];

  // ① 連携実績
  if (wb.SheetNames.includes('連携実績')) {
    sheetsProcessed.push('連携実績');
    const m = parseRenkeiSheet(wb.Sheets['連携実績'], errors);
    allMetrics = allMetrics.concat(m);
  }

  // ② エイブル実績_グローバル
  if (wb.SheetNames.includes('エイブル実績_グローバル')) {
    sheetsProcessed.push('エイブル実績_グローバル');
    const m = parseAbleGlobalSheet(wb.Sheets['エイブル実績_グローバル'], errors);
    allMetrics = allMetrics.concat(m);
  }

  if (sheetsProcessed.length === 0) {
    errors.push({ sheet: '(none)', row: 0, message: '「連携実績」「エイブル実績_グローバル」シートが見つかりませんでした' });
  }

  const companies = new Set(allMetrics.map(m => m.companyName));
  const stores = new Set(allMetrics.map(m => m.storeName));

  return {
    metrics: allMetrics,
    sheetsProcessed,
    companyCount: companies.size,
    storeCount: stores.size,
    errors,
  };
}
