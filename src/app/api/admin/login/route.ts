import { NextResponse } from "next/server";
import {
  adminCookieName,
  checkAdminPassword,
  signAdminToken,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!checkAdminPassword(body.password ?? "")) {
    return NextResponse.json({ ok: false, error: "bad_password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName(), signAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName(), "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
