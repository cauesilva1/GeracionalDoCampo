import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") ?? 20)));

  const raw = await prisma.hallEntry.findMany({
    take: Math.min(200, limit * 4),
  });

  const major = (e: (typeof raw)[number]) =>
    e.leagueTitles +
    e.nbaTitles +
    e.euroTitles +
    e.worldCups +
    e.olympicRuns;

  // Rank: legacy score → major titles → NBA rings → MVP → OVR → newest
  const entries = [...raw]
    .sort((a, b) => {
      if (b.legacyScore !== a.legacyScore) return b.legacyScore - a.legacyScore;
      const tb = major(b);
      const ta = major(a);
      if (tb !== ta) return tb - ta;
      if (b.nbaTitles !== a.nbaTitles) return b.nbaTitles - a.nbaTitles;
      if (b.mvps !== a.mvps) return b.mvps - a.mvps;
      if (b.ovr !== a.ovr) return b.ovr - a.ovr;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, limit);

  return Response.json({ ok: true, entries });
}

type HallBody = {
  playerName?: string;
  posId?: string;
  ovr?: number;
  tierId?: string;
  seasons?: number;
  leagueTitles?: number;
  nbaTitles?: number;
  euroTitles?: number;
  worldCups?: number;
  olympicRuns?: number;
  mvps?: number;
  finalsMvps?: number;
  allStars?: number;
  legacyScore?: number;
  careerSeed?: string;
  locale?: string;
  nickname?: string | null;
};

export async function POST(request: Request) {
  let body: HallBody;
  try {
    body = (await request.json()) as HallBody;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const playerName = (body.playerName ?? "").trim().slice(0, 40);
  if (playerName.length < 2) {
    return Response.json({ ok: false, error: "bad_name" }, { status: 400 });
  }
  const ovr = Number(body.ovr);
  const seasons = Number(body.seasons);
  const legacyScore = Number(body.legacyScore);
  if (!Number.isFinite(ovr) || !Number.isFinite(seasons) || !Number.isFinite(legacyScore)) {
    return Response.json({ ok: false, error: "bad_stats" }, { status: 400 });
  }

  try {
    const entry = await prisma.hallEntry.create({
      data: {
        playerName,
        posId: (body.posId ?? "SG").slice(0, 4),
        ovr: Math.round(Math.min(99, Math.max(40, ovr))),
        tierId: (body.tierId ?? "solid").slice(0, 32),
        seasons: Math.round(Math.min(40, Math.max(1, seasons))),
        leagueTitles: Math.max(0, Math.round(body.leagueTitles ?? 0)),
        nbaTitles: Math.max(0, Math.round(body.nbaTitles ?? 0)),
        euroTitles: Math.max(0, Math.round(body.euroTitles ?? 0)),
        worldCups: Math.max(0, Math.round(body.worldCups ?? 0)),
        olympicRuns: Math.max(0, Math.round(body.olympicRuns ?? 0)),
        mvps: Math.max(0, Math.round(body.mvps ?? 0)),
        finalsMvps: Math.max(0, Math.round(body.finalsMvps ?? 0)),
        allStars: Math.max(0, Math.round(body.allStars ?? 0)),
        legacyScore,
        careerSeed: (body.careerSeed ?? "").slice(0, 64),
        locale: (body.locale ?? "pt").slice(0, 5),
        nickname: body.nickname ? String(body.nickname).slice(0, 40) : null,
      },
    });
    return Response.json({ ok: true, id: entry.id });
  } catch (err) {
    console.error("[hall]", err);
    return Response.json({ ok: false, error: "db_error" }, { status: 500 });
  }
}
