import { Hono } from "hono";
import type { Env, Variables } from "../env";
import type { Redemption, RedemptionDetail } from "@keepet/shared";
import { authMiddleware, requireParent } from "../middleware";
import { now } from "../ids";

const redemptions = new Hono<{ Bindings: Env; Variables: Variables }>();

redemptions.use("*", authMiddleware);

// 列出兌現請求：家長看全家（預設未兌現）；小孩看自己的全部
redemptions.get("/", async (c) => {
  const jwt = c.var.jwt;
  if (jwt.role === "child") {
    const { results } = await c.env.DB.prepare(
      `SELECT r.*, s.name AS item_name, s.cost AS item_cost, u.name AS child_name
       FROM reward_redemptions r
       JOIN shop_items s ON s.id = r.item_id
       JOIN users u ON u.id = r.child_id
       WHERE r.child_id = ? ORDER BY r.requested_at DESC`,
    )
      .bind(jwt.sub)
      .all<RedemptionDetail>();
    return c.json(results ?? []);
  }
  const status = c.req.query("status") ?? "requested";
  const { results } = await c.env.DB.prepare(
    `SELECT r.*, s.name AS item_name, s.cost AS item_cost, u.name AS child_name
     FROM reward_redemptions r
     JOIN shop_items s ON s.id = r.item_id
     JOIN users u ON u.id = r.child_id
     WHERE u.family_id = ? AND r.status = ? ORDER BY r.requested_at`,
  )
    .bind(jwt.family_id, status)
    .all<RedemptionDetail>();
  return c.json(results ?? []);
});

// 家長標記已兌現（在現實中給了獎勵）
redemptions.post("/:id/fulfill", requireParent, async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    `SELECT r.* FROM reward_redemptions r
     JOIN users u ON u.id = r.child_id
     WHERE r.id = ? AND u.family_id = ?`,
  )
    .bind(id, c.var.jwt.family_id)
    .first<Redemption>();
  if (!row) return c.json({ error: "找不到此兌現請求" }, 404);
  if (row.status === "fulfilled") return c.json({ error: "已經兌現過了" }, 409);

  await c.env.DB.prepare(
    "UPDATE reward_redemptions SET status = 'fulfilled', fulfilled_at = ? WHERE id = ?",
  )
    .bind(now(), id)
    .run();
  return c.json({ ok: true });
});

export default redemptions;
