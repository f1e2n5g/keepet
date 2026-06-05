import { Hono } from "hono";
import type { Env, Variables } from "../env";
import type { OwnedItem } from "@keepet/shared";
import { authMiddleware } from "../middleware";
import { getPetWithDecay, petUpdateStmt } from "../pet";
import { evaluateAchievements } from "../achievements";

const pet = new Hono<{ Bindings: Env; Variables: Variables }>();

pet.use("*", authMiddleware);

// 衣櫥：小孩擁有的造型/配件（inventory join 商品）
pet.get("/wardrobe", async (c) => {
  if (c.var.jwt.role !== "child") return c.json({ error: "僅限小朋友" }, 403);
  const { results } = await c.env.DB.prepare(
    `SELECT inv.id AS inventory_id, inv.item_id, inv.acquired_at, s.type, s.name,
            json_extract(s.payload, '$.skin') AS skin
     FROM inventory inv
     JOIN shop_items s ON s.id = inv.item_id
     WHERE inv.child_id = ? AND s.type IN ('skin','accessory')
     ORDER BY inv.acquired_at DESC`,
  )
    .bind(c.var.jwt.sub)
    .all<OwnedItem>();
  return c.json(results ?? []);
});

// 取得寵物現值（伺服器懶算衰減後回傳）。
// 小孩看自己的；家長可帶 ?child_id= 看小孩的。
pet.get("/", async (c) => {
  const jwt = c.var.jwt;
  const childId = jwt.role === "child" ? jwt.sub : (c.req.query("child_id") ?? "");
  if (!childId) return c.json({ error: "需要 child_id" }, 400);
  if (jwt.role === "parent") {
    const owned = await c.env.DB.prepare(
      "SELECT id FROM users WHERE id = ? AND family_id = ?",
    )
      .bind(childId, jwt.family_id)
      .first();
    if (!owned) return c.json({ error: "找不到此小孩" }, 404);
  }
  const p = await getPetWithDecay(c.env.DB, childId);
  if (!p) return c.json({ error: "找不到寵物" }, 404);
  return c.json(p);
});

// 換造型：必須擁有該 skin（inventory 中有對應商品）才能裝備
pet.post("/skin", async (c) => {
  if (c.var.jwt.role !== "child") return c.json({ error: "僅限小朋友" }, 403);
  const body = await c.req.json<{ skin: string }>();
  const skin = body.skin ?? "default";

  if (skin !== "default") {
    const owned = await c.env.DB.prepare(
      `SELECT inv.id FROM inventory inv
       JOIN shop_items s ON s.id = inv.item_id
       WHERE inv.child_id = ? AND s.type = 'skin'
         AND json_extract(s.payload, '$.skin') = ?`,
    )
      .bind(c.var.jwt.sub, skin)
      .first();
    if (!owned) return c.json({ error: "你還沒有這個造型" }, 403);
  }

  const p = await getPetWithDecay(c.env.DB, c.var.jwt.sub);
  if (!p) return c.json({ error: "找不到寵物" }, 404);
  const updated = { ...p, current_skin: skin };
  await petUpdateStmt(c.env.DB, updated).run();
  c.executionCtx.waitUntil(evaluateAchievements(c.env.DB, c.var.jwt.sub).then(() => {}));
  return c.json(updated);
});

export default pet;
