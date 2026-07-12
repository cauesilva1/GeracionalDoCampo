"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  advanceToNextSeason,
  acceptJobOffer,
  autoLineup,
  buyPlayer,
  closeNationalCamp,
  createFreshManagerState,
  declineOffers,
  finishLiveMatch,
  goToLegacy,
  openNationalCamp,
  playMatchday,
  playNationalTournament,
  refreshMarket,
  resolveCareerEvent,
  retireCareer,
  sellPlayer,
  setStarterSlot,
  setTab,
  setTactics,
  skipSeason,
  startCareer,
  toggleNationalCallUp,
  tradePlayer,
} from "@/lib/manager/engine";
import {
  clearManagerState,
  loadManagerState,
  saveManagerState,
} from "@/lib/manager/persistence";
import { archiveFromManagerState } from "@/lib/manager/pastRuns";
import { t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/types/game";
import type {
  CoachCountry,
  CoachOrigin,
  CoachPhilosophy,
  FormationId,
  ManagerState,
  ManagerTab,
  TacticStyle,
  TacticsState,
} from "@/types/manager";

type Tr = (key: string, vars?: Record<string, string | number>) => string;

type ManagerActions = {
  tr: Tr;
  setLocale: (locale: Locale) => void;
  chooseClub: (
    country: CoachCountry,
    clubId: string,
    coachName: string,
    origin: CoachOrigin,
    philosophy: CoachPhilosophy,
  ) => void;
  goTab: (tab: ManagerTab) => void;
  updateTactics: (patch: Partial<TacticsState>) => void;
  setFormation: (f: FormationId) => void;
  setStyle: (s: TacticStyle) => void;
  assignStarter: (slotIndex: number, playerId: string) => void;
  doAutoLineup: () => void;
  doBuy: (listingId: string) => void;
  doSell: (playerId: string) => void;
  doTrade: (giveId: string, listingId: string) => void;
  doRefreshMarket: () => void;
  doPlayMatch: () => void;
  doSkipSeason: () => void;
  doFinishLiveMatch: (override?: {
    homeGoals: number;
    awayGoals: number;
  }) => void;
  doResolveEvent: (choiceId: string) => void;
  doOpenNational: () => void;
  doCloseNational: () => void;
  doToggleCallUp: (playerId: string) => void;
  doPlayTournament: () => void;
  doNextSeason: () => void;
  doAcceptOffer: (offerId: string) => void;
  doDeclineOffers: () => void;
  doRetire: () => void;
  doViewLegacy: () => void;
  restart: () => void;
};

const StateCtx = createContext<{ state: ManagerState; hydrated: boolean } | null>(
  null,
);
const ActionsCtx = createContext<ManagerActions | null>(null);

export function ManagerGameProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [state, setState] = useState<ManagerState>(() =>
    createFreshManagerState(locale),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadManagerState(locale);
    if (saved) setState(saved);
    else setState(createFreshManagerState(locale));
    setHydrated(true);
  }, [locale]);

  useEffect(() => {
    if (!hydrated) return;
    saveManagerState(state);
  }, [state, hydrated]);

  // Archive finished careers once when landing on legacy
  const archivedLegacyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || state.phase !== "legacy" || !state.career) return;
    const key = `${state.career.coachName}|${state.career.legacyScore}|${state.career.seasonsInCareer}|${state.career.endReason}`;
    if (archivedLegacyRef.current === key) return;
    archivedLegacyRef.current = key;
    archiveFromManagerState(
      state,
      state.career.endReason === "retired" ? "retired" : "fired",
    );
  }, [hydrated, state]);

  const tr = useCallback<Tr>(
    (key, vars) => t(state.locale, key, vars),
    [state.locale],
  );

  const setLocale = useCallback((next: Locale) => {
    setState((s) => ({ ...s, locale: next }));
  }, []);

  const chooseClub = useCallback(
    (
      country: CoachCountry,
      clubId: string,
      coachName: string,
      origin: CoachOrigin,
      philosophy: CoachPhilosophy,
    ) => {
      setState((s) =>
        startCareer(s, country, clubId, coachName, origin, philosophy),
      );
    },
    [],
  );

  const goTab = useCallback((tab: ManagerTab) => {
    setState((s) => setTab(s, tab));
  }, []);

  const updateTactics = useCallback((patch: Partial<TacticsState>) => {
    setState((s) => setTactics(s, patch));
  }, []);

  const setFormation = useCallback((f: FormationId) => {
    setState((s) => setTactics(s, { formation: f }));
  }, []);

  const setStyleFn = useCallback((style: TacticStyle) => {
    setState((s) => setTactics(s, { style }));
  }, []);

  const assignStarter = useCallback((slotIndex: number, playerId: string) => {
    setState((s) => setStarterSlot(s, slotIndex, playerId));
  }, []);

  const doAutoLineup = useCallback(() => {
    setState((s) => autoLineup(s));
  }, []);

  const doBuy = useCallback((listingId: string) => {
    setState((s) => {
      const r = buyPlayer(s, listingId);
      if (r.reason !== "ok") {
        return {
          ...s,
          news: [`mgr.block.${r.reason}`, ...s.news].slice(0, 8),
        };
      }
      return r.state;
    });
  }, []);

  const doSell = useCallback((playerId: string) => {
    setState((s) => {
      const r = sellPlayer(s, playerId);
      if (r.reason !== "ok") {
        return {
          ...s,
          news: [`mgr.block.${r.reason}`, ...s.news].slice(0, 8),
        };
      }
      return r.state;
    });
  }, []);

  const doTrade = useCallback((giveId: string, listingId: string) => {
    setState((s) => {
      const r = tradePlayer(s, giveId, listingId);
      if (r.reason !== "ok") {
        return {
          ...s,
          news: [`mgr.block.${r.reason}`, ...s.news].slice(0, 8),
        };
      }
      return r.state;
    });
  }, []);

  const doRefreshMarket = useCallback(() => {
    setState((s) => refreshMarket(s));
  }, []);

  const doPlayMatch = useCallback(() => {
    setState((s) => playMatchday(s));
  }, []);

  const doSkipSeason = useCallback(() => {
    setState((s) => skipSeason(s));
  }, []);

  const doFinishLiveMatch = useCallback(
    (override?: { homeGoals: number; awayGoals: number }) => {
      setState((s) => finishLiveMatch(s, override));
    },
    [],
  );

  const doResolveEvent = useCallback((choiceId: string) => {
    setState((s) => resolveCareerEvent(s, choiceId));
  }, []);

  const doOpenNational = useCallback(() => {
    setState((s) => openNationalCamp(s));
  }, []);

  const doCloseNational = useCallback(() => {
    setState((s) => closeNationalCamp(s));
  }, []);

  const doToggleCallUp = useCallback((playerId: string) => {
    setState((s) => toggleNationalCallUp(s, playerId));
  }, []);

  const doPlayTournament = useCallback(() => {
    setState((s) => playNationalTournament(s));
  }, []);

  const doNextSeason = useCallback(() => {
    setState((s) => advanceToNextSeason(s));
  }, []);

  const doAcceptOffer = useCallback((offerId: string) => {
    setState((s) => acceptJobOffer(s, offerId));
  }, []);

  const doDeclineOffers = useCallback(() => {
    setState((s) => declineOffers(s));
  }, []);

  const doRetire = useCallback(() => {
    setState((s) => retireCareer(s));
  }, []);

  const doViewLegacy = useCallback(() => {
    setState((s) => goToLegacy(s));
  }, []);

  const restart = useCallback(() => {
    setState((s) => {
      if (s.career && s.phase !== "setup") {
        const reason =
          s.phase === "legacy"
            ? s.career.endReason === "retired"
              ? "retired"
              : "fired"
            : "abandoned";
        // Avoid double-archive if already on legacy (effect handled it)
        if (s.phase !== "legacy") {
          archiveFromManagerState(s, reason);
        }
      }
      return createFreshManagerState(locale);
    });
    clearManagerState();
  }, [locale]);

  const actions = useMemo<ManagerActions>(
    () => ({
      tr,
      setLocale,
      chooseClub,
      goTab,
      updateTactics,
      setFormation,
      setStyle: setStyleFn,
      assignStarter,
      doAutoLineup,
      doBuy,
      doSell,
      doTrade,
      doRefreshMarket,
      doPlayMatch,
      doSkipSeason,
      doFinishLiveMatch,
      doResolveEvent,
      doOpenNational,
      doCloseNational,
      doToggleCallUp,
      doPlayTournament,
      doNextSeason,
      doAcceptOffer,
      doDeclineOffers,
      doRetire,
      doViewLegacy,
      restart,
    }),
    [
      tr,
      setLocale,
      chooseClub,
      goTab,
      updateTactics,
      setFormation,
      setStyleFn,
      assignStarter,
      doAutoLineup,
      doBuy,
      doSell,
      doTrade,
      doRefreshMarket,
      doPlayMatch,
      doSkipSeason,
      doFinishLiveMatch,
      doResolveEvent,
      doOpenNational,
      doCloseNational,
      doToggleCallUp,
      doPlayTournament,
      doNextSeason,
      doAcceptOffer,
      doDeclineOffers,
      doRetire,
      doViewLegacy,
      restart,
    ],
  );

  return (
    <StateCtx.Provider value={{ state, hydrated }}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useManagerState() {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error("useManagerState outside provider");
  return ctx;
}

export function useManagerActions() {
  const ctx = useContext(ActionsCtx);
  if (!ctx) throw new Error("useManagerActions outside provider");
  return ctx;
}
