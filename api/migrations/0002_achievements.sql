-- 成就解鎖紀錄。成就目錄定義在程式碼（@keepet/shared 的 ACHIEVEMENTS），
-- 這裡只記每個小孩解鎖了哪些、何時解鎖。
CREATE TABLE child_achievements (
  id               TEXT PRIMARY KEY,
  child_id         TEXT NOT NULL REFERENCES users(id),
  achievement_code TEXT NOT NULL,
  unlocked_at      INTEGER NOT NULL,
  UNIQUE (child_id, achievement_code)
);
CREATE INDEX idx_child_achievements_child ON child_achievements(child_id);

-- 給寵物造型加索引，換裝查詢用
CREATE INDEX idx_inventory_item ON inventory(item_id);
