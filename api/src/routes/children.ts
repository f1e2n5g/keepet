import { Hono } from "hono";
import type { Env, Variables } from "../env";
import type { CreateChildBody, User } from "@keepet/shared";
import { authMiddleware, requireParent } from "../middleware";
import { newId, now } from "../ids";
import { getBalance } from "../ledger";
import { toUser } from "./auth";

const children = new Hono<{ Bindings: Env; Variables: Variables }>();

children.use("*", authMiddleware);

// 家長新增小孩（同時建立一隻初始寵物）
children.post("/", requireParent, async (c) => {
  const body = await c.req.json<CreateChildBody>();
  if (!body.name || !/^\d{4}$/.test(body.pin ?? "")) {
    return c.json({ error: "需要名字與 4 碼數字 PIN" }, 400);
  }
  const childId = newId("user");
  const petId = newId("pet");
  const ts = now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO users (id, family_id, role, name, pin, avatar, created_at) VALUES (?,?,?,?,?,?,?)",
    ).bind(childId, c.var.jwt.family_id, "child", body.name, body.pin, body.avatar || "🐣", ts),
    c.env.DB.prepare(
      "INSERT INTO pets (id, child_id, species, name, last_updated) VALUES (?,?,?,?,?)",
    ).bind(petId, childId, "blob", `${body.name}的寵物`, ts),
  ]);
  const user: User = {
    id: childId,
    family_id: c.var.jwt.family_id,
    role: "child",
    name: body.name,
    email: null,
    avatar: body.avatar || "🐣",
    created_at: ts,
  };
  return c.json(user, 201);
});

// 列出 family 內所有小孩 + 餘額（家長管理 / 共用裝置上的登入選單用）
children.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, family_id, role, name, email, avatar, created_at FROM users WHERE family_id = ? AND role = 'child' ORDER BY created_at",
  )
    .bind(c.var.jwt.family_id)
    .all<Omit<User, "email"> & { email: string | null }>();

  const withBalance = await Promise.all(
    (results ?? []).map(async (row) => ({
      ...(row as User),
      balance: await getBalance(c.env.DB, row.id),
    })),
  );
  return c.json(withBalance);
});

// 家長刪除小孩資料（隱私控管入口）
children.delete("/:id", requireParent, async (c) => {
  const childId = c.req.param("id");
  const owned = await c.env.DB.prepare(
    "SELECT id FROM users WHERE id = ? AND family_id = ? AND role = 'child'",
  )
    .bind(childId, c.var.jwt.family_id)
    .first();
  if (!owned) return c.json({ error: "找不到此小孩" }, 404);

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM inventory WHERE child_id = ?").bind(childId),
    c.env.DB.prepare("DELETE FROM reward_redemptions WHERE child_id = ?").bind(childId),
    c.env.DB.prepare("DELETE FROM point_ledger WHERE child_id = ?").bind(childId),
    c.env.DB.prepare("DELETE FROM task_completions WHERE child_id = ?").bind(childId),
    c.env.DB.prepare("DELETE FROM pets WHERE child_id = ?").bind(childId),
    c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(childId),
  ]);
  return c.json({ ok: true });
});

// 取得某小孩的積分餘額
children.get("/:id/balance", async (c) => {
  const childId = c.req.param("id");
  if (c.var.jwt.role === "child" && c.var.jwt.sub !== childId) {
    return c.json({ error: "無法查看他人餘額" }, 403);
  }
  const balance = await getBalance(c.env.DB, childId);
  return c.json({ child_id: childId, balance });
});

export default children;
