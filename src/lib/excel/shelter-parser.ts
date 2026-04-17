/**
 * Shelter Excel パーサー
 * シート①「①【ラウンド用】取次数(週１回)」: 週次リスト数/通電数 → 月次合算
 * シート②「②-１取次、受注数(月１回) (2)」: 月次の光回線受注数合算 → 成約数
 *
 * 行構造:
 *   「○○(企業名)」+ col5="リスト連携数合計" → 企業合計行
 *   次行以降の店舗行: col1=所在地, col2=事業部, col4="店舗別", col5=店舗名
 */
import * as XLSX from 'xlsx';

export interface ShelterMetric {
  companyName: string;
  storeName: string;
  area: string | null;
  yearMonth: string;
  referrals: number;
  connections: number;
  brokerage: number;
}

export interface ShelterParseResult {
  metrics: ShelterMetric[];
  sheetsProcessed: string[];
  companyCount: number;
  storeCount: number;
  errors: { sheet: string; row: number; message: string }[];
}

/** 週ヘッダ "4/1~4/6" → 月番号 4 */
function weekToMonth(header: string): number | null {
  const m = header.match(/(\d{1,2})\//);
  return m ? parseInt(m[1]) : null;
}

function getNum(row: unknown[], col: number): number {
  const v = row[col];
  if (v === null || v === undefined || v === '') return 0;
  return typeof v === 'number' ? Math.round(v) : parseInt(String(v)) || 0;
}

/** シート①: 週次 → 月次合算 (取次数 + 通電数) */
function parseWeeklySheet(ws: XLSX.WorkSheet, baseYear: number, errors: { sheet: string; row: number; message: string }[]): Map<string, { refs: number; conns: number }> {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
  if (rows.length < 5) return new Map();

  // row2 = 週ヘッダ ("4/1~4/6" etc), row3 = "リスト数"/"通電数"
  const weekHeaders = rows[2] as unknown as unknown[];

  // 週→月マッピング: { col: number, month: number }[]
  const weekCols: { listCol: number; connCol: number; month: number }[] = [];
  for (let j = 6; j < (weekHeaders?.length || 0); j += 2) {
    const h = String(weekHeaders[j] || '');
    const month = weekToMonth(h);
    if (month !== null) {
      weekCols.push({ listCol: j, connCol: j + 1, month });
    }
  }

  // 年度の判定: baseYear=2025 → 4月=2504, 翌年1月=2601...
  function toYYMM(month: number): string {
    const year = month >= 4 ? baseYear : baseYear + 1;
    return String(year).slice(2) + String(month).padStart(2, '0');
  }

  // 企業合計行 (col3に企業名, col5="リスト連携数合計") から月次集計
  // ここでは企業合計行のみ使う (店舗別は合計に含まれる)
  const result = new Map<string, { refs: number; conns: number }>();

  let currentCompany = '';
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row) continue;

    const col3 = String(row[3] || '').trim();
    const col5 = String(row[5] || '').trim();

    // 企業合計行の検出
    if (col3 && col5 === 'リスト連携数合計') {
      // 合計行はスキップ (NTT東日本紹介... 等)
      if (col3.includes('合計') || col3.includes('NTT')) continue;
      currentCompany = col3;

      // この行の週次データを月次に合算
      for (const wc of weekCols) {
        const refs = getNum(row, wc.listCol);
        const conns = getNum(row, wc.connCol);
        if (refs === 0 && conns === 0) continue;

        const ym = toYYMM(wc.month);
        const key = `${currentCompany}__${ym}`;
        const prev = result.get(key) || { refs: 0, conns: 0 };
        prev.refs += refs;
        prev.conns += conns;
        result.set(key, prev);
      }
    }
  }

  return result;
}

/** シート②-1: 月次受注数 (光回線合算 = 成約数) */
function parseMonthlyOrderSheet(ws: XLSX.WorkSheet, baseYear: number, errors: { sheet: string; row: number; message: string }[]): Map<string, number> {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
  if (rows.length < 6) return new Map();

  // row2 = 月ヘッダ (col6="4月", col17="5月"...)
  const monthRow = rows[2] as unknown as unknown[];
  const monthBlocks: { startCol: number; month: number }[] = [];
  for (let j = 6; j < (monthRow?.length || 0); j++) {
    const h = String(monthRow[j] || '');
    const m = h.match(/(\d{1,2})月/);
    if (m) {
      monthBlocks.push({ startCol: j, month: parseInt(m[1]) });
    }
  }

  function toYYMM(month: number): string {
    const year = month >= 4 ? baseYear : baseYear + 1;
    return String(year).slice(2) + String(month).padStart(2, '0');
  }

  // row3 のヘッダから各月ブロック内の光回線列を特定
  // 各月ブロック: startCol=リスト連携数, startCol+1=光コラボ受注数, +2~+10=各光回線
  // 成約数 = col+2(SB光) + col+4(ドコモ光) + col+5(ビッグローブ光) + col+6(SONET光) + col+7(楽天光) + col+8(その他) + col+9(フレッツ光) + col+10(その他ネット)
  // 簡易: startCol+2 ~ startCol+10 の数値を全て合算

  const result = new Map<string, number>();

  for (let i = 5; i < rows.length; i++) {
    const row = rows[i] as unknown as unknown[];
    if (!row) continue;

    const col3 = String(row[3] || '').trim();
    const col5 = String(row[5] || '').trim();

    // 企業合計行
    if (col3 && col5 === 'リスト連携数合計') {
      if (col3.includes('合計') || col3.includes('NTT')) continue;

      for (const mb of monthBlocks) {
        // 光回線各列を合算 (startCol+2 ～ startCol+10)
        let brokerage = 0;
        for (let k = mb.startCol + 2; k <= mb.startCol + 10 && k < row.length; k++) {
          brokerage += getNum(row, k);
        }
        if (brokerage === 0) continue;

        const ym = toYYMM(mb.month);
        const key = `${col3}__${ym}`;
        result.set(key, (result.get(key) || 0) + brokerage);
      }
    }
  }

  return result;
}

export function parseShelterExcel(buffer: ArrayBuffer): ShelterParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const errors: { sheet: string; row: number; message: string }[] = [];
  const sheetsProcessed: string[] = [];

  // 年度を検出 (row1 "2025年度" → 2025)
  let baseYear = 2025;
  const s1Name = wb.SheetNames.find(n => n.includes('取次数'));
  if (s1Name) {
    const ws = wb.Sheets[s1Name];
    const r1 = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, range: { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } } });
    const row = r1[0] as unknown as unknown[];
    if (row) {
      for (const c of row) {
        const m = String(c || '').match(/(\d{4})年/);
        if (m) { baseYear = parseInt(m[1]); break; }
      }
    }
  }

  // シート①: 取次数 + 通電数
  const weeklyData = new Map<string, { refs: number; conns: number }>();
  const s1 = wb.SheetNames.find(n => n.includes('取次数') && n.includes('週'));
  if (s1) {
    sheetsProcessed.push(s1);
    const d = parseWeeklySheet(wb.Sheets[s1], baseYear, errors);
    d.forEach((v, k) => weeklyData.set(k, v));
  }

  // シート②-1: 成約数
  const orderData = new Map<string, number>();
  const s2 = wb.SheetNames.find(n => n.includes('取次、受注数') && !n.includes('前年'));
  if (s2) {
    sheetsProcessed.push(s2);
    const d = parseMonthlyOrderSheet(wb.Sheets[s2], baseYear, errors);
    d.forEach((v, k) => orderData.set(k, v));
  }

  // マージ: 企業×月 → { refs, conns, brokerage }
  const allKeys = new Set([...weeklyData.keys(), ...orderData.keys()]);
  const metrics: ShelterMetric[] = [];
  const companies = new Set<string>();

  for (const key of allKeys) {
    const [companyName, yearMonth] = key.split('__');
    const weekly = weeklyData.get(key) || { refs: 0, conns: 0 };
    const brokerage = orderData.get(key) || 0;
    if (weekly.refs === 0 && weekly.conns === 0 && brokerage === 0) continue;

    companies.add(companyName);
    metrics.push({
      companyName,
      storeName: companyName, // Shelter は企業合計のみ
      area: null,
      yearMonth,
      referrals: weekly.refs,
      connections: weekly.conns,
      brokerage,
    });
  }

  if (sheetsProcessed.length === 0) {
    errors.push({ sheet: '(none)', row: 0, message: 'Shelter のシートが見つかりません' });
  }

  return {
    metrics,
    sheetsProcessed,
    companyCount: companies.size,
    storeCount: companies.size,
    errors,
  };
}
