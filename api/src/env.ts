import type { JwtPayload } from "./auth";

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/** Hono context 變數型別：authMiddleware 會把已驗證的使用者放進來。 */
export interface Variables {
  jwt: JwtPayload;
}
