import { newId, now } from "./ids";

/** 取得小孩目前積分餘額（流水帳加總）。 */
export async function getBalance(db: D1Database, childId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COALESCE(SUM(delta), 0) AS balance FROM point_ledger WHERE child_id = ?")
    .bind(childId)
    .first<{ balance: number }>();
  return row?.balance ?? 0;
}

/** 建立一筆流水帳的 prepared statement（供 batch 使用，確保與其他寫入同一交易）。 */
export function ledgerInsert(
  db: D1Database,
  entry: {
    child_id: string;
    delta: number;
    reason: string;
    ref_type?: string | null;
    ref_id?: string | null;
  },
): D1PreparedStatement {
  return db
    .prepare(
      "INSERT INTO point_ledger (id, child_id, delta, reason, ref_type, ref_id, created_at) VALUES (?,?,?,?,?,?,?)",
    )
    .bind(
      newId("ledger"),
      entry.child_id,
      entry.delta,
      entry.reason,
      entry.ref_type ?? null,
      entry.ref_id ?? null,
      now(),
    );
}
