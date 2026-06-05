-- KeePet 初始 schema
-- 積分餘額不存欄位，一律由 point_ledger 加總（流水帳為唯一真相來源）。

CREATE TABLE families (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  family_id     TEXT NOT NULL REFERENCES families(id),
  role          TEXT NOT NULL CHECK (role IN ('parent','child')),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,             -- 只有家長有
  password_hash TEXT,                    -- 只有家長有
  pin           TEXT,                    -- 只有小孩有（4 碼）
  avatar        TEXT NOT NULL DEFAULT '🐣',
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_users_family ON users(family_id);

CREATE TABLE tasks (
  id                TEXT PRIMARY KEY,
  family_id         TEXT NOT NULL REFERENCES families(id),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  points            INTEGER NOT NULL CHECK (points >= 0),
  recurrence        TEXT NOT NULL DEFAULT 'once' CHECK (recurrence IN ('once','daily','weekly')),
  assigned_child_id TEXT REFERENCES users(id),   -- null = 全家小孩
  created_by        TEXT NOT NULL REFERENCES users(id),
  active            INTEGER NOT NULL DEFAULT 1,
  created_at        INTEGER NOT NULL
);
CREATE INDEX idx_tasks_family ON tasks(family_id);

CREATE TABLE task_completions (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL REFERENCES tasks(id),
  child_id     TEXT NOT NULL REFERENCES users(id),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_at INTEGER NOT NULL,
  reviewed_at  INTEGER,
  reviewed_by  TEXT REFERENCES users(id)
);
CREATE INDEX idx_completions_child ON task_completions(child_id);
CREATE INDEX idx_completions_status ON task_completions(status);

CREATE TABLE point_ledger (
  id         TEXT PRIMARY KEY,
  child_id   TEXT NOT NULL REFERENCES users(id),
  delta      INTEGER NOT NULL,          -- 正=獲得, 負=花費
  reason     TEXT NOT NULL,
  ref_type   TEXT,
  ref_id     TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_ledger_child ON point_ledger(child_id);

CREATE TABLE pets (
  id           TEXT PRIMARY KEY,
  child_id     TEXT NOT NULL UNIQUE REFERENCES users(id),
  species      TEXT NOT NULL,
  name         TEXT NOT NULL,
  level        INTEGER NOT NULL DEFAULT 1,
  xp           INTEGER NOT NULL DEFAULT 0,
  hunger       REAL NOT NULL DEFAULT 80,
  happiness    REAL NOT NULL DEFAULT 70,
  current_skin TEXT NOT NULL DEFAULT 'default',
  last_updated INTEGER NOT NULL
);

CREATE TABLE shop_items (
  id        TEXT PRIMARY KEY,
  family_id TEXT REFERENCES families(id),   -- null = 全域內建商品
  type      TEXT NOT NULL CHECK (type IN ('food','skin','accessory','real_reward')),
  name      TEXT NOT NULL,
  cost      INTEGER NOT NULL CHECK (cost >= 0),
  payload   TEXT NOT NULL DEFAULT '{}'      -- JSON 字串
);
CREATE INDEX idx_shop_family ON shop_items(family_id);

CREATE TABLE inventory (
  id          TEXT PRIMARY KEY,
  child_id    TEXT NOT NULL REFERENCES users(id),
  item_id     TEXT NOT NULL REFERENCES shop_items(id),
  acquired_at INTEGER NOT NULL,
  consumed    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_inventory_child ON inventory(child_id);

CREATE TABLE reward_redemptions (
  id           TEXT PRIMARY KEY,
  child_id     TEXT NOT NULL REFERENCES users(id),
  item_id      TEXT NOT NULL REFERENCES shop_items(id),
  status       TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','fulfilled')),
  requested_at INTEGER NOT NULL,
  fulfilled_at INTEGER
);
CREATE INDEX idx_redemptions_child ON reward_redemptions(child_id);
