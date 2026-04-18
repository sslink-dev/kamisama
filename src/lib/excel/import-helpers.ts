/**
 * Import API 呼び出し用の共通ヘルパー。
 * - JSON 以外のレスポンス (Vercel HTML エラーページ等) を分かりやすいエラーに変換
 * - サーバー負荷削減のため、metrics を (store, yearMonth) 単位で client 側で集約
 */

export interface GenericMetric {
  companyName: string;
  storeName: string;
  storeCode?: string | null;
  storeId?: string | null;
  area?: string | null;
  yearMonth: string;
  referrals?: number;
  connections?: number;
  brokerage?: number;
  effective?: number;
}

/** 同一 (companyName, storeName, yearMonth) を合算して行数を圧縮 */
export function aggregateMetrics<T extends GenericMetric>(metrics: T[]): T[] {
  const map = new Map<string, T>();
  for (const m of metrics) {
    const key = `${m.companyName}__${m.storeName}__${m.yearMonth}__${m.storeCode || ''}__${m.storeId || ''}`;
    const prev = map.get(key);
    if (prev) {
      prev.referrals = (prev.referrals || 0) + (m.referrals || 0);
      prev.connections = (prev.connections || 0) + (m.connections || 0);
      prev.brokerage = (prev.brokerage || 0) + (m.brokerage || 0);
      prev.effective = (prev.effective || 0) + (m.effective || 0);
      // area は最初の値を保持
    } else {
      map.set(key, { ...m });
    }
  }
  return [...map.values()];
}

export interface ImportResponse {
  ok: boolean;
  companyCount?: number;
  storeCount?: number;
  metricsCount?: number;
  insertErrors?: string[];
  error?: string;
}

/**
 * 大量 metrics をチャンク分割して agency-route に逐次 POST する。
 * Vercel Hobby の 60s 関数タイムアウト対策。各チャンクが独立した invocation で動作。
 *
 * - metrics は事前に aggregateMetrics で重複行を圧縮
 * - 各チャンクは ~2000 行ずつ
 * - isFirst / isLast で finalize 処理を制御
 * - 失敗時は途中のチャンクで打ち切り、エラーを返す
 */
export async function postImportChunked(
  url: string,
  baseBody: {
    agencyId: string;
    agencyName: string;
    fileName: string;
    storeCodePrefix: string;
    sheetsProcessed?: string[];
  },
  metrics: GenericMetric[],
  options: { chunkSize?: number; onProgress?: (done: number, total: number) => void } = {}
): Promise<ImportResponse> {
  const aggregated = aggregateMetrics(metrics);
  const chunkSize = options.chunkSize ?? 2000;
  const totalRows = aggregated.length;

  if (totalRows === 0) {
    return { ok: false, error: '有効なデータがありません' };
  }

  let totalCompanies = 0;
  let totalStores = 0;
  let totalMetrics = 0;
  const allErrors: string[] = [];
  const totalChunks = Math.ceil(totalRows / chunkSize);

  for (let i = 0; i < totalRows; i += chunkSize) {
    const chunk = aggregated.slice(i, i + chunkSize);
    const chunkIdx = Math.floor(i / chunkSize) + 1;
    const isFirst = i === 0;
    const isLast = i + chunkSize >= totalRows;

    const res = await postImport(url, {
      ...baseBody,
      metrics: chunk,
      isFirst,
      isLast,
      totalRows,
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `チャンク ${chunkIdx}/${totalChunks} でエラー: ${res.error || '不明'}`,
        insertErrors: allErrors.length > 0 ? allErrors : undefined,
      };
    }

    totalCompanies = Math.max(totalCompanies, res.companyCount || 0);
    totalStores = Math.max(totalStores, res.storeCount || 0);
    totalMetrics += res.metricsCount || 0;
    if (res.insertErrors) allErrors.push(...res.insertErrors);

    options.onProgress?.(Math.min(i + chunkSize, totalRows), totalRows);
  }

  return {
    ok: true,
    companyCount: totalCompanies,
    storeCount: totalStores,
    metricsCount: totalMetrics,
    insertErrors: allErrors.length > 0 ? allErrors : undefined,
  };
}

/**
 * fetch をラップして:
 * - HTTP エラー時は本文 (HTML 含む) からエラー要旨を抽出
 * - JSON パース失敗時もユーザーに伝わるメッセージにする
 */
export async function postImport(
  url: string,
  body: unknown
): Promise<ImportResponse> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      error: `ネットワークエラー: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // HTTP エラー (Vercel タイムアウト/サイズ超過の HTML が返るケース含む)
  if (!res.ok) {
    let text = '';
    try { text = await res.text(); } catch { /* noop */ }
    const snippet = text
      .replace(/<[^>]+>/g, ' ')   // HTML タグ除去
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    return {
      ok: false,
      error: `HTTP ${res.status}: ${snippet || res.statusText || '不明なサーバーエラー'}`,
    };
  }

  // 正常レスポンスでも JSON でないと parse エラー
  try {
    return (await res.json()) as ImportResponse;
  } catch {
    let text = '';
    try { text = await res.text(); } catch { /* noop */ }
    return {
      ok: false,
      error: `レスポンスが JSON ではありません: ${text.slice(0, 200)}`,
    };
  }
}
