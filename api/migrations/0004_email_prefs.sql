-- 家長的 email 週報偏好設定（預設開啟）
ALTER TABLE users ADD COLUMN email_report INTEGER NOT NULL DEFAULT 1;
