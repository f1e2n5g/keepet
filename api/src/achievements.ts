import { ACHIEVEMENTS, type AchievementState } from "@keepet/shared";
import { newId, now } from "./ids";

interface Aggregates {
  approvedCount: number;
  totalEarned: number;
  purchaseCount: number;
  petLevel: number;
  dressedUp: boolean;
}

async function gather(db: D1Database, childId: string): Promise<Aggregates> {
  const approved = await db
    .prepare("SELECT COUNT(*) AS n FROM task_completions WHERE child_id = ? AND status = 'approved'")
    .bind(childId)
    .first<{ n: number }>();
  const earned = await db
    .prepare("SELECT COALESCE(SUM(delta),0) AS n FROM point_ledger WHERE child_id = ? AND delta > 0")
    .bind(childId)
    .first<{ n: number }>();
  const purchases = await db
    .prepare("SELECT COUNT(*) AS n FROM point_ledger WHERE child_id = ? AND ref_type = 'shop_purchase'")
    .bind(childId)
    .first<{ n: number }>();
  const pet = await db
    .prepare("SELECT level, current_skin FROM pets WHERE child_id = ?")
    .bind(childId)
    .first<{ level: number; current_skin: string }>();

  return {
    approvedCount: approved?.n ?? 0,
    totalEarned: earned?.n ?? 0,
    purchaseCount: purchases?.n ?? 0,
    petLevel: pet?.level ?? 1,
    dressedUp: !!pet && pet.current_skin !== "default",
  };
}

/** 各成就的解鎖條件。 */
function satisfied(code: string, a: Aggregates): boolean {
  switch (code) {
    case "first_task":
      return a.approvedCount >= 1;
    case "task_master":
      return a.approvedCount >= 10;
    case "earn_100":
      return a.totalEarned >= 100;
    case "first_buy":
      return a.purchaseCount >= 1;
    case "level_5":
      return a.petLevel >= 5;
    case "dress_up":
      return a.dressedUp;
    default:
      return false;
  }
}

/**
 * 重新評估並解鎖達標成就，回傳完整圖鑑狀態（含已解鎖時間）。
 * 解鎖是「只增不減」— 一旦拿到就永久保留。
 */
export async function evaluateAchievements(
  db: D1Database,
  childId: string,
): Promise<AchievementState[]> {
  const aggregates = await gather(db, childId);

  const { results } = await db
    .prepare("SELECT achievement_code, unlocked_at FROM child_achievements WHERE child_id = ?")
    .bind(childId)
    .all<{ achievement_code: string; unlocked_at: number }>();
  const unlocked = new Map((results ?? []).map((r) => [r.achievement_code, r.unlocked_at]));

  // 找出新達標但尚未記錄的，批次寫入
  const ts = now();
  const inserts = ACHIEVEMENTS.filter(
    (def) => !unlocked.has(def.code) && satisfied(def.code, aggregates),
  ).map((def) => {
    unlocked.set(def.code, ts);
    return db
      .prepare(
        "INSERT OR IGNORE INTO child_achievements (id, child_id, achievement_code, unlocked_at) VALUES (?,?,?,?)",
      )
      .bind(newId("ach"), childId, def.code, ts);
  });
  if (inserts.length > 0) await db.batch(inserts);

  return ACHIEVEMENTS.map((def) => ({
    ...def,
    unlocked: unlocked.has(def.code),
    unlocked_at: unlocked.get(def.code) ?? null,
  }));
}
