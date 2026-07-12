import { MANAGER_STORAGE_KEY } from "@/lib/manager/clubs";
import {
  computeManagerLegacyScore,
  getManagerLegacyTier,
} from "@/lib/manager/legacy";
import { uid } from "@/lib/utils";
import type {
  CoachCountry,
  CoachLegacyTier,
  CoachOrigin,
  CoachPhilosophy,
  LeagueId,
  ManagerState,
} from "@/types/manager";

export const PAST_RUNS_KEY = "geracional-past-runs-v1";
const MAX_RUNS = 12;

export type PastRunEndReason = "fired" | "retired" | "abandoned";

export interface PastRun {
  id: string;
  endedAt: number;
  coachName: string;
  country: CoachCountry;
  clubName: string;
  leagueId: LeagueId;
  origin: CoachOrigin;
  philosophy: CoachPhilosophy;
  ovr: number;
  seasons: number;
  clubsManaged: number;
  wins: number;
  draws: number;
  losses: number;
  titles: number;
  topFlightTitles: number;
  legacyScore: number;
  legacyTier: CoachLegacyTier;
  endReason: PastRunEndReason;
}

export function pastRunFromState(
  state: ManagerState,
  endReason: PastRunEndReason,
): PastRun | null {
  const career = state.career;
  if (!career) return null;
  // Ignore empty setup / never played a match
  const matches =
    (career.careerWins ?? 0) +
    (career.careerDraws ?? 0) +
    (career.careerLosses ?? 0);
  if (state.phase === "setup" || (matches === 0 && career.seasonsInCareer <= 1)) {
    return null;
  }

  const score =
    career.legacyScore ?? computeManagerLegacyScore(career);
  const tier = career.legacyTier ?? getManagerLegacyTier(score);

  return {
    id: uid("run"),
    endedAt: Date.now(),
    coachName: career.coachName,
    country: career.country,
    clubName: career.clubName,
    leagueId: career.leagueId,
    origin: career.origin ?? "assistant",
    philosophy: career.philosophy ?? "balanced",
    ovr: Math.round(career.ovr ?? career.reputation ?? 50),
    seasons: career.seasonsInCareer,
    clubsManaged: career.clubsManaged ?? 1,
    wins: career.careerWins ?? 0,
    draws: career.careerDraws ?? 0,
    losses: career.careerLosses ?? 0,
    titles: career.trophyCabinet?.leagueTitles ?? career.trophies ?? 0,
    topFlightTitles: career.trophyCabinet?.topFlightTitles ?? 0,
    legacyScore: score,
    legacyTier: tier,
    endReason,
  };
}

export function loadPastRuns(): PastRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PAST_RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PastRun[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => r && typeof r.id === "string" && r.coachName)
      .map((r) => ({
        ...r,
        origin: r.origin ?? "assistant",
        philosophy: r.philosophy ?? "balanced",
        clubsManaged: r.clubsManaged ?? 1,
        topFlightTitles: r.topFlightTitles ?? 0,
      }))
      .slice(0, MAX_RUNS);
  } catch {
    return [];
  }
}

export function savePastRuns(runs: PastRun[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PAST_RUNS_KEY,
      JSON.stringify(runs.slice(0, MAX_RUNS)),
    );
  } catch {
    // quota
  }
}

/** Prepend a run; dedupe near-identical consecutive entries. */
export function archivePastRun(run: PastRun): PastRun[] {
  const prev = loadPastRuns();
  const dup = prev[0];
  if (
    dup &&
    dup.coachName === run.coachName &&
    dup.clubName === run.clubName &&
    dup.legacyScore === run.legacyScore &&
    dup.seasons === run.seasons &&
    Math.abs(dup.endedAt - run.endedAt) < 60_000
  ) {
    return prev;
  }
  const next = [run, ...prev].slice(0, MAX_RUNS);
  savePastRuns(next);
  return next;
}

export function archiveFromManagerState(
  state: ManagerState,
  endReason: PastRunEndReason,
): void {
  const run = pastRunFromState(state, endReason);
  if (run) archivePastRun(run);
}

/** Clear active save only — keeps past runs. */
export function clearActiveSave(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(MANAGER_STORAGE_KEY);
  } catch {
    // ignore
  }
}
