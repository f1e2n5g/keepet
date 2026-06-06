import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Variables } from "./env";
import auth from "./routes/auth";
import children from "./routes/children";
import tasks from "./routes/tasks";
import completions from "./routes/completions";
import shop from "./routes/shop";
import pet from "./routes/pet";
import redemptions from "./routes/redemptions";
import achievements from "./routes/achievements";
import reports from "./routes/reports";
import push from "./routes/push";
import { runWeeklyEmailJob } from "./jobs/weeklyEmail";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", cors());

app.get("/", (c) => c.json({ name: "KeePet API", ok: true }));
app.get("/health", (c) => c.json({ ok: true }));

app.route("/auth", auth);
app.route("/children", children);
app.route("/tasks", tasks);
app.route("/completions", completions);
app.route("/shop", shop);
app.route("/pet", pet);
app.route("/redemptions", redemptions);
app.route("/achievements", achievements);
app.route("/reports", reports);
app.route("/push", push);

// 手動觸發週報（用 CRON_SECRET 保護，方便測試；正式上線用 Cron Trigger）
app.post("/internal/weekly-email", async (c) => {
  const secret = c.req.header("X-Cron-Secret");
  if (!c.env.CRON_SECRET || secret !== c.env.CRON_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await runWeeklyEmailJob(c.env);
  return c.json({ ok: true });
});

app.notFound((c) => c.json({ error: "找不到此路徑" }, 404));
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "伺服器發生錯誤" }, 500);
});

// Cloudflare Cron Trigger：每週一 08:00 UTC 自動寄週報
export default {
  fetch: app.fetch,
  async scheduled(_event: unknown, env: Env) {
    await runWeeklyEmailJob(env);
  },
};
