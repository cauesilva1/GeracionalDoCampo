import {
  ATTRS,
  MARKET_COST_HIGH,
  MARKET_COST_LOW,
  MARKET_COST_MED,
  MARKET_COST_UNIT,
  POSITION_WEIGHTS,
} from "@/lib/data";
import { clamp, pick, rand, uid } from "@/lib/utils";
import type {
  AttrKey,
  AttrStats,
  EventOption,
  ImpactToast,
  PositionId,
  SeasonEvent,
  SeasonMods,
} from "@/types/game";

const POS_START_BAND: Record<PositionId, [number, number]> = {
  PG: [54, 62],
  SG: [53, 61],
  SF: [54, 62],
  PF: [52, 61],
  C: [52, 60],
};

/** Age-16 starters — lower floor, room to climb into the 70s. */
const START_ATTR_MIN = 50;
const START_ATTR_MAX = 64;

function roughOvr(stats: AttrStats, posId: PositionId): number {
  const weights = POSITION_WEIGHTS[posId];
  let total = 0;
  for (const a of ATTRS) {
    total += stats[a.k] * weights[a.k];
  }
  return Math.round(total);
}

/** Fill missing keys with a floor so OVR math is stable. */
export function completeStats(
  partial: Partial<AttrStats>,
  fill = 60,
): AttrStats {
  const out = {} as AttrStats;
  for (const a of ATTRS) {
    out[a.k] = partial[a.k] ?? fill;
  }
  return out;
}

/**
 * Rookie start at 16 — attrs locked in the teen band.
 * maxStats shapes relative strengths + future growth speed.
 */
export function createStarterStats(
  posId: PositionId,
  maxStats: Partial<AttrStats>,
): AttrStats {
  const max = completeStats(maxStats, 75);
  const [lo, hi] = POS_START_BAND[posId];
  const targetOvr = lo + Math.floor(rand(0, hi - lo + 1));

  // Map ceiling → band: higher legend attr → closer to max, never outside band
  const starter = {} as AttrStats;
  for (const a of ATTRS) {
    const ceilingFactor = clamp((max[a.k] - 40) / 59, 0, 1);
    const base =
      START_ATTR_MIN +
      ceilingFactor * (START_ATTR_MAX - START_ATTR_MIN) * 0.85 +
      rand(-2, 2);
    starter[a.k] = clamp(Math.round(base), START_ATTR_MIN, START_ATTR_MAX);
  }

  let guard = 0;
  while (guard++ < 50) {
    const o = roughOvr(starter, posId);
    if (Math.abs(o - targetOvr) <= 1) break;
    const key = pick(ATTRS).k as AttrKey;
    if (o < targetOvr) {
      starter[key] = clamp(starter[key] + 1, START_ATTR_MIN, START_ATTR_MAX);
    } else {
      starter[key] = clamp(starter[key] - 1, START_ATTR_MIN, START_ATTR_MAX);
    }
  }

  // Final hard clamp — no escape hatch
  for (const a of ATTRS) {
    starter[a.k] = clamp(starter[a.k], START_ATTR_MIN, START_ATTR_MAX);
  }

  return starter;
}

/** Soft growth toward ceiling after each offseason — each +1 should feel earned. */
export function growTowardMax(
  current: Partial<AttrStats>,
  maxStats: Partial<AttrStats>,
  age: number,
): AttrStats {
  const cur = completeStats(current);
  const max = completeStats(maxStats, 80);
  // Teen window needs aggressive bumps so Euro/NBA stay reachable
  const bumps =
    age <= 18 ? 5 : age <= 21 ? 4 : age <= 24 ? 3 : age <= 28 ? 2 : age <= 31 ? 1 : 0;
  const keys = shuffleKeys();
  let left = bumps;
  for (const k of keys) {
    if (left <= 0) break;
    if (cur[k] >= max[k]) continue;
    const gain = 1 + (Math.random() < 0.28 ? 1 : 0);
    cur[k] = clamp(cur[k] + gain, 0, max[k]);
    left--;
  }
  return cur;
}

function shuffleKeys(): AttrKey[] {
  const keys = ATTRS.map((a) => a.k);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j]!, keys[i]!];
  }
  return keys;
}

export function emptySeasonMods(): SeasonMods {
  return {
    shot: 0,
    fin: 0,
    drb: 0,
    pass: 0,
    def: 0,
    reb: 0,
    ath: 0,
    clu: 0,
    energy: 0,
    chemistry: 0,
    defConsistency: 0,
    nextAthPenalty: 0,
    ppgPenalty: 0,
    gamesMissed: 0,
  };
}

/** Apply temporary mid-season mods onto current for this sim only. */
export function applySeasonMods(
  current: Partial<AttrStats>,
  mods: SeasonMods,
): AttrStats {
  const base = completeStats(current);
  const out = { ...base };
  for (const a of ATTRS) {
    out[a.k] = clamp(base[a.k] + (mods[a.k] ?? 0), 40, 99);
  }
  return out;
}

const MID_EVENTS: Omit<SeasonEvent, "id">[] = [
  {
    kind: "mid",
    titleKey: "event.mid.midnight.title",
    bodyKey: "event.mid.midnight.body",
    options: [
      {
        id: "train_shot",
        labelKey: "event.mid.midnight.a",
        effects: [{ type: "season_attr", attr: "shot", value: 2 }],
      },
      {
        id: "rest",
        labelKey: "event.mid.midnight.b",
        effects: [{ type: "energy", value: 5 }],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.party.title",
    bodyKey: "event.mid.party.body",
    options: [
      {
        id: "party",
        labelKey: "event.mid.party.a",
        effects: [
          { type: "season_attr", attr: "clu", value: 3 },
          { type: "chemistry", value: 1 },
        ],
      },
      {
        id: "gym",
        labelKey: "event.mid.party.b",
        effects: [{ type: "season_attr", attr: "ath", value: 2 }],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.film.title",
    bodyKey: "event.mid.film.body",
    options: [
      {
        id: "film",
        labelKey: "event.mid.film.a",
        effects: [{ type: "season_attr", attr: "pass", value: 2 }],
      },
      {
        id: "weights",
        labelKey: "event.mid.film.b",
        effects: [{ type: "season_attr", attr: "fin", value: 2 }],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.ankle.title",
    bodyKey: "event.mid.ankle.body",
    options: [
      {
        id: "play_hurt",
        labelKey: "event.mid.ankle.a",
        effects: [{ type: "season_attr", attr: "ath", value: -8 }],
      },
      {
        id: "medical",
        labelKey: "event.mid.ankle.b",
        effects: [{ type: "games_missed", value: 5 }],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.lockroom.title",
    bodyKey: "event.mid.lockroom.body",
    options: [
      {
        id: "argue",
        labelKey: "event.mid.lockroom.a",
        effects: [{ type: "season_attr", attr: "clu", value: -5 }],
      },
      {
        id: "bench",
        labelKey: "event.mid.lockroom.b",
        effects: [{ type: "ppg_penalty", value: -3 }],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.shoe.title",
    bodyKey: "event.mid.shoe.body",
    options: [
      {
        id: "court_focus",
        labelKey: "event.mid.shoe.a",
        effects: [{ type: "perm_attr", attr: "shot", value: 2 }],
      },
      {
        id: "commercial",
        labelKey: "event.mid.shoe.b",
        effects: [
          { type: "market_cost", value: -1 },
          { type: "energy", value: -2 },
        ],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.confidence.title",
    bodyKey: "event.mid.confidence.body",
    options: [
      {
        id: "psych",
        labelKey: "event.mid.confidence.a",
        effects: [{ type: "season_attr", attr: "clu", value: 3 }],
      },
      {
        id: "solo",
        labelKey: "event.mid.confidence.b",
        effects: [
          {
            type: "random_season_attr",
            attr: "shot",
            value: -5,
            chance: 0.5,
          },
        ],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.media.title",
    bodyKey: "event.mid.media.body",
    options: [
      {
        id: "silence",
        labelKey: "event.mid.media.a",
        effects: [{ type: "season_attr", attr: "clu", value: 2 }],
      },
      {
        id: "fire",
        labelKey: "event.mid.media.b",
        effects: [
          { type: "season_attr", attr: "shot", value: 2 },
          { type: "chemistry", value: -1 },
        ],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.load.title",
    bodyKey: "event.mid.load.body",
    options: [
      {
        id: "rest_game",
        labelKey: "event.mid.load.a",
        effects: [
          { type: "games_missed", value: 2 },
          { type: "energy", value: 8 },
        ],
      },
      {
        id: "play_through",
        labelKey: "event.mid.load.b",
        effects: [{ type: "season_attr", attr: "ath", value: -3 }],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.mentor.title",
    bodyKey: "event.mid.mentor.body",
    options: [
      {
        id: "veteran",
        labelKey: "event.mid.mentor.a",
        effects: [{ type: "season_attr", attr: "pass", value: 3 }],
      },
      {
        id: "alpha",
        labelKey: "event.mid.mentor.b",
        effects: [
          { type: "season_attr", attr: "shot", value: 2 },
          { type: "season_attr", attr: "clu", value: -1 },
        ],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.diet.title",
    bodyKey: "event.mid.diet.body",
    options: [
      {
        id: "strict",
        labelKey: "event.mid.diet.a",
        effects: [{ type: "season_attr", attr: "ath", value: 3 }],
      },
      {
        id: "cheat",
        labelKey: "event.mid.diet.b",
        effects: [
          { type: "energy", value: 3 },
          { type: "season_attr", attr: "ath", value: -2 },
        ],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.foul.title",
    bodyKey: "event.mid.foul.body",
    options: [
      {
        id: "physical",
        labelKey: "event.mid.foul.a",
        effects: [
          { type: "season_attr", attr: "def", value: 3 },
          { type: "games_missed", value: 1 },
        ],
      },
      {
        id: "discipline",
        labelKey: "event.mid.foul.b",
        effects: [{ type: "season_attr", attr: "def", value: 1 }],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.trade.title",
    bodyKey: "event.mid.trade.body",
    options: [
      {
        id: "focus",
        labelKey: "event.mid.trade.a",
        effects: [{ type: "season_attr", attr: "clu", value: 2 }],
      },
      {
        id: "distract",
        labelKey: "event.mid.trade.b",
        effects: [
          { type: "ppg_penalty", value: -2 },
          { type: "season_attr", attr: "pass", value: -2 },
        ],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.three.title",
    bodyKey: "event.mid.three.body",
    options: [
      {
        id: "volume",
        labelKey: "event.mid.three.a",
        effects: [
          { type: "season_attr", attr: "shot", value: 3 },
          { type: "season_attr", attr: "fin", value: -1 },
        ],
      },
      {
        id: "balance",
        labelKey: "event.mid.three.b",
        effects: [
          { type: "season_attr", attr: "shot", value: 1 },
          { type: "season_attr", attr: "fin", value: 1 },
        ],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.rival.title",
    bodyKey: "event.mid.rival.body",
    options: [
      {
        id: "fuel",
        labelKey: "event.mid.rival.a",
        effects: [{ type: "season_attr", attr: "clu", value: 4 }],
      },
      {
        id: "ignore",
        labelKey: "event.mid.rival.b",
        effects: [{ type: "energy", value: 4 }],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.extra.title",
    bodyKey: "event.mid.extra.body",
    options: [
      {
        id: "dawn",
        labelKey: "event.mid.extra.a",
        effects: [
          { type: "season_attr", attr: "drb", value: 2 },
          { type: "energy", value: -3 },
        ],
      },
      {
        id: "sleep",
        labelKey: "event.mid.extra.b",
        effects: [{ type: "energy", value: 6 }],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.viral.title",
    bodyKey: "event.mid.viral.body",
    options: [
      {
        id: "post_it",
        labelKey: "event.mid.viral.a",
        effects: [
          { type: "market_boost", value: 1 },
          { type: "season_attr", attr: "clu", value: 1 },
        ],
      },
      {
        id: "stay_quiet",
        labelKey: "event.mid.viral.b",
        effects: [{ type: "season_attr", attr: "def", value: 2 }],
      },
    ],
  },
  {
    kind: "mid",
    titleKey: "event.mid.agent.title",
    bodyKey: "event.mid.agent.body",
    options: [
      {
        id: "push_nba",
        labelKey: "event.mid.agent.a",
        effects: [
          { type: "market_boost", value: 2 },
          { type: "chemistry", value: -1 },
        ],
      },
      {
        id: "loyalty",
        labelKey: "event.mid.agent.b",
        effects: [
          { type: "chemistry", value: 2 },
          { type: "energy", value: 4 },
        ],
      },
    ],
  },
];

const OFF_EVENTS: Omit<SeasonEvent, "id">[] = [
  {
    kind: "offseason",
    titleKey: "event.off.title",
    bodyKey: "event.off.body",
    options: [
      {
        id: "hanlen",
        labelKey: "event.off.hanlen",
        hintKey: "event.off.hanlen.hint",
        effects: [
          {
            type: "perm_attr_flex",
            attr: "shot",
            attrAlt: "drb",
            value: 2,
          },
          { type: "market_cost", value: MARKET_COST_HIGH },
        ],
      },
      {
        id: "clinic",
        labelKey: "event.off.clinic",
        hintKey: "event.off.clinic.hint",
        effects: [
          { type: "fatigue_reset", value: 1 },
          { type: "injury_shield", value: 1 },
          { type: "market_cost", value: MARKET_COST_MED },
        ],
      },
      {
        id: "marketing",
        labelKey: "event.off.marketing",
        hintKey: "event.off.marketing.hint",
        effects: [
          { type: "market_boost", value: 2 },
          { type: "next_ath_penalty", value: 2 },
          { type: "market_cost", value: MARKET_COST_LOW },
        ],
      },
      {
        id: "bahamas",
        labelKey: "event.off.bahamas",
        hintKey: "event.off.bahamas.hint",
        effects: [
          { type: "fatigue_reset", value: 1 },
          { type: "energy", value: 20 },
          { type: "next_clu_penalty", value: 3 },
          { type: "market_cost", value: MARKET_COST_MED },
        ],
      },
      {
        id: "street",
        labelKey: "event.off.street",
        hintKey: "event.off.street.hint",
        effects: [
          {
            type: "perm_attr_flex",
            attr: "ath",
            attrAlt: "def",
            value: 1,
          },
          { type: "random_injury_miss", value: 5, chance: 0.15 },
        ],
      },
    ],
  },
];

/** EuroLeague-only mid dilemma — minutes vs NBA risk. */
const EURO_MID_EVENTS: Omit<SeasonEvent, "id">[] = [
  {
    kind: "mid",
    titleKey: "event.mid.euro.title",
    bodyKey: "event.mid.euro.body",
    options: [
      {
        id: "euro_star",
        labelKey: "event.mid.euro.a",
        effects: [
          { type: "season_attr", attr: "clu", value: 3 },
          { type: "chemistry", value: 2 },
          { type: "energy", value: 4 },
        ],
      },
      {
        id: "nba_dream",
        labelKey: "event.mid.euro.b",
        effects: [
          { type: "market_boost", value: 1 },
          { type: "season_attr", attr: "ath", value: -2 },
          { type: "chemistry", value: -1 },
        ],
      },
    ],
  },
];

export function pickMidEvent(
  excludeIds: string[] = [],
  inEuro = false,
): SeasonEvent {
  const pool = [
    ...(inEuro ? EURO_MID_EVENTS : []),
    ...MID_EVENTS,
  ].filter((e) => !excludeIds.includes(e.titleKey));
  const base = pick(pool.length ? pool : MID_EVENTS);
  return { ...base, id: uid("mid"), options: base.options.map((o) => ({ ...o })) };
}

export function pickOffseasonEvent(): SeasonEvent {
  const base = OFF_EVENTS[0]!;
  return { ...base, id: uid("off"), options: base.options.map((o) => ({ ...o })) };
}

/** How many mid-season dilemmas this year (keep light for webgame pacing). */
export function midEventCount(_inNba: boolean): number {
  return _inNba ? 2 : 1;
}

export function applyOptionToMods(
  mods: SeasonMods,
  option: EventOption,
): SeasonMods {
  const next = { ...mods };
  for (const fx of option.effects) {
    if (fx.type === "season_attr" && fx.attr) {
      next[fx.attr] = (next[fx.attr] ?? 0) + fx.value;
    } else if (
      fx.type === "random_season_attr" &&
      fx.attr &&
      Math.random() < (fx.chance ?? 0.5)
    ) {
      next[fx.attr] = (next[fx.attr] ?? 0) + fx.value;
    } else if (fx.type === "energy") {
      next.energy += fx.value;
    } else if (fx.type === "chemistry") {
      next.chemistry += fx.value;
    } else if (fx.type === "def_consistency") {
      next.defConsistency += fx.value;
    } else if (fx.type === "next_ath_penalty") {
      next.nextAthPenalty += fx.value;
    } else if (fx.type === "ppg_penalty") {
      next.ppgPenalty += fx.value;
    } else if (fx.type === "games_missed") {
      next.gamesMissed += fx.value;
    }
  }
  return next;
}

/** Visible flash deltas from an event option (season + permanent attrs). */
export function collectStatFlash(
  option: EventOption,
  resolved?: { flexAttr?: AttrKey; injuryHit?: boolean },
): Partial<Record<AttrKey, number>> | null {
  const flash: Partial<Record<AttrKey, number>> = {};
  for (const fx of option.effects) {
    if (fx.type === "season_attr" && fx.attr) {
      flash[fx.attr] = (flash[fx.attr] ?? 0) + fx.value;
    } else if (fx.type === "perm_attr" && fx.attr) {
      flash[fx.attr] = (flash[fx.attr] ?? 0) + fx.value;
    } else if (fx.type === "perm_attr_flex" && resolved?.flexAttr) {
      flash[resolved.flexAttr] =
        (flash[resolved.flexAttr] ?? 0) + fx.value;
    } else if (
      fx.type === "random_season_attr" &&
      fx.attr &&
      Math.random() < (fx.chance ?? 0.5)
    ) {
      flash[fx.attr] = (flash[fx.attr] ?? 0) + fx.value;
    }
  }
  return Object.keys(flash).length ? flash : null;
}

/** Debit/credit career wallet from market_cost effects. */
export function applyWalletCost(wallet: number, option: EventOption): number {
  let next = wallet;
  for (const fx of option.effects) {
    if (fx.type === "market_cost") {
      next -= fx.value * MARKET_COST_UNIT;
    }
  }
  return Math.max(0, Math.round(next));
}

/** Net wallet delta for an option (negative = spend). */
export function optionWalletDelta(option: EventOption): number {
  let delta = 0;
  for (const fx of option.effects) {
    if (fx.type === "market_cost") {
      delta -= fx.value * MARKET_COST_UNIT;
    }
  }
  return delta;
}

export function canAffordOption(wallet: number, option: EventOption): boolean {
  const delta = optionWalletDelta(option);
  if (delta >= 0) return true;
  return wallet + delta >= 0;
}

/** Short gain chips for off-season / mid UI. */
export function optionGainChips(
  option: EventOption,
): { key: string; vars?: Record<string, string | number> }[] {
  const chips: { key: string; vars?: Record<string, string | number> }[] = [];
  for (const fx of option.effects) {
    switch (fx.type) {
      case "perm_attr":
      case "perm_attr_flex":
        chips.push({ key: "gain.attrUp", vars: { n: fx.value } });
        break;
      case "fatigue_reset":
        chips.push({ key: "gain.fatigue" });
        break;
      case "injury_shield":
        chips.push({ key: "gain.shield" });
        break;
      case "market_boost":
        chips.push({ key: "gain.market" });
        break;
      case "energy":
        chips.push({ key: "gain.energy" });
        break;
      case "random_injury_miss":
        chips.push({ key: "gain.risk" });
        break;
      case "next_ath_penalty":
        chips.push({ key: "gain.athDown", vars: { n: fx.value } });
        break;
      case "next_clu_penalty":
        chips.push({ key: "gain.cluDown", vars: { n: fx.value } });
        break;
      default:
        break;
    }
  }
  return chips;
}

function pickFlexAttr(
  stats: AttrStats,
  max: AttrStats,
  primary: AttrKey,
  alt: AttrKey,
): AttrKey {
  const roomA = max[primary] - stats[primary];
  const roomB = max[alt] - stats[alt];
  if (roomA === roomB) return Math.random() < 0.5 ? primary : alt;
  return roomA >= roomB ? primary : alt;
}

export function applyPermanentOption(
  current: Partial<AttrStats>,
  maxStats: Partial<AttrStats>,
  option: EventOption,
): {
  stats: AttrStats;
  fatigueReset: boolean;
  nextAthPenalty: number;
  nextCluPenalty: number;
  injuryShield: boolean;
  marketBoost: number;
  pendingGamesMissed: number;
  flexAttr?: AttrKey;
  injuryHit: boolean;
} {
  const stats = completeStats(current);
  const max = completeStats(maxStats, 99);
  let fatigueReset = false;
  let nextAthPenalty = 0;
  let nextCluPenalty = 0;
  let injuryShield = false;
  let marketBoost = 0;
  let pendingGamesMissed = 0;
  let flexAttr: AttrKey | undefined;
  let injuryHit = false;

  for (const fx of option.effects) {
    if (fx.type === "perm_attr" && fx.attr) {
      stats[fx.attr] = clamp(stats[fx.attr] + fx.value, 40, max[fx.attr]);
    } else if (fx.type === "perm_attr_flex" && fx.attr && fx.attrAlt) {
      flexAttr = pickFlexAttr(stats, max, fx.attr, fx.attrAlt);
      stats[flexAttr] = clamp(stats[flexAttr] + fx.value, 40, max[flexAttr]);
    } else if (fx.type === "fatigue_reset") {
      fatigueReset = true;
    } else if (fx.type === "next_ath_penalty") {
      nextAthPenalty += fx.value;
    } else if (fx.type === "next_clu_penalty") {
      nextCluPenalty += fx.value;
    } else if (fx.type === "def_consistency") {
      stats.def = clamp(stats.def + 1, 40, max.def);
    } else if (fx.type === "injury_shield") {
      injuryShield = true;
    } else if (fx.type === "market_boost") {
      marketBoost += fx.value;
    } else if (
      fx.type === "random_injury_miss" &&
      Math.random() < (fx.chance ?? 0.15)
    ) {
      pendingGamesMissed += fx.value;
      injuryHit = true;
    }
  }

  return {
    stats,
    fatigueReset,
    nextAthPenalty,
    nextCluPenalty,
    injuryShield,
    marketBoost,
    pendingGamesMissed,
    flexAttr,
    injuryHit,
  };
}

/**
 * Build high-contrast impact toasts for the center column.
 * Pass resolved rolls so random outcomes match gameplay.
 */
export function collectImpactToasts(
  option: EventOption,
  resolved: {
    walletDelta: number;
    flexAttr?: AttrKey;
    injuryHit?: boolean;
    injuryShielded?: boolean;
  },
): ImpactToast[] {
  const toasts: ImpactToast[] = [];
  const SHORT: Record<AttrKey, string> = {
    shot: "ARR",
    fin: "FIN",
    drb: "DRB",
    pass: "PAS",
    def: "DEF",
    reb: "REB",
    ath: "ATL",
    clu: "INS",
  };

  for (const fx of option.effects) {
    if (fx.type === "games_missed" && fx.value !== 0) {
      if (resolved.injuryShielded) {
        toasts.push({
          id: uid("toast"),
          tone: "good",
          labelKey: "impact.shielded",
        });
      } else {
        toasts.push({
          id: uid("toast"),
          tone: "bad",
          labelKey: "impact.medical",
          vars: { n: fx.value },
        });
      }
    }
    if (fx.type === "ppg_penalty" && fx.value !== 0) {
      toasts.push({
        id: uid("toast"),
        tone: fx.value < 0 ? "bad" : "good",
        labelKey: "impact.ppg",
        vars: { n: fx.value },
      });
    }
    if (
      (fx.type === "season_attr" || fx.type === "perm_attr") &&
      fx.attr
    ) {
      toasts.push({
        id: uid("toast"),
        tone: fx.value >= 0 ? "good" : "bad",
        labelKey: "impact.attr",
        vars: { attr: SHORT[fx.attr], n: fx.value > 0 ? `+${fx.value}` : fx.value },
      });
    }
    if (fx.type === "perm_attr_flex" && resolved.flexAttr) {
      toasts.push({
        id: uid("toast"),
        tone: "good",
        labelKey: "impact.attr",
        vars: {
          attr: SHORT[resolved.flexAttr],
          n: `+${fx.value}`,
        },
      });
    }
    if (fx.type === "energy" && fx.value !== 0) {
      toasts.push({
        id: uid("toast"),
        tone: fx.value >= 0 ? "good" : "bad",
        labelKey: "impact.energy",
        vars: { n: fx.value > 0 ? `+${fx.value}` : fx.value },
      });
    }
    if (fx.type === "fatigue_reset") {
      toasts.push({
        id: uid("toast"),
        tone: "good",
        labelKey: "impact.fatigue",
      });
    }
    if (fx.type === "injury_shield") {
      toasts.push({
        id: uid("toast"),
        tone: "good",
        labelKey: "impact.injuryShield",
      });
    }
    if (fx.type === "market_boost") {
      toasts.push({
        id: uid("toast"),
        tone: "good",
        labelKey: "impact.marketBoost",
      });
    }
    if (fx.type === "next_ath_penalty") {
      toasts.push({
        id: uid("toast"),
        tone: "warn",
        labelKey: "impact.nextAth",
        vars: { n: fx.value },
      });
    }
    if (fx.type === "next_clu_penalty") {
      toasts.push({
        id: uid("toast"),
        tone: "warn",
        labelKey: "impact.nextClu",
        vars: { n: fx.value },
      });
    }
    if (fx.type === "random_injury_miss") {
      if (resolved.injuryHit) {
        toasts.push({
          id: uid("toast"),
          tone: "bad",
          labelKey: "impact.longInjury",
          vars: { n: fx.value },
        });
      } else {
        toasts.push({
          id: uid("toast"),
          tone: "good",
          labelKey: "impact.noInjury",
        });
      }
    }
  }

  if (resolved.walletDelta !== 0) {
    toasts.push({
      id: uid("toast"),
      tone: resolved.walletDelta < 0 ? "bad" : "good",
      labelKey: "impact.wallet",
      vars: { n: resolved.walletDelta },
    });
  }

  return toasts;
}
