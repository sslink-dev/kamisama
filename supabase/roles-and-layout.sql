-- ========================================
-- 神様CRM - ロール管理 + ダッシュボードレイアウト
-- ========================================

-- ロール管理テーブル
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_roles" ON user_roles;
DROP POLICY IF EXISTS "admin_write_roles" ON user_roles;

-- 認証済みユーザーは全員のロールを読み取り可 (管理コンソール用)
CREATE POLICY "read_all_roles" ON user_roles
  FOR SELECT TO authenticated USING (true);

-- admin のみ更新可
CREATE POLICY "admin_write_roles" ON user_roles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ========================================
-- ダッシュボードレイアウト (単一行で共有)
-- ========================================
CREATE TABLE IF NOT EXISTS dashboard_layout (
  id text PRIMARY KEY DEFAULT 'default',
  widgets jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE dashboard_layout ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_layout" ON dashboard_layout;
DROP POLICY IF EXISTS "admin_write_layout" ON dashboard_layout;

CREATE POLICY "read_layout" ON dashboard_layout
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_layout" ON dashboard_layout
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 初期データ: 現在のダッシュボード構成
INSERT INTO dashboard_layout (id, widgets) VALUES ('default', '[
  {"id":"kpi","type":"kpi_summary","size":"full","config":{"title":"KPIサマリー"}},
  {"id":"trend","type":"trend_chart","size":"full","config":{"title":"月次推移"}},
  {"id":"agency","type":"agency_chart","size":"half","config":{"title":"代理店ランキング"}},
  {"id":"target","type":"target_chart","size":"half","config":{"title":"目標 vs 実績"}}
]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 初回 admin 設定 (自分のメールアドレスに書き換えて実行)
-- ========================================
-- 例: 'your@email.com' を自分のメールアドレスに置き換えて実行
-- INSERT INTO user_roles (user_id, email, role)
--   SELECT id, email, 'admin' FROM auth.users WHERE email = 'your@email.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = now();
