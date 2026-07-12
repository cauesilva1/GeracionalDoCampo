/** Visual themes for coach OVR tier cards on landing / legacy. */

import type { CoachLegacyTier } from "@/types/manager";

export type CoachTheme = {
  id: CoachLegacyTier;
  accent: string;
  accentSoft: string;
  bg0: string;
  bg1: string;
  titleClass: string;
  ovrClass: string;
  ribbonClass: string;
  glow: string;
};

const THEMES: Record<CoachLegacyTier, CoachTheme> = {
  prospect: {
    id: "prospect",
    accent: "#94a3b8",
    accentSoft: "rgba(148,163,184,0.18)",
    bg0: "#0c1410",
    bg1: "#162018",
    titleClass: "text-slate-200",
    ovrClass: "text-slate-300",
    ribbonClass: "bg-slate-500/20 text-slate-200",
    glow: "rgba(148,163,184,0.22)",
  },
  builder: {
    id: "builder",
    accent: "#3d9b5f",
    accentSoft: "rgba(61,155,95,0.2)",
    bg0: "#07140f",
    bg1: "#0f2a1c",
    titleClass: "text-emerald-200",
    ovrClass: "text-emerald-300",
    ribbonClass: "bg-emerald-400 text-[#07140f]",
    glow: "rgba(61,155,95,0.28)",
  },
  contender: {
    id: "contender",
    /** Sky — distinct from legend gold (RISE vs MAX) */
    accent: "#38bdf8",
    accentSoft: "rgba(56,189,248,0.22)",
    bg0: "#061018",
    bg1: "#0c2438",
    titleClass: "text-sky-100",
    ovrClass: "text-sky-300",
    ribbonClass: "bg-sky-400 text-[#061018]",
    glow: "rgba(56,189,248,0.38)",
  },
  elite: {
    id: "elite",
    accent: "#c41e3a",
    accentSoft: "rgba(196,30,58,0.2)",
    bg0: "#140808",
    bg1: "#2a1014",
    titleClass: "text-red-200",
    ovrClass: "text-[#ff7a72]",
    ribbonClass: "bg-[#ff5c55] text-[#140808]",
    glow: "rgba(196,30,58,0.3)",
  },
  legend: {
    id: "legend",
    /** Gold climax — MAX, clearly warmer than RISE sky */
    accent: "#f5d76e",
    accentSoft: "rgba(245,215,110,0.28)",
    bg0: "#050505",
    bg1: "#1a1408",
    titleClass: "text-[#fff6d6]",
    ovrClass: "text-[#ffe08a]",
    ribbonClass: "bg-[#f5d76e] text-[#1a1408]",
    glow: "rgba(245,215,110,0.45)",
  },
};

export function coachLegacyTheme(tierId: string): CoachTheme {
  return THEMES[
    (tierId as CoachLegacyTier) in THEMES
      ? (tierId as CoachLegacyTier)
      : "builder"
  ];
}

/** Showcase cards on the landing hero — OVR path of a great coach. */
export const LANDING_COACH_TIERS = [
  { ovr: 62, tier: "builder" as const },
  { ovr: 74, tier: "contender" as const },
  { ovr: 86, tier: "elite" as const },
  { ovr: 95, tier: "legend" as const },
];
