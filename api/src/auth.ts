import { sign, verify } from "hono/jwt";
import type { JWTPayload } from "hono/utils/jwt/types";
import type { Role } from "@keepet/shared";

export interface JwtPayload extends JWTPayload {
  sub: string; // user id
  family_id: string;
  role: Role;
  name: string;
  exp: number;
}

const ALG = "HS256" as const;

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 天

export async function issueToken(
  secret: string,
  user: { id: string; family_id: string; role: Role; name: string },
): Promise<string> {
  const payload: JwtPayload = {
    sub: user.id,
    family_id: user.family_id,
    role: user.role,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  return sign(payload, secret, ALG);
}

export async function readToken(
  secret: string,
  token: string,
): Promise<JwtPayload> {
  return (await verify(token, secret, ALG)) as unknown as JwtPayload;
}

// ─── 密碼雜湊（Web Crypto PBKDF2，Workers 原生，免額外套件）─────────
const PBKDF2_ITERATIONS = 100_000;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

/** 回傳格式：pbkdf2$<iterations>$<saltB64>$<hashB64> */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  const actual = await derive(password, salt);
  if (actual.length !== expected.length) return false;
  // 常數時間比較
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
