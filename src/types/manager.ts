import type { Locale } from "@/types/game";

export type ManagerPhase =
  | "setup"
  | "hub"
  | "season_end"
  | "offers"
  | "fired"
  | "legacy"
  | "match_live"
  | "career_event"
  | "national";

export type ManagerTab =
  | "overview"
  | "squad"
  | "lineup"
  | "tactics"
  | "market"
  | "table"
  | "match";

/** Country of birth — determines starting lower division */
export type CoachCountry = "br" | "en" | "es" | "pt" | "fr" | "it" | "de" | "ar";

/** Tiered leagues: 1 = top, 2 = second division */
export type LeagueId =
  | "bra1"
  | "bra2"
  | "eng1"
  | "eng2"
  | "esp1"
  | "esp2"
  | "por1"
  | "por2"
  | "fra1"
  | "fra2"
  | "ita1"
  | "ita2"
  | "ger1"
  | "ger2"
  | "arg1"
  | "arg2";

export type PitchPos =
  | "GK"
  | "CB"
  | "FB"
  | "DM"
  | "CM"
  | "AM"
  | "W"
  | "ST";

export type FormationId = "433" | "442" | "352" | "4231";

export type TacticStyle = "possession" | "direct" | "pressing";

/** How you became a coach — shapes the career story */
export type CoachOrigin = "ex_player" | "assistant" | "analyst" | "youth";

/** Your identity as a manager (locks preferred match style) */
export type CoachPhilosophy =
  | "possession"
  | "high_press"
  | "counter"
  | "balanced";

export type BoardGoal = "survive" | "midtable" | "top4" | "title";

export type CoachLegacyTier =
  | "prospect"
  | "builder"
  | "contender"
  | "elite"
  | "legend";

export interface TrophyCabinet {
  /** Total league titles (1st place) */
  leagueTitles: number;
  /** Titles won in a country's top flight */
  topFlightTitles: number;
  /** Titles won in second division */
  secondDivTitles: number;
  /** Times you left a lower league for a bigger job after success */
  promotions: number;
  /** Titles at clubs with prestige ≥ 88 */
  bigClubTitles: number;
}

export type RebuildDifficulty = "easy" | "medium" | "hard" | "nightmare";

export interface PlayerAttrs {
  pace: number;
  shoot: number;
  pass: number;
  defend: number;
  physical: number;
  mental: number;
}

export interface SquadPlayer {
  id: string;
  name: string;
  age: number;
  nationality: string;
  pos: PitchPos;
  attrs: PlayerAttrs;
  ovr: number;
  potential: number;
  value: number;
  wage: number;
  morale: number;
  fitness: number;
  injuredWeeks: number;
  isCaptain?: boolean;
  /** Set-piece roles */
  takesPk?: boolean;
  takesFk?: boolean;
  takesCorner?: boolean;
  wantsTransfer?: boolean;
  /** Years left on contract (default set on create) */
  contractYears?: number;
}

export interface ClubTemplate {
  id: string;
  name: string;
  shortName: string;
  leagueId: LeagueId;
  prestige: number;
  /** 0–1 how broken the starting squad is (higher = harder rebuild) */
  rebuildGap: number;
  colors: { primary: string; secondary: string };
  difficulty: RebuildDifficulty;
  boardGoal: BoardGoal;
  budgetMul: number;
  transferBudgetM: number;
  wageBudgetM: number;
}

export interface LeagueDef {
  id: LeagueId;
  nameKey: string;
  country: CoachCountry;
  tier: 1 | 2;
  clubs: number;
  matchdays: number;
  /** Top N promote (tier 2) or European spots flavor (tier 1) */
  promote: number;
  relegate: number;
  currency: string;
}

export interface JobOffer {
  id: string;
  clubId: string;
  clubName: string;
  leagueId: LeagueId;
  /** Why this club called */
  reasonKey: string;
}

export interface TacticsState {
  formation: FormationId;
  style: TacticStyle;
  attack: number;
  midfield: number;
  defense: number;
}

export interface TableRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface Fixture {
  id: string;
  matchday: number;
  homeId: string;
  awayId: string;
  played: boolean;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface MatchEvent {
  id: string;
  minute: number;
  kind: "goal" | "chance" | "card";
  clubId: string;
  textKey: string;
  playerName?: string;
}

export interface MatchPlayerRating {
  playerId: string;
  name: string;
  rating: number;
}

export interface MatchResult {
  fixtureId: string;
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  summaryKey: string;
  /** Simple post-match notes for user XI */
  ratings?: MatchPlayerRating[];
}

export interface MarketListing {
  id: string;
  player: SquadPlayer;
  askingPrice: number;
  fromClubId: string | null;
  fromClubName: string;
  /** Rare Galáctico-level signing */
  isSuper?: boolean;
}

export type CareerEventKind =
  | "transfer_request"
  | "captain_band"
  | "set_pieces"
  | "dressing_room"
  | "national_invite";

export interface CareerEvent {
  id: string;
  kind: CareerEventKind;
  titleKey: string;
  bodyKey: string;
  playerId?: string;
  playerName?: string;
  choices: { id: string; labelKey: string }[];
}

export interface NationalTeamState {
  country: CoachCountry;
  isCoach: boolean;
  /** Player ids called up (from club squad and/or pool) */
  calledUpIds: string[];
  pool: SquadPlayer[];
  titles: number;
  lastTournamentKey: string | null;
  pendingTournament: {
    id: string;
    nameKey: string;
    year: number;
  } | null;
}

export type MarketBlockReason =
  | "window_closed"
  | "no_budget"
  | "wage_cap"
  | "squad_full"
  | "signing_limit"
  | "board_block"
  | "super_block"
  | "min_squad"
  | "starter"
  | "not_found"
  | "ok";

export interface SeasonState {
  year: number;
  matchday: number;
  matchdaysTotal: number;
  fixtures: Fixture[];
  table: TableRow[];
  lastResult: MatchResult | null;
  transferWindowOpen: boolean;
}

export interface ManagerCareer {
  coachName: string;
  country: CoachCountry;
  origin: CoachOrigin;
  philosophy: CoachPhilosophy;
  clubId: string;
  clubName: string;
  leagueId: LeagueId;
  season: number;
  /** Remaining transfer budget (EUR) */
  transferBudget: number;
  /** Annual wage budget cap (EUR) */
  wageBudget: number;
  /** Current annual wage bill (EUR) */
  wageBill: number;
  /** Alias of transferBudget for UI that still reads budget */
  budget: number;
  boardGoal: BoardGoal;
  boardConfidence: number;
  reputation: number;
  /** Coach overall — grows with wins and titles (like player OVR) */
  ovr: number;
  /** Career match record */
  careerWins: number;
  careerDraws: number;
  careerLosses: number;
  seasonsAtClub: number;
  /** Alias of trophyCabinet.leagueTitles */
  trophies: number;
  trophyCabinet: TrophyCabinet;
  /** Distinct clubs managed this career */
  clubsManaged: number;
  /** Highest league tier reached (1 = top flight) */
  peakTier: 1 | 2;
  signingsThisWindow: number;
  /** Seasons managed in career */
  seasonsInCareer: number;
  /** Set when career ends (fired / retired) */
  legacyScore?: number;
  legacyTier?: CoachLegacyTier;
  endReason?: "fired" | "retired";
  /** National team coaching unlock */
  nationalCoach?: boolean;
  nationalTitles?: number;
  /** Optional difficulty override from setup (scales AI / user powers) */
  difficulty?: "easy" | "medium" | "hard";
}

export interface ManagerState {
  phase: ManagerPhase;
  tab: ManagerTab;
  locale: Locale;
  career: ManagerCareer | null;
  squad: SquadPlayer[];
  starters: string[];
  bench: string[];
  tactics: TacticsState;
  season: SeasonState | null;
  market: MarketListing[];
  /** AI club squads for sim + market (clubId → players) */
  aiSquads: Record<string, SquadPlayer[]>;
  news: string[];
  seasonLog: string[];
  /** Pending club offers after season / promotion */
  offers: JobOffer[];
  /** Live match playback (chronometer UI) */
  liveMatch: MatchResult | null;
  /** Pending career dilemma */
  careerEvent: CareerEvent | null;
  /** National team management */
  nationalTeam: NationalTeamState | null;
}

export const FORMATION_SLOTS: Record<FormationId, PitchPos[]> = {
  "433": ["GK", "FB", "CB", "CB", "FB", "CM", "CM", "CM", "W", "ST", "W"],
  "442": ["GK", "FB", "CB", "CB", "FB", "CM", "CM", "CM", "CM", "ST", "ST"],
  "352": ["GK", "CB", "CB", "CB", "CM", "CM", "CM", "W", "W", "ST", "ST"],
  "4231": ["GK", "FB", "CB", "CB", "FB", "DM", "DM", "AM", "W", "W", "ST"],
};

export const DEFAULT_TACTICS: TacticsState = {
  formation: "433",
  style: "possession",
  attack: 55,
  midfield: 55,
  defense: 55,
};
