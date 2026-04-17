-- ========================================
-- 神様CRM - U-NEXT Excel インポート用テーブル
-- ========================================
-- 元データシートの各行を referral_transactions に保持し、
-- staff マスタを自動構築、monthly_metrics へ集計連携する。

-- ============================
-- 1. インポートバッチ管理
-- ============================
CREATE TABLE IF NOT EXISTS import_batches (
  id text PRIMARY KEY,
  file_name text NOT NULL,
  import_type text NOT NULL DEFAULT 'unext',
  sheet_name text,
  row_count int NOT NULL DEFAULT 0,
  imported_at timestamptz DEFAULT now(),
  imported_by uuid REFERENCES auth.users(id)
);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_batches" ON import_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_batches" ON import_batches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ============================
-- 2. 担当者マスタ
-- ============================
CREATE TABLE IF NOT EXISTS staff (
  id text PRIMARY KEY,
  agency_name text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  store_code text,
  department text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_name, code)
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_staff" ON staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_staff" ON staff FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ============================
-- 3. 取次トランザクション (元データの各行)
-- ============================
CREATE TABLE IF NOT EXISTS referral_transactions (
  id text PRIMARY KEY,
  import_batch_id text NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  agency_name text NOT NULL,
  inquiry_date date NOT NULL,
  store_code text NOT NULL,
  store_name text NOT NULL,
  staff_code text,
  staff_name text,
  department text,
  ng_reason text,
  call_status text,
  service_type text,
  year_month text NOT NULL,
  is_connected boolean NOT NULL DEFAULT false,
  is_contracted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rt_year_month ON referral_transactions(year_month);
CREATE INDEX IF NOT EXISTS idx_rt_store_code ON referral_transactions(store_code);
CREATE INDEX IF NOT EXISTS idx_rt_batch ON referral_transactions(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_rt_agency ON referral_transactions(agency_name);
CREATE INDEX IF NOT EXISTS idx_rt_staff ON referral_transactions(staff_code);

ALTER TABLE referral_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_transactions" ON referral_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_transactions" ON referral_transactions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ============================
-- 4. 集計ビュー: 店舗×月
-- ============================
CREATE OR REPLACE VIEW v_store_monthly_summary AS
SELECT
  store_code,
  MAX(store_name) AS store_name,
  MAX(agency_name) AS agency_name,
  MAX(department) AS department,
  year_month,
  COUNT(*)::int AS referrals,
  COUNT(*) FILTER (WHERE is_connected)::int AS connections,
  COUNT(*) FILTER (WHERE is_contracted)::int AS brokerage,
  COUNT(*) FILTER (WHERE ng_reason IS NOT NULL AND ng_reason != '')::int AS ng_count
FROM referral_transactions
GROUP BY store_code, year_month;

-- ============================
-- 5. 集計ビュー: 担当者×月
-- ============================
CREATE OR REPLACE VIEW v_staff_monthly_summary AS
SELECT
  staff_code,
  MAX(staff_name) AS staff_name,
  store_code,
  MAX(store_name) AS store_name,
  MAX(agency_name) AS agency_name,
  year_month,
  COUNT(*)::int AS referrals,
  COUNT(*) FILTER (WHERE is_connected)::int AS connections,
  COUNT(*) FILTER (WHERE is_contracted)::int AS brokerage
FROM referral_transactions
WHERE staff_code IS NOT NULL AND staff_code != '' AND staff_code != '不明'
GROUP BY staff_code, store_code, year_month;

-- ============================
-- 6. 権限付与
-- ============================
GRANT SELECT ON v_store_monthly_summary TO authenticated, service_role;
GRANT SELECT ON v_staff_monthly_summary TO authenticated, service_role;
