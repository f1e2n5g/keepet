import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Variables } from "./env";
import auth from "./routes/auth";
import children from "./routes/children";
import tasks from "./routes/tasks";
import completions from "./routes/completions";
import shop from "./routes/shop";
import pet from "./routes/pet";

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

app.notFound((c) => c.json({ error: "找不到此路徑" }, 404));
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "伺服器發生錯誤" }, 500);
});

export default app;
