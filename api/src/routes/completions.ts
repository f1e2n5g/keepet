import { Hono } from "hono";
import type { Env, Variables } from "../env";
import type { PendingCompletion, ReviewBody } from "@keepet/shared";
import { authMiddleware, requireParent } from "../middleware";
import { now } from "../ids";
import { getBalance, ledgerInsert } from "../ledger";

const completions = new Hono<{ Bindings: Env; Variables: Variables }>();

completions.use("*", authMiddleware);

// 家長：待審核清單（帶任務標題、積分、小孩名字）
completions.get("/", requireParent, async (c) => {
  const status = c.req.query("status") ?? "pending";
  const { results } = await c.env.DB.prepare(
    `SELECT tc.*, t.title AS task_title, t.points AS task_points, u.name AS child_name
     FROM task_completions tc
     JOIN tasks t ON t.id = tc.task_id
     JOIN users u ON u.id = tc.child_id
     WHERE t.family_id = ? AND tc.status = ?
     ORDER BY tc.submitted_at`,
  )
    .bind(c.var.jwt.family_id, status)
    .all<PendingCompletion>();
  return c.json(results ?? []);
});

// 家長：核可 / 退回。核可時在同一交易寫入 +points 流水帳。
completions.post("/:id/review", requireParent, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<ReviewBody>();

  const comp = await c.env.DB.prepare(
    `SELECT tc.*, t.points AS task_points, t.family_id AS family_id
     FROM task_completions tc
     JOIN tasks t ON t.id = tc.task_id
     WHERE tc.id = ?`,
  )
    .bind(id)
    .first<{
      id: string;
      child_id: string;
      status: string;
      task_points: number;
      family_id: string;
    }>();

  if (!comp || comp.family_id !== c.var.jwt.family_id) {
    return c.json({ error: "找不到此提交" }, 404);
  }
  if (comp.status !== "pending") {
    return c.json({ error: "此提交已審核過" }, 409);
  }

  const ts = now();
  if (body.approve) {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE task_completions SET status='approved', reviewed_at=?, reviewed_by=? WHERE id=?",
      ).bind(ts, c.var.jwt.sub, id),
      ledgerInsert(c.env.DB, {
        child_id: comp.child_id,
        delta: comp.task_points,
        reason: "完成任務",
        ref_type: "task_completion",
        ref_id: id,
      }),
    ]);
  } else {
    await c.env.DB.prepare(
      "UPDATE task_completions SET status='rejected', reviewed_at=?, reviewed_by=? WHERE id=?",
    )
      .bind(ts, c.var.jwt.sub, id)
      .run();
  }

  const balance = await getBalance(c.env.DB, comp.child_id);
  return c.json({ ok: true, approved: !!body.approve, child_id: comp.child_id, balance });
});

export default completions;
