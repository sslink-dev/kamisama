/**
 * U-NEXT 週次報告 Excel の「元データ」シートをパースし、
 * referral_transactions に投入する構造体に変換する。
 */
import * as XLSX from 'xlsx';

export interface ParsedTransaction {
  agencyName: string;
  inquiryDate: string;      // ISO 日付 YYYY-MM-DD
  storeCode: string;
  storeName: string;
  staffCode: string | null;
  staffName: string | null;
  department: string | null;
  ngReason: string | null;
  callStatus: string | null;
  serviceType: string | null;
  yearMonth: string;         // YYMM 形式
  isConnected: boolean;
  isContracted: boolean;
}

export interface UnextParseResult {
  transactions: ParsedTransaction[];
  sheetName: string;
  errors: { row: number; message: string }[];
  totalRows: number;
}

// Excel の日付シリアル値 → Date
function excelSerialToDate(serial: number): Date {
  // Excel epoch = 1899-12-30, 但し1900/2/29バグ補正
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const ms = epoch.getTime() + serial * 86400000;
  return new Date(ms);
}

// Date → YYMM 形式
function toYearMonth(d: Date): string {
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return yy + mm;
}

// Date → ISO 日付
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// 「契」始まりで成約判定
function isContracted(callStatus: string | undefined | null): boolean {
  if (!callStatus) return false;
  return callStatus.startsWith('契');
}

// フレッツNG理由が空 → 通電成功
function isConnected(ngReason: string | undefined | null): boolean {
  if (!ngReason || ngReason.trim() === '') return true;
  return false;
}

/**
 * 「元データ」シートを自動検出して優先的にパースする。
 * 見つからなければ最もトランザクション的な構造のシートを選ぶ。
 */
function findRawDataSheet(wb: XLSX.WorkBook): string | null {
  // 「元データ」を優先
  const preferred = ['元データ', 'データ貼付'];
  for (const name of preferred) {
    if (wb.SheetNames.includes(name)) return name;
  }
  // ヘッダ行に「代理店CD」「取次支店CD」があるシートを探す
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const firstRow = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, range: 0 });
    if (firstRow.length > 0) {
      const headers = (firstRow[0] as unknown as unknown[]).map(String);
      if (headers.includes('代理店CD') && headers.includes('取次支店CD')) return name;
    }
  }
  return null;
}

export function parseUnextExcel(buffer: ArrayBuffer): UnextParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName = findRawDataSheet(wb);
  if (!sheetName) {
    return {
      transactions: [],
      sheetName: '(not found)',
      errors: [{ row: 0, message: '「元データ」シートが見つかりませんでした。Excel ファイルを確認してください。' }],
      totalRows: 0,
    };
  }

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  const transactions: ParsedTransaction[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header

    // 代理店CD が空ならスキップ
    const agencyName = String(row['代理店CD'] || '').trim();
    if (!agencyName) continue;

    // 問い合わせ日 (Excel シリアルまたは文字列)
    const rawDate = row['問い合わせ日'];
    let date: Date;
    if (typeof rawDate === 'number') {
      date = excelSerialToDate(rawDate);
    } else if (rawDate instanceof Date) {
      date = rawDate;
    } else {
      const parsed = new Date(String(rawDate));
      if (isNaN(parsed.getTime())) {
        errors.push({ row: rowNum, message: `無効な日付: ${rawDate}` });
        continue;
      }
      date = parsed;
    }

    // 取次支店
    const storeCode = String(row['取次支店CD'] || '').trim();
    const storeName = String(row['取次支店名'] || '').trim();
    if (!storeCode || !storeName) {
      errors.push({ row: rowNum, message: '取次支店CDまたは支店名が空です' });
      continue;
    }

    // 担当者
    let staffCode = String(row['取次担当者CD'] || '').trim() || null;
    let staffName = String(row['取次担当者名'] || '').trim() || null;
    if (staffCode === '不明' || staffName === '不明') {
      staffCode = null;
      staffName = null;
    }

    const department = String(row['取次部署名'] || '').trim() || null;
    const ngReason = String(row['フレッツNG理由'] || '').trim() || null;
    const callStatus = String(row['第2コールステータス'] || '').trim() || null;
    const serviceType = String(row['フレッツ申込サービス'] || '').trim() || null;

    transactions.push({
      agencyName,
      inquiryDate: toIsoDate(date),
      storeCode,
      storeName,
      staffCode,
      staffName,
      department,
      ngReason,
      callStatus,
      serviceType,
      yearMonth: toYearMonth(date),
      isConnected: isConnected(ngReason),
      isContracted: isContracted(callStatus),
    });
  }

  return {
    transactions,
    sheetName,
    errors,
    totalRows: rows.length,
  };
}
