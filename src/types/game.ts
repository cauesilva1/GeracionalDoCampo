export type Locale = "pt" | "en" | "es";

/** Shared attribute keys across all positions (weights decide what matters). */
export type AttrKey =
  | "thr"
  | "car"
  | "rec"
  | "blk"
  | "tkl"
  | "cov"
  | "awa"
  | "ath";

export type PositionId =
  | "QB"
  | "RB"
  | "WR"
  | "TE"
  | "OL"
  | "EDGE"
  | "DL"
  | "LB"
  | "CB"
  | "S"
  | "K"
  | "P";

export type GameMode = "classic" | "purist";

/** Only USA path: college → NFL. */
export type LeagueId = "ncaa" | "nfl";

export type CountryId = "br" | "us" | "es" | "au" | "cn" | "fr" | "mx" | "de" | "jp" | "gb";

export type Currency = "USD";

export type GamePhase =
  | "setup"
  | "origin_story"
  | "howto"
  | "draft"
  | "reveal"
  | "career"
  | "transfers"
  | "nfl_draft"
  | "legacy";

export type CenterView =
  | "season"
  | "press"
  | "transfers"
  | "nfl_draft"
  | "finals_prompt"
  | "clutch"
  | "award"
  | "mid_event"
  | "offseason_event"
  | "simulating"
  | "journey"
  | "full_game"
  | "identity"
  | "timeline"
  | "museum"
  | "quick_crunch"
  | "daily_posse"
  | "spectator"
  | "press_choice"
  | "dream"
  | "seven_on_seven"
  | "probowl"
  | "contract_talk"
  | "idle";

export type SignatureMove =
  | "deep_ball"
  | "slant"
  | "spin"
  | "juke"
  | "bull_rush"
  | "pick_play";

export type DripStyle = "classic" | "flashy" | "street" | "minimal";

export type CoachStyle = "spread" | "pro_style" | "defense_first";

export type PathTrack = "ncaa";

export type MuseumItem = {
  id: string;
  kind: "cleat" | "jersey" | "medal" | "draft_pick" | "clip";
  labelKey: string;
  season: number;
};

export type Teammate = {
  id: string;
  name: string;
  role: "mentor" | "rival_teammate" | "rookie";
  chem: number;
};

export type PressChoice = {
  id: string;
  headlineKey: string;
  bodyKey: string;
  optionA: { id: string; labelKey: string; tone: "good" | "warn" };
  optionB: { id: string; labelKey: string; tone: "good" | "warn" };
};

export type DreamEvent = {
  kind: "dream" | "nightmare";
  titleKey: string;
  bodyKey: string;
  clutchMod: number;
};

export type DailyChallenge = {
  dateKey: string;
  seed: string;
  kind: "posse" | "crunch";
  bestScore: number | null;
};

export type DocumentaryLine = {
  season: number;
  age: number;
  year: number;
  ovr: number;
  club: string;
  lineKey: string;
  vars?: Record<string, string | number>;
};

export type FinalsCompetition =
  | "conference"
  | "league"
  | "super_bowl"
  | "playoff"
  | "key_game";

export type SeasonBeat = "key_game" | "mid" | "sim";

export type FullOffCall =
  | "run"
  | "short_pass"
  | "deep_pass"
  | "screen"
  | "play_action"
  | "qb_draw";

export type FullDefCall = "blitz" | "cover2" | "man" | "zone" | "spy";

export type FullPlayLog = { id: string; message: string };

export interface FullGameState {
  finals: FinalsContext;
  quarter: 1 | 2 | 3 | 4;
  clock: number;
  playerScore: number;
  opponentScore: number;
  possession: "offense" | "defense";
  possessionsLeft: number;
  phase: "playing" | "quarter_break" | "result";
  log: FullPlayLog[];
  lastNote: string | null;
  resolved: boolean;
  winsGame: boolean | null;
  /** 3-snap read+targets moment for the current commandable possession */
  moment: ClutchState;
}

export type AwardId =
  | "league_mvp"
  | "nfl_mvp"
  | "dpoy"
  | "roy"
  | "opoy";

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
  | "stat_penalty"
  | "games_missed"
  | "random_season_attr"
  | "injury_shield"
  | "random_injury_miss";

export interface EventEffect {
  type: EventEffectType;
  attr?: AttrKey;
  attrAlt?: AttrKey;
  value: number;
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
  labelKey: string;
  vars?: Record<string, string | number>;
}

export interface SeasonMods {
  thr: number;
  car: number;
  rec: number;
  blk: number;
  tkl: number;
  cov: number;
  awa: number;
  ath: number;
  energy: number;
  chemistry: number;
  defConsistency: number;
  nextAthPenalty: number;
  statPenalty: number;
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
  category: "passer" | "runner" | "receiver" | "blocker" | "rusher" | "coverage" | "specialist";
}

export interface Club {
  id: string;
  name: string;
  short: string;
  strength: number;
  coachStyle: CoachStyle;
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
  /** Always ncaa — nationality is flavor; career is USA-only. */
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
  id: string;
  key: string;
  rim?: boolean;
}

/** Position-flavored box; UI picks which fields to show. */
export interface SeasonBoxStats {
  passYds: number;
  passTd: number;
  ints: number;
  rushYds: number;
  rushTd: number;
  receptions: number;
  recYds: number;
  recTd: number;
  tackles: number;
  sacks: number;
  defInts: number;
  fgMade: number;
  fgAtt: number;
}

export interface SeasonSummary {
  gp: number;
  box: SeasonBoxStats;
  rating: number;
  tags: SeasonTag[];
  champion: boolean;
  mvp: boolean;
  allStar: boolean;
  finalsMvp: boolean;
  dpoy: boolean;
  roy: boolean;
  opoy: boolean;
}

export type OfferPath = "college_transfer" | "nfl_fa" | "udfa";

export interface ContractOffer {
  id: string;
  clubId: string;
  clubName: string;
  leagueId: LeagueId;
  years: number;
  annualSalary: number;
  currency: Currency;
  isNfl: boolean;
  path: OfferPath;
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

export interface NflDraftResult {
  pick: number;
  round: number;
  teamId: string;
  teamName: string;
}

export interface TrophyCounts {
  leagueTitles: number;
  superBowls: number;
  mvps: number;
  finalsMvps: number;
  proBowls: number;
  dpoy: number;
  roy: number;
  opoy: number;
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
  deficit: number;
  winChanceOnSkip: number;
  franchiseStrength: number;
  keyKind?: "rival" | "ranking" | "showcase";
  playMode?: "clutch" | "full";
}

export type FieldZoneKind = "deep" | "intermediate" | "short" | "redzone";

export interface FieldZone {
  id: string;
  row: number;
  col: number;
  kind: FieldZoneKind;
  labelKey: string;
  weight: number;
}

export type CrunchPhase = "playing" | "result";

/** Position family for the read-and-click play moment. */
export type PlayRole = "passer" | "ball" | "line" | "coverage";

export type PlayTargetKind =
  | "receiver"
  | "gap"
  | "route"
  | "engage"
  | "cover"
  | "help";

export interface PlayTarget {
  id: string;
  x: number;
  y: number;
  labelKey: string;
  kind: PlayTargetKind;
  correct: boolean;
  /** 0–1 — higher = riskier even if correct */
  risk: number;
}

export interface PlayFrame {
  role: PlayRole;
  formationKey: string;
  scoutHintKey: string;
  targets: PlayTarget[];
  /** Soft urgency flavor for UI */
  clockPressure: "low" | "mid" | "high";
}

export interface CrunchLogEntry {
  id: string;
  message: string;
}

/** Read + click targets — 3 snaps, no offense/defense flip per click. */
export interface ClutchState {
  finals: FinalsContext;
  phase: CrunchPhase;
  clock: number;
  playerScore: number;
  opponentScore: number;
  log: CrunchLogEntry[];
  lastNote: string | null;
  resolved: boolean;
  winsGame: boolean | null;
  role: PlayRole;
  snap: number;
  snapsTotal: number;
  frame: PlayFrame;
  /** Accumulated offensive yards this moment */
  yards: number;
  /** Defensive stops this moment */
  stops: number;
  /** Line pressure / sacks-ish this moment */
  pressure: number;
  /** Yards goal for offensive roles */
  yardsGoal: number;
  /** Waiting brief feedback before next frame */
  awaitingNext: boolean;
}

/** @deprecated kept for typed leftovers in old UI — prefer PlayTarget clicks */
export type OffenseAction = "run" | "pass" | "hail_mary";
export type DefenseAction = "blitz" | "prevent" | "goal_line";
export type CrunchAction = OffenseAction | DefenseAction;
export type CrunchPossession = "offense" | "defense";

export interface OriginStory {
  id: string;
  titleKey: string;
  bodyKey: string;
}

export interface CareerState {
  age: number;
  calendarYear: number;
  season: number;
  leagueId: LeagueId;
  clubId: string;
  clubName: string;
  seasonsPlayed: number;
  nflSeasons: number;
  trophies: TrophyCounts;
  lastSeason: SeasonSummary | null;
  standings: StandingRow[];
  press: PressItem[];
  offers: ContractOffer[];
  ovrHistory: OvrHistoryPoint[];
  perfHistory: number[];
  nflDraftResult: NflDraftResult | null;
  retired: boolean;
  inNfl: boolean;
  seasonMods: SeasonMods;
  midEventsDone: number;
  fatigue: number;
  pendingAthPenalty: number;
  pendingCluPenalty: number;
  pendingGamesMissed: number;
  injuryShield: boolean;
  injuryRisk: number;
  marketBoost: number;
  wallet: number;
  annualSalary: number;
  contractYearsRemaining: number;
  contractCurrency: Currency;
  rivalClubId: string | null;
  rivalClubName: string | null;
  careerSeed: string;
  nickname: string | null;
  signature: SignatureMove | null;
  drip: DripStyle;
  coachStyle: CoachStyle;
  pathTrack: PathTrack;
  mentorName: string | null;
  teammates: Teammate[];
  museum: MuseumItem[];
  unlockedLegendIds: string[];
  rivalWins: number;
  rivalLosses: number;
  proBowlCount: number;
  familyMorale: number;
  liveVoteEnabled: boolean;
  clubBudget: number;
  clutchMod: number;
  documentary: string[];
  /** Set when non-US nationality picked an origin story. */
  originStoryId: string | null;
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
  currentStats: Partial<AttrStats>;
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
  awaitingOffseason: boolean;
  seasonQueue: SeasonBeat[];
  keyGamesQueue: FinalsContext[];
  fullGame: FullGameState | null;
  clutchKind: "finals" | "key_game" | "quick" | null;
  statFlash: Partial<Record<AttrKey, number>> | null;
  effectToasts: ImpactToast[];
  careerSeed: string;
  pendingPressChoice: PressChoice | null;
  pendingDream: DreamEvent | null;
  spectatorDoc: DocumentaryLine[];
  dailyChallenge: DailyChallenge | null;
  identityDone: boolean;
  hubTourDone: boolean;
  pendingOriginStory: OriginStory | null;
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
