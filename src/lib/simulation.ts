import {
  ATTRS,
  COUNTRIES,
  EURO_MIN_SEASONS,
  EURO_OVR,
  LEAGUES,
  LEGACY_TIERS,
  NBA_DRAFT_MAX_AGE,
  NBA_DRAFT_MIN_SEASONS,
  NBA_DRAFT_OVR,
  NBA_DRAFT_LOTTERY_OVR,
  NBA_FA_MIN_AGE,
  NBA_FA_MIN_SEASONS,
  NBA_FA_OVR,
  POSITION_WEIGHTS,
  STARTER_WALLET,
} from "@/lib/data";
import { newAwardId, seedFinalsScore } from "@/lib/clutch";
import { t } from "@/lib/i18n/dictionary";
import { emptySeasonMods, applySeasonMods } from "@/lib/progression";
import { clamp, pick, rand, shuffle, uid } from "@/lib/utils";
import type {
  AttrStats,
  AwardAnnouncement,
  CareerState,
  ContractOffer,
  CountryId,
  FinalsContext,
  GameState,
  LeagueId,
  Locale,
  PlayerIdentity,
  PositionId,
  PressItem,
  SeasonSummary,
  SeasonTag,
  SimulateSeasonResult,
  StandingRow,
  TrophyCounts,
} from "@/types/game";

/** Prefer currentStats; migrate legacy `slots` if present on old saves. */
export function liveStats(state: GameState): Partial<AttrStats> {
  if (state.currentStats && Object.keys(state.currentStats).length > 0) {
    return state.currentStats;
  }
  const legacy = (state as GameState & { slots?: Partial<AttrStats> }).slots;
  return legacy ?? {};
}

/** Contenders pay less; rebuilders pay max. Strength ~70–96. */
export function contenderSalaryFactor(clubStrength: number): number {
  const ratio = clamp((clubStrength - 70) / 25, 0, 1);
  return 1.38 - ratio * 0.76;
}

export function salaryTierFor(clubStrength: number): ContractOffer["salaryTier"] {
  if (clubStrength >= 90) return "contender";
  if (clubStrength >= 82) return "mid";
  return "rebuild";
}

export function computeOfferSalary(
  ovr: number,
  age: number,
  career: CareerState,
  stats: Partial<AttrStats>,
  clubStrength: number,
  marketBoost = 0,
): number {
  const base = computeMarketValue(ovr, age, career, stats);
  const factor = contenderSalaryFactor(clubStrength) * (1 + marketBoost * 0.12);
  return Math.max(1_000, Math.round(base * factor * rand(0.92, 1.08)));
}

function makeTag(id: string, season: number, rim?: boolean): SeasonTag {
  return {
    id,
    key: `${id}-s${season}-${uid("t")}`,
    rim,
  };
}

export function emptyTrophies(): TrophyCounts {
  return {
    leagueTitles: 0,
    nbaTitles: 0,
    mvps: 0,
    finalsMvps: 0,
    allStars: 0,
    scoringTitles: 0,
    dpoy: 0,
    roy: 0,
    reiAmerica: 0,
    worldCups: 0,
    olympicRuns: 0,
    euroTitles: 0,
  };
}

export function freshCareer(): CareerState {
  return {
    age: 16,
    calendarYear: 2016,
    season: 1,
    leagueId: "nbb",
    clubId: "",
    clubName: "",
    seasonsPlayed: 0,
    nbaSeasons: 0,
    trophies: emptyTrophies(),
    lastSeason: null,
    standings: [],
    press: [],
    offers: [],
    ovrHistory: [],
    perfHistory: [],
    nbaDraftResult: null,
    retired: false,
    inNba: false,
    seasonMods: emptySeasonMods(),
    midEventsDone: 0,
    fatigue: 0,
    pendingAthPenalty: 0,
    pendingCluPenalty: 0,
    pendingGamesMissed: 0,
    injuryShield: false,
    injuryRisk: 0.15,
    nationalCaps: 0,
    marketBoost: 0,
    wallet: STARTER_WALLET,
    annualSalary: 0,
    contractYearsRemaining: 0,
    contractCurrency: "USD",
    rivalClubId: null,
    rivalClubName: null,
  };
}

export function freshState(locale: Locale = "pt"): GameState {
  return {
    phase: "setup",
    centerView: "idle",
    player: null,
    draftPool: [],
    draftIndex: 0,
    rerollUsed: false,
    currentStats: {},
    maxStats: {},
    justFilledAttr: null,
    draftAnimating: false,
    career: null,
    locale,
    pendingFinals: null,
    clutch: null,
    awardQueue: [],
    activeAward: null,
    pendingEvent: null,
    awaitingOffseason: false,
    seasonQueue: [],
    keyGamesQueue: [],
    pendingNational: null,
    clutchKind: null,
    statFlash: null,
    effectToasts: [],
  };
}

export function computeOverall(
  slots: Partial<AttrStats>,
  posId: PositionId | null,
): number {
  if (!posId) return 0;
  const weights = POSITION_WEIGHTS[posId];
  let total = 0;
  for (const a of ATTRS) {
    total += (slots[a.k] ?? 0) * weights[a.k];
  }
  return Math.round(total);
}

export function ageFactor(age: number): number {
  // Age 16–18 ramp; still contribute enough that franchise isn't tanked
  if (age <= 18) return 0.78 + (age - 16) * 0.06;
  if (age <= 21) return 0.9 + (age - 18) * 0.03;
  if (age <= 27) return 0.96 + (age - 21) * 0.007;
  if (age <= 31) return 1.0;
  return Math.max(0.35, 1.0 - (age - 31) * 0.055);
}

/** Fatigue grows with age + long seasons — hurts title odds. */
export function fatigueFactor(age: number, seasonsPlayed: number): number {
  const ageFatigue = age >= 33 ? 0.72 : age >= 30 ? 0.85 : age >= 28 ? 0.93 : 1;
  const mileage = clamp(1 - seasonsPlayed * 0.008, 0.78, 1);
  return ageFatigue * mileage;
}

export function getLeague(id: LeagueId) {
  return LEAGUES.find((l) => l.id === id)!;
}

export function getCountry(id: CountryId) {
  return COUNTRIES.find((c) => c.id === id)!;
}

export function getClubStrength(leagueId: LeagueId, clubId: string): number {
  const club = getLeague(leagueId).clubs.find((c) => c.id === clubId);
  return club?.strength ?? 75;
}

export function computeMarketValue(
  ovr: number,
  age: number,
  career: CareerState,
  slots: Partial<AttrStats>,
): number {
  const league = getLeague(career.leagueId);
  const peak = ageFactor(age);
  const scoring =
    ((slots.shot ?? 0) * 0.55 + (slots.fin ?? 0) * 0.45) / 99;
  const trophyBoost =
    career.trophies.leagueTitles * 0.04 +
    career.trophies.nbaTitles * 0.14 +
    career.trophies.mvps * 0.08 +
    career.trophies.allStars * 0.03;
  const base = Math.pow(Math.max(55, ovr) / 55, 2.35) * 450_000;
  const ageMod = age <= 24 ? 1.15 : age <= 30 ? 1.0 : age <= 34 ? 0.7 : 0.4;
  return Math.round(
    base *
      league.salaryScale *
      peak *
      ageMod *
      (0.85 + scoring * 0.3 + trophyBoost),
  );
}

export function computeLegacyScore(career: CareerState): number {
  const avg =
    career.perfHistory.length > 0
      ? career.perfHistory.reduce((a, b) => a + b, 0) /
        career.perfHistory.length
      : 0;
  const tr = career.trophies;
  return (
    avg * 0.4 +
    tr.leagueTitles * 6 +
    tr.nbaTitles * 18 +
    tr.mvps * 10 +
    tr.finalsMvps * 9 +
    tr.allStars * 2.5 +
    tr.scoringTitles * 3.5 +
    tr.dpoy * 7 +
    tr.roy * 5 +
    tr.reiAmerica * 6 +
    tr.worldCups * 12 +
    (tr.euroTitles ?? 0) * 14 +
    (career.inNba ? 10 : 0) +
    career.seasonsPlayed * 1.1
  );
}

export function getLegacyTierId(career: CareerState): string {
  const score = computeLegacyScore(career);
  let id = LEGACY_TIERS[0]!.id;
  for (const tier of LEGACY_TIERS) {
    if (score >= tier.min) id = tier.id;
  }
  return id;
}

function playoffCutoff(leagueId: LeagueId): number {
  const n = getLeague(leagueId).clubs.length;
  if (leagueId === "nba") return 8;
  return Math.min(8, Math.max(4, Math.ceil(n * 0.8)));
}

/**
 * Franchise sets the table. Player form only nudges a few wins —
 * transferring to a contender must not dump them into the cellar.
 */
function simulateStandings(
  leagueId: LeagueId,
  playerClubId: string,
  playerPerf: number,
): StandingRow[] {
  const league = getLeague(leagueId);
  const games = leagueId === "nba" ? 82 : 34;
  const rows = league.clubs.map((club) => {
    const isPlayer = club.id === playerClubId;
    const formNudge = clamp((playerPerf - 55) / 6, -3, 9);
    const strength = isPlayer
      ? clamp(
          club.strength + formNudge * 0.4,
          club.strength - 2,
          Math.min(98, club.strength + 10),
        )
      : club.strength + rand(-3, 3);
    const winPct = clamp((strength - 52) / 48, 0.18, 0.82);
    const wins = Math.round(games * winPct + rand(-2, 2));
    const w = clamp(wins, 4, games - 2);
    return {
      clubId: club.id,
      name: club.name,
      short: club.short,
      wins: w,
      losses: games - w,
      pts: w * 2,
      isPlayer,
    };
  });
  return rows.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

/** After a title — table must show the champion as #1 (narrative consistency). */
export function promoteChampionStandings(
  standings: StandingRow[],
  clubId: string,
): StandingRow[] {
  if (!standings.length) return standings;
  const rows = standings.map((r) => ({ ...r }));
  const player = rows.find((r) => r.clubId === clubId);
  if (!player) return standings;
  const leader = rows.reduce((a, b) => (b.wins > a.wins ? b : a));
  if (player.clubId === leader.clubId && player.wins >= leader.wins) {
    return rows.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  }
  const games = player.wins + player.losses;
  player.wins = clamp(leader.wins + 1, 1, games - 1);
  player.losses = games - player.wins;
  player.pts = player.wins * 2;
  return rows.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

/** Standing rank heavily gates MVP/DPOY — below 6th gets an extra 20% efficiency cut. */
function standingAwardMult(rank: number): number {
  let mult = 0.02;
  if (rank <= 0) mult = 0.2;
  else if (rank <= 2) mult = 1.0;
  else if (rank <= 4) mult = 0.72;
  else if (rank <= 6) mult = 0.42;
  else if (rank <= 8) mult = 0.18;
  else if (rank <= 10) mult = 0.07;

  // Outside top-6 playoff picture → −20% award efficiency
  if (rank > 6) mult *= 0.8;
  return mult;
}

function playerRank(standings: StandingRow[]): number {
  const idx = standings.findIndex((r) => r.isPlayer);
  return idx >= 0 ? idx + 1 : 12;
}

/**
 * Season stocks (STL+BLK).
 * Heavy minutes / accumulated fatigue cut defensive efficiency by 15%.
 */
function generateDefStockStats(
  slots: Partial<AttrStats>,
  performance: number,
  gp: number,
  fat: number,
  inNba: boolean,
): { stl: number; blk: number; stocks: number } {
  const def = slots.def ?? 70;
  const ath = slots.ath ?? 70;
  const reb = slots.reb ?? 70;
  const form = clamp(performance / 90, 0.7, 1.2);

  // Star usage ≈ high GP + minutes load
  const gpLoad = inNba ? gp / 82 : gp / 34;
  const heavyMinutes = gpLoad >= 0.85 || fat < 0.93;
  const fatigueMult = heavyMinutes ? 0.85 : 1;

  const stl = clamp(
    Math.round(
      ((def / 99) * 1.4 + (ath / 99) * 0.9) *
        form *
        fatigueMult *
        10 +
        rand(-3, 3),
    ) / 10,
    0.4,
    3.2,
  );
  const blk = clamp(
    Math.round(
      ((def / 99) * 1.6 + (reb / 99) * 0.7) *
        form *
        fatigueMult *
        10 +
        rand(-3, 3),
    ) / 10,
    0.2,
    3.8,
  );
  return {
    stl,
    blk,
    stocks: Math.round((stl + blk) * 10) / 10,
  };
}

/**
 * Compete against elite AI seasons (Gobert, AD, Giannis…).
 * DEF below 85 → essentially locked out of DPOY.
 */
function resolveDpoyRace(
  stocks: number,
  defAttr: number,
  rank: number,
  inNba: boolean,
  narrative: number,
  defConsistency = 0,
): boolean {
  const standMult = standingAwardMult(rank);
  if (standMult < 0.05) return false;

  // Rookies / raw defenders cannot beat established stars
  if (defAttr < 85) return false;

  const rivalPool = inNba
    ? [3.8, 4.1, 4.3, 3.7, 4.0] // Gobert / Giannis / AD tier — inflated
    : [3.2, 3.5, 3.7, 3.1];
  const rivalBest =
    rivalPool[Math.floor(Math.random() * rivalPool.length)]! +
    rand(-0.2, 0.35);

  const consistencyBoost = defConsistency * 4;
  const playerScore =
    stocks * 14 +
    (defAttr / 99) * 8 +
    standMult * 22 +
    narrative * 14 +
    consistencyBoost;

  const rivalScore =
    rivalBest * 14 +
    0.95 * 8 +
    0.9 * 22 +
    Math.random() * 16;

  if (playerScore <= rivalScore) return false;
  const edge = clamp((playerScore - rivalScore) / 45, 0.06, 0.42);
  return Math.random() < edge * standMult;
}

function resolveMvpRace(
  box: { ppg: number; rpg: number; apg: number; rating: number },
  performance: number,
  rank: number,
  inNba: boolean,
  narrative: number,
  ovr: number,
): boolean {
  const standMult = standingAwardMult(rank);
  if (standMult < 0.08) return false;
  // Early-career OVR gate — no MVP at ~70
  if (ovr < (inNba ? 86 : 80)) return false;

  const rivalRating = inNba
    ? 8.6 + Math.random() * 1.0
    : 8.0 + Math.random() * 0.9;
  const rivalPpg = inNba ? 27 + Math.random() * 5 : 23 + Math.random() * 5;

  const playerScore =
    box.rating * 10 +
    box.ppg * 0.55 +
    box.rpg * 0.35 +
    box.apg * 0.4 +
    performance * 0.08 +
    standMult * 28 +
    narrative * 16;
  const rivalScore =
    rivalRating * 10 +
    rivalPpg * 0.55 +
    8 * 0.35 +
    7 * 0.4 +
    90 * 0.08 +
    0.92 * 28 +
    Math.random() * 16;

  if (playerScore <= rivalScore) return false;
  const edge = clamp((playerScore - rivalScore) / 55, 0.05, 0.4);
  return Math.random() < edge * (0.35 + standMult * 0.55);
}

function resolveRoyRace(
  box: { ppg: number; rpg: number; apg: number; rating: number },
  performance: number,
  rank: number,
  narrative: number,
): boolean {
  const standMult = standingAwardMult(rank);
  // Rookies can win on bad teams more often, but still gated
  if (box.ppg < 15.5 || performance < 70) return false;

  const rivalPpg = 16 + Math.random() * 7;
  const rivalRating = 6.8 + Math.random() * 1.4;
  const playerScore =
    box.ppg * 1.2 +
    box.rpg * 0.6 +
    box.apg * 0.7 +
    box.rating * 4 +
    standMult * 12 +
    narrative * 14;
  const rivalScore =
    rivalPpg * 1.2 +
    5 * 0.6 +
    4 * 0.7 +
    rivalRating * 4 +
    0.55 * 12 +
    Math.random() * 14;

  if (playerScore <= rivalScore) return false;
  return Math.random() < clamp(0.15 + (playerScore - rivalScore) / 35, 0.1, 0.5);
}

/** Realistic box-score generation clamped to pro basketball ranges. */
function computeBoxStats(
  slots: Partial<AttrStats>,
  posId: PositionId,
  performance: number,
  inNba: boolean,
  extras?: { ppgPenalty?: number; gamesMissed?: number },
): { gp: number; ppg: number; rpg: number; apg: number; rating: number } {
  const baseGp = inNba
    ? 72 + Math.floor(rand(0, 11))
    : 26 + Math.floor(rand(0, 9));
  const gp = Math.max(
    inNba ? 55 : 18,
    baseGp - Math.max(0, extras?.gamesMissed ?? 0),
  );

  const shot = slots.shot ?? 70;
  const fin = slots.fin ?? 70;
  const pass = slots.pass ?? 70;
  const reb = slots.reb ?? 70;
  const ath = slots.ath ?? 70;

  const usage = clamp(performance / 100, 0.55, 1.2);
  const scoringSkill = (shot * 0.5 + fin * 0.4 + ath * 0.1) / 99;

  // Position scoring ceilings
  const scoreFloor = posId === "C" || posId === "PF" ? 14 : 15;
  const scoreCeil = inNba ? 36 : 32;
  let ppg = scoreFloor + scoringSkill * (scoreCeil - scoreFloor) * usage;
  ppg += rand(-1.2, 1.2);
  ppg += extras?.ppgPenalty ?? 0;
  ppg = clamp(Math.round(ppg * 10) / 10, 8, 36);

  // Rebounds by position
  const rebBase =
    posId === "C"
      ? 9.5
      : posId === "PF"
        ? 7.8
        : posId === "SF"
          ? 5.2
          : posId === "SG"
            ? 3.8
            : 3.2;
  let rpg =
    rebBase * (0.75 + (reb / 99) * 0.55) * clamp(usage, 0.7, 1.15) +
    rand(-0.6, 0.6);
  rpg = clamp(Math.round(rpg * 10) / 10, 1.5, posId === "C" ? 14.5 : 11);

  // Assists by position
  const astBase =
    posId === "PG"
      ? 7.8
      : posId === "SG"
        ? 4.2
        : posId === "SF"
          ? 4.0
          : posId === "PF"
            ? 2.8
            : 2.2;
  let apg =
    astBase * (0.7 + (pass / 99) * 0.6) * clamp(usage, 0.7, 1.15) +
    rand(-0.5, 0.5);
  apg = clamp(Math.round(apg * 10) / 10, 1.0, posId === "PG" ? 12.5 : 8.5);

  const rating =
    Math.round(
      clamp(5.2 + (performance - 55) / 22 + (ppg - 18) / 40, 4.5, 9.7) * 10,
    ) / 10;

  return { gp, ppg, rpg, apg, rating };
}

/**
 * NBA title odds — deliberately harsh.
 * Elite OVR + top franchise + peak age ≈ ~18–22% per Finals appearance.
 * Average star on mid team ≈ 4–8%. Dynasties of 8 require near-perfect builds.
 */
export function computeNbaTitleChance(
  ovr: number,
  franchiseStrength: number,
  age: number,
  seasonsPlayed: number,
  slots: Partial<AttrStats>,
): number {
  const ovrFactor = clamp((ovr - 78) / 22, 0, 1); // 0 at 78, 1 at 100
  const franchiseFactor = clamp((franchiseStrength - 72) / 26, 0, 1);
  const peak = ageFactor(age) * fatigueFactor(age, seasonsPlayed);
  const clutch = ((slots.clu ?? 70) / 99) * 0.15;
  const raw =
    0.025 +
    ovrFactor * 0.12 +
    franchiseFactor * 0.09 +
    peak * 0.04 +
    clutch;
  return clamp(raw, 0.02, 0.22);
}

export function computeLeagueTitleChance(
  ovr: number,
  franchiseStrength: number,
  age: number,
  prestige: number,
): number {
  const ovrFactor = clamp((ovr - 70) / 28, 0, 1);
  const franchiseFactor = clamp((franchiseStrength - 70) / 28, 0, 1);
  const peak = ageFactor(age);
  return clamp(
    0.08 + ovrFactor * 0.28 + franchiseFactor * 0.18 + peak * 0.08 * prestige,
    0.06,
    0.48,
  );
}

function pickFinalsOpponent(
  leagueId: LeagueId,
  playerClubId: string,
): { name: string; strength: number } {
  const rivals = getLeague(leagueId).clubs.filter((c) => c.id !== playerClubId);
  const top = [...rivals].sort((a, b) => b.strength - a.strength).slice(0, 4);
  const opp = pick(top.length ? top : rivals);
  return { name: opp.name, strength: opp.strength };
}

function buildPendingFinals(
  career: CareerState,
  ovr: number,
  slots: Partial<AttrStats>,
  competition: FinalsContext["competition"],
): FinalsContext {
  const leagueId = competition === "nba" ? "nba" : career.leagueId;
  const franchiseStrength = getClubStrength(career.leagueId, career.clubId);
  const opp = pickFinalsOpponent(
    competition === "world_cup" ? career.leagueId : leagueId,
    career.clubId,
  );

  let winChance: number;
  let titleKey: string;
  if (competition === "conference") {
    winChance = clamp(
      computeNbaTitleChance(
        ovr,
        franchiseStrength,
        career.age,
        career.seasonsPlayed,
        slots,
      ) + 0.08,
      0.08,
      0.32,
    );
    titleKey = "finals.conference";
  } else if (competition === "nba") {
    winChance = computeNbaTitleChance(
      ovr,
      franchiseStrength,
      career.age,
      career.seasonsPlayed,
      slots,
    );
    titleKey = "finals.nba";
  } else if (competition === "world_cup") {
    winChance = clamp(0.1 + (ovr - 75) / 50, 0.08, 0.35);
    titleKey = "finals.worldCup";
    opp.name = pick([
      "USA",
      "Spain",
      "France",
      "Serbia",
      "Germany",
      "Canada",
      "Argentina",
    ]);
    opp.strength = 90 + Math.floor(rand(0, 6));
  } else {
    winChance = computeLeagueTitleChance(
      ovr,
      franchiseStrength,
      career.age,
      getLeague(career.leagueId).prestige,
    );
    titleKey =
      career.leagueId === "euro"
        ? "finals.euroFinalFour"
        : `finals.league.${career.leagueId}`;
  }

  const scores = seedFinalsScore(winChance);
  return {
    competition,
    leagueId: career.leagueId,
    titleKey,
    opponentName: opp.name,
    opponentStrength: opp.strength,
    playerScore: scores.playerScore,
    opponentScore: scores.opponentScore,
    deficit: scores.deficit,
    winChanceOnSkip: winChance,
    franchiseStrength,
  };
}

function buildAwards(
  locale: Locale,
  player: PlayerIdentity,
  career: CareerState,
  summary: SeasonSummary,
  ovr: number,
  slots: Partial<AttrStats>,
): AwardAnnouncement[] {
  const awards: AwardAnnouncement[] = [];
  const leagueName = t(locale, getLeague(career.leagueId).nameKey);

  if (summary.reiAmerica) {
    awards.push({
      id: newAwardId(),
      awardId: "rei_america",
      titleKey: "award.reiAmerica.title",
      subtitleKey: "award.reiAmerica.sub",
      accent: "yellow",
      stats: [
        { labelKey: "dash.ppg", value: String(summary.ppg) },
        { labelKey: "dash.rpg", value: String(summary.rpg) },
        { labelKey: "dash.apg", value: String(summary.apg) },
      ],
    });
  }

  if (summary.mvp && !career.inNba) {
    awards.push({
      id: newAwardId(),
      awardId: "league_mvp",
      titleKey:
        career.leagueId === "nbb"
          ? "award.nbbMvp.title"
          : "award.leagueMvp.title",
      subtitleKey: "award.leagueMvp.sub",
      accent: "yellow",
      stats: [
        { labelKey: "dash.ppg", value: String(summary.ppg) },
        { labelKey: "dash.rating", value: String(summary.rating) },
        { labelKey: "reveal.ovr", value: String(ovr) },
      ],
    });
  }

  if (summary.mvp && career.inNba) {
    awards.push({
      id: newAwardId(),
      awardId: "nba_mvp",
      titleKey: "award.nbaMvp.title",
      subtitleKey: "award.nbaMvp.sub",
      accent: "yellow",
      stats: [
        { labelKey: "dash.ppg", value: String(summary.ppg) },
        { labelKey: "dash.rpg", value: String(summary.rpg) },
        { labelKey: "dash.apg", value: String(summary.apg) },
        { labelKey: "dash.rating", value: String(summary.rating) },
      ],
    });
  }

  if (summary.dpoy) {
    awards.push({
      id: newAwardId(),
      awardId: "dpoy",
      titleKey: "award.dpoy.title",
      subtitleKey: "award.dpoy.sub",
      accent: "green",
      stats: [
        { labelKey: "attr.def", value: String(slots.def ?? 0) },
        { labelKey: "dash.rpg", value: String(summary.rpg) },
        { labelKey: "reveal.ovr", value: String(ovr) },
      ],
    });
  }

  if (summary.roy) {
    awards.push({
      id: newAwardId(),
      awardId: "roy",
      titleKey: "award.roy.title",
      subtitleKey: "award.roy.sub",
      accent: "yellow",
      stats: [
        { labelKey: "dash.ppg", value: String(summary.ppg) },
        { labelKey: "dash.rpg", value: String(summary.rpg) },
        { labelKey: "dash.apg", value: String(summary.apg) },
      ],
    });
  }

  void player;
  void leagueName;
  return awards;
}

function buildPress(
  locale: Locale,
  player: PlayerIdentity,
  career: CareerState,
  summary: SeasonSummary,
  ovr: number,
  leagueName: string,
  standingRank: number,
): PressItem[] {
  const items: PressItem[] = [];
  const base = {
    season: career.season,
    age: career.age,
    name: player.name,
    club: career.clubName,
    league: leagueName,
    ppg: summary.ppg,
    rpg: summary.rpg,
    apg: summary.apg,
    rating: summary.rating,
    ovr,
    need: NBA_DRAFT_OVR,
    rival: career.rivalClubName ?? "",
  };

  if (summary.champion) {
    items.push({
      id: uid("press"),
      season: career.season,
      age: career.age,
      headline: t(locale, "press.champion", base),
      body: t(locale, "press.championBody", base),
    });
  }
  if (summary.mvp) {
    items.push({
      id: uid("press"),
      season: career.season,
      age: career.age,
      headline: t(locale, "press.mvp", base),
      body: t(locale, "press.mvpBody", base),
    });
  }
  if (summary.allStar) {
    items.push({
      id: uid("press"),
      season: career.season,
      age: career.age,
      headline: t(locale, "press.allstar", base),
      body: t(locale, "press.allstarBody", base),
    });
  }

  // Scout notes toward NBA draft — ready copy only when fully eligible
  if (
    !career.inNba &&
    career.age <= NBA_DRAFT_MAX_AGE &&
    career.seasonsPlayed >= 1
  ) {
    if (isNbaDraftEligible(ovr, career.age, career.inNba, career.seasonsPlayed)) {
      items.push({
        id: uid("press"),
        season: career.season,
        age: career.age,
        headline: t(locale, "press.scoutReady", base),
        body: t(locale, "press.scoutReadyBody", base),
      });
    } else if (ovr >= NBA_DRAFT_OVR - 8) {
      items.push({
        id: uid("press"),
        season: career.season,
        age: career.age,
        headline: t(locale, "press.scoutNear", base),
        body: t(locale, "press.scoutNearBody", base),
      });
    }
  }

  // Rival narrative
  if (career.rivalClubName && standingRank <= 4 && Math.random() < 0.55) {
    items.push({
      id: uid("press"),
      season: career.season,
      age: career.age,
      headline: t(locale, "press.rival", base),
      body: t(locale, "press.rivalBody", base),
    });
  }

  if (items.length === 0) {
    items.push({
      id: uid("press"),
      season: career.season,
      age: career.age,
      headline: t(locale, "press.solid", base),
      body: t(locale, "press.solidBody", base),
    });
  }
  return items;
}

export function simulateSeason(state: GameState): SimulateSeasonResult {
  const player = state.player!;
  const career = state.career!;
  const mods = career.seasonMods ?? emptySeasonMods();
  const baseSlots = liveStats(state);
  const modded = applySeasonMods(baseSlots, mods);
  const slots = {
    ...modded,
    ath: clamp(
      modded.ath - (career.pendingAthPenalty ?? 0),
      40,
      99,
    ),
    clu: clamp(
      modded.clu - (career.pendingCluPenalty ?? 0),
      40,
      99,
    ),
  };
  const ovr = computeOverall(slots, player.posId);
  const league = getLeague(career.leagueId);
  const franchiseStrength = getClubStrength(career.leagueId, career.clubId);
  const af = ageFactor(career.age);
  const fatBase = fatigueFactor(career.age, career.seasonsPlayed);
  const fat =
    fatBase *
    clamp(1 - (career.fatigue ?? 0) / 200, 0.75, 1) *
    (1 + (mods.energy ?? 0) / 100);
  const noise = rand(0.9, 1.08);
  const teamBoost =
    0.92 +
    (franchiseStrength / 100) * 0.16 +
    (mods.chemistry ?? 0) * 0.01;
  const performance = ovr * af * fat * league.prestige * teamBoost * noise;

  const box = computeBoxStats(slots, player.posId, performance, career.inNba, {
    ppgPenalty: mods.ppgPenalty ?? 0,
    gamesMissed:
      (mods.gamesMissed ?? 0) + (career.pendingGamesMissed ?? 0),
  });
  const standings = simulateStandings(
    career.leagueId,
    career.clubId,
    performance,
  );
  const rank = playerRank(standings);
  const narrative = Math.random();
  const defStocks = generateDefStockStats(
    slots,
    performance,
    box.gp,
    fat,
    career.inNba,
  );

  const tags: SeasonTag[] = [];
  const trophies = { ...career.trophies };

  let mvp = false;
  let allStar = false;
  let dpoy = false;
  let roy = false;
  let reiAmerica = false;

  const asThresh = career.inNba ? 78 : 68;
  if (performance >= asThresh) {
    tags.push(makeTag("allstar", career.season));
    allStar = true;
    trophies.allStars++;
  }

  const mvpFloor = career.inNba ? 84 : 76;
  if (performance >= mvpFloor) {
    mvp = resolveMvpRace(
      box,
      performance,
      rank,
      career.inNba,
      narrative,
      ovr,
    );
    if (mvp) {
      tags.push(makeTag("mvp", career.season, true));
      trophies.mvps++;
    }
  }

  if (box.ppg >= (career.inNba ? 28 : 25) && Math.random() < 0.22) {
    tags.push(makeTag("scoring", career.season));
    trophies.scoringTitles++;
  }

  dpoy = resolveDpoyRace(
    defStocks.stocks,
    slots.def ?? 70,
    rank,
    career.inNba,
    Math.random(),
    mods.defConsistency ?? 0,
  );
  if (dpoy) {
    tags.push(makeTag("dpoy", career.season, true));
    trophies.dpoy++;
  }

  if (career.inNba && career.nbaSeasons === 0) {
    roy = resolveRoyRace(box, performance, rank, narrative);
    if (roy) {
      tags.push(makeTag("roy", career.season, true));
      trophies.roy++;
    }
  }

  if (
    !career.inNba &&
    player.countryId === "br" &&
    performance >= 84 &&
    box.ppg >= 20 &&
    standingAwardMult(rank) >= 0.4
  ) {
    if (Math.random() < 0.18 + narrative * 0.12) {
      tags.push(makeTag("reiAmerica", career.season, true));
      reiAmerica = true;
      trophies.reiAmerica++;
    }
  }

  if (career.season === 1 && performance >= 70) {
    tags.push(makeTag("breakout", career.season));
  }

  // Playoffs / finals pipeline — must make the playoff picture first
  let pendingFinals: FinalsContext | null = null;
  const cutoff = playoffCutoff(career.leagueId);
  if (career.inNba) {
    if (rank <= cutoff) {
      const confGate = clamp(
        0.35 + (9 - rank) * 0.08 + (performance - 70) / 90,
        0.28,
        0.78,
      );
      if (Math.random() < confGate) {
        pendingFinals = buildPendingFinals(
          career,
          ovr,
          slots,
          "conference",
        );
        tags.push(makeTag("finals", career.season));
      }
    }
  } else if (rank <= cutoff) {
    const isEuro = career.leagueId === "euro";
    const finalsGate = clamp(
      (isEuro ? 0.28 : 0.2) + (9 - rank) * 0.04 + (performance - 58) / 80,
      isEuro ? 0.18 : 0.14,
      isEuro ? 0.65 : 0.58,
    );
    if (Math.random() < finalsGate) {
      pendingFinals = buildPendingFinals(career, ovr, slots, "league");
      tags.push(makeTag(isEuro ? "euroFinalFour" : "finals", career.season));
    } else if (
      career.season % 4 === 0 &&
      ovr >= 78 &&
      Math.random() < 0.22
    ) {
      pendingFinals = buildPendingFinals(career, ovr, slots, "world_cup");
      tags.push(makeTag("finals", career.season));
    }
  }

  const summary: SeasonSummary = {
    ...box,
    tags,
    champion: false,
    mvp,
    allStar,
    finalsMvp: false,
    dpoy,
    roy,
    reiAmerica,
  };

  const leagueName = t(state.locale, league.nameKey);
  const pressNew = buildPress(
    state.locale,
    player,
    career,
    summary,
    ovr,
    leagueName,
    rank,
  );

  const awards = buildAwards(
    state.locale,
    player,
    career,
    summary,
    ovr,
    slots,
  );

  const next: CareerState = {
    ...career,
    seasonsPlayed: career.seasonsPlayed + 1,
    nbaSeasons: career.inNba ? career.nbaSeasons + 1 : career.nbaSeasons,
    trophies,
    lastSeason: summary,
    standings,
    press: [...pressNew, ...career.press].slice(0, 40),
    perfHistory: [...career.perfHistory, Math.round(performance)],
    ovrHistory: [
      ...career.ovrHistory,
      { age: career.age, season: career.season, ovr },
    ],
    offers: [],
    seasonMods: emptySeasonMods(),
    midEventsDone: 0,
    fatigue: clamp((career.fatigue ?? 0) + 8 + box.gp * 0.15, 0, 100),
    pendingAthPenalty: 0,
    pendingCluPenalty: 0,
    pendingGamesMissed: 0,
    injuryShield: false,
    marketBoost: Math.max(0, (career.marketBoost ?? 0) - 1),
    wallet: (career.wallet ?? 0) + (career.annualSalary ?? 0),
    contractYearsRemaining: Math.max(
      0,
      (career.contractYearsRemaining ?? 1) - 1,
    ),
  };

  return { career: next, summary, pendingFinals, awards };
}

/** Apply finals win/loss after clutch or skip. */
export function applyFinalsResult(
  state: GameState,
  won: boolean,
  viaClutch: boolean,
): {
  career: CareerState;
  awards: AwardAnnouncement[];
  /** Conference win → NBA Finals context */
  nextFinals: FinalsContext | null;
} {
  const career = state.career!;
  const finals = state.pendingFinals ?? state.clutch?.finals;
  if (!finals) return { career, awards: [], nextFinals: null };

  const trophies = { ...career.trophies };
  const summary = career.lastSeason
    ? { ...career.lastSeason }
    : null;
  const tags = summary ? [...summary.tags] : [];
  const awards: AwardAnnouncement[] = [];
  const ovr = computeOverall(liveStats(state), state.player!.posId);
  const slots = liveStats(state);

  // Conference Finals — win advances to NBA Finals; loss ends the run
  if (finals.competition === "conference") {
    if (won) {
      const pressItem: PressItem = {
        id: `press-conf-${career.season}-${uid("p")}`,
        season: career.season,
        age: career.age,
        headline: t(state.locale, "press.confWin", {
          name: state.player!.name,
          opponent: finals.opponentName,
        }),
        body: t(state.locale, "press.confWinBody", {
          name: state.player!.name,
          opponent: finals.opponentName,
        }),
      };
      return {
        career: {
          ...career,
          press: [pressItem, ...career.press].slice(0, 40),
        },
        awards: [],
        nextFinals: buildPendingFinals(career, ovr, slots, "nba"),
      };
    }

    const pressItem: PressItem = {
      id: `press-conf-loss-${career.season}-${uid("p")}`,
      season: career.season,
      age: career.age,
      headline: t(state.locale, "press.confLoss", {
        name: state.player!.name,
        opponent: finals.opponentName,
      }),
      body: t(state.locale, "press.confLossBody", {
        name: state.player!.name,
        opponent: finals.opponentName,
      }),
    };
    return {
      career: {
        ...career,
        press: [pressItem, ...career.press].slice(0, 40),
      },
      awards: [],
      nextFinals: null,
    };
  }

  if (won) {
    tags.push(makeTag("champion", career.season, true));
    if (finals.competition === "nba") {
      trophies.nbaTitles++;
      if (viaClutch || Math.random() < 0.4) {
        tags.push(makeTag("finalsMvp", career.season, true));
        trophies.finalsMvps++;
        if (summary) summary.finalsMvp = true;
      }
    } else if (finals.competition === "world_cup") {
      trophies.worldCups++;
    } else if (career.leagueId === "euro") {
      trophies.euroTitles++;
      trophies.leagueTitles++;
      tags.push(makeTag("euroElite", career.season, true));
    } else {
      trophies.leagueTitles++;
    }
    if (summary) summary.champion = true;

    const pressItem: PressItem = {
      id: `press-champ-${career.season}-${uid("p")}`,
      season: career.season,
      age: career.age,
      headline: t(state.locale, "press.champion", {
        name: state.player!.name,
        club: career.clubName,
        league: t(state.locale, finals.titleKey),
      }),
      body: t(state.locale, "press.championBody", {
        name: state.player!.name,
        club: career.clubName,
        ppg: summary?.ppg ?? 0,
      }),
    };

    return {
      career: {
        ...career,
        trophies,
        standings: promoteChampionStandings(career.standings, career.clubId),
        lastSeason: summary
          ? { ...summary, tags, champion: true }
          : career.lastSeason,
        press: [pressItem, ...career.press].slice(0, 40),
      },
      awards,
      nextFinals: null,
    };
  }

  // Lost finals — dramatic clutch headline or generic
  const pressItem: PressItem = viaClutch
    ? {
        id: `press-rim-${career.season}-${uid("p")}`,
        season: career.season,
        age: career.age,
        headline: t(state.locale, "press.rimMiss", {
          name: state.player!.name,
        }),
        body: t(state.locale, "press.rimMissBody", {
          name: state.player!.name,
          opponent: finals.opponentName,
        }),
      }
    : {
        id: `press-finals-loss-${career.season}-${uid("p")}`,
        season: career.season,
        age: career.age,
        headline: t(state.locale, "press.finalsLoss", {
          name: state.player!.name,
          opponent: finals.opponentName,
        }),
        body: t(state.locale, "press.finalsLossBody", {
          name: state.player!.name,
          opponent: finals.opponentName,
        }),
      };

  const lossTags = tags.some((t) => t.id === "finals")
    ? tags
    : [...tags, makeTag("finals", career.season)];

  return {
    career: {
      ...career,
      lastSeason: summary
        ? { ...summary, tags: lossTags }
        : career.lastSeason,
      press: [pressItem, ...career.press].slice(0, 40),
    },
    awards,
    nextFinals: null,
  };
}

export function isEuroEligible(
  ovr: number,
  inNba: boolean,
  leagueId: CareerState["leagueId"],
  seasonsPlayed = 0,
): boolean {
  return (
    !inNba &&
    leagueId !== "euro" &&
    leagueId !== "nba" &&
    ovr >= EURO_OVR &&
    seasonsPlayed >= EURO_MIN_SEASONS
  );
}

export function isNbaDraftEligible(
  ovr: number,
  age: number,
  inNba: boolean,
  seasonsPlayed = 0,
): boolean {
  return (
    !inNba &&
    age <= NBA_DRAFT_MAX_AGE &&
    ovr >= NBA_DRAFT_OVR &&
    seasonsPlayed >= NBA_DRAFT_MIN_SEASONS
  );
}

export function isNbaFaEligible(
  ovr: number,
  age: number,
  inNba: boolean,
  seasonsPlayed = 0,
): boolean {
  return (
    !inNba &&
    age >= NBA_FA_MIN_AGE &&
    ovr >= NBA_FA_OVR &&
    seasonsPlayed >= NBA_FA_MIN_SEASONS
  );
}

export function generateTransferOffers(
  state: GameState,
  ovr: number,
): ContractOffer[] {
  const career = state.career!;
  const offers: ContractOffer[] = [];
  const live = liveStats(state);
  const boost = career.marketBoost ?? 0;

  if (isNbaFaEligible(ovr, career.age, career.inNba, career.seasonsPlayed)) {
    const nba = getLeague("nba");
    // Mix contenders + rebuilders so the salary dilemma is visible
    const sortedAsc = [...nba.clubs].sort((a, b) => a.strength - b.strength);
    const sortedDesc = [...nba.clubs].sort((a, b) => b.strength - a.strength);
    const pool =
      boost > 0
        ? [
            ...sortedDesc.slice(0, 4),
            ...sortedAsc.slice(0, 4),
          ]
        : [
            ...sortedDesc.slice(0, 3),
            ...sortedAsc.slice(0, 4),
            ...shuffle(nba.clubs).slice(0, 4),
          ];
    const picks = shuffle([...new Map(pool.map((c) => [c.id, c])).values()]).slice(
      0,
      boost > 0 ? 4 : 3,
    );
    for (const club of picks) {
      const years = clamp(Math.round(2 + (ovr - 82) / 8), 2, 5);
      const annual = computeOfferSalary(
        ovr,
        career.age,
        { ...career, leagueId: "nba" },
        live,
        club.strength,
        boost,
      );
      offers.push({
        id: uid("offer"),
        clubId: club.id,
        clubName: club.name,
        leagueId: "nba",
        years,
        annualSalary: annual,
        currency: "USD",
        isNba: true,
        path: "nba_fa",
        salaryTier: salaryTierFor(club.strength),
        clubStrength: club.strength,
      });
    }
  }

  if (isEuroEligible(ovr, career.inNba, career.leagueId, career.seasonsPlayed)) {
    const euro = getLeague("euro");
    const sortedAsc = [...euro.clubs].sort((a, b) => a.strength - b.strength);
    const sortedDesc = [...euro.clubs].sort((a, b) => b.strength - a.strength);
    const pool =
      boost > 0
        ? [...sortedDesc.slice(0, 3), ...sortedAsc.slice(0, 3)]
        : [...sortedDesc.slice(0, 2), ...sortedAsc.slice(0, 3), ...shuffle(euro.clubs).slice(0, 3)];
    const picks = shuffle([...new Map(pool.map((c) => [c.id, c])).values()]).slice(
      0,
      boost > 0 ? 4 : 3,
    );
    for (const club of picks) {
      offers.push({
        id: uid("offer"),
        clubId: club.id,
        clubName: club.name,
        leagueId: "euro",
        years: pick([2, 3, 4]),
        annualSalary: computeOfferSalary(
          ovr,
          career.age,
          { ...career, leagueId: "euro" },
          live,
          club.strength,
          boost,
        ),
        currency: "EUR",
        isNba: false,
        path: "euro",
        salaryTier: salaryTierFor(club.strength),
        clubStrength: club.strength,
      });
    }
  }

  if (!career.inNba && career.leagueId !== "nba") {
    const league = getLeague(career.leagueId);
    const rivals = shuffle(
      league.clubs.filter((c) => c.id !== career.clubId),
    ).slice(0, 2);
    for (const club of rivals) {
      offers.push({
        id: uid("offer"),
        clubId: club.id,
        clubName: club.name,
        leagueId: league.id,
        years: pick([1, 2, 3]),
        annualSalary: computeOfferSalary(
          ovr,
          career.age,
          career,
          live,
          club.strength,
          boost,
        ),
        currency: league.currency,
        isNba: false,
        path: "domestic",
        salaryTier: salaryTierFor(club.strength),
        clubStrength: club.strength,
      });
    }
  }

  return offers;
}

export function resolveNbaDraftPick(
  ovr: number,
  age: number,
): { pick: number; teamId: string; teamName: string } {
  const stock = ovr * (age <= 20 ? 1.08 : age <= 22 ? 1.0 : 0.92);
  let pickNum = Math.round(55 - (stock - NBA_DRAFT_OVR) * 2.2 + rand(-4, 4));
  pickNum = clamp(pickNum, 1, 60);
  // Can declare at draft OVR, but Top 10 needs lottery stock (82+)
  if (ovr < NBA_DRAFT_LOTTERY_OVR) {
    pickNum = Math.max(11, pickNum);
  } else if (ovr >= 88) {
    pickNum = clamp(Math.round(pickNum * 0.72 + rand(-2, 1)), 1, 14);
  } else {
    // Soft lottery bias — still can fall out of top 10
    pickNum = clamp(pickNum + Math.round(rand(-3, 2)), 1, 25);
  }
  const nba = getLeague("nba");
  const lottery = shuffle(nba.clubs).slice(0, 14);
  const rest = shuffle(nba.clubs.filter((c) => !lottery.includes(c)));
  const ordered = [...lottery, ...rest];
  const team = ordered[Math.min(pickNum - 1, ordered.length - 1)]!;
  return { pick: pickNum, teamId: team.id, teamName: team.name };
}

export function assignStarterClub(countryId: CountryId, ovr: number) {
  const country = getCountry(countryId);
  const league = getLeague(country.leagueId);
  const sorted = [...league.clubs].sort((a, b) => b.strength - a.strength);
  let idx: number;
  if (ovr >= 82) idx = Math.floor(rand(0, 3));
  else if (ovr >= 74) idx = Math.floor(rand(1, 5));
  else idx = Math.floor(rand(3, sorted.length));
  const club = sorted[clamp(idx, 0, sorted.length - 1)]!;
  return { leagueId: league.id, club };
}

export function shareCareerText(state: GameState): string {
  const player = state.player!;
  const career = state.career!;
  const ovr = computeOverall(liveStats(state), player.posId);
  const tierId = getLegacyTierId(career);
  const tier = t(state.locale, `tier.${tierId}`);
  const tr = career.trophies;
  return `LENDA DA QUADRA — ${player.name} · ${player.posId} · OVR ${ovr}\n${tier}\n${career.seasonsPlayed} seasons · ${tr.nbaTitles} NBA · ${tr.leagueTitles} league · ${tr.mvps} MVP · ${tr.allStars} AS`;
}

/** Pick next center view after a season resolves (finals > awards > transfers > season). */
export function nextViewAfterSeason(
  pendingFinals: FinalsContext | null,
  awards: AwardAnnouncement[],
  hasNbaOffers: boolean,
): GameState["centerView"] {
  if (pendingFinals) return "finals_prompt";
  if (awards.length > 0) return "award";
  if (hasNbaOffers) return "transfers";
  return "season";
}
