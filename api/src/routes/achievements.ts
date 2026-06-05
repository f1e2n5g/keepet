import { Hono } from "hono";
import type { Env, Variables } from "../env";
import { authMiddleware } from "../middleware";
import { evaluateAchievements } from "../achievements";

const achievements = new Hono<{ Bindings: Env; Variables: Variables }>();

achievements.use("*", authMiddleware);

// 圖鑑：回傳完整成就目錄 + 解鎖狀態（讀取時即時評估，達標就自動解鎖）。
// 小孩看自己的；家長可帶 ?child_id=。
achievements.get("/", async (c) => {
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
  const state = await evaluateAchievements(c.env.DB, childId);
  return c.json(state);
});

export default achievements;
