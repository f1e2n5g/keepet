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

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// 前端是 web (Cloudflare Pages) + Android，開放跨來源；token 走 Authorization header。
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

app.notFound((c) => c.json({ error: "找不到此路徑" }, 404));
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "伺服器發生錯誤" }, 500);
});

export default app;
