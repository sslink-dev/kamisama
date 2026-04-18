-- ========================================
-- 神様CRM - パフォーマンス最適化ビュー
-- ========================================
-- 目的: クライアント側で52,350件の集計をしている処理を
-- PostgreSQL側の集計済みビューに置き換え、高速化する
-- 実行方法: Supabase SQL Editor にコピー&ペーストして Run

-- 既存関数を削除 (戻り値型変更時に必要)
DROP FUNCTION IF EXISTS get_kpi_summary(text);
DROP FUNCTION IF EXISTS get_agency_summaries_by_month(text);

-- ============================
-- 1. 月次トレンド集計ビュー (getMonthlyTrends相当)
-- ============================
CREATE OR REPLACE VIEW v_monthly_trends AS
SELECT
  year_month,
  SUM(referrals)::int           AS total_referrals,
  SUM(brokerage)::int            AS total_brokerage,
  AVG(referral_rate)             AS avg_referral_rate,
  SUM(target_referrals)::int     AS total_target_referrals,
  COUNT(*)::int                  AS store_count
FROM monthly_metrics
GROUP BY year_month;

-- ============================
-- 2. 代理店×月の集計ビュー (getAgencySummariesの内部処理用)
-- ============================
CREATE OR REPLACE VIEW v_agency_monthly AS
SELECT
  s.agency_id,
  m.year_month,
  SUM(m.referrals)::int          AS total_referrals,
  SUM(m.brokerage)::int           AS total_brokerage,
  AVG(m.referral_rate)            AS avg_referral_rate,
  SUM(m.target_referrals)::int    AS total_target_referrals
FROM monthly_metrics m
JOIN stores s ON s.id = m.store_id
GROUP BY s.agency_id, m.year_month;

-- ============================
-- 3. 代理店サマリービュー (getAgencySummaries相当、yearMonth引数なし)
-- ============================
CREATE OR REPLACE VIEW v_agency_totals AS
SELECT
  a.id                             AS agency_id,
  a.name                           AS agency_name,
  COUNT(DISTINCT s.id)::int        AS store_count,
  COUNT(DISTINCT s.id) FILTER (WHERE NOT s.is_ng)::int AS active_store_count,
  COUNT(DISTINCT s.id) FILTER (WHERE s.is_ng)::int     AS ng_store_count,
  COALESCE(SUM(m.referrals), 0)::int                   AS total_referrals,
  COALESCE(SUM(m.brokerage), 0)::int                   AS total_brokerage,
  -- 成約率 = 成約 / 取次 (referral_rate という名前は互換性のため保持)
  CASE WHEN COALESCE(SUM(m.referrals), 0) > 0
       THEN ROUND((SUM(m.brokerage)::numeric / SUM(m.referrals)::numeric), 4)
       ELSE 0 END                                      AS avg_referral_rate,
  COALESCE(SUM(m.target_referrals), 0)::int            AS total_target_referrals,
  CASE WHEN COALESCE(SUM(m.target_referrals), 0) > 0
       THEN ROUND((SUM(m.referrals)::numeric / SUM(m.target_referrals)::numeric), 4)
       ELSE 0 END                                      AS target_achievement_rate
FROM agencies a
LEFT JOIN stores s ON s.agency_id = a.id
LEFT JOIN monthly_metrics m ON m.store_id = s.id
GROUP BY a.id, a.name;

-- ============================
-- 4. KPIサマリー関数 (getKpiSummary相当)
-- ============================
CREATE OR REPLACE FUNCTION get_kpi_summary(p_year_month text)
RETURNS TABLE(
  total_referrals        int,
  total_brokerage        int,
  referral_rate          numeric,
  target_achievement_rate numeric,
  total_target_referrals int,
  active_store_count     int,
  stores_with_data       int
) AS $$
  SELECT
    COALESCE(SUM(m.referrals), 0)::int,
    COALESCE(SUM(m.brokerage), 0)::int,
    -- 成約率 = 成約 / 取次 (referral_rate という名前は互換性のため保持)
    CASE WHEN COALESCE(SUM(m.referrals), 0) > 0
         THEN ROUND((SUM(m.brokerage)::numeric / SUM(m.referrals)::numeric), 4)
         ELSE 0 END,
    CASE WHEN COALESCE(SUM(m.target_referrals), 0) > 0
         THEN ROUND((SUM(m.referrals)::numeric / SUM(m.target_referrals)::numeric), 4)
         ELSE 0 END,
    COALESCE(SUM(m.target_referrals), 0)::int,
    (SELECT COUNT(*)::int FROM stores WHERE NOT is_ng),
    COUNT(*)::int
  FROM monthly_metrics m
  WHERE m.year_month = p_year_month
$$ LANGUAGE sql STABLE;

-- ============================
-- 5. 代理店×指定月のサマリー関数 (getAgencySummaries(yearMonth)相当)
-- ============================
CREATE OR REPLACE FUNCTION get_agency_summaries_by_month(p_year_month text)
RETURNS TABLE(
  agency_id              text,
  agency_name            text,
  store_count            int,
  active_store_count     int,
  ng_store_count         int,
  total_referrals        int,
  total_brokerage        int,
  avg_referral_rate      numeric,
  total_target_referrals int,
  target_achievement_rate numeric
) AS $$
  SELECT
    a.id,
    a.name,
    COUNT(DISTINCT s.id)::int,
    COUNT(DISTINCT s.id) FILTER (WHERE NOT s.is_ng)::int,
    COUNT(DISTINCT s.id) FILTER (WHERE s.is_ng)::int,
    COALESCE(SUM(m.referrals), 0)::int,
    COALESCE(SUM(m.brokerage), 0)::int,
    -- 成約率 = 成約 / 取次 (referral_rate という名前は互換性のため保持)
    CASE WHEN COALESCE(SUM(m.referrals), 0) > 0
         THEN ROUND((SUM(m.brokerage)::numeric / SUM(m.referrals)::numeric), 4)
         ELSE 0 END,
    COALESCE(SUM(m.target_referrals), 0)::int,
    CASE WHEN COALESCE(SUM(m.target_referrals), 0) > 0
         THEN ROUND((SUM(m.referrals)::numeric / SUM(m.target_referrals)::numeric), 4)
         ELSE 0 END
  FROM agencies a
  LEFT JOIN stores s ON s.agency_id = a.id
  LEFT JOIN monthly_metrics m ON m.store_id = s.id AND m.year_month = p_year_month
  GROUP BY a.id, a.name
$$ LANGUAGE sql STABLE;

-- ============================
-- 6. ビューにRLSを継承させる (認証ユーザーのみアクセス可)
-- ============================
-- PostgreSQL 15+ のセキュリティバリア付きビュー
ALTER VIEW v_monthly_trends SET (security_invoker = on);
ALTER VIEW v_agency_monthly SET (security_invoker = on);
ALTER VIEW v_agency_totals SET (security_invoker = on);

-- 関数にも権限付与
GRANT EXECUTE ON FUNCTION get_kpi_summary(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agency_summaries_by_month(text) TO authenticated;
