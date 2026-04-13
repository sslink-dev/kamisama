-- ========================================
-- 神様CRM - Supabase Migration
-- ========================================

-- 代理店テーブル
CREATE TABLE IF NOT EXISTS agencies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- 企業テーブル
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  agency_id TEXT REFERENCES agencies(id)
);

-- 店舗テーブル
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  number INTEGER,
  code TEXT UNIQUE NOT NULL,
  agency_id TEXT REFERENCES agencies(id),
  agency_name TEXT NOT NULL DEFAULT '',
  company_id TEXT REFERENCES companies(id),
  company_name TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  is_ng BOOLEAN NOT NULL DEFAULT false,
  ng_month TEXT,
  ng_reason TEXT,
  is_priority BOOLEAN NOT NULL DEFAULT false,
  is_priority_q3 BOOLEAN NOT NULL DEFAULT false,
  added_month TEXT,
  round_restart TEXT,
  company_flag TEXT,
  unit TEXT,
  rank TEXT
);

-- 月次メトリクステーブル
CREATE TABLE IF NOT EXISTS monthly_metrics (
  id SERIAL PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id),
  year_month TEXT NOT NULL,
  referrals INTEGER NOT NULL DEFAULT 0,
  brokerage INTEGER NOT NULL DEFAULT 0,
  referral_rate DECIMAL(5,4),
  target_referrals INTEGER NOT NULL DEFAULT 0,
  UNIQUE(store_id, year_month)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_stores_agency ON stores(agency_id);
CREATE INDEX IF NOT EXISTS idx_stores_unit ON stores(unit);
CREATE INDEX IF NOT EXISTS idx_stores_ng ON stores(is_ng);
CREATE INDEX IF NOT EXISTS idx_metrics_store ON monthly_metrics(store_id);
CREATE INDEX IF NOT EXISTS idx_metrics_month ON monthly_metrics(year_month);
CREATE INDEX IF NOT EXISTS idx_metrics_store_month ON monthly_metrics(store_id, year_month);

-- RLS無効化（テスト段階）
ALTER TABLE agencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_metrics DISABLE ROW LEVEL SECURITY;
