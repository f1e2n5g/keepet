import { Hono } from "hono";
import type { Env, Variables } from "../env";
import type { CreateTaskBody, Task } from "@keepet/shared";
import { authMiddleware, requireParent } from "../middleware";
import { newId, now } from "../ids";
import { notifyUsers, parentIdsOf } from "../push";

const tasks = new Hono<{ Bindings: Env; Variables: Variables }>();

tasks.use("*", authMiddleware);

/** 目前週期的起始時間戳（UTC）。once 回 0（永不重置）。 */
function periodStart(recurrence: "once" | "daily" | "weekly"): number {
  if (recurrence === "once") return 0;
  const d = new Date();
  if (recurrence === "daily") {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  // weekly：以週一為一週起點
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // 週一=0
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayOfWeek);
  return monday;
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    family_id: row.family_id as string,
    title: row.title as string,
    description: row.description as string,
    points: row.points as number,
    recurrence: row.recurrence as Task["recurrence"],
    assigned_child_id: (row.assigned_child_id as string) ?? null,
    created_by: row.created_by as string,
    active: !!row.active,
    created_at: row.created_at as number,
  };
}

// 列出任務：家長看 family 全部；小孩看「指派給自己 or 全家」的有效任務
tasks.get("/", async (c) => {
  const jwt = c.var.jwt;
  if (jwt.role === "parent") {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM tasks WHERE family_id = ? ORDER BY created_at DESC",
    )
      .bind(jwt.family_id)
      .all();
    return c.json((results ?? []).map(rowToTask));
  }
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM tasks WHERE family_id = ? AND active = 1 AND (assigned_child_id IS NULL OR assigned_child_id = ?) ORDER BY created_at DESC",
  )
    .bind(jwt.family_id, jwt.sub)
    .all();
  return c.json((results ?? []).map(rowToTask));
});

// 家長建立任務
tasks.post("/", requireParent, async (c) => {
  const body = await c.req.json<CreateTaskBody>();
  if (!body.title || typeof body.points !== "number" || body.points < 0) {
    return c.json({ error: "需要任務標題與非負的積分" }, 400);
  }
  const id = newId("task");
  const ts = now();
  await c.env.DB.prepare(
    "INSERT INTO tasks (id, family_id, title, description, points, recurrence, assigned_child_id, created_by, active, created_at) VALUES (?,?,?,?,?,?,?,?,1,?)",
  )
    .bind(
      id,
      c.var.jwt.family_id,
      body.title,
      body.description ?? "",
      Math.floor(body.points),
      body.recurrence ?? "once",
      body.assigned_child_id ?? null,
      c.var.jwt.sub,
      ts,
    )
    .run();
  const row = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first();
  return c.json(rowToTask(row as Record<string, unknown>), 201);
});

// 家長更新任務（停用/編輯）
tasks.patch("/:id", requireParent, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Partial<CreateTaskBody> & { active?: boolean }>();
  const existing = await c.env.DB.prepare(
    "SELECT * FROM tasks WHERE id = ? AND family_id = ?",
  )
    .bind(id, c.var.jwt.family_id)
    .first();
  if (!existing) return c.json({ error: "找不到任務" }, 404);

  const merged = {
    title: body.title ?? (existing.title as string),
    description: body.description ?? (existing.description as string),
    points: typeof body.points === "number" ? Math.floor(body.points) : (existing.points as number),
    recurrence: body.recurrence ?? (existing.recurrence as string),
    assigned_child_id:
      body.assigned_child_id !== undefined
        ? body.assigned_child_id
        : (existing.assigned_child_id as string | null),
    active: body.active !== undefined ? (body.active ? 1 : 0) : (existing.active as number),
  };
  await c.env.DB.prepare(
    "UPDATE tasks SET title=?, description=?, points=?, recurrence=?, assigned_child_id=?, active=? WHERE id=?",
  )
    .bind(
      merged.title,
      merged.description,
      merged.points,
      merged.recurrence,
      merged.assigned_child_id,
      merged.active,
      id,
    )
    .run();
  const row = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first();
  return c.json(rowToTask(row as Record<string, unknown>));
});

// 小孩提交完成 → 建立 pending completion（不直接發點，等家長審核）
tasks.post("/:id/complete", async (c) => {
  if (c.var.jwt.role !== "child") return c.json({ error: "僅限小朋友提交" }, 403);
  const taskId = c.req.param("id");
  const task = await c.env.DB.prepare(
    "SELECT * FROM tasks WHERE id = ? AND family_id = ? AND active = 1",
  )
    .bind(taskId, c.var.jwt.family_id)
    .first();
  if (!task) return c.json({ error: "找不到任務" }, 404);
  if (task.assigned_child_id && task.assigned_child_id !== c.var.jwt.sub) {
    return c.json({ error: "這不是你的任務" }, 403);
  }
  // 避免重複提交：同任務若已有 pending，擋下
  const pending = await c.env.DB.prepare(
    "SELECT id FROM task_completions WHERE task_id = ? AND child_id = ? AND status = 'pending'",
  )
    .bind(taskId, c.var.jwt.sub)
    .first();
  if (pending) return c.json({ error: "你已經提交過，等家長審核中" }, 409);

  // 依重複週期決定「本期是否已完成」。每日/每週的重置由時間區間計算（免排程）。
  const recurrence = task.recurrence as "once" | "daily" | "weekly";
  const sinceTs = periodStart(recurrence);
  const doneThisPeriod = await c.env.DB.prepare(
    "SELECT id FROM task_completions WHERE task_id = ? AND child_id = ? AND status = 'approved' AND submitted_at >= ?",
  )
    .bind(taskId, c.var.jwt.sub, sinceTs)
    .first();
  if (doneThisPeriod) {
    const msg =
      recurrence === "daily"
        ? "今天已經完成這個任務囉，明天再來！"
        : recurrence === "weekly"
          ? "這週已經完成這個任務囉！"
          : "這個任務已經完成囉";
    return c.json({ error: msg }, 409);
  }

  const id = newId("comp");
  await c.env.DB.prepare(
    "INSERT INTO task_completions (id, task_id, child_id, status, submitted_at) VALUES (?,?,?,'pending',?)",
  )
    .bind(id, taskId, c.var.jwt.sub, now())
    .run();

  // 通知家長有任務待審核（fire-and-forget，不阻塞回應）
  const childName = c.var.jwt.name;
  const taskTitle = task.title as string;
  c.executionCtx.waitUntil(
    (async () => {
      const parents = await parentIdsOf(c.env.DB, c.var.jwt.family_id);
      await notifyUsers(c.env.DB, parents, "📋 有任務待審核", `${childName} 完成了「${taskTitle}」`);
    })(),
  );

  return c.json({ id, status: "pending" }, 201);
});

export default tasks;
