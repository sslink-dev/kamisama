/**
 * スマサポ Excel パーサー
 * シート「取次数」: col3=会社名, col4=店舗名, col5=取次数 (当月)
 * シート「受注数」: col3=会社名, col4=店舗名, col11=総計(成約数) (当月)
 * シート「受注数（前年）」: 月別の光回線受注数 (前年データ)
 *
 * 月はファイル名 "202603" から取得
 */
import * as XLSX from 'xlsx';

export interface SmasapoMetric {
  companyName: string;
  storeName: string;
  area: string | null;
  yearMonth: string;
  referrals: number;
  brokerage: number;
}

export interface SmasapoParseResult {
  metrics: SmasapoMetric[];
  sheetsProcessed: string[];
  companyCount: number;
  storeCount: number;
  errors: { sheet: string; row: number; message: string }[];
}

function getNum(row: unknown[], col: number): number {
  const v = row[col];
  if (v === null || v === undefined || v === '') return 0;
  return typeof v === 'number' ? Math.round(v) : parseInt(String(v)) || 0;
}

function detectYearMonth(fileName: string): string {
  const m = fileName.match(/(\d{4})(\d{2})/);
  if (m) {
    const yy = m[1].slice(2);
    return yy + m[2];
  }
  return '2603';
}

/** 取次数シート: 会社名 + 店舗名 + 個数 */
function parseReferrals(ws: XLSX.WorkSheet, yearMonth: string): Map<string, { refs: number; area: string | null }> {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
  const result = new Map<string, { refs: number; area: string | null }>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row) continue;

    const area = String(row[2] || '').trim() || null;
    const companyName = String(row[3] || '').trim();
    const storeName = String(row[4] || '').trim();
    if (!companyName) continue;
    // 合計行スキップ
    if (companyName.includes('合計') || companyName.includes('NTT')) continue;

    const refs = getNum(row, 5);
    if (refs <= 0) continue;

    const key = `${companyName}__${storeName || companyName}`;
    const prev = result.get(key) || { refs: 0, area };
    prev.refs += refs;
    result.set(key, prev);
  }

  return result;
}

/** 受注数シート: 会社名 + 店舗名 + 総計(col11) */
function parseBrokerage(ws: XLSX.WorkSheet): Map<string, number> {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
  const result = new Map<string, number>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row) continue;

    const companyName = String(row[3] || '').trim();
    const storeName = String(row[4] || '').trim();
    if (!companyName) continue;
    if (companyName.includes('合計') || companyName.includes('NTT')) continue;

    const total = getNum(row, 11);
    if (total <= 0) continue;

    const key = `${companyName}__${storeName || companyName}`;
    result.set(key, (result.get(key) || 0) + total);
  }

  return result;
}

/** 受注数（前年）シート: 月別の光回線受注数を合算 */
function parsePriorYear(ws: XLSX.WorkSheet, errors: { sheet: string; row: number; message: string }[]): SmasapoMetric[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
  if (rows.length < 5) return [];

  // row2: 月ヘッダ "4月　集計　光コラボ受注数", "5月　集計..." etc
  // row3: 列ヘッダ col1=所在地, col3=会社名, col4=店舗名, col5=4月集計, col6-11=各光回線...
  const monthRow = rows[2] as unknown as unknown[];
  const headerRow = rows[3] as unknown as unknown[];

  // 月ブロック検出: "○月" + "集計" を含む列 = その月の集計列
  // 次の月ブロックまでの光回線列を合算 → 成約数
  const monthBlocks: { month: number; startCol: number }[] = [];
  for (let j = 5; j < (monthRow?.length || 0); j++) {
    const h = String(monthRow[j] || '');
    const m = h.match(/(\d{1,2})月/);
    if (m && h.includes('集計')) {
      monthBlocks.push({ month: parseInt(m[1]), startCol: j });
    }
  }

  if (monthBlocks.length === 0) return [];

  // 年推定: row2 に "2024年" 等があるかチェック
  let year = 2024;
  for (const c of (rows[1] as unknown as unknown[]) || []) {
    const m = String(c || '').match(/(\d{4})年/);
    if (m) { year = parseInt(m[1]); break; }
  }

  const metrics: SmasapoMetric[] = [];

  for (let i = 4; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row) continue;

    const area = String(row[1] || '').trim() || null;
    const companyName = String(row[3] || '').trim();
    const storeName = String(row[4] || '').trim();
    if (!companyName) continue;
    if (companyName.includes('合計') || companyName.includes('NTT')) continue;

    for (let mi = 0; mi < monthBlocks.length; mi++) {
      const mb = monthBlocks[mi];
      const nextStart = mi + 1 < monthBlocks.length ? monthBlocks[mi + 1].startCol : mb.startCol + 7;

      // 集計列の次列 ～ 次月の集計列-1 の光回線数値を合算
      let brokerage = 0;
      for (let k = mb.startCol + 1; k < nextStart; k++) {
        brokerage += getNum(row, k);
      }
      if (brokerage <= 0) continue;

      const mm = String(mb.month).padStart(2, '0');
      const adjYear = mb.month >= 4 ? year : year + 1;
      const yy = String(adjYear).slice(2);

      metrics.push({
        companyName,
        storeName: storeName || companyName,
        area,
        yearMonth: `${yy}${mm}`,
        referrals: 0,
        brokerage,
      });
    }
  }

  return metrics;
}

export function parseSmasapoExcel(buffer: ArrayBuffer, fileName: string = ''): SmasapoParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const errors: { sheet: string; row: number; message: string }[] = [];
  const sheetsProcessed: string[] = [];
  const yearMonth = detectYearMonth(fileName);

  let allMetrics: SmasapoMetric[] = [];

  // 取次数
  if (wb.SheetNames.includes('取次数')) {
    sheetsProcessed.push('取次数');
    const refsMap = parseReferrals(wb.Sheets['取次数'], yearMonth);

    // 受注数
    const brkMap = new Map<string, number>();
    if (wb.SheetNames.includes('受注数')) {
      sheetsProcessed.push('受注数');
      const b = parseBrokerage(wb.Sheets['受注数']);
      b.forEach((v, k) => brkMap.set(k, v));
    }

    // マージ
    const allKeys = new Set([...refsMap.keys(), ...brkMap.keys()]);
    for (const key of allKeys) {
      const [companyName, storeName] = key.split('__');
      const r = refsMap.get(key);
      const b = brkMap.get(key) || 0;
      allMetrics.push({
        companyName,
        storeName,
        area: r?.area || null,
        yearMonth,
        referrals: r?.refs || 0,
        brokerage: b,
      });
    }
  }

  // 受注数（前年）
  const priorSheet = wb.SheetNames.find(n => n.includes('前年'));
  if (priorSheet) {
    sheetsProcessed.push(priorSheet);
    const priorMetrics = parsePriorYear(wb.Sheets[priorSheet], errors);
    allMetrics = allMetrics.concat(priorMetrics);
  }

  if (sheetsProcessed.length === 0) {
    errors.push({ sheet: '(none)', row: 0, message: 'スマサポのシートが見つかりません' });
  }

  const companies = new Set(allMetrics.map(m => m.companyName));
  const stores = new Set(allMetrics.map(m => `${m.companyName}_${m.storeName}`));

  return {
    metrics: allMetrics,
    sheetsProcessed,
    companyCount: companies.size,
    storeCount: stores.size,
    errors,
  };
}
