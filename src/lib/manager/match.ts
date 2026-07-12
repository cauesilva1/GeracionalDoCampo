import { clubsByLeague, getClub, LEAGUES } from "@/lib/manager/clubs";
import {
  coachOvrMatchBonus,
  philosophyMatchBonus,
} from "@/lib/manager/legacy";
import { xiPowers } from "@/lib/manager/players";
import { clamp, rand, shuffle, uid } from "@/lib/utils";
import type {
  CoachPhilosophy,
  Fixture,
  MatchEvent,
  MatchResult,
  SquadPlayer,
  TableRow,
  TacticStyle,
  TacticsState,
} from "@/types/manager";

function styleBonus(style: TacticStyle, asHome: boolean): number {
  const home = asHome ? 1.8 : 0;
  switch (style) {
    case "pressing":
      return 2.2 + home;
    case "direct":
      return 1.4 + home;
    default:
      return 1.6 + home;
  }
}

/** xG from attack power vs opponent defense. */
function expectedGoals(attack: number, oppDefense: number): number {
  const diff = (attack - oppDefense) / 11;
  return clamp(1.25 + diff, 0.45, 3.4);
}

function sampleGoals(xg: number): number {
  // Poisson-ish
  let L = Math.exp(-xg);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 8);
  return k - 1;
}

export function buildFixtures(leagueId: string): Fixture[] {
  const clubs = clubsByLeague(leagueId as import("@/types/manager").LeagueId);
  const ids = clubs.map((c) => c.id);
  const matchdays = LEAGUES[leagueId as keyof typeof LEAGUES].matchdays;
  // Simplified: each matchday pairs randomly from a rotating list
  const fixtures: Fixture[] = [];
  let pool = shuffle([...ids]);
  for (let md = 1; md <= matchdays; md++) {
    if (md % 4 === 1) pool = shuffle([...ids]);
    const used = new Set<string>();
    const order = [...pool];
    for (let i = 0; i < order.length - 1; i += 2) {
      const a = order[i]!;
      const b = order[i + 1]!;
      if (used.has(a) || used.has(b)) continue;
      used.add(a);
      used.add(b);
      const homeFirst = (md + i) % 2 === 0;
      fixtures.push({
        id: uid("fx"),
        matchday: md,
        homeId: homeFirst ? a : b,
        awayId: homeFirst ? b : a,
        played: false,
        homeGoals: null,
        awayGoals: null,
      });
    }
  }
  return fixtures;
}

export function emptyTable(leagueId: string): TableRow[] {
  return clubsByLeague(leagueId as import("@/types/manager").LeagueId).map((c) => ({
    clubId: c.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    pts: 0,
  }));
}

export function sortTable(table: TableRow[]): TableRow[] {
  return [...table].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });
}

export function applyResult(table: TableRow[], homeId: string, awayId: string, hg: number, ag: number): TableRow[] {
  return table.map((row) => {
    if (row.clubId !== homeId && row.clubId !== awayId) return row;
    const isHome = row.clubId === homeId;
    const gf = isHome ? hg : ag;
    const ga = isHome ? ag : hg;
    let won = row.won;
    let drawn = row.drawn;
    let lost = row.lost;
    let pts = row.pts;
    if (gf > ga) {
      won++;
      pts += 3;
    } else if (gf === ga) {
      drawn++;
      pts += 1;
    } else {
      lost++;
    }
    return {
      ...row,
      played: row.played + 1,
      won,
      drawn,
      lost,
      gf: row.gf + gf,
      ga: row.ga + ga,
      pts,
    };
  });
}

/** Undo a previously applied match result (for mid-match score changes). */
export function reverseResult(
  table: TableRow[],
  homeId: string,
  awayId: string,
  hg: number,
  ag: number,
): TableRow[] {
  return table.map((row) => {
    if (row.clubId !== homeId && row.clubId !== awayId) return row;
    const isHome = row.clubId === homeId;
    const gf = isHome ? hg : ag;
    const ga = isHome ? ag : hg;
    let won = row.won;
    let drawn = row.drawn;
    let lost = row.lost;
    let pts = row.pts;
    if (gf > ga) {
      won--;
      pts -= 3;
    } else if (gf === ga) {
      drawn--;
      pts -= 1;
    } else {
      lost--;
    }
    return {
      ...row,
      played: Math.max(0, row.played - 1),
      won: Math.max(0, won),
      drawn: Math.max(0, drawn),
      lost: Math.max(0, lost),
      gf: Math.max(0, row.gf - gf),
      ga: Math.max(0, row.ga - ga),
      pts: Math.max(0, pts),
    };
  });
}

function powersForClub(
  clubId: string,
  userClubId: string,
  userSquad: SquadPlayer[],
  userStarters: string[],
  userTactics: TacticsState,
  aiSquads: Record<string, SquadPlayer[]>,
  asHome: boolean,
  coachPhilosophy?: CoachPhilosophy,
  coachOvr?: number,
): { attack: number; defense: number } {
  if (clubId === userClubId) {
    const philo = coachPhilosophy
      ? philosophyMatchBonus(coachPhilosophy, userTactics.style)
      : 0;
    const skill = coachOvr != null ? coachOvrMatchBonus(coachOvr) : 0;
    return xiPowers(
      userSquad,
      userStarters,
      userTactics.attack,
      userTactics.midfield,
      userTactics.defense,
      styleBonus(userTactics.style, asHome) + philo + skill,
      userTactics.formation,
    );
  }
  const club = getClub(clubId);
  const squad = aiSquads[clubId] ?? [];
  const top = [...squad]
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 11)
    .map((p) => p.id);
  const base = xiPowers(squad, top, 52, 52, 52, asHome ? 1.8 : 0.4);
  // Prestige nudges AI, but squad quality dominates (was 40% prestige).
  const prestige = club?.prestige ?? 60;
  return {
    attack: clamp(base.attack * 0.72 + prestige * 0.22, 50, 92),
    defense: clamp(base.defense * 0.72 + prestige * 0.22, 50, 92),
  };
}

export function simulateMatchday(input: {
  fixtures: Fixture[];
  matchday: number;
  table: TableRow[];
  userClubId: string;
  userSquad: SquadPlayer[];
  userStarters: string[];
  userTactics: TacticsState;
  coachPhilosophy?: CoachPhilosophy;
  coachOvr?: number;
  aiSquads: Record<string, SquadPlayer[]>;
}): {
  fixtures: Fixture[];
  table: TableRow[];
  userResult: MatchResult | null;
} {
  const {
    matchday,
    userClubId,
    userSquad,
    userStarters,
    userTactics,
    coachPhilosophy,
    coachOvr,
    aiSquads,
  } = input;
  let table = input.table;
  let userResult: MatchResult | null = null;

  const fixtures = input.fixtures.map((fx) => {
    if (fx.matchday !== matchday || fx.played) return fx;

    const home = powersForClub(
      fx.homeId,
      userClubId,
      userSquad,
      userStarters,
      userTactics,
      aiSquads,
      true,
      coachPhilosophy,
      coachOvr,
    );
    const away = powersForClub(
      fx.awayId,
      userClubId,
      userSquad,
      userStarters,
      userTactics,
      aiSquads,
      false,
      coachPhilosophy,
      coachOvr,
    );

    const hg = sampleGoals(expectedGoals(home.attack, away.defense));
    const ag = sampleGoals(expectedGoals(away.attack, home.defense));

    table = applyResult(table, fx.homeId, fx.awayId, hg, ag);

    const involvesUser =
      fx.homeId === userClubId || fx.awayId === userClubId;

    if (involvesUser) {
      const events = buildEvents(fx.homeId, fx.awayId, hg, ag, userClubId, userSquad);
      const won =
        (fx.homeId === userClubId && hg > ag) ||
        (fx.awayId === userClubId && ag > hg);
      const drawn = hg === ag;
      userResult = {
        fixtureId: fx.id,
        homeId: fx.homeId,
        awayId: fx.awayId,
        homeGoals: hg,
        awayGoals: ag,
        events,
        summaryKey: won ? "mgr.match.win" : drawn ? "mgr.match.draw" : "mgr.match.loss",
      };
    }

    return {
      ...fx,
      played: true,
      homeGoals: hg,
      awayGoals: ag,
    };
  });

  return { fixtures, table: sortTable(table), userResult };
}

export function buildEvents(
  homeId: string,
  awayId: string,
  hg: number,
  ag: number,
  userClubId: string,
  userSquad: SquadPlayer[],
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const scorers = (n: number, clubId: string) => {
    for (let i = 0; i < n; i++) {
      const minute = Math.round(rand(6, 90));
      let playerName: string | undefined;
      if (clubId === userClubId) {
        const atk = userSquad
          .filter((p) => p.pos === "ST" || p.pos === "W" || p.pos === "AM")
          .sort((a, b) => b.attrs.shoot - a.attrs.shoot);
        playerName = atk[i % Math.max(atk.length, 1)]?.name ?? userSquad[0]?.name;
      }
      events.push({
        minute,
        kind: "goal",
        clubId,
        textKey: "mgr.event.goal",
        playerName,
      });
    }
  };
  scorers(hg, homeId);
  scorers(ag, awayId);
  if (Math.random() < 0.35) {
    events.push({
      minute: Math.round(rand(20, 80)),
      kind: "chance",
      clubId: Math.random() < 0.5 ? homeId : awayId,
      textKey: "mgr.event.chance",
    });
  }
  return events.sort((a, b) => a.minute - b.minute);
}

export function boardConfidenceDelta(
  goal: import("@/types/manager").BoardGoal,
  tablePos: number,
  clubs: number,
  result: "W" | "D" | "L",
): number {
  let d = result === "W" ? 3 : result === "D" ? 0 : -4;
  const expected =
    goal === "title"
      ? 1
      : goal === "top4"
        ? 4
        : goal === "midtable"
          ? Math.ceil(clubs / 2)
          : clubs - 3;
  if (tablePos <= expected) d += 1;
  else if (tablePos > expected + 3) d -= 2;
  return d;
}
