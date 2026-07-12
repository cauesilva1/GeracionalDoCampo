import { MANAGER_STORAGE_KEY } from "@/lib/manager/clubs";
import { createFreshManagerState } from "@/lib/manager/engine";
import type { ManagerState } from "@/types/manager";
import type { Locale } from "@/types/game";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: ManagerState | null = null;

function writeNow(state: ManagerState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MANAGER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota
  }
}

export function saveManagerState(state: ManagerState): void {
  pending = state;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (pending) writeNow(pending);
    pending = null;
    saveTimer = null;
  }, 400);
}

export function loadManagerState(locale: Locale): ManagerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MANAGER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ManagerState;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.phase) return null;
    // v2 career shape required
    if (
      parsed.career &&
      (typeof parsed.career.transferBudget !== "number" ||
        typeof parsed.career.wageBudget !== "number" ||
        !parsed.career.country)
    ) {
      return null;
    }
    return {
      ...parsed,
      locale,
      offers: parsed.offers ?? [],
      liveMatch: parsed.liveMatch ?? null,
      careerEvent: parsed.careerEvent ?? null,
      nationalTeam: parsed.nationalTeam ?? null,
      career: parsed.career
        ? {
            ...parsed.career,
            origin: parsed.career.origin ?? "assistant",
            philosophy: parsed.career.philosophy ?? "balanced",
            trophyCabinet: parsed.career.trophyCabinet ?? {
              leagueTitles: parsed.career.trophies ?? 0,
              topFlightTitles: 0,
              secondDivTitles: 0,
              promotions: 0,
              bigClubTitles: 0,
            },
            clubsManaged: parsed.career.clubsManaged ?? 1,
            peakTier: parsed.career.peakTier ?? 2,
            ovr: parsed.career.ovr ?? parsed.career.reputation ?? 58,
            careerWins: parsed.career.careerWins ?? 0,
            careerDraws: parsed.career.careerDraws ?? 0,
            careerLosses: parsed.career.careerLosses ?? 0,
          }
        : null,
    };
  } catch {
    return null;
  }
}

export function clearManagerState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(MANAGER_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function initialManagerState(locale: Locale): ManagerState {
  return createFreshManagerState(locale);
}
