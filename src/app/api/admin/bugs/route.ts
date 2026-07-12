import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const bugs = await prisma.bugReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ ok: true, bugs });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let body: { id?: string; status?: string };
  try {
    body = (await request.json()) as { id?: string; status?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.id || (body.status !== "open" && body.status !== "done")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const bug = await prisma.bugReport.update({
    where: { id: body.id },
    data: { status: body.status },
  });
  return NextResponse.json({ ok: true, bug });
}
