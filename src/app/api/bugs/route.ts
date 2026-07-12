import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type BugBody = {
  message?: string;
  locale?: string;
  path?: string;
  userAgent?: string;
};

const MAX_LEN = 4000;

export async function POST(request: Request) {
  let body: BugBody;
  try {
    body = (await request.json()) as BugBody;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (message.length < 8) {
    return Response.json({ ok: false, error: "too_short" }, { status: 400 });
  }
  if (message.length > MAX_LEN) {
    return Response.json({ ok: false, error: "too_long" }, { status: 400 });
  }

  try {
    const report = await prisma.bugReport.create({
      data: {
        message,
        locale: body.locale ?? "pt",
        path: (body.path ?? "").slice(0, 500),
        userAgent: (body.userAgent ?? "").slice(0, 300),
        status: "open",
      },
    });
    return Response.json({ ok: true, id: report.id });
  } catch (err) {
    console.error("[bug-report]", err);
    return Response.json({ ok: false, error: "db_error" }, { status: 500 });
  }
}
