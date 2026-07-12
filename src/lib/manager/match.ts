import { clubsByLeague, getClub, LEAGUES } from "@/lib/manager/clubs";
import {
  coachOvrMatchBonus,
  philosophyMatchBonus,
} from "@/lib/manager/legacy";
import { xiPowers } from "@/lib/manager/players";
import { clamp, rand, shuffle, uid } from "@/lib/utils";
import type {
  BoardGoal,
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

/** Known derby pairs + prestige ≥ 70 same-league clash. */
const RIVAL_PAIRS: [string, string][] = [
  ["bra-fla", "bra-flu"],
  ["bra-cor", "bra-pal"],
  ["bra-sao", "bra-san"],
  ["bra-gre", "bra-int"],
  ["eng-liv", "eng-eve"],
  ["eng-mun", "eng-liv"],
  ["eng-ars", "eng-tot"],
  ["esp-rma", "esp-bar"],
  ["esp-atm", "esp-rma"],
  ["esp-sev", "esp-bet"],
];

export function isRivalryMatch(a: string, b: string): boolean {
  const pair = RIVAL_PAIRS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
  if (pair) return true;
  const ca = getClub(a);
  const cb = getClub(b);
  if (!ca || !cb) return false;
  return (
    ca.leagueId === cb.leagueId &&
    ca.prestige >= 70 &&
    cb.prestige >= 70
  );
}

function rivalryAttackBonus(
  clubId: string,
  oppId: string,
  userClubId: string,
): number {
  if (clubId !== userClubId) return 0;
  return isRivalryMatch(clubId, oppId) ? 1.5 : 0;
}

function difficultyScale(
  difficulty: "easy" | "medium" | "hard" | undefined,
  isUser: boolean,
): number {
  if (!difficulty || difficulty === "medium") return 1;
  if (difficulty === "easy") return isUser ? 1.06 : 0.94;
  return isUser ? 0.94 : 1.08;
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

const BYE = "__bye__";

/** Single round-robin via circle method. Odd team counts get a bye. */
function circleRoundRobin(
  teamIds: string[],
): { homeId: string; awayId: string }[][] {
  const ids = shuffle([...teamIds]);
  if (ids.length % 2 === 1) ids.push(BYE);
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const rotation = [...ids];
  const schedule: { homeId: string; awayId: string }[][] = [];

  for (let r = 0; r < rounds; r++) {
    const pairs: { homeId: string; awayId: string }[] = [];
    for (let i = 0; i < half; i++) {
      const a = rotation[i]!;
      const b = rotation[n - 1 - i]!;
      if (a === BYE || b === BYE) continue;
      // Alternate home/away across rounds for fairness
      const swap = r % 2 === 1;
      pairs.push(
        swap
          ? { homeId: b, awayId: a }
          : { homeId: a, awayId: b },
      );
    }
    schedule.push(pairs);
    // Keep index 0 fixed; rotate the rest clockwise
    const fixed = rotation[0]!;
    const rest = rotation.slice(1);
    rest.unshift(rest.pop()!);
    rotation.splice(0, rotation.length, fixed, ...rest);
  }
  return schedule;
}

function scheduleToFixtures(
  schedule: { homeId: string; awayId: string }[][],
  startMatchday: number,
): Fixture[] {
  const fixtures: Fixture[] = [];
  for (let i = 0; i < schedule.length; i++) {
    const md = startMatchday + i;
    for (const pair of schedule[i]!) {
      fixtures.push({
        id: uid("fx"),
        matchday: md,
        homeId: pair.homeId,
        awayId: pair.awayId,
        played: false,
        homeGoals: null,
        awayGoals: null,
      });
    }
  }
  return fixtures;
}

function reverseSchedule(
  schedule: { homeId: string; awayId: string }[][],
): { homeId: string; awayId: string }[][] {
  return schedule.map((round) =>
    round.map((p) => ({ homeId: p.awayId, awayId: p.homeId })),
  );
}

export function buildFixtures(
  leagueId: string,
  clubIds?: string[],
): Fixture[] {
  const clubs = clubsByLeague(leagueId as import("@/types/manager").LeagueId);
  const ids = clubIds ?? clubs.map((c) => c.id);
  const matchdays = LEAGUES[leagueId as keyof typeof LEAGUES].matchdays;

  const single = circleRoundRobin(ids);
  // Double RR: first legs + return legs
  let schedule = [...single, ...reverseSchedule(single)];

  if (matchdays < schedule.length) {
    // Take first N rounds of a shuffled full schedule
    schedule = shuffle([...schedule]).slice(0, matchdays);
  } else {
    while (schedule.length < matchdays) {
      const more = circleRoundRobin(ids);
      const need = matchdays - schedule.length;
      if (need >= more.length * 2) {
        schedule = [...schedule, ...more, ...reverseSchedule(more)];
      } else if (need >= more.length) {
        schedule = [
          ...schedule,
          ...more,
          ...reverseSchedule(more).slice(0, need - more.length),
        ];
      } else {
        schedule = [...schedule, ...more.slice(0, need)];
      }
    }
  }

  return scheduleToFixtures(schedule, 1);
}

export function emptyTable(
  leagueId: string,
  clubIds?: string[],
): TableRow[] {
  const ids =
    clubIds ??
    clubsByLeague(leagueId as import("@/types/manager").LeagueId).map(
      (c) => c.id,
    );
  return ids.map((clubId) => ({
    clubId,
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

export function powersForClub(
  clubId: string,
  userClubId: string,
  userSquad: SquadPlayer[],
  userStarters: string[],
  userTactics: TacticsState,
  aiSquads: Record<string, SquadPlayer[]>,
  asHome: boolean,
  coachPhilosophy?: CoachPhilosophy,
  coachOvr?: number,
  oppId?: string,
  difficulty?: "easy" | "medium" | "hard",
  seasonsAtClub?: number,
): { attack: number; defense: number } {
  const isUser = clubId === userClubId;
  let scale = difficultyScale(difficulty, isUser);
  const rival =
    oppId != null ? rivalryAttackBonus(clubId, oppId, userClubId) : 0;

  if (isUser) {
    const userClub = getClub(userClubId);
    if (userClub) {
      if (userClub.difficulty === "nightmare") scale *= 0.92;
      else if (userClub.difficulty === "hard") scale *= 0.96;
      const seasons = Math.max(1, seasonsAtClub ?? 1);
      const fade = Math.max(0, 1 - (seasons - 1) * 0.28);
      scale *= 1 - userClub.rebuildGap * 0.1 * fade;
    }
    const philo = coachPhilosophy
      ? philosophyMatchBonus(coachPhilosophy, userTactics.style)
      : 0;
    const skill = coachOvr != null ? coachOvrMatchBonus(coachOvr) : 0;
    const base = xiPowers(
      userSquad,
      userStarters,
      userTactics.attack,
      userTactics.midfield,
      userTactics.defense,
      styleBonus(userTactics.style, asHome) + philo + skill + rival,
      userTactics.formation,
    );
    return {
      attack: clamp(base.attack * scale, 48, 96),
      defense: clamp(base.defense * scale, 48, 96),
    };
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
  const prestigeW =
    difficulty === "easy" ? 0.16 : difficulty === "hard" ? 0.28 : 0.22;
  return {
    attack: clamp((base.attack * 0.72 + prestige * prestigeW) * scale, 50, 92),
    defense: clamp((base.defense * 0.72 + prestige * prestigeW) * scale, 50, 92),
  };
}

/** Safe finish line for survive goal (avoid relegation / bottom danger). */
export function surviveSafePosition(clubs: number, relegate: number): number {
  if (relegate > 0) return clubs - relegate;
  const danger = Math.max(3, Math.ceil(clubs * 0.25));
  return Math.max(1, clubs - danger);
}

/** Target table position for board goal (soft progress UI). */
export function boardGoalTarget(
  goal: BoardGoal,
  clubs: number,
  relegate = 0,
): number {
  if (goal === "title") return 1;
  if (goal === "top4") return 4;
  if (goal === "midtable") return Math.ceil(clubs / 2);
  return surviveSafePosition(clubs, relegate);
}

export function matchLeanKey(
  userAttack: number,
  oppDefense: number,
): "mgr.preview.lean.fav" | "mgr.preview.lean.even" | "mgr.preview.lean.hard" {
  const diff = userAttack - oppDefense;
  if (diff >= 4) return "mgr.preview.lean.fav";
  if (diff <= -4) return "mgr.preview.lean.hard";
  return "mgr.preview.lean.even";
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
  difficulty?: "easy" | "medium" | "hard";
  seasonsAtClub?: number;
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
    difficulty,
    seasonsAtClub,
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
      fx.awayId,
      difficulty,
      seasonsAtClub,
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
      fx.homeId,
      difficulty,
      seasonsAtClub,
    );

    let hg = sampleGoals(expectedGoals(home.attack, away.defense));
    let ag = sampleGoals(expectedGoals(away.attack, home.defense));

    const involvesUser =
      fx.homeId === userClubId || fx.awayId === userClubId;

    let events: MatchEvent[] = [];
    if (involvesUser) {
      events = buildEvents(fx.homeId, fx.awayId, hg, ag, userClubId, userSquad);
      // Source of truth = goal events
      hg = events.filter((e) => e.kind === "goal" && e.clubId === fx.homeId).length;
      ag = events.filter((e) => e.kind === "goal" && e.clubId === fx.awayId).length;
    }

    table = applyResult(table, fx.homeId, fx.awayId, hg, ag);

    if (involvesUser) {
      const won =
        (fx.homeId === userClubId && hg > ag) ||
        (fx.awayId === userClubId && ag > hg);
      const drawn = hg === ag;
      const gd = Math.abs(
        (fx.homeId === userClubId ? hg - ag : ag - hg),
      );
      let summaryKey = won
        ? "mgr.match.win"
        : drawn
          ? "mgr.match.draw"
          : "mgr.match.loss";
      if (won && gd >= 3) summaryKey = "mgr.match.bigWin";
      if (!won && !drawn && gd >= 3) summaryKey = "mgr.match.bigLoss";
      userResult = {
        fixtureId: fx.id,
        homeId: fx.homeId,
        awayId: fx.awayId,
        homeGoals: hg,
        awayGoals: ag,
        events,
        summaryKey,
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

function pickUniqueMinute(
  used: Set<number>,
  min: number,
  max: number,
): number {
  for (let attempt = 0; attempt < 40; attempt++) {
    const m = Math.round(rand(min, max));
    if (!used.has(m)) {
      used.add(m);
      return m;
    }
  }
  for (let m = min; m <= max; m++) {
    if (!used.has(m)) {
      used.add(m);
      return m;
    }
  }
  const fallback = Math.min(max, min + used.size);
  used.add(fallback);
  return fallback;
}

function pickScorerName(
  clubId: string,
  userClubId: string,
  userSquad: SquadPlayer[],
  index: number,
): string | undefined {
  if (clubId !== userClubId) return undefined;
  const atk = userSquad
    .filter((p) => p.pos === "ST" || p.pos === "W" || p.pos === "AM")
    .sort((a, b) => b.attrs.shoot - a.attrs.shoot);
  return atk[index % Math.max(atk.length, 1)]?.name ?? userSquad[0]?.name;
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
  const usedMinutes = new Set<number>();

  const scorers = (n: number, clubId: string) => {
    for (let i = 0; i < n; i++) {
      const minute = pickUniqueMinute(usedMinutes, 6, 90);
      events.push({
        id: uid("ev"),
        minute,
        kind: "goal",
        clubId,
        textKey: "mgr.event.goal",
        playerName: pickScorerName(clubId, userClubId, userSquad, i),
      });
    }
  };
  scorers(hg, homeId);
  scorers(ag, awayId);

  // Spot-kick: if user has a designated PK taker, small chance of a penalty goal
  const pkTaker = userSquad.find((p) => p.takesPk);
  if (pkTaker && Math.random() < 0.08) {
    events.push({
      id: uid("ev"),
      minute: pickUniqueMinute(usedMinutes, 12, 88),
      kind: "goal",
      clubId: userClubId,
      textKey: "mgr.event.penalty",
      playerName: pkTaker.name,
    });
  }

  if (Math.random() < 0.35) {
    events.push({
      id: uid("ev"),
      minute: pickUniqueMinute(usedMinutes, 20, 80),
      kind: "chance",
      clubId: Math.random() < 0.5 ? homeId : awayId,
      textKey: "mgr.event.chance",
    });
  }

  // Cards: yellow common-ish, red rare — feed only, no score impact
  if (Math.random() < 0.15) {
    const clubId = Math.random() < 0.5 ? homeId : awayId;
    const fromUser = clubId === userClubId;
    const name = fromUser
      ? userSquad[Math.floor(Math.random() * Math.max(userSquad.length, 1))]
          ?.name
      : undefined;
    events.push({
      id: uid("ev"),
      minute: pickUniqueMinute(usedMinutes, 8, 88),
      kind: "card",
      clubId,
      textKey: "mgr.event.yellow",
      playerName: name,
    });
  }
  if (Math.random() < 0.03) {
    const clubId = Math.random() < 0.5 ? homeId : awayId;
    const fromUser = clubId === userClubId;
    const name = fromUser
      ? userSquad[Math.floor(Math.random() * Math.max(userSquad.length, 1))]
          ?.name
      : undefined;
    events.push({
      id: uid("ev"),
      minute: pickUniqueMinute(usedMinutes, 20, 85),
      kind: "card",
      clubId,
      textKey: "mgr.event.red",
      playerName: name,
    });
  }

  return events.sort((a, b) => a.minute - b.minute);
}

/**
 * Keep goals ≤ 45, re-roll goals for 46–90 from updated powers.
 * Score at 45 is preserved; totals come from the new event list.
 */
export function simulateSecondHalf(
  match: MatchResult,
  powers: {
    homeAttack: number;
    homeDefense: number;
    awayAttack: number;
    awayDefense: number;
  },
  userClubId: string,
  userSquad: SquadPlayer[],
): MatchResult {
  const kept = match.events.filter(
    (e) => e.kind !== "goal" || e.minute <= 45,
  );
  const hg45 = kept.filter(
    (e) => e.kind === "goal" && e.clubId === match.homeId,
  ).length;
  const ag45 = kept.filter(
    (e) => e.kind === "goal" && e.clubId === match.awayId,
  ).length;

  // Half-match xG (~45')
  const addH = sampleGoals(
    expectedGoals(powers.homeAttack, powers.awayDefense) * 0.5,
  );
  const addA = sampleGoals(
    expectedGoals(powers.awayAttack, powers.homeDefense) * 0.5,
  );

  const used = new Set(kept.map((e) => e.minute));
  const extra: MatchEvent[] = [];
  for (let i = 0; i < addH; i++) {
    extra.push({
      id: uid("ev"),
      minute: pickUniqueMinute(used, 46, 90),
      kind: "goal",
      clubId: match.homeId,
      textKey: "mgr.event.goal",
      playerName: pickScorerName(
        match.homeId,
        userClubId,
        userSquad,
        hg45 + i,
      ),
    });
  }
  for (let i = 0; i < addA; i++) {
    extra.push({
      id: uid("ev"),
      minute: pickUniqueMinute(used, 46, 90),
      kind: "goal",
      clubId: match.awayId,
      textKey: "mgr.event.goal",
      playerName: pickScorerName(
        match.awayId,
        userClubId,
        userSquad,
        ag45 + i,
      ),
    });
  }

  const events = [
    ...kept.filter(
      (e) => e.kind === "goal" || e.kind === "chance" || e.kind === "card",
    ),
    ...extra,
  ].sort((a, b) => a.minute - b.minute);
  const homeGoals = events.filter(
    (e) => e.kind === "goal" && e.clubId === match.homeId,
  ).length;
  const awayGoals = events.filter(
    (e) => e.kind === "goal" && e.clubId === match.awayId,
  ).length;

  const uHome = match.homeId === userClubId;
  const gf = uHome ? homeGoals : awayGoals;
  const ga = uHome ? awayGoals : homeGoals;
  const won = gf > ga;
  const drawn = gf === ga;
  const gd = Math.abs(gf - ga);
  let summaryKey = won
    ? "mgr.match.win"
    : drawn
      ? "mgr.match.draw"
      : "mgr.match.loss";
  if (won && gd >= 3) summaryKey = "mgr.match.bigWin";
  if (!won && !drawn && gd >= 3) summaryKey = "mgr.match.bigLoss";

  return {
    ...match,
    homeGoals,
    awayGoals,
    events,
    summaryKey,
  };
}

export function boardConfidenceDelta(
  goal: import("@/types/manager").BoardGoal,
  tablePos: number,
  clubs: number,
  result: "W" | "D" | "L",
  relegate = 0,
): number {
  let d = result === "W" ? 3 : result === "D" ? 0 : -4;
  const expected = boardGoalTarget(goal, clubs, relegate);
  if (tablePos <= expected) d += 1;
  else if (tablePos > expected + 3) d -= 2;
  return d;
}
