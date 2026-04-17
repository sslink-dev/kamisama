/**
 * エフプレイン Excel パーサー
 * 1行=1取次。col4「現在状況」が「受付」「NG」以外 → 成約
 * 成約の内訳は col4 の文字列から光回線名を抽出
 */
import * as XLSX from 'xlsx';

export interface FplainMetric {
  companyName: string;
  staffName: string | null;
  yearMonth: string;
  isContracted: boolean;
  contractType: string | null;
  hasFreenet: boolean;
}

export interface FplainParseResult {
  metrics: FplainMetric[];
  companyCount: number;
  staffCount: number;
  totalRows: number;
  errors: { row: number; message: string }[];
}

function excelSerialToYYMM(serial: number): string {
  const d = new Date((serial - 25569) * 86400000);
  return String(d.getUTCFullYear()).slice(2) + String(d.getUTCMonth() + 1).padStart(2, '0');
}

const NG_STATUSES = new Set(['受付', 'NG']);

function isContracted(status: string): boolean {
  if (!status) return false;
  // 「受付」「NG」を含む場合は成約ではない
  // 「○○キャンセル」も成約ではない
  if (NG_STATUSES.has(status)) return false;
  if (status.includes('キャンセル')) return false;
  if (status.includes('NG')) return false;
  return true;
}

function extractContractType(status: string): string | null {
  if (!status) return null;
  // "SB光受注" → "SB光", "NURO受注" → "NURO" etc
  const m = status.match(/(.+?)(?:受注|開通|完了)/);
  return m ? m[1].trim() : status;
}

export function parseFplainExcel(buffer: ArrayBuffer): FplainParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const errors: { row: number; message: string }[] = [];
  const ws = wb.Sheets[wb.SheetNames[0]]; // Sheet1
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });

  const metrics: FplainMetric[] = [];
  const companies = new Set<string>();
  const staffSet = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row) continue;

    const companyName = String(row[0] || '').trim();
    if (!companyName) continue;

    const rawDate = row[1];
    if (typeof rawDate !== 'number' || rawDate < 40000) continue;

    const yearMonth = excelSerialToYYMM(rawDate);
    const staffName = String(row[3] || '').trim() || null;
    const status = String(row[4] || '').trim();
    const freenet = String(row[7] || '').trim();

    companies.add(companyName);
    if (staffName) staffSet.add(staffName);

    const contracted = isContracted(status);
    metrics.push({
      companyName,
      staffName,
      yearMonth,
      isContracted: contracted,
      contractType: contracted ? extractContractType(status) : null,
      hasFreenet: freenet === '有',
    });
  }

  return {
    metrics,
    companyCount: companies.size,
    staffCount: staffSet.size,
    totalRows: rows.length - 1,
    errors,
  };
}
