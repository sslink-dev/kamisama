-- ========================================
-- 神様CRM - 取次 / 通電 / 成約 ファネル拡張
-- ========================================
-- 目的: monthly_metrics に connections (通電数) カラムを追加し、
-- 関連するマテリアライズドビュー・関数を再作成して
-- 通電数を全社 / 代理店 / 月次で集計できるようにする。

-- ============================
-- 1. カラム追加 (既存行は 0 で埋める)
-- ============================
ALTER TABLE monthly_metrics
  ADD COLUMN IF NOT EXISTS connections integer NOT NULL DEFAULT 0;

-- ============================
-- 2. 依存するビュー / 関数を DROP
-- (通常 VIEW として作られていた環境とマテリアライズド両方に対応)
-- ============================
DROP VIEW IF EXISTS v_monthly_trends CASCADE;
DROP VIEW IF EXISTS v_agency_totals CASCADE;
DROP VIEW IF EXISTS v_agency_monthly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS v_monthly_trends CASCADE;
DROP MATERIALIZED VIEW IF EXISTS v_agency_totals CASCADE;
DROP MATERIALIZED VIEW IF EXISTS v_agency_monthly CASCADE;
DROP FUNCTION IF EXISTS get_kpi_summary(text);
DROP FUNCTION IF EXISTS get_agency_summaries_by_month(text);
DROP FUNCTION IF EXISTS refresh_all_views();

-- ============================
-- 3. マテリアライズドビューを connections 付きで再作成
-- ============================
CREATE MATERIALIZED VIEW v_monthly_trends AS
SELECT
  year_month,
  SUM(referrals)::int           AS total_referrals,
  SUM(connections)::int         AS total_connections,
  SUM(brokerage)::int           AS total_brokerage,
  AVG(referral_rate)            AS avg_referral_rate,
  SUM(target_referrals)::int    AS total_target_referrals,
  COUNT(*)::int                 AS store_count
FROM monthly_metrics
GROUP BY year_month;

CREATE UNIQUE INDEX idx_v_monthly_trends ON v_monthly_trends(year_month);

CREATE MATERIALIZED VIEW v_agency_totals AS
SELECT
  a.id                                                  AS agency_id,
  a.name                                                AS agency_name,
  COUNT(DISTINCT s.id)::int                             AS store_count,
  COUNT(DISTINCT s.id) FILTER (WHERE NOT s.is_ng)::int  AS active_store_count,
  COUNT(DISTINCT s.id) FILTER (WHERE s.is_ng)::int      AS ng_store_count,
  COALESCE(SUM(m.referrals), 0)::int                    AS total_referrals,
  COALESCE(SUM(m.connections), 0)::int                  AS total_connections,
  COALESCE(SUM(m.brokerage), 0)::int                    AS total_brokerage,
  -- 成約率 = 成約 / 取次 (referral_rate という名前は互換性のため保持)
  CASE WHEN COALESCE(SUM(m.referrals), 0) > 0
       THEN ROUND((SUM(m.brokerage)::numeric / SUM(m.referrals)::numeric), 4)
       ELSE 0 END                                       AS avg_referral_rate,
  COALESCE(SUM(m.target_referrals), 0)::int             AS total_target_referrals,
  CASE WHEN COALESCE(SUM(m.target_referrals), 0) > 0
       THEN ROUND((SUM(m.referrals)::numeric / SUM(m.target_referrals)::numeric), 4)
       ELSE 0 END                                       AS target_achievement_rate
FROM agencies a
LEFT JOIN stores s ON s.agency_id = a.id
LEFT JOIN monthly_metrics m ON m.store_id = s.id
GROUP BY a.id, a.name;

CREATE UNIQUE INDEX idx_v_agency_totals ON v_agency_totals(agency_id);

CREATE MATERIALIZED VIEW v_agency_monthly AS
SELECT
  s.agency_id,
  m.year_month,
  SUM(m.referrals)::int         AS total_referrals,
  SUM(m.connections)::int       AS total_connections,
  SUM(m.brokerage)::int         AS total_brokerage,
  AVG(m.referral_rate)          AS avg_referral_rate,
  SUM(m.target_referrals)::int  AS total_target_referrals
FROM monthly_metrics m
JOIN stores s ON s.id = m.store_id
GROUP BY s.agency_id, m.year_month;

CREATE INDEX idx_v_agency_monthly_ym ON v_agency_monthly(year_month);
CREATE INDEX idx_v_agency_monthly_agency ON v_agency_monthly(agency_id);

-- ============================
-- 4. KPI サマリー関数 (connections 含む)
-- ============================
CREATE OR REPLACE FUNCTION get_kpi_summary(p_year_month text)
RETURNS TABLE(
  total_referrals         int,
  total_connections       int,
  total_brokerage         int,
  referral_rate           numeric,
  target_achievement_rate numeric,
  total_target_referrals  int,
  active_store_count      int,
  stores_with_data        int
) AS $$
  SELECT
    COALESCE(SUM(m.referrals), 0)::int,
    COALESCE(SUM(m.connections), 0)::int,
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
-- 5. 代理店×指定月サマリー関数 (connections 含む)
-- ============================
CREATE OR REPLACE FUNCTION get_agency_summaries_by_month(p_year_month text)
RETURNS TABLE(
  agency_id               text,
  agency_name             text,
  store_count             int,
  active_store_count      int,
  ng_store_count          int,
  total_referrals         int,
  total_connections       int,
  total_brokerage         int,
  avg_referral_rate       numeric,
  total_target_referrals  int,
  target_achievement_rate numeric
) AS $$
  SELECT
    a.id,
    a.name,
    COUNT(DISTINCT s.id)::int,
    COUNT(DISTINCT s.id) FILTER (WHERE NOT s.is_ng)::int,
    COUNT(DISTINCT s.id) FILTER (WHERE s.is_ng)::int,
    COALESCE(SUM(m.referrals), 0)::int,
    COALESCE(SUM(m.connections), 0)::int,
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
-- 6. リフレッシュ関数
-- ============================
CREATE OR REPLACE FUNCTION refresh_all_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_monthly_trends;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_agency_totals;
  REFRESH MATERIALIZED VIEW v_agency_monthly;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================
-- 7. 権限付与
-- ============================
GRANT EXECUTE ON FUNCTION refresh_all_views() TO authenticated;
GRANT EXECUTE ON FUNCTION get_kpi_summary(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agency_summaries_by_month(text) TO authenticated;

GRANT SELECT ON v_monthly_trends TO authenticated, service_role;
GRANT SELECT ON v_agency_totals TO authenticated, service_role;
GRANT SELECT ON v_agency_monthly TO authenticated, service_role;

-- ============================
-- 8. 最初のリフレッシュ
-- ============================
SELECT refresh_all_views();
