import { Hono } from "hono";
import type { Env, Variables } from "../env";
import type { WeeklyReport } from "@keepet/shared";
import { authMiddleware, requireParent } from "../middleware";

const reports = new Hono<{ Bindings: Env; Variables: Variables }>();

reports.use("*", authMiddleware);

/** 本週起點（週一 00:00 UTC）。 */
function weekStart(): number {
  const d = new Date();
  const dow = (d.getUTCDay() + 6) % 7; // 週一=0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow);
}

// 家長週報：每個小孩本週完成任務數、賺/花積分、目前餘額、寵物等級、成就數
reports.get("/", requireParent, async (c) => {
  const since = weekStart();
  const { results: children } = await c.env.DB.prepare(
    "SELECT id, name, avatar FROM users WHERE family_id = ? AND role = 'child' ORDER BY created_at",
  )
    .bind(c.var.jwt.family_id)
    .all<{ id: string; name: string; avatar: string }>();

  const report: WeeklyReport[] = await Promise.all(
    (children ?? []).map(async (child) => {
      const approved = await c.env.DB.prepare(
        "SELECT COUNT(*) AS n FROM task_completions WHERE child_id = ? AND status = 'approved' AND reviewed_at >= ?",
      )
        .bind(child.id, since)
        .first<{ n: number }>();
      const earned = await c.env.DB.prepare(
        "SELECT COALESCE(SUM(delta),0) AS n FROM point_ledger WHERE child_id = ? AND delta > 0 AND created_at >= ?",
      )
        .bind(child.id, since)
        .first<{ n: number }>();
      const spent = await c.env.DB.prepare(
        "SELECT COALESCE(SUM(delta),0) AS n FROM point_ledger WHERE child_id = ? AND delta < 0 AND created_at >= ?",
      )
        .bind(child.id, since)
        .first<{ n: number }>();
      const balance = await c.env.DB.prepare(
        "SELECT COALESCE(SUM(delta),0) AS n FROM point_ledger WHERE child_id = ?",
      )
        .bind(child.id)
        .first<{ n: number }>();
      const pet = await c.env.DB.prepare("SELECT level FROM pets WHERE child_id = ?")
        .bind(child.id)
        .first<{ level: number }>();
      const ach = await c.env.DB.prepare(
        "SELECT COUNT(*) AS n FROM child_achievements WHERE child_id = ?",
      )
        .bind(child.id)
        .first<{ n: number }>();

      return {
        child_id: child.id,
        child_name: child.name,
        avatar: child.avatar,
        week_start: since,
        tasks_approved: approved?.n ?? 0,
        points_earned: earned?.n ?? 0,
        points_spent: Math.abs(spent?.n ?? 0),
        balance: balance?.n ?? 0,
        pet_level: pet?.level ?? 1,
        achievements_unlocked: ach?.n ?? 0,
      };
    }),
  );
  return c.json(report);
});

export default reports;
