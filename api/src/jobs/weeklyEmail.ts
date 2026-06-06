import type { Env } from "../env";
import type { WeeklyReport } from "@keepet/shared";
import { sendWeeklyReport } from "../email";

/** 找出所有開啟 email_report 的家長，查各自家庭的週報，寄信。 */
export async function runWeeklyEmailJob(env: Env): Promise<void> {
  // 有開啟 email 週報的家長清單
  const { results: parents } = await env.DB.prepare(
    "SELECT id, name, email, family_id FROM users WHERE role = 'parent' AND email_report = 1 AND email IS NOT NULL",
  ).all<{ id: string; name: string; email: string; family_id: string }>();

  if (!parents || parents.length === 0) return;

  // 本週起點（週一 00:00 UTC）
  const d = new Date();
  const dow = (d.getUTCDay() + 6) % 7;
  const since = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow);

  for (const parent of parents) {
    try {
      // 取此 family 的 family name
      const family = await env.DB.prepare("SELECT name FROM families WHERE id = ?")
        .bind(parent.family_id)
        .first<{ name: string }>();

      // 取此 family 所有小孩
      const { results: children } = await env.DB.prepare(
        "SELECT id, name, avatar FROM users WHERE family_id = ? AND role = 'child'",
      )
        .bind(parent.family_id)
        .all<{ id: string; name: string; avatar: string }>();

      if (!children || children.length === 0) continue;

      const reports: WeeklyReport[] = await Promise.all(
        children.map(async (child) => {
          const approved = await env.DB.prepare(
            "SELECT COUNT(*) AS n FROM task_completions WHERE child_id = ? AND status = 'approved' AND reviewed_at >= ?",
          )
            .bind(child.id, since)
            .first<{ n: number }>();
          const earned = await env.DB.prepare(
            "SELECT COALESCE(SUM(delta),0) AS n FROM point_ledger WHERE child_id = ? AND delta > 0 AND created_at >= ?",
          )
            .bind(child.id, since)
            .first<{ n: number }>();
          const spent = await env.DB.prepare(
            "SELECT COALESCE(SUM(delta),0) AS n FROM point_ledger WHERE child_id = ? AND delta < 0 AND created_at >= ?",
          )
            .bind(child.id, since)
            .first<{ n: number }>();
          const balance = await env.DB.prepare(
            "SELECT COALESCE(SUM(delta),0) AS n FROM point_ledger WHERE child_id = ?",
          )
            .bind(child.id)
            .first<{ n: number }>();
          const pet = await env.DB.prepare("SELECT level FROM pets WHERE child_id = ?")
            .bind(child.id)
            .first<{ level: number }>();
          const ach = await env.DB.prepare(
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

      await sendWeeklyReport(env, parent.email, family?.name ?? "我的家庭", reports);
      console.log(`Weekly report sent to ${parent.email}`);
    } catch (err) {
      console.error(`Failed to send report to ${parent.email}:`, err);
    }
  }
}
