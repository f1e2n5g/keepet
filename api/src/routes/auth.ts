import { Hono } from "hono";
import type { Env, Variables } from "../env";
import type {
  AuthResponse,
  RegisterBody,
  LoginBody,
  ChildLoginBody,
  User,
} from "@keepet/shared";
import { hashPassword, verifyPassword, issueToken } from "../auth";
import { authMiddleware } from "../middleware";
import { newId, now } from "../ids";

interface UserRow {
  id: string;
  family_id: string;
  role: "parent" | "child";
  name: string;
  email: string | null;
  password_hash: string | null;
  pin: string | null;
  avatar: string;
  created_at: number;
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    family_id: row.family_id,
    role: row.role,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    created_at: row.created_at,
  };
}

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

// 家長註冊：建立 family + 家長帳號
auth.post("/register", async (c) => {
  const body = await c.req.json<RegisterBody>();
  if (!body.email || !body.password || !body.family_name || !body.parent_name) {
    return c.json({ error: "缺少必要欄位" }, 400);
  }
  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(body.email.toLowerCase())
    .first();
  if (existing) return c.json({ error: "此 email 已被註冊" }, 409);

  const familyId = newId("fam");
  const userId = newId("user");
  const ts = now();
  const passwordHash = await hashPassword(body.password);

  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO families (id, name, created_at) VALUES (?,?,?)").bind(
      familyId,
      body.family_name,
      ts,
    ),
    c.env.DB.prepare(
      "INSERT INTO users (id, family_id, role, name, email, password_hash, avatar, created_at) VALUES (?,?,?,?,?,?,?,?)",
    ).bind(userId, familyId, "parent", body.parent_name, body.email.toLowerCase(), passwordHash, "👩‍👧", ts),
  ]);

  const user: User = {
    id: userId,
    family_id: familyId,
    role: "parent",
    name: body.parent_name,
    email: body.email.toLowerCase(),
    avatar: "👩‍👧",
    created_at: ts,
  };
  const token = await issueToken(c.env.JWT_SECRET, user);
  return c.json<AuthResponse>({ token, user }, 201);
});

// 家長登入
auth.post("/login", async (c) => {
  const body = await c.req.json<LoginBody>();
  const row = await c.env.DB.prepare(
    "SELECT * FROM users WHERE email = ? AND role = 'parent'",
  )
    .bind((body.email ?? "").toLowerCase())
    .first<UserRow>();
  if (!row || !row.password_hash || !(await verifyPassword(body.password ?? "", row.password_hash))) {
    return c.json({ error: "email 或密碼錯誤" }, 401);
  }
  const user = toUser(row);
  const token = await issueToken(c.env.JWT_SECRET, user);
  return c.json<AuthResponse>({ token, user });
});

// 小孩登入：在自己 family 下用 child_id + PIN
auth.post("/child-login", async (c) => {
  const body = await c.req.json<ChildLoginBody>();
  const row = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ? AND role = 'child'",
  )
    .bind(body.child_id ?? "")
    .first<UserRow>();
  if (!row || row.pin !== body.pin) {
    return c.json({ error: "PIN 錯誤" }, 401);
  }
  const user = toUser(row);
  const token = await issueToken(c.env.JWT_SECRET, user);
  return c.json<AuthResponse>({ token, user });
});

// 取得目前登入者
auth.get("/me", authMiddleware, async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(c.var.jwt.sub)
    .first<UserRow>();
  if (!row) return c.json({ error: "找不到使用者" }, 404);
  return c.json(toUser(row));
});

export default auth;
