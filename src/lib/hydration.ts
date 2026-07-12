import {
  NBA_DRAFT_MAX_AGE,
  NBA_DRAFT_MIN_SEASONS,
  NBA_DRAFT_OVR,
} from "@/lib/data";
import type { GameState } from "@/types/game";

/**
 * Normalize interrupted / desynced saves before the player can interact.
 * Webgame rule: refresh mid-animation must never soft-lock the career.
 */
export function recoverHydratedState(state: GameState): GameState {
  let next: GameState = {
    ...state,
    justFilledAttr: null,
    statFlash: null,
    effectToasts: [],
    draftAnimating: false,
  };

  // In-flight "Simulando…" never survives a refresh (timer is in-memory only)
  if (next.centerView === "simulating") {
    const hadPriorSeason = !!next.career?.lastSeason;
    next = {
      ...next,
      centerView: hadPriorSeason ? "season" : "journey",
      pendingEvent: null,
      awaitingOffseason: hadPriorSeason,
      seasonQueue: [],
      keyGamesQueue: [],
      clutch: null,
      clutchKind: null,
    };
  }

  // National call-up without payload → offseason or season
  if (next.centerView === "national_callup" && !next.pendingNational) {
    next = {
      ...next,
      centerView: next.career?.lastSeason ? "season" : "journey",
      awaitingOffseason: next.awaitingOffseason ?? true,
    };
  }

  // Mid-season in progress (queue / clutch / mid dilemma) — keep it
  const midSeasonLive =
    (next.seasonQueue?.length ?? 0) > 0 ||
    (next.keyGamesQueue?.length ?? 0) > 0 ||
    !!next.clutch ||
    next.centerView === "mid_event" ||
    next.centerView === "clutch" ||
    next.centerView === "simulating" ||
    next.centerView === "national_callup";

  // Career started but season never launched → destination card
  if (
    next.career &&
    !next.career.lastSeason &&
    !midSeasonLive &&
    (next.phase === "career" || next.phase === "transfers") &&
    next.centerView !== "journey"
  ) {
    next = {
      ...next,
      phase: "career",
      centerView: "journey",
      pendingEvent: null,
      awaitingOffseason: false,
    };
  }

  // NBA Draft interrupted mid-suspense → resume animation (finishNbaDraft resolves pick)
  const onDraft =
    next.phase === "nba_draft" || next.centerView === "nba_draft";
  if (onDraft) {
    if (next.career?.nbaDraftResult) {
      next = {
        ...next,
        phase: "nba_draft",
        centerView: "nba_draft",
        draftAnimating: false,
      };
    } else if (next.career && next.player) {
      next = {
        ...next,
        phase: "nba_draft",
        centerView: "nba_draft",
        draftAnimating: true,
      };
    } else {
      next = {
        ...next,
        phase: "career",
        centerView: next.career?.lastSeason ? "season" : "journey",
        draftAnimating: false,
      };
    }
  }

  // Crunch Time interrupted → force clutch view, clear orphan clutch
  if (next.clutch) {
    const valid =
      typeof next.clutch.clock === "number" &&
      (next.clutch.possession === "offense" ||
        next.clutch.possession === "defense");
    if (!valid) {
      next = {
        ...next,
        clutch: null,
        centerView: next.career?.lastSeason ? "season" : "journey",
      };
    } else if (
      next.clutch.phase === "playing" ||
      next.clutch.phase === "result"
    ) {
      next = {
        ...next,
        phase: next.phase === "legacy" ? next.phase : "career",
        centerView: "clutch",
      };
    }
  } else if (next.centerView === "clutch") {
    next = {
      ...next,
      centerView: next.career?.lastSeason ? "season" : "journey",
    };
  }

  // Award without payload
  if (next.centerView === "award") {
    if (!next.activeAward && next.awardQueue.length > 0) {
      const [first, ...rest] = next.awardQueue;
      next = { ...next, activeAward: first!, awardQueue: rest };
    } else if (!next.activeAward) {
      next = {
        ...next,
        centerView: next.career?.lastSeason ? "season" : "journey",
      };
    }
  }

  // Event panel without event
  if (
    (next.centerView === "mid_event" ||
      next.centerView === "offseason_event") &&
    !next.pendingEvent
  ) {
    next = {
      ...next,
      centerView: next.career?.lastSeason ? "season" : "journey",
      awaitingOffseason: next.awaitingOffseason,
    };
  }

  // Finals prompt without context
  if (next.centerView === "finals_prompt" && !next.pendingFinals) {
    next = {
      ...next,
      centerView: next.career?.lastSeason ? "season" : "journey",
    };
  }

  return next;
}

export type ScoutGateStatus = "need_ovr" | "maturity" | "eligible";

export type ScoutBarState = {
  pct: number;
  ready: boolean;
  status: ScoutGateStatus;
  labelKey: "scout.needOvr" | "scout.maturity" | "scout.eligible";
};

/** Fairness: green / "ready" only when OVR + age + seasons all pass. */
export function scoutBarProgress(
  ovr: number,
  age: number,
  seasonsPlayed: number,
  draftOvr = NBA_DRAFT_OVR,
  maxAge = NBA_DRAFT_MAX_AGE,
  minSeasons = NBA_DRAFT_MIN_SEASONS,
): ScoutBarState {
  const ovrOk = ovr >= draftOvr;
  const ageOk = age <= maxAge;
  const seasonsOk = seasonsPlayed >= minSeasons;
  const ready = ovrOk && ageOk && seasonsOk;

  let pct: number;
  if (ovr <= 55) pct = 0;
  else if (ovr <= 72) pct = Math.round(((ovr - 55) / (72 - 55)) * 50);
  else if (!ovrOk) {
    pct = Math.round(50 + ((ovr - 72) / (draftOvr - 72)) * 40);
  } else if (!ready) {
    pct = 90;
  } else {
    pct = 100;
  }

  if (!ovrOk) {
    return { pct, ready: false, status: "need_ovr", labelKey: "scout.needOvr" };
  }
  if (!ageOk || !seasonsOk) {
    return {
      pct,
      ready: false,
      status: "maturity",
      labelKey: "scout.maturity",
    };
  }
  return {
    pct: 100,
    ready: true,
    status: "eligible",
    labelKey: "scout.eligible",
  };
}
