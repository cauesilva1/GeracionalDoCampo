import { clamp } from "@/lib/utils";
import type { AttrStats } from "@/types/game";

/**
 * Injury predisposition from draft athleticism ceiling / live ATH.
 * Low ATH = fragile; high ATH = durable (street + mid events).
 */
export function computeInjuryRisk(
  stats: Partial<AttrStats>,
  maxStats?: Partial<AttrStats>,
): number {
  const ath = stats.ath ?? maxStats?.ath ?? 65;
  const ceil = maxStats?.ath ?? ath;
  const blend = ath * 0.65 + ceil * 0.35;
  // ATH 55 → ~0.28 · ATH 80 → ~0.08 · ATH 90 → ~0.05
  return clamp(0.32 - (blend - 50) / 140, 0.05, 0.32);
}

/**
 * Soft drift after growth/clinic — keep draft DNA, react to live ATH.
 */
export function blendInjuryRisk(
  previous: number,
  stats: Partial<AttrStats>,
  maxStats?: Partial<AttrStats>,
): number {
  const live = computeInjuryRisk(stats, maxStats);
  return clamp(previous * 0.55 + live * 0.45, 0.05, 0.32);
}

/** Clinic / physio trims predisposition for next season. */
export function clinicRiskReduction(injuryRisk: number): number {
  return clamp(injuryRisk - 0.04, 0.05, 0.32);
}

/** Street workout miss chance — uses career injuryRisk. */
export function streetInjuryChance(injuryRisk: number): number {
  return clamp(injuryRisk, 0.08, 0.35);
}

/** Extra GP missed on ankle rest path when fragile. */
export function ankleMissGames(injuryRisk: number): number {
  return injuryRisk >= 0.22 ? 7 : injuryRisk >= 0.14 ? 5 : 4;
}

export type InjuryTier = "durable" | "normal" | "fragile";

export function injuryTier(injuryRisk: number): InjuryTier {
  if (injuryRisk <= 0.1) return "durable";
  if (injuryRisk >= 0.2) return "fragile";
  return "normal";
}

/** Percent shown in UI for street risk. */
export function streetRiskPct(injuryRisk: number): number {
  return Math.round(streetInjuryChance(injuryRisk) * 100);
}
