/**
 * ハウスメイト FAX送付枚数報告 Excel パーサー。
 * シート構成: 【ユニット別】20XX年間Total (年ごと)
 * 行: 店舗コード | 店舗名 | 1月〜12月 | TOTAL
 * 数値 = 取次数（FAX送付枚数）
 */
import * as XLSX from 'xlsx';

export interface HousemateMetric {
  storeCode: string;
  storeName: string;
  unit: string;       // 第Nユニット
  yearMonth: string;   // YYMM
  referrals: number;
}

export interface HousemateParseResult {
  metrics: HousemateMetric[];
  sheetsProcessed: string[];
  storeCount: number;
  errors: { sheet: string; row: number; message: string }[];
}

export function parseHousemateExcel(buffer: ArrayBuffer): HousemateParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });

  const metrics: HousemateMetric[] = [];
  const sheetsProcessed: string[] = [];
  const storeSet = new Set<string>();
  const errors: { sheet: string; row: number; message: string }[] = [];

  // 「【ユニット別】20XX年間Total」パターンのシートを処理
  for (const sheetName of wb.SheetNames) {
    const yearMatch = sheetName.match(/(\d{4})年間/);
    if (!yearMatch) continue;

    const year = parseInt(yearMatch[1]);
    const yy = String(year).slice(2); // 2026 → "26"
    sheetsProcessed.push(sheetName);

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });

    let currentUnit = '';

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown as unknown[];
      if (!row || row.length < 3) continue;

      const col0 = String(row[0] || '').trim();
      const col1 = String(row[1] || '').trim();

      // ユニット合計行 → ユニット名を記録してスキップ
      if (col0.includes('ユニット')) {
        currentUnit = col0;
        continue;
      }

      // 空行 / ヘッダ行スキップ
      if (!col0 || col0 === '店舗コード' || col1 === '' || col0 === 'TOTAL') continue;

      // 合計行スキップ
      if (col1 === '合計') continue;

      const storeCode = col0;
      const storeName = col1;
      storeSet.add(storeCode);

      // 1月〜12月 (列 index 2〜13)
      for (let m = 0; m < 12; m++) {
        const val = row[m + 2];
        const num = typeof val === 'number' ? Math.round(val) : parseInt(String(val || '0')) || 0;
        if (num === 0 && (val === undefined || val === null || val === '')) continue; // 空欄はスキップ

        const mm = String(m + 1).padStart(2, '0');
        metrics.push({
          storeCode,
          storeName,
          unit: currentUnit,
          yearMonth: `${yy}${mm}`,
          referrals: num,
        });
      }
    }
  }

  if (sheetsProcessed.length === 0) {
    errors.push({ sheet: '(none)', row: 0, message: '「【ユニット別】20XX年間Total」形式のシートが見つかりませんでした' });
  }

  return {
    metrics,
    sheetsProcessed,
    storeCount: storeSet.size,
    errors,
  };
}
