import { STORAGE_KEY, STORAGE_KEY_LEGACY } from "@/lib/data";
import { freshState } from "@/lib/simulation";
import type { GameState, Locale } from "@/types/game";

/** UI-only fields — omit from disk to keep saves small and fast. */
function toPersistable(state: GameState): GameState {
  return {
    ...state,
    justFilledAttr: null,
    draftAnimating: false,
    statFlash: null,
    effectToasts: [],
    clutch:
      state.centerView === "clutch" || state.clutch?.phase === "playing"
        ? state.clutch
        : state.clutch
          ? { ...state.clutch, log: state.clutch.log.slice(0, 4) }
          : null,
  };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: GameState | null = null;

function writeNow(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistable(state)));
    // Drop legacy key after successful v6 write
    localStorage.removeItem(STORAGE_KEY_LEGACY);
  } catch {
    // ignore quota
  }
}

export function loadGameState(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(STORAGE_KEY_LEGACY) ??
      localStorage.getItem("lenda-da-quadra-v5");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed?.phase) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Debounced persist — coalesces rapid UI ticks (toasts, flash, draft). */
export function saveGameState(state: GameState): void {
  pending = state;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (pending) writeNow(pending);
    pending = null;
  }, 450);
}

/** Flush immediately (accept offer, retire, unmount). */
export function flushGameState(state?: GameState): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const next = state ?? pending;
  pending = null;
  if (next) writeNow(next);
}

export function clearGameState(): void {
  if (typeof window === "undefined") return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pending = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_LEGACY);
  } catch {
    // ignore
  }
}

export function createInitialState(locale: Locale = "pt"): GameState {
  return freshState(locale);
}
