-- 全域內建商店商品（family_id = NULL）。可重複執行（先刪再插）。
DELETE FROM shop_items WHERE family_id IS NULL;

INSERT INTO shop_items (id, family_id, type, name, cost, payload) VALUES
  ('item_food_apple',  NULL, 'food', '蘋果',   5,  '{"hunger":15,"happiness":3,"xp":5}'),
  ('item_food_meal',   NULL, 'food', '寵物餐',  12, '{"hunger":35,"happiness":8,"xp":12}'),
  ('item_food_cake',   NULL, 'food', '生日蛋糕', 25, '{"hunger":40,"happiness":25,"xp":30}'),
  ('item_skin_space',  NULL, 'skin', '太空裝',   50, '{"skin":"space"}'),
  ('item_skin_ninja',  NULL, 'skin', '忍者裝',   50, '{"skin":"ninja"}'),
  ('item_skin_crown',  NULL, 'skin', '皇冠',     80, '{"skin":"crown"}');
