import type {
  CoachLegacyTier,
  CoachOrigin,
  CoachPhilosophy,
  ManagerCareer,
  TacticStyle,
  TacticsState,
  TrophyCabinet,
} from "@/types/manager";

export const COACH_ORIGINS: CoachOrigin[] = [
  "ex_player",
  "assistant",
  "analyst",
  "youth",
];

export const COACH_PHILOSOPHIES: CoachPhilosophy[] = [
  "possession",
  "high_press",
  "counter",
  "balanced",
];

export function emptyTrophyCabinet(): TrophyCabinet {
  return {
    leagueTitles: 0,
    topFlightTitles: 0,
    secondDivTitles: 0,
    promotions: 0,
    bigClubTitles: 0,
  };
}

export function philosophyToTactics(philosophy: CoachPhilosophy): TacticsState {
  switch (philosophy) {
    case "possession":
      return {
        formation: "433",
        style: "possession",
        attack: 58,
        midfield: 62,
        defense: 52,
      };
    case "high_press":
      return {
        formation: "4231",
        style: "pressing",
        attack: 60,
        midfield: 55,
        defense: 58,
      };
    case "counter":
      return {
        formation: "442",
        style: "direct",
        attack: 62,
        midfield: 50,
        defense: 56,
      };
    default:
      return {
        formation: "433",
        style: "possession",
        attack: 55,
        midfield: 55,
        defense: 55,
      };
  }
}

export function preferredTacticStyle(philosophy: CoachPhilosophy): TacticStyle {
  if (philosophy === "high_press") return "pressing";
  if (philosophy === "counter") return "direct";
  return "possession";
}

/** Small XI bonus when match tactics match your identity */
export function philosophyMatchBonus(
  philosophy: CoachPhilosophy,
  style: TacticStyle,
): number {
  if (philosophy === "balanced") return 0.4;
  return preferredTacticStyle(philosophy) === style ? 1.6 : -0.4;
}

export function originStartMods(origin: CoachOrigin): {
  reputationMul: number;
  confidence: number;
  startOvr: number;
  storyKey: string;
} {
  switch (origin) {
    case "ex_player":
      return {
        reputationMul: 1.15,
        confidence: 58,
        startOvr: 64,
        storyKey: "mgr.story.ex_player",
      };
    case "assistant":
      return {
        reputationMul: 0.95,
        confidence: 70,
        startOvr: 58,
        storyKey: "mgr.story.assistant",
      };
    case "analyst":
      return {
        reputationMul: 0.9,
        confidence: 64,
        startOvr: 56,
        storyKey: "mgr.story.analyst",
      };
    case "youth":
      return {
        reputationMul: 0.85,
        confidence: 68,
        startOvr: 54,
        storyKey: "mgr.story.youth",
      };
  }
}

/** Match result → coach OVR delta (soft growth, titles are the big jumps) */
export function coachOvrDeltaFromMatch(result: "W" | "D" | "L"): number {
  if (result === "W") return 0.22;
  if (result === "D") return 0.04;
  return -0.18;
}

export function coachOvrDeltaFromTitle(opts: {
  tier: 1 | 2;
  prestige: number;
}): number {
  let d = opts.tier === 1 ? 2.4 : 1.4;
  if (opts.prestige >= 88) d += 1.2;
  else if (opts.prestige >= 80) d += 0.5;
  return d;
}

export function applyCoachOvr(current: number, delta: number): number {
  return Math.round(clamp(current + delta, 45, 99) * 10) / 10;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Soft XI bonus from coach OVR (60 → ~0, 80 → ~1.5, 95 → ~2.6) */
export function coachOvrMatchBonus(ovr: number): number {
  return clamp((ovr - 60) * 0.075, -1.2, 2.8);
}

/**
 * Legacy score — titles counted once (by tier), OVR is a boost not the bulk.
 * Rough targets: builder ~40–70, contender ~70–115, elite ~115–165, legend 165+.
 */
export function computeManagerLegacyScore(career: ManagerCareer): number {
  const t = career.trophyCabinet ?? emptyTrophyCabinet();
  const ovr = career.ovr ?? career.reputation ?? 50;
  return Math.round(
    t.topFlightTitles * 22 +
      t.secondDivTitles * 10 +
      t.promotions * 8 +
      t.bigClubTitles * 14 +
      // OVR above 55 counts; 85 ≈ +9 pts (was ~47)
      Math.max(0, ovr - 55) * 0.3 +
      (career.careerWins ?? 0) * 0.25 +
      career.seasonsInCareer * 1.5 +
      (career.peakTier === 1 ? 6 : 0) +
      Math.max(0, (career.clubsManaged ?? 1) - 1) * 3,
  );
}

export function getManagerLegacyTier(score: number): CoachLegacyTier {
  if (score >= 165) return "legend";
  if (score >= 115) return "elite";
  if (score >= 70) return "contender";
  if (score >= 40) return "builder";
  return "prospect";
}

/** Extra gate so early careers with inflated OVR don't skip into Elite. */
export function resolveManagerLegacyTier(
  career: ManagerCareer,
  score = computeManagerLegacyScore(career),
): CoachLegacyTier {
  const t = career.trophyCabinet ?? emptyTrophyCabinet();
  let tier = getManagerLegacyTier(score);
  const titles = t.topFlightTitles + t.secondDivTitles;
  if (tier === "legend" && t.topFlightTitles < 2) tier = "elite";
  if (tier === "elite" && titles < 2 && t.topFlightTitles < 1) tier = "contender";
  if (tier === "contender" && titles < 1 && (career.seasonsInCareer ?? 0) < 4) {
    tier = "builder";
  }
  return tier;
}
