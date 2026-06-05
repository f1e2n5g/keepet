import { Hono } from "hono";
import type { Env, Variables } from "../env";
import type { ShopItem } from "@keepet/shared";
import { authMiddleware, requireChild } from "../middleware";
import { newId, now } from "../ids";
import { getBalance, ledgerInsert } from "../ledger";
import { getPetWithDecay, computeFeed, petUpdateStmt } from "../pet";

const shop = new Hono<{ Bindings: Env; Variables: Variables }>();

shop.use("*", authMiddleware);

interface ItemRow {
  id: string;
  family_id: string | null;
  type: ShopItem["type"];
  name: string;
  cost: number;
  payload: string;
}

function toItem(row: ItemRow): ShopItem {
  return {
    id: row.id,
    family_id: row.family_id,
    type: row.type,
    name: row.name,
    cost: row.cost,
    payload: safeJson(row.payload),
  };
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// 商店列表：全域商品 + 自家 family 商品
shop.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM shop_items WHERE family_id IS NULL OR family_id = ? ORDER BY type, cost",
  )
    .bind(c.var.jwt.family_id)
    .all<ItemRow>();
  return c.json((results ?? []).map(toItem));
});

// 小孩購買：扣點與套用效果在同一個 D1 batch（交易）完成
shop.post("/:itemId/buy", requireChild, async (c) => {
  const itemId = c.req.param("itemId");
  const childId = c.var.jwt.sub;

  const row = await c.env.DB.prepare(
    "SELECT * FROM shop_items WHERE id = ? AND (family_id IS NULL OR family_id = ?)",
  )
    .bind(itemId, c.var.jwt.family_id)
    .first<ItemRow>();
  if (!row) return c.json({ error: "找不到商品" }, 404);

  const item = toItem(row);
  const balance = await getBalance(c.env.DB, childId);
  if (balance < item.cost) {
    return c.json({ error: "積分不足", balance }, 402);
  }

  const spend = ledgerInsert(c.env.DB, {
    child_id: childId,
    delta: -item.cost,
    reason: `購買 ${item.name}`,
    ref_type: "shop_purchase",
    ref_id: item.id,
  });

  // food：直接餵給寵物（消耗品，不入庫）
  if (item.type === "food") {
    const pet = await getPetWithDecay(c.env.DB, childId);
    if (!pet) return c.json({ error: "找不到寵物" }, 404);
    const fed = computeFeed(pet, {
      hunger: Number(item.payload.hunger ?? 0),
      happiness: Number(item.payload.happiness ?? 0),
      xp: Number(item.payload.xp ?? 0),
    });
    await c.env.DB.batch([spend, petUpdateStmt(c.env.DB, fed)]);
    return c.json({ balance: balance - item.cost, pet: fed });
  }

  // real_reward：建立兌現請求，等家長 fulfill
  if (item.type === "real_reward") {
    const redemptionId = newId("redeem");
    await c.env.DB.batch([
      spend,
      c.env.DB.prepare(
        "INSERT INTO reward_redemptions (id, child_id, item_id, status, requested_at) VALUES (?,?,?,'requested',?)",
      ).bind(redemptionId, childId, item.id, now()),
    ]);
    return c.json({ balance: balance - item.cost, redemption_id: redemptionId });
  }

  // skin / accessory：入庫
  const invId = newId("inv");
  await c.env.DB.batch([
    spend,
    c.env.DB.prepare(
      "INSERT INTO inventory (id, child_id, item_id, acquired_at, consumed) VALUES (?,?,?,?,0)",
    ).bind(invId, childId, item.id, now()),
  ]);
  return c.json({
    balance: balance - item.cost,
    inventory_item: { id: invId, child_id: childId, item_id: item.id, acquired_at: now(), consumed: false },
  });
});

export default shop;
