import { Hono } from "hono";
import type { Env, Variables } from "../env";
import type { RegisterPushBody } from "@keepet/shared";
import { authMiddleware } from "../middleware";
import { registerToken } from "../push";

const push = new Hono<{ Bindings: Env; Variables: Variables }>();

push.use("*", authMiddleware);

// 裝置註冊 push token（登入後由 App 呼叫）
push.post("/register", async (c) => {
  const body = await c.req.json<RegisterPushBody>();
  if (!body.token || !body.platform) return c.json({ error: "缺少 token 或 platform" }, 400);
  await registerToken(c.env.DB, c.var.jwt.sub, body.token, body.platform);
  return c.json({ ok: true });
});

export default push;
