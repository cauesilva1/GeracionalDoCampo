import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "lenda_admin";

function secret() {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "dev-only";
}

export function signAdminToken(): string {
  const payload = `ok:${Date.now()}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  // 14 days
  const ts = Number(payload.split(":")[1] ?? 0);
  if (!ts || Date.now() - ts > 14 * 24 * 60 * 60 * 1000) return false;
  return true;
}

export async function isAdminSession(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(COOKIE)?.value);
}

export function adminCookieName() {
  return COOKIE;
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
