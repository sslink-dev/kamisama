// CSV の必須ヘッダ。通電数は任意 (既存 CSV との後方互換のため)
export const CSV_HEADERS = [
  '店舗コード',
  '店舗名',
  '代理店名',
  '企業名',
  'ユニット',
  'ランク',
  '企業フラグ',
  'NG状態',
  'NG理由',
  'NG月',
  '重点',
  '3Q重点',
  '年月',
  '取次数',
  '仲介数',
  '取次率',
  '目標取次数',
] as const;

export type CsvRow = {
  店舗コード: string;
  店舗名: string;
  代理店名: string;
  企業名: string;
  ユニット: string;
  ランク: string;
  企業フラグ: string;
  NG状態: string;
  NG理由: string;
  NG月: string;
  重点: string;
  '3Q重点': string;
  年月: string;
  取次数: string;
  通電数?: string; // 任意: 通電数カラムがある場合のみ
  仲介数: string;
  取次率: string;
  目標取次数: string;
};
