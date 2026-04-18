-- ========================================
-- 取込で発生した orphan / 不整合データのクリーンアップ
-- ========================================
-- v2.9 のバグで、stores の id が更新され monthly_metrics の FK が壊れた可能性あり。
-- このスクリプトで状況確認と必要なクリーンアップを行う。

-- ============================
-- STEP 0. 状況確認
-- ============================
-- orphan な monthly_metrics (参照先 store が無い)
SELECT COUNT(*) AS orphan_metrics
FROM monthly_metrics m
WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.id = m.store_id);

-- 重複 code を持つ stores (本来 UNIQUE のはず)
SELECT code, COUNT(*) AS dup
FROM stores
GROUP BY code
HAVING COUNT(*) > 1
ORDER BY dup DESC
LIMIT 20;

-- ============================
-- STEP 1. orphan な monthly_metrics を削除
-- ============================
-- 集計結果に影響あり (orphan は v_agency_totals 等から既に集計対象外なので削除しても表示変わらない)
DELETE FROM monthly_metrics m
WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.id = m.store_id);

-- ============================
-- STEP 2. マテリアライズドビュー再構築
-- ============================
SELECT refresh_all_views();

-- ============================
-- STEP 3. 確認
-- ============================
-- 0 になればクリーン
SELECT COUNT(*) AS remaining_orphans
FROM monthly_metrics m
WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.id = m.store_id);
