import type { Context, Next } from "hono";
import type { Env, Variables } from "./env";
import { readToken } from "./auth";

type Ctx = Context<{ Bindings: Env; Variables: Variables }>;

/** 驗證 Bearer token，把使用者放進 c.var.jwt。 */
export async function authMiddleware(c: Ctx, next: Next) {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return c.json({ error: "缺少認證 token" }, 401);
  try {
    const payload = await readToken(c.env.JWT_SECRET, token);
    c.set("jwt", payload);
  } catch {
    return c.json({ error: "token 無效或已過期" }, 401);
  }
  await next();
}

/** 限定家長角色。 */
export async function requireParent(c: Ctx, next: Next) {
  if (c.var.jwt.role !== "parent") {
    return c.json({ error: "僅限家長操作" }, 403);
  }
  await next();
}

/** 限定小孩角色。 */
export async function requireChild(c: Ctx, next: Next) {
  if (c.var.jwt.role !== "child") {
    return c.json({ error: "僅限小朋友操作" }, 403);
  }
  await next();
}
