-- ============================================================
-- Supabase migration for Kamisama CRM
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Tables
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agencies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  agency_id TEXT REFERENCES agencies(id)
);

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  code TEXT NOT NULL,
  agency_id TEXT REFERENCES agencies(id),
  agency_name TEXT NOT NULL DEFAULT '',
  company_id TEXT REFERENCES companies(id),
  company_name TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  is_ng BOOLEAN NOT NULL DEFAULT FALSE,
  ng_month TEXT,
  ng_reason TEXT,
  is_priority BOOLEAN NOT NULL DEFAULT FALSE,
  is_priority_q3 BOOLEAN NOT NULL DEFAULT FALSE,
  added_month TEXT,
  round_restart TEXT,
  company_flag TEXT,
  unit TEXT,
  rank TEXT
);

CREATE TABLE IF NOT EXISTS metrics (
  id SERIAL PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  year_month TEXT NOT NULL,
  referrals INTEGER NOT NULL DEFAULT 0,
  brokerage INTEGER NOT NULL DEFAULT 0,
  referral_rate REAL,
  target_referrals INTEGER NOT NULL DEFAULT 0,
  UNIQUE(store_id, year_month)
);

-- 2. Indexes
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_stores_agency_id ON stores(agency_id);
CREATE INDEX IF NOT EXISTS idx_stores_unit ON stores(unit);
CREATE INDEX IF NOT EXISTS idx_stores_rank ON stores(rank);
CREATE INDEX IF NOT EXISTS idx_stores_is_ng ON stores(is_ng);
CREATE INDEX IF NOT EXISTS idx_metrics_store_id ON metrics(store_id);
CREATE INDEX IF NOT EXISTS idx_metrics_year_month ON metrics(year_month);
CREATE INDEX IF NOT EXISTS idx_metrics_store_year ON metrics(store_id, year_month);

-- 3. Row Level Security (public read access)
-- ------------------------------------------------------------

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON agencies FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON companies FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON stores FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON metrics FOR SELECT USING (true);

-- 4. RPC Functions (server-side aggregations)
-- ------------------------------------------------------------

-- 4a. Distinct utility helpers
CREATE OR REPLACE FUNCTION get_available_months()
RETURNS TEXT[] AS $$
  SELECT COALESCE(array_agg(DISTINCT year_month ORDER BY year_month), '{}')
  FROM metrics;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_units()
RETURNS TEXT[] AS $$
  SELECT COALESCE(array_agg(DISTINCT unit ORDER BY unit), '{}')
  FROM stores WHERE unit IS NOT NULL;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_ranks()
RETURNS TEXT[] AS $$
  SELECT COALESCE(array_agg(DISTINCT rank ORDER BY rank), '{}')
  FROM stores WHERE rank IS NOT NULL;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_company_flags()
RETURNS TEXT[] AS $$
  SELECT COALESCE(array_agg(DISTINCT company_flag ORDER BY company_flag), '{}')
  FROM stores WHERE company_flag IS NOT NULL;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_ng_reasons()
RETURNS TEXT[] AS $$
  SELECT COALESCE(array_agg(DISTINCT ng_reason ORDER BY ng_reason), '{}')
  FROM stores WHERE ng_reason IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- 4b. Monthly trends aggregation
CREATE OR REPLACE FUNCTION get_monthly_trends(
  p_agency_id TEXT DEFAULT NULL,
  p_unit TEXT DEFAULT NULL,
  p_rank TEXT DEFAULT NULL,
  p_is_ng BOOLEAN DEFAULT NULL,
  p_company_flag TEXT DEFAULT NULL
)
RETURNS TABLE (
  year_month TEXT,
  total_referrals BIGINT,
  total_brokerage BIGINT,
  avg_referral_rate DOUBLE PRECISION,
  total_target_referrals BIGINT,
  store_count BIGINT
) AS $$
  SELECT
    m.year_month,
    SUM(m.referrals)::BIGINT,
    SUM(m.brokerage)::BIGINT,
    CASE WHEN COUNT(m.referral_rate) > 0
      THEN ROUND(AVG(m.referral_rate)::numeric, 4)::DOUBLE PRECISION
      ELSE 0
    END,
    SUM(m.target_referrals)::BIGINT,
    COUNT(*)::BIGINT
  FROM metrics m
  INNER JOIN stores s ON s.id = m.store_id
  WHERE (p_agency_id IS NULL OR s.agency_id = p_agency_id)
    AND (p_unit IS NULL OR s.unit = p_unit)
    AND (p_rank IS NULL OR s.rank = p_rank)
    AND (p_is_ng IS NULL OR s.is_ng = p_is_ng)
    AND (p_company_flag IS NULL OR s.company_flag = p_company_flag)
  GROUP BY m.year_month
  ORDER BY m.year_month;
$$ LANGUAGE sql STABLE;

-- 4c. Agency summaries aggregation
CREATE OR REPLACE FUNCTION get_agency_summaries(p_year_month TEXT DEFAULT NULL)
RETURNS TABLE (
  agency_id TEXT,
  agency_name TEXT,
  store_count BIGINT,
  active_store_count BIGINT,
  ng_store_count BIGINT,
  total_referrals BIGINT,
  total_brokerage BIGINT,
  avg_referral_rate DOUBLE PRECISION,
  total_target_referrals BIGINT,
  target_achievement_rate DOUBLE PRECISION
) AS $$
  SELECT
    a.id,
    a.name,
    COUNT(DISTINCT s.id)::BIGINT,
    COUNT(DISTINCT s.id) FILTER (WHERE NOT s.is_ng)::BIGINT,
    COUNT(DISTINCT s.id) FILTER (WHERE s.is_ng)::BIGINT,
    COALESCE(SUM(m.referrals), 0)::BIGINT,
    COALESCE(SUM(m.brokerage), 0)::BIGINT,
    CASE WHEN COALESCE(SUM(m.brokerage), 0) > 0
      THEN ROUND((SUM(m.referrals)::numeric / SUM(m.brokerage)::numeric), 4)::DOUBLE PRECISION
      ELSE 0
    END,
    COALESCE(SUM(m.target_referrals), 0)::BIGINT,
    CASE WHEN COALESCE(SUM(m.target_referrals), 0) > 0
      THEN ROUND((SUM(m.referrals)::numeric / SUM(m.target_referrals)::numeric), 4)::DOUBLE PRECISION
      ELSE 0
    END
  FROM agencies a
  LEFT JOIN stores s ON s.agency_id = a.id
  LEFT JOIN metrics m ON m.store_id = s.id
    AND (p_year_month IS NULL OR m.year_month = p_year_month)
  GROUP BY a.id, a.name
  ORDER BY a.id;
$$ LANGUAGE sql STABLE;

-- 4d. KPI summary for a given month
CREATE OR REPLACE FUNCTION get_kpi_summary(p_year_month TEXT)
RETURNS TABLE (
  total_referrals BIGINT,
  total_brokerage BIGINT,
  referral_rate DOUBLE PRECISION,
  target_achievement_rate DOUBLE PRECISION,
  total_target_referrals BIGINT,
  active_store_count BIGINT,
  stores_with_data BIGINT
) AS $$
  SELECT
    COALESCE(SUM(m.referrals), 0)::BIGINT,
    COALESCE(SUM(m.brokerage), 0)::BIGINT,
    CASE WHEN COALESCE(SUM(m.brokerage), 0) > 0
      THEN ROUND((SUM(m.referrals)::numeric / SUM(m.brokerage)::numeric), 4)::DOUBLE PRECISION
      ELSE 0
    END,
    CASE WHEN COALESCE(SUM(m.target_referrals), 0) > 0
      THEN ROUND((SUM(m.referrals)::numeric / SUM(m.target_referrals)::numeric), 4)::DOUBLE PRECISION
      ELSE 0
    END,
    COALESCE(SUM(m.target_referrals), 0)::BIGINT,
    (SELECT COUNT(*) FROM stores WHERE NOT is_ng)::BIGINT,
    COUNT(*)::BIGINT
  FROM metrics m
  WHERE m.year_month = p_year_month;
$$ LANGUAGE sql STABLE;
