/**
 * ベンダー Excel パーサー
 * 1行=1紹介。col12「コール結果_回線」で判定
 * 取次: col12 = "受注成立"
 * 通電: col12 が "長期留守"/"留守"/"連絡保留"/空白 以外
 * 成約: col12 = "受注成立" かつ col13 に文言あり
 */
import * as XLSX from 'xlsx';

export interface VendorMetric {
  companyName: string;
  storeName: string;
  staffName: string | null;
  yearMonth: string;
  isReferral: boolean;    // 受注成立 = 取次
  isConnected: boolean;   // 通電
  isContracted: boolean;  // 成約
  contractDetail: string | null; // 成約内訳
}

export interface VendorParseResult {
  metrics: VendorMetric[];
  companyCount: number;
  storeCount: number;
  totalRows: number;
  errors: { row: number; message: string }[];
}

const NON_CONNECT = new Set(['長期留守', '留守', '連絡保留', '']);

function excelSerialToYYMM(serial: number): string {
  const d = new Date((serial - 25569) * 86400000);
  return String(d.getUTCFullYear()).slice(2) + String(d.getUTCMonth() + 1).padStart(2, '0');
}

export function parseVendorExcel(buffer: ArrayBuffer): VendorParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const errors: { row: number; message: string }[] = [];
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });

  const metrics: VendorMetric[] = [];
  const companies = new Set<string>();
  const stores = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row) continue;

    const rawDate = row[0];
    if (typeof rawDate !== 'number' || rawDate < 40000) continue;

    const yearMonth = excelSerialToYYMM(rawDate);
    const callResult = String(row[12] || '').trim();
    const callDetail = String(row[13] || '').trim();
    const companyName = String(row[23] || '').trim();
    const storeName = String(row[24] || '').trim();
    const staffName = String(row[25] || '').trim() || null;

    if (!companyName) continue;
    companies.add(companyName);
    if (storeName) stores.add(storeName);

    const isReferral = callResult === '受注成立';
    const isConnected = callResult !== '' && !NON_CONNECT.has(callResult);
    const isContracted = isReferral && callDetail !== '';

    metrics.push({
      companyName,
      storeName: storeName || companyName,
      staffName,
      yearMonth,
      isReferral,
      isConnected,
      isContracted,
      contractDetail: isContracted ? callDetail : null,
    });
  }

  return { metrics, companyCount: companies.size, storeCount: stores.size, totalRows: rows.length - 1, errors };
}
