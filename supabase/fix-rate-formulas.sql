-- ========================================
-- referral_rate / avg_referral_rate の計算式修正
-- ========================================
-- 既存 SQL は SUM(referrals)/SUM(brokerage) で計算していたため、
-- 取次 > 成約 のとき >100% という誤った値を返していた。
--
-- 本パッチでは「成約率 = 成約 / 取次」 (= brokerage / referrals) に修正する。
-- カラム名は互換性のため referral_rate のままだが、意味は「成約率」。
--
-- Supabase SQL Editor で順番に実行してください。

-- ============================
-- 1. get_kpi_summary を修正
-- ============================
DROP FUNCTION IF EXISTS get_kpi_summary(text);

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
    -- 成約率 = 成約 / 取次 (旧: 取次 / 成約 で逆算されていたバグ修正)
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

GRANT EXECUTE ON FUNCTION get_kpi_summary(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_kpi_summary(text) TO service_role;

-- ============================
-- 2. get_agency_summaries_by_month を修正
-- ============================
DROP FUNCTION IF EXISTS get_agency_summaries_by_month(text);

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
    -- 成約率 = 成約 / 取次
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

GRANT EXECUTE ON FUNCTION get_agency_summaries_by_month(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agency_summaries_by_month(text) TO service_role;

-- ============================
-- 3. v_agency_totals マテリアライズドビューを再作成
-- ============================
DROP MATERIALIZED VIEW IF EXISTS v_agency_totals CASCADE;

CREATE MATERIALIZED VIEW v_agency_totals AS
SELECT
  a.id                             AS agency_id,
  a.name                           AS agency_name,
  COUNT(DISTINCT s.id)::int        AS store_count,
  COUNT(DISTINCT s.id) FILTER (WHERE NOT s.is_ng)::int AS active_store_count,
  COUNT(DISTINCT s.id) FILTER (WHERE s.is_ng)::int     AS ng_store_count,
  COALESCE(SUM(m.referrals), 0)::int                   AS total_referrals,
  COALESCE(SUM(m.brokerage), 0)::int                   AS total_brokerage,
  -- 成約率 = 成約 / 取次
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

CREATE UNIQUE INDEX idx_v_agency_totals ON v_agency_totals(agency_id);

ALTER MATERIALIZED VIEW v_agency_totals OWNER TO postgres;
GRANT SELECT ON v_agency_totals TO authenticated;
GRANT SELECT ON v_agency_totals TO service_role;

-- ============================
-- 4. リフレッシュ
-- ============================
SELECT refresh_all_views();

-- ============================
-- 5. 確認 (任意)
-- ============================
-- SELECT * FROM get_kpi_summary('2503');  -- 期待: referral_rate ≤ 1.0
-- SELECT agency_name, total_referrals, total_brokerage, avg_referral_rate
--   FROM v_agency_totals ORDER BY total_referrals DESC;
