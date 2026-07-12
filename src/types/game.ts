export type Locale = "pt" | "en" | "es";

export type AttrKey =
  | "shot"
  | "fin"
  | "drb"
  | "pass"
  | "def"
  | "reb"
  | "ath"
  | "clu";

export type PositionId = "PG" | "SG" | "SF" | "PF" | "C";

export type GameMode = "classic" | "purist";

export type LeagueId =
  | "nbb"
  | "ncaa"
  | "acb"
  | "nbl"
  | "lnb"
  | "cba"
  | "euro"
  | "nba";

export type CountryId = "br" | "us" | "es" | "au" | "cn" | "fr";

export type Currency = "BRL" | "EUR" | "AUD" | "USD" | "CNY";

export type GamePhase =
  | "setup"
  | "howto"
  | "draft"
  | "reveal"
  | "career"
  | "transfers"
  | "nba_draft"
  | "legacy";

export type CenterView =
  | "season"
  | "press"
  | "transfers"
  | "nba_draft"
  | "finals_prompt"
  | "clutch"
  | "award"
  | "mid_event"
  | "offseason_event"
  | "simulating"
  | "journey"
  | "national_callup"
  | "idle";

export type FinalsCompetition =
  | "conference"
  | "league"
  | "nba"
  | "world_cup"
  | "olympics"
  | "key_game";

export type SeasonBeat = "key_game" | "mid" | "sim";

export type NationalCallup = {
  kind: "world_cup" | "olympics";
  year: number;
  titleKey: string;
  bodyKey: string;
  /** Soft minutes path vs star path */
  minutesLikely: boolean;
};

export type AwardId =
  | "rei_america"
  | "league_mvp"
  | "nba_mvp"
  | "dpoy"
  | "roy";

export type AttrWeights = Record<AttrKey, number>;
export type AttrStats = Record<AttrKey, number>;

export type EventEffectType =
  | "season_attr"
  | "perm_attr"
  | "perm_attr_flex"
  | "energy"
  | "chemistry"
  | "def_consistency"
  | "fatigue_reset"
  | "next_ath_penalty"
  | "next_clu_penalty"
  | "market_cost"
  | "market_boost"
  | "ppg_penalty"
  | "games_missed"
  | "random_season_attr"
  | "injury_shield"
  | "random_injury_miss";

export interface EventEffect {
  type: EventEffectType;
  attr?: AttrKey;
  /** Second attr for perm_attr_flex (e.g. shot | drb) */
  attrAlt?: AttrKey;
  value: number;
  /** For random_* — probability 0–1 */
  chance?: number;
}

export interface EventOption {
  id: string;
  labelKey: string;
  hintKey?: string;
  effects: EventEffect[];
}

export interface SeasonEvent {
  id: string;
  kind: "mid" | "offseason";
  titleKey: string;
  bodyKey: string;
  options: EventOption[];
}

export type ImpactTone = "good" | "bad" | "warn";

export interface ImpactToast {
  id: string;
  tone: ImpactTone;
  /** Display key resolved via i18n */
  labelKey: string;
  vars?: Record<string, string | number>;
}

/** Temporary buffs for the current season simulation. */
export interface SeasonMods {
  shot: number;
  fin: number;
  drb: number;
  pass: number;
  def: number;
  reb: number;
  ath: number;
  clu: number;
  energy: number;
  chemistry: number;
  defConsistency: number;
  /** Applied as −ath for the next season's first stretch */
  nextAthPenalty: number;
  ppgPenalty: number;
  gamesMissed: number;
}

export interface AttrDef {
  k: AttrKey;
  labelKey: string;
}

export interface Position {
  id: PositionId;
  nameKey: string;
  weights: AttrWeights;
}

export interface Legend {
  id: string;
  name: string;
  nick: string;
  stats: AttrStats;
  tier: 1 | 2 | 3;
  category: "scorer" | "playmaker" | "defender" | "athletic";
}

export interface Club {
  id: string;
  name: string;
  short: string;
  strength: number;
}

export interface LeagueDef {
  id: LeagueId;
  nameKey: string;
  countryId: CountryId;
  currency: Currency;
  prestige: number;
  salaryScale: number;
  clubs: Club[];
}

export interface CountryDef {
  id: CountryId;
  nameKey: string;
  flag: string;
  leagueId: LeagueId;
}

export interface StandingRow {
  clubId: string;
  name: string;
  short: string;
  wins: number;
  losses: number;
  pts: number;
  isPlayer: boolean;
}

export interface SeasonTag {
  /** Stable award/event type for i18n + icons */
  id: string;
  /** Unique React list key (season + uid) */
  key: string;
  rim?: boolean;
}

export interface SeasonSummary {
  gp: number;
  ppg: number;
  rpg: number;
  apg: number;
  rating: number;
  tags: SeasonTag[];
  champion: boolean;
  mvp: boolean;
  allStar: boolean;
  finalsMvp: boolean;
  dpoy: boolean;
  roy: boolean;
  reiAmerica: boolean;
}

export type OfferPath = "domestic" | "euro" | "nba_fa";

export interface ContractOffer {
  id: string;
  clubId: string;
  clubName: string;
  leagueId: LeagueId;
  years: number;
  annualSalary: number;
  currency: Currency;
  isNba: boolean;
  path: OfferPath;
  /** Contender pay cut vs rebuild max offer */
  salaryTier: "contender" | "mid" | "rebuild";
  clubStrength: number;
}

export interface PressItem {
  id: string;
  season: number;
  age: number;
  headline: string;
  body: string;
}

export interface NbaDraftResult {
  pick: number;
  teamId: string;
  teamName: string;
}

export interface TrophyCounts {
  leagueTitles: number;
  nbaTitles: number;
  mvps: number;
  finalsMvps: number;
  allStars: number;
  scoringTitles: number;
  dpoy: number;
  roy: number;
  reiAmerica: number;
  worldCups: number;
  /** Olympic basketball medals / campaigns */
  olympicRuns: number;
  /** EuroLeague / Final Four elite titles */
  euroTitles: number;
}

export interface OvrHistoryPoint {
  age: number;
  season: number;
  ovr: number;
}

export interface AwardAnnouncement {
  id: string;
  awardId: AwardId;
  titleKey: string;
  subtitleKey: string;
  accent: "yellow" | "green";
  stats: { labelKey: string; value: string }[];
}

export interface FinalsContext {
  competition: FinalsCompetition;
  leagueId: LeagueId;
  titleKey: string;
  opponentName: string;
  opponentStrength: number;
  playerScore: number;
  opponentScore: number;
  /** 0 = tied, 1–2 = points behind */
  deficit: number;
  winChanceOnSkip: number;
  franchiseStrength: number;
  /** Present for in-season key games */
  keyKind?: "rival" | "ranking" | "showcase";
}

export type CourtZoneKind = "three" | "mid" | "paint";

export interface CourtZone {
  id: string;
  row: number;
  col: number;
  kind: CourtZoneKind;
  labelKey: string;
  weight: number;
}

/** Crunch Time — possession-based endgame simulator */
export type CrunchPossession = "offense" | "defense";
export type CrunchPhase = "playing" | "result";
export type OffenseAction = "three" | "drive" | "kick";
export type DefenseAction = "steal" | "contest" | "foul";
export type CrunchAction = OffenseAction | DefenseAction;

export interface CrunchLogEntry {
  id: string;
  message: string;
}

export interface ClutchState {
  finals: FinalsContext;
  phase: CrunchPhase;
  clock: number;
  playerScore: number;
  opponentScore: number;
  possession: CrunchPossession;
  log: CrunchLogEntry[];
  lastNote: string | null;
  resolved: boolean;
  winsGame: boolean | null;
  /** True during OT — walk-off disabled until buzzer */
  overtime: boolean;
}

export interface CareerState {
  age: number;
  /** Calendar year (starts 2016) — drives World Cup / Olympics */
  calendarYear: number;
  season: number;
  leagueId: LeagueId;
  clubId: string;
  clubName: string;
  seasonsPlayed: number;
  nbaSeasons: number;
  trophies: TrophyCounts;
  lastSeason: SeasonSummary | null;
  standings: StandingRow[];
  press: PressItem[];
  offers: ContractOffer[];
  ovrHistory: OvrHistoryPoint[];
  perfHistory: number[];
  nbaDraftResult: NbaDraftResult | null;
  retired: boolean;
  inNba: boolean;
  /** Accumulated mid-season mods for the active year */
  seasonMods: SeasonMods;
  /** Mid events already shown this year */
  midEventsDone: number;
  /** Fatigue 0–100; Bahamas resets to 0 */
  fatigue: number;
  /** Carry-over −ath from luxury vacation / marketing */
  pendingAthPenalty: number;
  /** Carry-over −instinct (Bahamas rhythm break) */
  pendingCluPenalty: number;
  /** Games to auto-miss at next season tip-off */
  pendingGamesMissed: number;
  /** Next season: light injuries neutralized */
  injuryShield: boolean;
  /** 0.05–0.32 from draft ATH — drives street / mid injury odds */
  injuryRisk: number;
  /** National team caps */
  nationalCaps: number;
  /** Temporary boost to FA / Euro offer quality */
  marketBoost: number;
  /** Fictitious career cash / market wallet */
  wallet: number;
  /** Active deal — paid into wallet each simulated season */
  annualSalary: number;
  /** Seasons remaining on current deal (decrements after each sim) */
  contractYearsRemaining: number;
  contractCurrency: Currency;
  /** Persistent rival franchise for narrative press */
  rivalClubId: string | null;
  rivalClubName: string | null;
}

export interface PlayerIdentity {
  name: string;
  posId: PositionId;
  countryId: CountryId;
  mode: GameMode;
}

export interface GameState {
  phase: GamePhase;
  centerView: CenterView;
  player: PlayerIdentity | null;
  draftPool: Legend[];
  draftIndex: number;
  rerollUsed: boolean;
  /**
   * Live attributes (grows toward maxStats).
   */
  currentStats: Partial<AttrStats>;
  /** Career ceiling stolen from legends in the draft */
  maxStats: Partial<AttrStats>;
  justFilledAttr: AttrKey | null;
  draftAnimating: boolean;
  career: CareerState | null;
  locale: Locale;
  pendingFinals: FinalsContext | null;
  clutch: ClutchState | null;
  awardQueue: AwardAnnouncement[];
  activeAward: AwardAnnouncement | null;
  pendingEvent: SeasonEvent | null;
  /** After sim, wait for offseason before next advance */
  awaitingOffseason: boolean;
  /** In-season beat queue: key games → mid → sim */
  seasonQueue: SeasonBeat[];
  /** Queued key-game contexts for clutch */
  keyGamesQueue: FinalsContext[];
  /** National team invitation pending after season */
  pendingNational: NationalCallup | null;
  /** Whether active clutch is a finals or in-season key game */
  clutchKind: "finals" | "key_game" | null;
  /** Temporary attribute deltas for sidebar flash (+2 ARR) */
  statFlash: Partial<Record<AttrKey, number>> | null;
  /** High-contrast impact toasts in the center column */
  effectToasts: ImpactToast[];
}

export interface LegacyTier {
  min: number;
  id: string;
}

export interface SimulateSeasonResult {
  career: CareerState;
  summary: SeasonSummary;
  pendingFinals: FinalsContext | null;
  awards: AwardAnnouncement[];
}
