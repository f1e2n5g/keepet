import { newId, now } from "./ids";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** 註冊（或更新）一個使用者的 push token。 */
export async function registerToken(
  db: D1Database,
  userId: string,
  token: string,
  platform: string,
): Promise<void> {
  // token 唯一：若已存在就改綁到目前使用者
  await db
    .prepare(
      `INSERT INTO push_tokens (id, user_id, token, platform, created_at)
       VALUES (?,?,?,?,?)
       ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform`,
    )
    .bind(newId("push"), userId, token, platform, now())
    .run();
}

/**
 * 推播給一組使用者（best-effort，失敗不影響主流程）。
 * 用 Expo Push API；Expo token 在 web 上沒有，所以實際只會送到有註冊的裝置。
 */
export async function notifyUsers(
  db: D1Database,
  userIds: string[],
  title: string,
  body: string,
): Promise<void> {
  if (userIds.length === 0) return;
  const placeholders = userIds.map(() => "?").join(",");
  const { results } = await db
    .prepare(`SELECT token FROM push_tokens WHERE user_id IN (${placeholders})`)
    .bind(...userIds)
    .all<{ token: string }>();
  const tokens = (results ?? []).map((r) => r.token).filter((t) => t.startsWith("ExponentPushToken"));
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({ to, title, body, sound: "default" }));
  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error("push send failed:", err);
  }
}

/** 取得某 family 的所有家長 user id。 */
export async function parentIdsOf(db: D1Database, familyId: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT id FROM users WHERE family_id = ? AND role = 'parent'")
    .bind(familyId)
    .all<{ id: string }>();
  return (results ?? []).map((r) => r.id);
}
