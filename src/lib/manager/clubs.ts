import { LOWER_CLUBS } from "@/data/lowerRosters";
import { REAL_CLUBS, getRealClub as getTopClub } from "@/data/realRosters";
import { WORLD_CLUBS } from "@/data/worldRosters";
import { WORLD_CLUBS_B } from "@/data/worldRostersB";
import type {
  ClubTemplate,
  CoachCountry,
  LeagueDef,
  LeagueId,
} from "@/types/manager";
import type { ClubSeed } from "@/data/realRosters";

export const MANAGER_STORAGE_KEY = "geracional-reconstrutor-v7";

export const ECONOMY = {
  maxSquadSize: 25,
  minSquadSize: 16,
  maxSigningsPerWindow: 3,
  sellValueFactor: 0.72,
  askMin: 0.95,
  askMax: 1.35,
  weeksPerYear: 52,
  bigFeeShare: 0.42,
  minConfidenceForBigFee: 62,
} as const;

function league(
  id: LeagueId,
  country: CoachCountry,
  tier: 1 | 2,
  clubs: number,
  currency: string,
): LeagueDef {
  const matchdays = (clubs - 1) * 2;
  return {
    id,
    nameKey: `mgr.league.${id}`,
    country,
    tier,
    clubs,
    matchdays,
    promote: tier === 2 ? 2 : 0,
    relegate: tier === 1 ? 2 : 0,
    currency,
  };
}

export const LEAGUES: Record<LeagueId, LeagueDef> = {
  bra1: {
    id: "bra1",
    nameKey: "mgr.league.bra1",
    country: "br",
    tier: 1,
    clubs: 12,
    matchdays: 22,
    promote: 0,
    relegate: 2,
    currency: "R$",
  },
  bra2: {
    id: "bra2",
    nameKey: "mgr.league.bra2",
    country: "br",
    tier: 2,
    clubs: 8,
    matchdays: 18,
    promote: 2,
    relegate: 0,
    currency: "R$",
  },
  eng1: {
    id: "eng1",
    nameKey: "mgr.league.eng1",
    country: "en",
    tier: 1,
    clubs: 12,
    matchdays: 22,
    promote: 0,
    relegate: 2,
    currency: "£",
  },
  eng2: {
    id: "eng2",
    nameKey: "mgr.league.eng2",
    country: "en",
    tier: 2,
    clubs: 8,
    matchdays: 18,
    promote: 2,
    relegate: 0,
    currency: "£",
  },
  esp1: {
    id: "esp1",
    nameKey: "mgr.league.esp1",
    country: "es",
    tier: 1,
    clubs: 12,
    matchdays: 22,
    promote: 0,
    relegate: 2,
    currency: "€",
  },
  esp2: {
    id: "esp2",
    nameKey: "mgr.league.esp2",
    country: "es",
    tier: 2,
    clubs: 8,
    matchdays: 18,
    promote: 2,
    relegate: 0,
    currency: "€",
  },
  por1: league("por1", "pt", 1, 6, "€"),
  por2: league("por2", "pt", 2, 6, "€"),
  fra1: league("fra1", "fr", 1, 6, "€"),
  fra2: league("fra2", "fr", 2, 6, "€"),
  ita1: league("ita1", "it", 1, 6, "€"),
  ita2: league("ita2", "it", 2, 6, "€"),
  ger1: league("ger1", "de", 1, 6, "€"),
  ger2: league("ger2", "de", 2, 6, "€"),
  arg1: league("arg1", "ar", 1, 6, "$"),
  arg2: league("arg2", "ar", 2, 6, "$"),
};

export const ALL_CLUB_SEEDS: ClubSeed[] = [
  ...REAL_CLUBS,
  ...LOWER_CLUBS,
  ...WORLD_CLUBS,
  ...WORLD_CLUBS_B,
];

export function toDisplayMoney(eur: number, leagueId: LeagueId): number {
  const country = LEAGUES[leagueId].country;
  if (country === "br") return Math.round(eur * 6.0);
  if (country === "en") return Math.round(eur * 0.85);
  if (country === "ar") return Math.round(eur * 1100);
  return Math.round(eur);
}

function toTemplate(seed: ClubSeed): ClubTemplate {
  const avgOvr =
    seed.players.reduce((s, p) => s + p.ovr, 0) / Math.max(seed.players.length, 1);
  const rebuildGap = Math.max(0, Math.min(0.9, (88 - avgOvr) / 40));
  return {
    id: seed.id,
    name: seed.name,
    shortName: seed.shortName,
    leagueId: seed.leagueId,
    prestige: seed.prestige,
    rebuildGap,
    colors: seed.colors,
    difficulty: seed.difficulty,
    boardGoal: seed.boardGoal,
    budgetMul: 1,
    transferBudgetM: seed.transferBudgetM,
    wageBudgetM: seed.wageBudgetM,
  };
}

export const CLUBS: ClubTemplate[] = ALL_CLUB_SEEDS.map(toTemplate);

export function clubsByLeague(leagueId: LeagueId): ClubTemplate[] {
  return ALL_CLUB_SEEDS.filter((c) => c.leagueId === leagueId).map(toTemplate);
}

export function getClub(clubId: string): ClubTemplate | undefined {
  const seed = ALL_CLUB_SEEDS.find((c) => c.id === clubId);
  return seed ? toTemplate(seed) : undefined;
}

export function getClubSeed(clubId: string): ClubSeed | undefined {
  return ALL_CLUB_SEEDS.find((c) => c.id === clubId) ?? getTopClub(clubId);
}

const START_BY_COUNTRY: Record<CoachCountry, LeagueId> = {
  br: "bra2",
  en: "eng2",
  es: "esp2",
  pt: "por2",
  fr: "fra2",
  it: "ita2",
  de: "ger2",
  ar: "arg2",
};

const TOP_BY_COUNTRY: Record<CoachCountry, LeagueId> = {
  br: "bra1",
  en: "eng1",
  es: "esp1",
  pt: "por1",
  fr: "fra1",
  it: "ita1",
  de: "ger1",
  ar: "arg1",
};

export function startingLeagueForCountry(country: CoachCountry): LeagueId {
  return START_BY_COUNTRY[country];
}

export function topLeagueForCountry(country: CoachCountry): LeagueId {
  return TOP_BY_COUNTRY[country];
}

export function foreignTopLeagues(country: CoachCountry): LeagueId[] {
  const all: LeagueId[] = [
    "bra1",
    "eng1",
    "esp1",
    "por1",
    "fra1",
    "ita1",
    "ger1",
    "arg1",
  ];
  return all.filter((id) => LEAGUES[id].country !== country);
}
