/**
 * いえらぶ Excel パーサー
 * 対象シート: いえらぶMaster, リスト外店舗
 * 「○月 データ」列から取次数を抽出。
 * 月順を追って年を推定 (12月→1月 で year++)。
 */
import * as XLSX from 'xlsx';

export interface IerabuMetric {
  companyName: string;
  storeName: string;
  groupId: string;
  prefecture: string | null;
  yearMonth: string; // YYMM
  referrals: number;
}

export interface IerabuParseResult {
  metrics: IerabuMetric[];
  sheetsProcessed: string[];
  companyCount: number;
  storeCount: number;
  errors: { sheet: string; row: number; message: string }[];
}

interface DataColumn {
  col: number;
  month: number; // 1-12
}

/**
 * ヘッダ行をスキャンして「○月\nデータ」or「○月 データ」列を検出
 */
function findDataColumns(headerRow: unknown[]): DataColumn[] {
  const cols: DataColumn[] = [];
  for (let j = 0; j < headerRow.length; j++) {
    const h = String(headerRow[j] || '');
    // "6月\nデータ" or "6月データ" or "1月データ"
    const m = h.match(/(\d{1,2})月[\s\n]*データ/);
    if (m) {
      cols.push({ col: j, month: parseInt(m[1]) });
    }
  }
  return cols;
}

/**
 * 月の並びから年を推定する。
 * ファイル名から終了年月を推定するのが理想だが、
 * ここではシンプルに: 最初の月が6月 → 2024年スタートと仮定。
 * 12月→1月で年が繰り上がる。
 */
function assignYears(cols: DataColumn[], startYear: number): { col: number; yearMonth: string }[] {
  let year = startYear;
  let prevMonth = 0;
  return cols.map(c => {
    if (c.month <= prevMonth) year++;
    prevMonth = c.month;
    const yy = String(year).slice(2);
    const mm = String(c.month).padStart(2, '0');
    return { col: c.col, yearMonth: `${yy}${mm}` };
  });
}

function parseSheet(
  ws: XLSX.WorkSheet,
  sheetName: string,
  companyCol: number,   // アカウント名 or 会社名
  storeCol: number,     // 店名
  groupIdCol: number,   // 会員GroupID
  prefectureCol: number, // 都道府県
  errors: { sheet: string; row: number; message: string }[]
): IerabuMetric[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
  if (rows.length < 2) return [];

  // ヘッダ行 (row 0) からデータ列を検出
  const headerRow = rows[0] as unknown as unknown[];
  const dataCols = findDataColumns(headerRow);
  if (dataCols.length === 0) {
    errors.push({ sheet: sheetName, row: 0, message: '「○月データ」列が見つかりません' });
    return [];
  }

  // 年を割り当て (最初の月が6月 → 2024年開始)
  const startYear = dataCols[0].month >= 4 ? 2024 : 2025;
  const mappedCols = assignYears(dataCols, startYear);

  const metrics: IerabuMetric[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row || row.length < storeCol + 1) continue;

    const companyName = String(row[companyCol] || '').trim();
    const storeName = String(row[storeCol] || '').trim();
    if (!storeName && !companyName) continue;

    const groupId = String(row[groupIdCol] || '').trim();
    const prefecture = String(row[prefectureCol] || '').trim() || null;
    const displayStore = storeName || companyName;
    const displayCompany = companyName || storeName;

    for (const mc of mappedCols) {
      const val = row[mc.col];
      const num = typeof val === 'number' ? Math.round(val) : parseInt(String(val || '0')) || 0;
      if (num <= 0) continue;

      metrics.push({
        companyName: displayCompany,
        storeName: displayStore,
        groupId,
        prefecture,
        yearMonth: mc.yearMonth,
        referrals: num,
      });
    }
  }

  return metrics;
}

export function parseIerabuExcel(buffer: ArrayBuffer): IerabuParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const errors: { sheet: string; row: number; message: string }[] = [];
  let allMetrics: IerabuMetric[] = [];
  const sheetsProcessed: string[] = [];

  // いえらぶMaster: col3=アカウント名(企業), col4=店名, col2=GroupID, col6=都道府県
  if (wb.SheetNames.includes('いえらぶMaster')) {
    sheetsProcessed.push('いえらぶMaster');
    const m = parseSheet(wb.Sheets['いえらぶMaster'], 'いえらぶMaster', 3, 4, 2, 6, errors);
    allMetrics = allMetrics.concat(m);
  }

  // リスト外店舗: col3=アカウント名(missing sometimes), col4=店名, col2=GroupID, col6=都道府県
  if (wb.SheetNames.includes('リスト外店舗')) {
    sheetsProcessed.push('リスト外店舗');
    const m = parseSheet(wb.Sheets['リスト外店舗'], 'リスト外店舗', 3, 4, 2, 6, errors);
    allMetrics = allMetrics.concat(m);
  }

  if (sheetsProcessed.length === 0) {
    errors.push({ sheet: '(none)', row: 0, message: '「いえらぶMaster」「リスト外店舗」シートが見つかりませんでした' });
  }

  const companies = new Set(allMetrics.map(m => m.companyName));
  const stores = new Set(allMetrics.map(m => `${m.groupId}_${m.storeName}`));

  return {
    metrics: allMetrics,
    sheetsProcessed,
    companyCount: companies.size,
    storeCount: stores.size,
    errors,
  };
}
