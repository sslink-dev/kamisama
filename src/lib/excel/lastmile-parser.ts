/**
 * ラストワンマイル Excel パーサー
 *
 * LOM シート:
 *   col7:  最新対応結果 → "不備"/"同一企業"/"重複" 以外 = 取次
 *   col8:  最新対応者_テキスト → 個人実績
 *   col11: 最新中区分 → "通電" = 通電
 *   col13: 最新判定結果 → "有効" = 有効
 *   col19: 引受会社 → 企業名
 *   col20: 店舗名
 *   col66: 作成日時 → 年月
 *   col69: 獲得回線 → 値あり = 成約
 *   col84: 獲得区分 → "不動産" のみ対象
 *
 * noiatto シート:
 *   col1:  取引先名 → 企業名
 *   col2:  不動産店舗名 → 店舗名
 *   col4:  不動産担当者 → 個人実績
 *   col13: 通電日 → 日付あり = 通電
 *   col14: 登録日 → 年月 & 取次
 */
import * as XLSX from 'xlsx';

export interface LastmileMetric {
  companyName: string;
  storeName: string;
  staffName: string | null;
  yearMonth: string;
  isReferral: boolean;
  isConnected: boolean;
  isContracted: boolean;
  isEffective: boolean;
  contractDetail: string | null;
  source: 'lom' | 'noiatto';
}

export interface LastmileParseResult {
  metrics: LastmileMetric[];
  sheetsProcessed: string[];
  companyCount: number;
  storeCount: number;
  totalRows: number;
  errors: { sheet: string; row: number; message: string }[];
}

const EXCLUDE_RESULTS = ['不備', '同一企業', '重複', '不備架電停止案件', '不備同一企業重複'];

function excelSerialToYYMM(serial: number): string {
  const d = new Date((serial - 25569) * 86400000);
  return String(d.getUTCFullYear()).slice(2) + String(d.getUTCMonth() + 1).padStart(2, '0');
}

function isExcluded(result: string): boolean {
  if (!result) return false;
  return EXCLUDE_RESULTS.some(ex => result.includes(ex));
}

function parseLOM(ws: XLSX.WorkSheet): LastmileMetric[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
  const metrics: LastmileMetric[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row) continue;

    const acqType = String(row[84] || '').trim();
    if (acqType !== '不動産') continue;

    const result = String(row[7] || '').trim();
    if (isExcluded(result)) continue;

    const companyName = String(row[19] || '').trim();
    const storeName = String(row[20] || '').trim();
    if (!companyName && !storeName) continue;

    // 年月: col66 (作成日時) or col1 (通電日)
    let yearMonth = '';
    const createDate = row[66];
    if (typeof createDate === 'number' && createDate > 40000) {
      yearMonth = excelSerialToYYMM(createDate);
    } else {
      const connDate = row[1];
      if (typeof connDate === 'number' && connDate > 40000) {
        yearMonth = excelSerialToYYMM(connDate);
      }
    }
    if (!yearMonth) continue;

    const midCategory = String(row[11] || '').trim();
    const judgement = String(row[13] || '').trim();
    const lineResult = String(row[69] || '').trim();
    const staffText = String(row[8] || '').trim();

    metrics.push({
      companyName: companyName || storeName,
      storeName: storeName || companyName,
      staffName: staffText || null,
      yearMonth,
      isReferral: true, // 獲得区分=不動産 & 除外以外 = 取次
      isConnected: midCategory === '通電',
      isContracted: lineResult !== '',
      isEffective: judgement === '有効',
      contractDetail: lineResult || null,
      source: 'lom',
    });
  }

  return metrics;
}

function parseNoiatto(ws: XLSX.WorkSheet): LastmileMetric[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
  const metrics: LastmileMetric[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row) continue;

    const companyName = String(row[1] || '').trim();
    const storeName = String(row[2] || '').trim();
    if (!companyName && !storeName) continue;

    // 登録日 (col14) → 年月 & 取次
    const regDate = row[14];
    if (typeof regDate !== 'number' || regDate < 40000) continue;
    const yearMonth = excelSerialToYYMM(regDate);

    // 通電日 (col13) → 日付あり = 通電
    const connDate = row[13];
    const isConnected = typeof connDate === 'number' && connDate > 40000;

    const staffName = String(row[4] || '').trim() || null;

    metrics.push({
      companyName: companyName || storeName,
      storeName: storeName || companyName,
      staffName,
      yearMonth,
      isReferral: true,
      isConnected,
      isContracted: false, // noiatto は成約なし
      isEffective: false,  // noiatto は有効数なし
      contractDetail: null,
      source: 'noiatto',
    });
  }

  return metrics;
}

export function parseLastmileExcel(buffer: ArrayBuffer): LastmileParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const errors: { sheet: string; row: number; message: string }[] = [];
  const sheetsProcessed: string[] = [];
  let allMetrics: LastmileMetric[] = [];

  if (wb.SheetNames.includes('LOM')) {
    sheetsProcessed.push('LOM');
    allMetrics = allMetrics.concat(parseLOM(wb.Sheets['LOM']));
  }

  if (wb.SheetNames.includes('noiatto')) {
    sheetsProcessed.push('noiatto');
    allMetrics = allMetrics.concat(parseNoiatto(wb.Sheets['noiatto']));
  }

  if (sheetsProcessed.length === 0) {
    errors.push({ sheet: '(none)', row: 0, message: '「LOM」「noiatto」シートが見つかりません' });
  }

  const companies = new Set(allMetrics.map(m => m.companyName));
  const stores = new Set(allMetrics.map(m => `${m.companyName}_${m.storeName}`));

  return {
    metrics: allMetrics,
    sheetsProcessed,
    companyCount: companies.size,
    storeCount: stores.size,
    totalRows: allMetrics.length,
    errors,
  };
}
