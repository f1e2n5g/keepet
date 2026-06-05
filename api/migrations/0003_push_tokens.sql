-- 推播 token：每個使用者（家長/小孩）在各自裝置註冊的 Expo push token。
CREATE TABLE push_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  token      TEXT NOT NULL UNIQUE,
  platform   TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
