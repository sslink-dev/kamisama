-- ========================================
-- 神様CRM - マテリアライズドビュー化 (さらに高速化)
-- ========================================
-- 目的: 集計ビュー(v_monthly_trends, v_agency_totals)を
-- 物理的にキャッシュしたマテリアライズドビューに変える
-- 結果: 毎回集計せず、事前計算済みデータを即座に返す
--
-- トレードオフ:
-- - データは手動で REFRESH が必要（インポート後に要実行）
-- - 本アプリはメトリクスが日次で更新される程度なので許容範囲

-- 依存関係により既存の通常ビューを先に削除
DROP VIEW IF EXISTS v_monthly_trends CASCADE;
DROP VIEW IF EXISTS v_agency_totals CASCADE;
DROP VIEW IF EXISTS v_agency_monthly CASCADE;

-- ============================
-- 月次トレンドのマテリアライズドビュー
-- ============================
CREATE MATERIALIZED VIEW v_monthly_trends AS
SELECT
  year_month,
  SUM(referrals)::int           AS total_referrals,
  SUM(brokerage)::int            AS total_brokerage,
  AVG(referral_rate)             AS avg_referral_rate,
  SUM(target_referrals)::int     AS total_target_referrals,
  COUNT(*)::int                  AS store_count
FROM monthly_metrics
GROUP BY year_month;

CREATE UNIQUE INDEX idx_v_monthly_trends ON v_monthly_trends(year_month);

-- ============================
-- 代理店全期間サマリのマテリアライズドビュー
-- ============================
CREATE MATERIALIZED VIEW v_agency_totals AS
SELECT
  a.id                             AS agency_id,
  a.name                           AS agency_name,
  COUNT(DISTINCT s.id)::int        AS store_count,
  COUNT(DISTINCT s.id) FILTER (WHERE NOT s.is_ng)::int AS active_store_count,
  COUNT(DISTINCT s.id) FILTER (WHERE s.is_ng)::int     AS ng_store_count,
  COALESCE(SUM(m.referrals), 0)::int                   AS total_referrals,
  COALESCE(SUM(m.brokerage), 0)::int                   AS total_brokerage,
  CASE WHEN COALESCE(SUM(m.brokerage), 0) > 0
       THEN ROUND((SUM(m.referrals)::numeric / SUM(m.brokerage)::numeric), 4)
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

-- ============================
-- 代理店×月のマテリアライズドビュー
-- ============================
CREATE MATERIALIZED VIEW v_agency_monthly AS
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

CREATE INDEX idx_v_agency_monthly ON v_agency_monthly(year_month);
CREATE INDEX idx_v_agency_monthly_agency ON v_agency_monthly(agency_id);

-- ============================
-- リフレッシュ関数 (データ更新時に呼び出す)
-- ============================
CREATE OR REPLACE FUNCTION refresh_all_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_monthly_trends;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_agency_totals;
  REFRESH MATERIALIZED VIEW v_agency_monthly; -- UNIQUE INDEX なしなので CONCURRENTLY 不可
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- authenticated ユーザーに実行権限付与 (インポート後にアプリから呼べるように)
GRANT EXECUTE ON FUNCTION refresh_all_views() TO authenticated;

-- authenticated にマテリアライズドビューの読み取り権限
GRANT SELECT ON v_monthly_trends TO authenticated;
GRANT SELECT ON v_agency_totals TO authenticated;
GRANT SELECT ON v_agency_monthly TO authenticated;

-- service_role は自動で持っているが、明示
GRANT SELECT ON v_monthly_trends TO service_role;
GRANT SELECT ON v_agency_totals TO service_role;
GRANT SELECT ON v_agency_monthly TO service_role;
