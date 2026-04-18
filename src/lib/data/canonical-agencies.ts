/**
 * 正規 11 代理店 (インポート機能を持つ代理店)。
 *
 * agencies テーブルにここに無い行が入っていた場合は「企業 (companies)」が
 * 誤って agencies に登録されたレガシーデータと見なし、UI からは除外する。
 *
 * ID と名称は import API / parser と完全に一致させること。
 */
export const CANONICAL_AGENCIES = [
  { id: 'ag-unext', name: 'U-NEXT' },
  { id: 'ag-housemate', name: 'ハウスメイト' },
  { id: 'ag-rensa', name: 'レンサ' },
  { id: 'ag-ierabu', name: 'いえらぶ' },
  { id: 'ag-umx', name: 'UMX' },
  { id: 'ag-shelter', name: 'Shelter' },
  { id: 'ag-smasapo', name: 'スマサポ' },
  { id: 'ag-dual', name: 'DUAL' },
  { id: 'ag-fplain', name: 'エフプレイン' },
  { id: 'ag-vendor', name: 'ベンダー' },
  { id: 'ag-lastmile', name: 'ラストワンマイル' },
] as const;

export const CANONICAL_AGENCY_IDS: ReadonlySet<string> = new Set<string>(
  CANONICAL_AGENCIES.map(a => a.id)
);

export const CANONICAL_AGENCY_NAMES: ReadonlySet<string> = new Set<string>(
  CANONICAL_AGENCIES.map(a => a.name)
);

/** 表示用の並び順 (固定。新規追加時はここに追記) */
export const CANONICAL_AGENCY_ORDER: ReadonlyMap<string, number> = new Map<string, number>(
  CANONICAL_AGENCIES.map((a, i) => [a.id, i])
);

export function isCanonicalAgencyId(id: string | null | undefined): boolean {
  return !!id && CANONICAL_AGENCY_IDS.has(id);
}
