-- ========================================
-- agencies テーブルのクリーンアップ
-- ========================================
-- 目的:
--   1. 正規 11 代理店を agencies に揃える
--   2. それ以外 (legacy 期に誤って agencies に入った企業) を companies に降格
--   3. 該当する stores の agency_id / company_id を更新
--
-- 実行前に必ず Supabase で SELECT を回してデータを確認してください。
-- 実行は SQL Editor で 1 ステップずつ。

-- ============================
-- STEP 0. 現状確認 (実行)
-- ============================
-- まず現在の agencies テーブルを確認:
--   SELECT id, name FROM agencies ORDER BY name;
--
-- 次に "正規 11" に該当しないものを確認 (これらが「企業として降格すべきもの」):
--   SELECT id, name FROM agencies WHERE id NOT IN (
--     'ag-unext','ag-housemate','ag-rensa','ag-ierabu','ag-umx',
--     'ag-shelter','ag-smasapo','ag-dual','ag-fplain','ag-vendor','ag-lastmile'
--   );

-- ============================
-- STEP 1. 正規 11 代理店を upsert
-- ============================
INSERT INTO agencies (id, name) VALUES
  ('ag-unext', 'U-NEXT'),
  ('ag-housemate', 'ハウスメイト'),
  ('ag-rensa', 'レンサ'),
  ('ag-ierabu', 'いえらぶ'),
  ('ag-umx', 'UMX'),
  ('ag-shelter', 'Shelter'),
  ('ag-smasapo', 'スマサポ'),
  ('ag-dual', 'DUAL'),
  ('ag-fplain', 'エフプレイン'),
  ('ag-vendor', 'ベンダー'),
  ('ag-lastmile', 'ラストワンマイル')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================
-- STEP 2. 非正規 agencies を companies に変換 (U-NEXT 配下に集約)
-- ============================
-- 殆どのレガシーデータは U-NEXT 由来の企業 (エイブル/ピタットハウス/スペース・プラン等) と想定し、
-- ag-unext 配下の company として登録し直す。
-- 異なる代理店配下にしたい企業がある場合は、このステップを実行する前に手動で
-- companies に作成 + stores の agency_id/company_id を書き換えてください。
--
-- SAFETY: 既に同名の company があればそれを使う。無ければ新規作成。

-- 2a. 非正規 agencies のうち、companies に同名が無いものを新規作成
INSERT INTO companies (id, name, agency_id)
SELECT
  'co-from-' || a.id AS id,
  a.name              AS name,
  'ag-unext'          AS agency_id
FROM agencies a
WHERE a.id NOT IN (
  'ag-unext','ag-housemate','ag-rensa','ag-ierabu','ag-umx',
  'ag-shelter','ag-smasapo','ag-dual','ag-fplain','ag-vendor','ag-lastmile'
)
AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.name = a.name)
ON CONFLICT (name) DO NOTHING;

-- 2b. 該当 stores を更新 (agency_id を ag-unext に、company_id を新企業に)
UPDATE stores s
SET
  agency_id = 'ag-unext',
  agency_name = 'U-NEXT',
  company_id = c.id,
  company_name = c.name
FROM agencies a
JOIN companies c ON c.name = a.name
WHERE s.agency_id = a.id
  AND a.id NOT IN (
    'ag-unext','ag-housemate','ag-rensa','ag-ierabu','ag-umx',
    'ag-shelter','ag-smasapo','ag-dual','ag-fplain','ag-vendor','ag-lastmile'
  );

-- ============================
-- STEP 3. 非正規 agencies 行を削除
-- ============================
-- ※ この時点で stores の agency_id は ag-unext に切り替え済みなので
--    DELETE しても FK は壊れない (ON DELETE は CASCADE 設定なし)
DELETE FROM agencies
WHERE id NOT IN (
  'ag-unext','ag-housemate','ag-rensa','ag-ierabu','ag-umx',
  'ag-shelter','ag-smasapo','ag-dual','ag-fplain','ag-vendor','ag-lastmile'
);

-- ============================
-- STEP 4. マテリアライズドビューを再構築
-- ============================
SELECT refresh_all_views();

-- ============================
-- STEP 5. 確認
-- ============================
-- SELECT id, name FROM agencies ORDER BY name;       -- 正規 11 のみのはず
-- SELECT agency_id, agency_name, COUNT(*) FROM stores GROUP BY 1,2 ORDER BY 2;
-- SELECT * FROM v_agency_totals ORDER BY agency_name;
