-- ========================================
-- 神様CRM - Row Level Security (RLS) 設定
-- ========================================
-- 実行前提: supabase/migration.sql のテーブル作成が済んでいること
-- 実行後: 認証済みユーザーのみ DB にアクセス可能になる

-- 全テーブルで RLS を有効化
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_metrics ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーを削除（再実行可能にするため）
DROP POLICY IF EXISTS "authenticated_all" ON agencies;
DROP POLICY IF EXISTS "authenticated_all" ON companies;
DROP POLICY IF EXISTS "authenticated_all" ON stores;
DROP POLICY IF EXISTS "authenticated_all" ON monthly_metrics;

-- 認証済みユーザーは全操作可 (SELECT / INSERT / UPDATE / DELETE)
CREATE POLICY "authenticated_all" ON agencies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON stores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON monthly_metrics
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
