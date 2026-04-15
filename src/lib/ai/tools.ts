/**
 * AI チャットが呼び出せるツール群
 * - OpenAI の function calling 用 JSON Schema
 * - 実行ハンドラ
 */
import {
  getAgencies,
  getAvailableMonths,
  getKpiSummary,
  getMonthlyTrends,
  getAgencySummaries,
  getStores,
  getNgReasons,
} from '@/lib/data/repository';
import type { StoreFilters } from '@/lib/data/types';

// --- OpenAI の tools 定義 (Chat Completions 形式) ---
export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_agencies',
      description: '代理店の一覧（id と名前）を返す。代理店名→ID 解決に必須。',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_available_months',
      description: 'データが存在する年月（YYMM形式）の一覧を返す。古い順。',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_kpi_summary',
      description: '指定月の全社KPI（取次数・通電数・成約数・取次率・目標達成率・有効店舗数）を返す。',
      parameters: {
        type: 'object',
        properties: {
          year_month: { type: 'string', description: 'YYMM形式 (例: "2503")。指定なしなら最新月' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_monthly_trends',
      description: '月次推移データ（取次数・通電数・成約数・取次率の月ごとの値）を返す。代理店・ユニットでフィルタ可。',
      parameters: {
        type: 'object',
        properties: {
          agency_id: { type: 'string', description: '代理店IDでフィルタ。指定なしで全代理店合算' },
          unit: { type: 'string', description: 'ユニット名でフィルタ' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_agency_summaries',
      description: '代理店別の集計（取次数・通電数・成約数・店舗数・目標達成率等）を返す。ランキング作成にも使う。',
      parameters: {
        type: 'object',
        properties: {
          year_month: { type: 'string', description: 'YYMM形式。指定なしで全期間合算' },
          limit: { type: 'number', description: '上位 N 件のみ返す。指定なしで全件' },
          sort_by: {
            type: 'string',
            enum: ['totalReferrals', 'totalConnections', 'totalBrokerage', 'targetAchievementRate', 'avgReferralRate', 'storeCount'],
            description: 'ソート対象の指標',
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_stores',
      description: '店舗一覧を取得。各種フィルタ可（代理店・ユニット・NG等）。大量返却を避けるため limit 推奨。',
      parameters: {
        type: 'object',
        properties: {
          agency_id: { type: 'string' },
          unit: { type: 'string' },
          is_ng: { type: 'boolean', description: 'true=NG店舗のみ、false=非NG店舗のみ' },
          ng_reason: { type: 'string', description: 'NG理由でフィルタ' },
          search: { type: 'string', description: '店舗名・コード・会社名の部分一致' },
          limit: { type: 'number', description: '返却件数上限。デフォルト50' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_ng_breakdown',
      description: 'NG店舗の理由別件数を返す。円グラフ向き。',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
];

// --- ハンドラ: name → 実行関数 ---
type ToolArgs = Record<string, unknown>;

export async function executeTool(name: string, args: ToolArgs): Promise<unknown> {
  switch (name) {
    case 'list_agencies': {
      const agencies = await getAgencies();
      return agencies.map(a => ({ id: a.id, name: a.name }));
    }

    case 'get_available_months':
      return await getAvailableMonths();

    case 'get_kpi_summary': {
      let ym = args.year_month as string | undefined;
      if (!ym) {
        const months = await getAvailableMonths();
        ym = months[months.length - 1];
        if (!ym) return { error: 'データのある月が見つかりません' };
      }
      const kpi = await getKpiSummary(ym);
      return { yearMonth: ym, ...kpi };
    }

    case 'get_monthly_trends': {
      const filters: StoreFilters = {};
      if (args.agency_id) filters.agencyId = args.agency_id as string;
      if (args.unit) filters.unit = args.unit as string;
      const trends = await getMonthlyTrends(Object.keys(filters).length ? filters : undefined);
      return trends;
    }

    case 'get_agency_summaries': {
      const ym = args.year_month as string | undefined;
      const summaries = await getAgencySummaries(ym);
      const sortBy = args.sort_by as keyof typeof summaries[number] | undefined;
      let result = [...summaries];
      if (sortBy) {
        result.sort((a, b) => {
          const av = a[sortBy] as number;
          const bv = b[sortBy] as number;
          return (bv ?? 0) - (av ?? 0);
        });
      }
      const limit = args.limit as number | undefined;
      if (limit && limit > 0) result = result.slice(0, limit);
      return result;
    }

    case 'get_stores': {
      const filters: StoreFilters = {};
      if (args.agency_id) filters.agencyId = args.agency_id as string;
      if (args.unit) filters.unit = args.unit as string;
      if (args.is_ng !== undefined) filters.isNg = args.is_ng as boolean;
      if (args.ng_reason) filters.ngReason = args.ng_reason as string;
      if (args.search) filters.search = args.search as string;
      const stores = await getStores(filters);
      const limit = (args.limit as number) || 50;
      return stores.slice(0, limit).map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        agency: s.agencyName,
        company: s.companyName,
        unit: s.unit,
        isNg: s.isNg,
        ngReason: s.ngReason,
      }));
    }

    case 'get_ng_breakdown': {
      const reasons = await getNgReasons();
      const stores = await getStores({ isNg: true });
      const counts = new Map<string, number>();
      for (const s of stores) {
        const r = s.ngReason || '(理由未設定)';
        counts.set(r, (counts.get(r) ?? 0) + 1);
      }
      // reasons には null 含まれないので 0 初期化を保証
      reasons.forEach(r => {
        if (!counts.has(r)) counts.set(r, 0);
      });
      return [...counts.entries()]
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
    }

    default:
      return { error: `unknown tool: ${name}` };
  }
}
