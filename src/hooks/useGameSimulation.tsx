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
import { RETIRE_AGE, STARTER_WALLET, buildBalancedDraftPool, pickRerollLegend } from "@/lib/data";
import {
  createClutchState,
  resolveDefenseAction,
  resolveOffenseAction,
} from "@/lib/clutch";
import {
  applyOptionToMods,
  applyPermanentOption,
  applyWalletCost,
  canAffordOption,
  collectImpactToasts,
  collectStatFlash,
  completeStats,
  createStarterStats,
  emptySeasonMods,
  growTowardMax,
  seasonDevelopmentBump,
  pickMidEvent,
  pickOffseasonEvent,
} from "@/lib/progression";
import { loadSfxMute, sfxClick, sfxDraft, sfxSuccess } from "@/lib/sfx";
import {
  clearGameState,
  createInitialState,
  flushGameState,
  loadGameState,
  saveGameState,
} from "@/lib/persistence";
import { recoverHydratedState } from "@/lib/hydration";
import {
  START_AGE,
  START_YEAR,
  isNationalCallupEligible,
  nationalEventForYear,
} from "@/lib/calendar";
import {
  ankleMissGames,
  blendInjuryRisk,
  clinicRiskReduction,
  computeInjuryRisk,
  streetInjuryChance,
} from "@/lib/injury";
import { buildKeyGames } from "@/lib/keyGames";
import {
  applyIdentity,
  applyPressChoice,
  maybeInjectDrama,
  runSimulateCareer,
  startQuickCrunchState,
  todayChallengeSeed,
} from "@/lib/featureActions";
import { makeCareerSeed, normalizeSeed } from "@/lib/rng";
import { museumUnlock } from "@/lib/careerFlavor";
import {
  buildNationalGames,
  enrichNationalCallup,
} from "@/lib/nationalGames";
import {
  advanceFullQuarter,
  resolveFullDefense,
  resolveFullOffense,
} from "@/lib/fullGame";
import {
  buildSeasonQueue,
  continueNationalQueue,
  continueSeasonQueue,
} from "@/lib/seasonFlow";
import {
  applyFinalsResult,
  assignStarterClub,
  computeMarketValue,
  computeOfferSalary,
  computeOverall,
  emptyTrophies,
  freshCareer,
  generateTransferOffers,
  getClubStrength,
  getLeague,
  getLegacyTierId,
  isEuroEligible,
  isNbaDraftEligible,
  isNbaFaEligible,
  liveStats,
  nextViewAfterSeason,
  resolveNbaDraftPick,
  shareCareerText,
  simulateSeason,
} from "@/lib/simulation";
import { t } from "@/lib/i18n/dictionary";
import { clamp, uid } from "@/lib/utils";
import type {
  AttrKey,
  AwardAnnouncement,
  CenterView,
  DefenseAction,
  OffenseAction,
  FullDefCall,
  FullOffCall,
  SignatureMove,
  DripStyle,
  CoachStyle,
  CountryId,
  GameMode,
  GameState,
  Locale,
  PositionId,
} from "@/types/game";

function syncStats(stats: Partial<GameState["currentStats"]>) {
  return { currentStats: stats };
}

function queueAwards(
  awards: AwardAnnouncement[],
): Pick<GameState, "awardQueue" | "activeAward" | "centerView"> {
  if (awards.length === 0) {
    return { awardQueue: [], activeAward: null, centerView: "season" };
  }
  const [first, ...rest] = awards;
  return {
    awardQueue: rest,
    activeAward: first!,
    centerView: "award",
  };
}

function openOffseason(s: GameState, career: NonNullable<GameState["career"]>): GameState {
  return {
    ...s,
    career,
    pendingFinals: null,
    clutch: null,
    clutchKind: null,
    fullGame: null,
    nationalGamesQueue: [],
    awardQueue: [],
    activeAward: null,
    pendingEvent: pickOffseasonEvent(),
    pendingNational: null,
    awaitingOffseason: true,
    centerView: "offseason_event",
    phase: "career",
  };
}

function maybeNationalOrOffseason(
  s: GameState,
  career: NonNullable<GameState["career"]>,
): GameState {
  const year = career.calendarYear ?? START_YEAR;
  const kind = nationalEventForYear(year);
  if (!kind || !s.player) return openOffseason(s, career);
  const o = computeOverall(liveStats({ ...s, career }), s.player.posId);
  if (
    !isNationalCallupEligible(
      o,
      career.age,
      career.seasonsPlayed,
      kind,
    )
  ) {
    return openOffseason(s, career);
  }
  const recent =
    career.perfHistory.length > 0
      ? career.perfHistory[career.perfHistory.length - 1]!
      : 70;
  const pendingNational = enrichNationalCallup(
    {
      kind,
      year,
      titleKey: kind === "world_cup" ? "national.wc" : "national.oly",
      bodyKey: kind === "world_cup" ? "national.wcBody" : "national.olyBody",
      minutesLikely: o < 72,
    },
    o,
    career.seasonsPlayed,
    recent,
  );
  return {
    ...s,
    career,
    pendingFinals: null,
    clutch: null,
    clutchKind: null,
    fullGame: null,
    awardQueue: [],
    activeAward: null,
    pendingEvent: null,
    awaitingOffseason: true,
    pendingNational,
    nationalGamesQueue: [],
    nationalWins: 0,
    centerView: "national_callup",
    phase: "career",
  };
}

function finishNationalSlate(
  s: GameState,
  career: NonNullable<GameState["career"]>,
  callKind: "world_cup" | "olympics" | null,
): GameState {
  const wins = s.nationalWins ?? 0;
  let next = { ...career };
  // Better national campaigns: strong run counts as a title for legacy
  if (callKind && wins > 0) {
    next = {
      ...next,
      trophies: {
        ...next.trophies,
        worldCups:
          callKind === "world_cup"
            ? next.trophies.worldCups + (wins >= 2 ? 1 : 0)
            : next.trophies.worldCups,
        olympicRuns:
          callKind === "olympics"
            ? (next.trophies.olympicRuns ?? 0) + (wins >= 2 ? 1 : 0)
            : (next.trophies.olympicRuns ?? 0),
      },
      marketBoost: (next.marketBoost ?? 0) + (wins >= 2 ? 2 : 1),
    };
  }
  return openOffseason(
    {
      ...s,
      nationalGamesQueue: [],
      nationalWins: 0,
      clutch: null,
      clutchKind: null,
      fullGame: null,
    },
    next,
  );
}

function applySimResult(
  s: GameState,
  sim: ReturnType<typeof simulateSeason>,
  extraOffers = false,
): GameState {
  let career = sim.career;
  const stats = seasonDevelopmentBump(
    liveStats(s),
    s.maxStats,
    career.age,
  );
  const o = computeOverall(stats, s.player!.posId);
  let offers = career.offers;
  const contractExpired = (career.contractYearsRemaining ?? 0) <= 0;
  if (extraOffers || contractExpired) {
    offers = generateTransferOffers(
      { ...s, career, ...syncStats(stats) },
      o,
    );
    if (offers.some((x) => x.isNba) && s.player) {
      career = {
        ...career,
        offers,
        press: [
          {
            id: uid("press"),
            season: career.season,
            age: career.age,
            headline: t(s.locale, "press.nbaOffer", {
              name: s.player.name,
              ovr: o,
              age: career.age,
            }),
            body: t(s.locale, "press.nbaOfferBody", {
              name: s.player.name,
              ovr: o,
              age: career.age,
            }),
          },
          ...career.press,
        ],
      };
    } else {
      career = { ...career, offers };
    }
  }

  const hasNba = career.offers.some((x) => x.isNba);
  const view = nextViewAfterSeason(sim.pendingFinals, sim.awards, hasNba);

  if (view === "finals_prompt") {
    return {
      ...s,
      ...syncStats(stats),
      career,
      pendingFinals: sim.pendingFinals,
      clutch: null,
      clutchKind: null,
      fullGame: null,
      awardQueue: sim.awards,
      activeAward: null,
      pendingEvent: null,
      awaitingOffseason: true,
      phase: "career",
      centerView: "finals_prompt",
      seasonQueue: [],
      keyGamesQueue: [],
    };
  }

  if (view === "award") {
    const q = queueAwards(sim.awards);
    return {
      ...s,
      ...syncStats(stats),
      career,
      pendingFinals: null,
      clutch: null,
      clutchKind: null,
      fullGame: null,
      ...q,
      pendingEvent: null,
      awaitingOffseason: true,
      phase: "career",
      seasonQueue: [],
      keyGamesQueue: [],
    };
  }

  const withGrowth = {
    ...s,
    ...syncStats(stats),
    effectToasts: [
      {
        id: uid("toast"),
        tone: "good" as const,
        labelKey: "impact.ovrUp",
        vars: { ovr: o },
      },
      ...(s.effectToasts ?? []),
    ],
  };
  const next = maybeNationalOrOffseason(withGrowth, career);
  if (
    next.centerView === "national_callup" ||
    next.centerView === "offseason_event" ||
    next.centerView === "finals_prompt" ||
    next.centerView === "award"
  ) {
    return next;
  }
  return maybeInjectDrama(next);
}

interface GameStateValue {
  state: GameState;
  hydrated: boolean;
  ovr: number;
  potentialOvr: number;
  marketValue: number;
  draftEligible: boolean;
  faEligible: boolean;
  euroEligible: boolean;
  legacyTierId: string;
}

interface GameActionsValue {
  setLocale: (locale: Locale) => void;
  startDraft: (input: {
    name: string;
    countryId: CountryId;
    posId: PositionId;
    mode: GameMode;
    seed?: string;
  }) => void;
  takeAttr: (attr: AttrKey) => void;
  rerollLegend: () => void;
  clearJustFilled: () => void;
  clearStatFlash: () => void;
  clearEffectToasts: () => void;
  beginCareer: () => void;
  beginDraft: () => void;
  launchSeason: () => void;
  advanceSeason: () => void;
  resolveNationalCallup: (choice: "accept" | "decline") => void;
  setCenterView: (view: CenterView) => void;
  declareNbaDraft: () => void;
  finishNbaDraft: () => void;
  enterNbaFromDraft: () => void;
  acceptOffer: (offerId: string) => void;
  stayClub: () => void;
  retire: () => void;
  restart: () => void;
  copySummary: () => Promise<boolean>;
  getShareText: () => string;
  watchFinals: () => void;
  skipFinals: () => void;
  resolveCrunchOffense: (action: OffenseAction) => void;
  resolveCrunchDefense: (action: DefenseAction) => void;
  finishClutch: () => void;
  resolveFullOff: (action: FullOffCall) => void;
  resolveFullDef: (action: FullDefCall) => void;
  nextFullQuarter: () => void;
  finishFullGame: () => void;
  confirmIdentity: (input: {
    nickname: string;
    signature: SignatureMove;
    drip: DripStyle;
    coachStyle: CoachStyle;
    preferNcaa: boolean;
  }) => void;
  simulateEntireCareer: () => void;
  startQuickCrunch: () => void;
  openDailyChallenge: () => void;
  resolvePressChoice: (optionId: string) => void;
  resolveDream: () => void;
  finishStreet3x3: (play: boolean) => void;
  finishAllStar: () => void;
  resolveContractTalk: (choice: "stay" | "trade" | "renegotiate") => void;
  copyClipMoment: () => Promise<boolean>;
  setCareerSeed: (seed: string) => void;
  toggleLiveVote: () => void;
  dismissHubTour: () => void;
  dismissAward: () => void;
  resolveSeasonEvent: (optionId: string) => void;
  tr: (key: string, vars?: Record<string, string | number>) => string;
}

/** @deprecated Prefer useGameState + useGameActions to avoid cascade re-renders */
type GameApi = GameStateValue & GameActionsValue;

const GameStateContext = createContext<GameStateValue | null>(null);
const GameActionsContext = createContext<GameActionsValue | null>(null);

export function GameSimulationProvider({
  children,
  initialLocale = "pt",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [state, setState] = useState<GameState>(() =>
    createInitialState(initialLocale),
  );
  const [hydrated, setHydrated] = useState(false);
  const skipSave = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pendingSimRef = useRef<{
    base: GameState;
    sim: ReturnType<typeof simulateSeason>;
    extraOffers: boolean;
    flash: GameState["statFlash"];
    toasts: GameState["effectToasts"];
  } | null>(null);

  useEffect(() => {
    if (state.centerView !== "simulating" || !pendingSimRef.current) return;
    const timer = setTimeout(() => {
      const payload = pendingSimRef.current;
      pendingSimRef.current = null;
      if (!payload) return;
      setState(() => ({
        ...applySimResult(payload.base, payload.sim, payload.extraOffers),
        statFlash: payload.flash,
        effectToasts: payload.toasts,
      }));
    }, 1200);
    return () => clearTimeout(timer);
  }, [state.centerView]);

  useEffect(() => {
    loadSfxMute();
    const saved = loadGameState();
    if (saved) {
      let career = saved.career
        ? {
            ...saved.career,
            nbaSeasons: saved.career.nbaSeasons ?? 0,
            trophies: {
              ...emptyTrophies(),
              ...saved.career.trophies,
              olympicRuns: saved.career.trophies?.olympicRuns ?? 0,
            },
            seasonMods: saved.career.seasonMods ?? emptySeasonMods(),
            midEventsDone: saved.career.midEventsDone ?? 0,
            fatigue: saved.career.fatigue ?? 0,
            pendingAthPenalty: saved.career.pendingAthPenalty ?? 0,
            pendingCluPenalty: saved.career.pendingCluPenalty ?? 0,
            pendingGamesMissed: saved.career.pendingGamesMissed ?? 0,
            injuryShield: saved.career.injuryShield ?? false,
            injuryRisk: saved.career.injuryRisk ?? 0.15,
            nationalCaps: saved.career.nationalCaps ?? 0,
            calendarYear:
              saved.career.calendarYear ??
              2016 + Math.max(0, (saved.career.season ?? 1) - 1),
            marketBoost: saved.career.marketBoost ?? 0,
            wallet: saved.career.wallet ?? STARTER_WALLET,
            annualSalary: saved.career.annualSalary ?? 0,
            contractYearsRemaining: saved.career.contractYearsRemaining ?? 0,
            contractCurrency:
              saved.career.contractCurrency ??
              (saved.career.leagueId
                ? getLeague(saved.career.leagueId).currency
                : "USD"),
            rivalClubId: saved.career.rivalClubId ?? null,
            rivalClubName: saved.career.rivalClubName ?? null,
            careerSeed:
              saved.career.careerSeed ||
              saved.careerSeed ||
              "",
            nickname: saved.career.nickname ?? null,
            signature: saved.career.signature ?? null,
            drip: saved.career.drip ?? "classic",
            coachStyle: saved.career.coachStyle ?? "halfcourt",
            pathTrack: saved.career.pathTrack ?? "pro_direct",
            preferNcaa: saved.career.preferNcaa ?? false,
            mentorName: saved.career.mentorName ?? null,
            teammates: saved.career.teammates ?? [],
            museum: saved.career.museum ?? [],
            unlockedLegendIds: saved.career.unlockedLegendIds ?? [],
            rivalWins: saved.career.rivalWins ?? 0,
            rivalLosses: saved.career.rivalLosses ?? 0,
            allStarCount: saved.career.allStarCount ?? 0,
            familyMorale: saved.career.familyMorale ?? 50,
            liveVoteEnabled: saved.career.liveVoteEnabled ?? false,
            clubBudget: saved.career.clubBudget ?? 75,
            clutchMod: saved.career.clutchMod ?? 0,
            documentary: saved.career.documentary ?? [],
          }
        : null;
      const legacySlots =
        (saved as GameState & { slots?: Partial<GameState["currentStats"]> })
          .slots ?? {};
      const maxStats =
        saved.maxStats && Object.keys(saved.maxStats).length > 0
          ? saved.maxStats
          : legacySlots;
      const currentStats =
        saved.currentStats && Object.keys(saved.currentStats).length > 0
          ? saved.currentStats
          : legacySlots;

      // v6: backfill missing contract salary from club strength
      if (
        career &&
        (career.annualSalary ?? 0) <= 0 &&
        career.clubId &&
        Object.keys(currentStats).length > 0
      ) {
        const o = computeOverall(currentStats, saved.player?.posId ?? null);
        const strength = getClubStrength(career.leagueId, career.clubId);
        career = {
          ...career,
          annualSalary: computeOfferSalary(
            o,
            career.age,
            career,
            currentStats,
            strength,
          ),
          contractYearsRemaining: Math.max(
            1,
            career.contractYearsRemaining ?? 0,
          ),
          contractCurrency:
            career.contractCurrency ?? getLeague(career.leagueId).currency,
        };
      }

      // Backfill rival if missing
      if (career && !career.rivalClubId) {
        const clubId = career.clubId;
        const league = getLeague(career.leagueId);
        const rival = [...league.clubs]
          .filter((c) => c.id !== clubId)
          .sort((a, b) => b.strength - a.strength)[0];
        if (rival) {
          career = {
            ...career,
            rivalClubId: rival.id,
            rivalClubName: rival.name,
          };
        }
      }

      setState(
        recoverHydratedState({
          ...createInitialState(initialLocale),
          ...saved,
          career,
          locale: initialLocale,
          ...syncStats(currentStats),
          maxStats,
          pendingFinals: saved.pendingFinals ?? null,
          clutch:
            saved.clutch &&
            "possession" in saved.clutch &&
            "clock" in saved.clutch
              ? { ...saved.clutch, overtime: saved.clutch.overtime ?? false }
              : null,
          awardQueue: saved.awardQueue ?? [],
          activeAward: saved.activeAward ?? null,
          pendingEvent: saved.pendingEvent ?? null,
          awaitingOffseason: saved.awaitingOffseason ?? false,
          seasonQueue: saved.seasonQueue ?? [],
          keyGamesQueue: saved.keyGamesQueue ?? [],
          pendingNational: saved.pendingNational ?? null,
          nationalGamesQueue: saved.nationalGamesQueue ?? [],
          nationalWins: saved.nationalWins ?? 0,
          fullGame: saved.fullGame ?? null,
          clutchKind: saved.clutchKind ?? null,
          careerSeed: saved.careerSeed || career?.careerSeed || "",
          pendingPressChoice: saved.pendingPressChoice ?? null,
          pendingDream: saved.pendingDream ?? null,
          spectatorDoc: saved.spectatorDoc ?? [],
          dailyChallenge: saved.dailyChallenge ?? null,
          identityDone:
            saved.identityDone ?? !!career?.nickname,
          hubTourDone: saved.hubTourDone ?? false,
          draftAnimating: false,
          justFilledAttr: null,
          statFlash: null,
          effectToasts: [],
        }),
      );
    } else {
      setState((s) => ({ ...s, locale: initialLocale }));
    }
    setHydrated(true);
    skipSave.current = false;
  }, [initialLocale]);

  useEffect(() => {
    if (!hydrated || skipSave.current) return;
    if (state.centerView === "simulating") return;
    saveGameState(state);
  }, [state, hydrated]);

  const ovr = useMemo(
    () => computeOverall(liveStats(state), state.player?.posId ?? null),
    [state.currentStats, state.player?.posId],
  );

  const marketValue = useMemo(() => {
    if (!state.career || !state.player) return 0;
    return computeMarketValue(
      ovr,
      state.career.age,
      state.career,
      liveStats(state),
    );
  }, [state.career, state.player, state.currentStats, ovr]);

  const potentialOvr = useMemo(
    () =>
      computeOverall(
        state.maxStats && Object.keys(state.maxStats).length > 0
          ? state.maxStats
          : liveStats(state),
        state.player?.posId ?? null,
      ),
    [state.maxStats, state.currentStats, state.player?.posId],
  );

  const draftEligible = useMemo(() => {
    if (!state.career) return false;
    return isNbaDraftEligible(
      ovr,
      state.career.age,
      state.career.inNba,
      state.career.seasonsPlayed,
    );
  }, [state.career, ovr]);

  const faEligible = useMemo(() => {
    if (!state.career) return false;
    return isNbaFaEligible(
      ovr,
      state.career.age,
      state.career.inNba,
      state.career.seasonsPlayed,
    );
  }, [state.career, ovr]);

  const euroEligible = useMemo(() => {
    if (!state.career) return false;
    return isEuroEligible(
      ovr,
      state.career.inNba,
      state.career.leagueId,
      state.career.seasonsPlayed,
    );
  }, [state.career, ovr]);

  const legacyTierId = useMemo(
    () => (state.career ? getLegacyTierId(state.career, ovr) : "bench"),
    [state.career, ovr],
  );

  const tr = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      t(stateRef.current.locale, key, vars),
    [],
  );

  const setLocale = useCallback((locale: Locale) => {
    setState((s) => ({ ...s, locale }));
  }, []);

  const startDraft = useCallback(
    (input: {
      name: string;
      countryId: CountryId;
      posId: PositionId;
      mode: GameMode;
      seed?: string;
    }) => {
      const seed = input.seed ? normalizeSeed(input.seed) : makeCareerSeed();
      setState((s) => ({
        ...s,
        phase: "howto",
        careerSeed: seed,
        identityDone: false,
        player: {
          name: input.name.trim() || "Prospect",
          countryId: input.countryId,
          posId: input.posId,
          mode: input.mode,
        },
        draftPool: buildBalancedDraftPool(),
        draftIndex: 0,
        rerollUsed: false,
        ...syncStats({}),
        maxStats: {},
        justFilledAttr: null,
        career: null,
        pendingFinals: null,
        clutch: null,
        clutchKind: null,
        awardQueue: [],
        activeAward: null,
        pendingEvent: null,
        pendingNational: null,
        nationalGamesQueue: [],
        nationalWins: 0,
        fullGame: null,
        seasonQueue: [],
        keyGamesQueue: [],
        awaitingOffseason: false,
        centerView: "idle",
      }));
    },
    [],
  );

  const beginDraft = useCallback(() => {
    setState((s) => {
      if (!s.player || s.draftPool.length === 0) return s;
      return { ...s, phase: "draft" };
    });
  }, []);

  const takeAttr = useCallback((attr: AttrKey) => {
    setState((s) => {
      const ceiling = s.maxStats ?? {};
      if (ceiling[attr] !== undefined) return s;
      const legend = s.draftPool[s.draftIndex];
      if (!legend) return s;
      const maxStats = { ...ceiling, [attr]: legend.stats[attr] };
      const draftIndex = s.draftIndex + 1;
      sfxDraft();
      return {
        ...s,
        maxStats,
        // Preview ceiling on currentStats during draft for reveal UI
        ...syncStats(maxStats),
        justFilledAttr: attr,
        draftIndex,
        phase: draftIndex >= 8 ? "reveal" : "draft",
      };
    });
  }, []);

  const rerollLegend = useCallback(() => {
    setState((s) => {
      if (s.rerollUsed || s.player?.mode !== "classic") return s;
      const current = s.draftPool[s.draftIndex];
      if (!current) return s;
      const next = pickRerollLegend(current, s.draftPool);
      if (!next) return s;
      const draftPool = [...s.draftPool];
      draftPool[s.draftIndex] = next;
      return { ...s, rerollUsed: true, draftPool };
    });
  }, []);

  const clearJustFilled = useCallback(() => {
    setState((s) => (s.justFilledAttr ? { ...s, justFilledAttr: null } : s));
  }, []);

  const clearStatFlash = useCallback(() => {
    setState((s) => (s.statFlash ? { ...s, statFlash: null } : s));
  }, []);

  const clearEffectToasts = useCallback(() => {
    setState((s) =>
      s.effectToasts.length ? { ...s, effectToasts: [] } : s,
    );
  }, []);

  const beginCareer = useCallback(() => {
    setState((s) => {
      if (!s.player) return s;
      const maxStats = completeStats(s.maxStats);
      const currentStats = createStarterStats(s.player.posId, maxStats);
      const o = computeOverall(currentStats, s.player.posId);
      const { leagueId, club } = assignStarterClub(s.player.countryId, o);
      const league = getLeague(leagueId);
      const years = club.strength >= 88 ? 2 : 3;
      const draftCareer = {
        ...freshCareer(),
        leagueId,
        clubId: club.id,
        clubName: club.name,
        contractCurrency: league.currency,
      };
      const annualSalary = computeOfferSalary(
        o,
        START_AGE,
        draftCareer,
        currentStats,
        club.strength,
      );
      const rival = [...league.clubs]
        .filter((c) => c.id !== club.id)
        .sort((a, b) => b.strength - a.strength)[0];
      const career = {
        ...draftCareer,
        age: START_AGE,
        calendarYear: START_YEAR,
        annualSalary,
        contractYearsRemaining: years,
        contractCurrency: league.currency,
        rivalClubId: rival?.id ?? null,
        rivalClubName: rival?.name ?? null,
        injuryRisk: computeInjuryRisk(currentStats, maxStats),
        nationalCaps: 0,
        careerSeed: s.careerSeed || makeCareerSeed(),
      };
      sfxSuccess();
      return {
        ...s,
        maxStats,
        ...syncStats(currentStats),
        career,
        careerSeed: career.careerSeed,
        phase: "career",
        pendingEvent: null,
        pendingNational: null,
        nationalGamesQueue: [],
        nationalWins: 0,
        fullGame: null,
        identityDone: false,
        awaitingOffseason: false,
        centerView: "identity",
        seasonQueue: [],
        keyGamesQueue: [],
        pendingFinals: null,
        clutch: null,
        clutchKind: null,
        awardQueue: [],
        activeAward: null,
        statFlash: null,
        effectToasts: [],
      };
    });
  }, []);

  /** Journey CTA: start season beat queue (key games → mid → sim). */
  const launchSeason = useCallback(() => {
    setState((s) => {
      if (!s.career || !s.player) return s;
      if (s.career.lastSeason) return s;
      const o = computeOverall(liveStats(s), s.player.posId);
      const keys = buildKeyGames(s.career, o);
      const career = {
        ...s.career,
        seasonMods: emptySeasonMods(),
        midEventsDone: 0,
        injuryRisk:
          s.career.injuryRisk ??
          computeInjuryRisk(liveStats(s), s.maxStats),
      };
      return continueSeasonQueue(
        {
          ...s,
          career,
          seasonQueue: buildSeasonQueue(career.inNba),
          keyGamesQueue: keys,
          pendingEvent: null,
          awaitingOffseason: false,
          effectToasts: [],
          statFlash: null,
        },
        pendingSimRef,
      );
    });
  }, []);

  const advanceSeason = useCallback(() => {
    setState((s) => {
      if (!s.career || !s.player) return s;

      if (s.awaitingOffseason && s.centerView === "season") {
        return openOffseason(s, s.career);
      }

      let career = {
        ...s.career,
        age: s.career.age + 1,
        season: s.career.season + 1,
        calendarYear: (s.career.calendarYear ?? START_YEAR) + 1,
        seasonMods: emptySeasonMods(),
        midEventsDone: 0,
      };

      if (career.age >= RETIRE_AGE) {
        return {
          ...s,
          career: { ...career, retired: true },
          phase: "legacy",
          centerView: "idle",
          pendingFinals: null,
          clutch: null,
          clutchKind: null,
          pendingEvent: null,
          pendingNational: null,
          seasonQueue: [],
          keyGamesQueue: [],
          awaitingOffseason: false,
        };
      }

      const o = computeOverall(liveStats(s), s.player.posId);
      const keys = buildKeyGames(career, o);
      return continueSeasonQueue(
        {
          ...s,
          career,
          seasonQueue: buildSeasonQueue(career.inNba),
          keyGamesQueue: keys,
          pendingEvent: null,
          awaitingOffseason: false,
          pendingFinals: null,
          clutch: null,
          clutchKind: null,
          effectToasts: [],
        },
        pendingSimRef,
      );
    });
  }, []);

  const resolveSeasonEvent = useCallback((optionId: string) => {
    setState((s) => {
      if (!s.pendingEvent || !s.career || !s.player) return s;
      const option = s.pendingEvent.options.find((o) => o.id === optionId);
      if (!option) return s;

      const walletBefore = s.career.wallet ?? STARTER_WALLET;
      if (
        s.pendingEvent.kind === "offseason" &&
        !canAffordOption(walletBefore, option)
      ) {
        return s;
      }

      if (s.pendingEvent.kind === "mid") {
        let optionForMods = option;
        // Ankle rest severity scales with draft injury risk
        if (option.id === "medical") {
          const miss = ankleMissGames(s.career.injuryRisk ?? 0.15);
          optionForMods = {
            ...option,
            effects: option.effects.map((e) =>
              e.type === "games_missed" ? { ...e, value: miss } : e,
            ),
          };
        }
        let shielded = false;
        if (
          s.career.injuryShield &&
          optionForMods.effects.some((e) => e.type === "games_missed")
        ) {
          shielded = true;
          optionForMods = {
            ...optionForMods,
            effects: optionForMods.effects.filter(
              (e) => e.type !== "games_missed",
            ),
          };
        }

        const seasonMods = applyOptionToMods(
          s.career.seasonMods ?? emptySeasonMods(),
          optionForMods,
        );
        const needsPerm = optionForMods.effects.some(
          (e) =>
            e.type === "perm_attr" ||
            e.type === "perm_attr_flex" ||
            e.type === "market_boost" ||
            e.type === "injury_shield" ||
            e.type === "random_injury_miss",
        );
        let nextStats = liveStats(s);
        let flexAttr: import("@/types/game").AttrKey | undefined;
        let injuryHit = false;
        let marketBoost = s.career.marketBoost ?? 0;
        if (needsPerm) {
          const applied = applyPermanentOption(
            nextStats,
            s.maxStats,
            optionForMods,
          );
          if (
            optionForMods.effects.some(
              (e) =>
                e.type === "perm_attr" || e.type === "perm_attr_flex",
            )
          ) {
            nextStats = applied.stats;
          }
          flexAttr = applied.flexAttr;
          injuryHit = applied.injuryHit;
          marketBoost += applied.marketBoost;
        }
        const wallet = applyWalletCost(walletBefore, optionForMods);
        const flash = collectStatFlash(optionForMods, { flexAttr, injuryHit });
        const toasts = collectImpactToasts(optionForMods, {
          walletDelta: wallet - walletBefore,
          flexAttr,
          injuryHit,
          injuryShielded: shielded,
        });
        const career = {
          ...s.career,
          seasonMods,
          midEventsDone: (s.career.midEventsDone ?? 0) + 1,
          wallet,
          marketBoost,
          injuryShield: shielded ? false : s.career.injuryShield,
        };
        const synced = syncStats(nextStats);
        return continueSeasonQueue(
          {
            ...s,
            ...synced,
            career,
            pendingEvent: null,
            statFlash: flash,
            effectToasts: toasts,
          },
          pendingSimRef,
        );
      }

      // Off-season — street injury chance from draft ATH risk
      let offOption = option;
      if (option.effects.some((e) => e.type === "random_injury_miss")) {
        const chance = streetInjuryChance(s.career.injuryRisk ?? 0.15);
        offOption = {
          ...option,
          effects: option.effects.map((e) =>
            e.type === "random_injury_miss" ? { ...e, chance } : e,
          ),
        };
      }
      const applied = applyPermanentOption(
        liveStats(s),
        s.maxStats,
        offOption,
      );
      const stats = growTowardMax(applied.stats, s.maxStats, s.career.age);
      const wallet = applyWalletCost(walletBefore, offOption);
      const flash = collectStatFlash(offOption, {
        flexAttr: applied.flexAttr,
        injuryHit: applied.injuryHit,
      });
      const toasts = collectImpactToasts(offOption, {
        walletDelta: wallet - walletBefore,
        flexAttr: applied.flexAttr,
        injuryHit: applied.injuryHit,
      });
      let injuryRisk = blendInjuryRisk(
        s.career.injuryRisk ?? 0.15,
        stats,
        s.maxStats,
      );
      if (applied.injuryShield) {
        injuryRisk = clinicRiskReduction(injuryRisk);
      }
      const career = {
        ...s.career,
        fatigue: applied.fatigueReset ? 0 : s.career.fatigue,
        pendingAthPenalty:
          (s.career.pendingAthPenalty ?? 0) + applied.nextAthPenalty,
        pendingCluPenalty:
          (s.career.pendingCluPenalty ?? 0) + applied.nextCluPenalty,
        pendingGamesMissed:
          (s.career.pendingGamesMissed ?? 0) + applied.pendingGamesMissed,
        injuryShield: applied.injuryShield || (s.career.injuryShield ?? false),
        injuryRisk,
        marketBoost: (s.career.marketBoost ?? 0) + applied.marketBoost,
        wallet,
      };
      const hasOffers = career.offers.length > 0;
      return {
        ...s,
        ...syncStats(stats),
        career,
        pendingEvent: null,
        awaitingOffseason: false,
        centerView: hasOffers ? "transfers" : "season",
        statFlash: flash,
        effectToasts: toasts,
      };
    });
  }, []);

  const setCenterView = useCallback((view: CenterView) => {
    setState((s) => ({ ...s, centerView: view }));
  }, []);

  const finishFinalsFlow = useCallback(
    (s: GameState, won: boolean, viaClutch: boolean): GameState => {
      const applied = applyFinalsResult(s, won, viaClutch);
      const career = applied.career;

      if (applied.nextFinals) {
        return {
          ...s,
          career,
          pendingFinals: applied.nextFinals,
          clutch: null,
          centerView: "finals_prompt",
          phase: "career",
        };
      }

      const awards = [...(s.awardQueue ?? []), ...applied.awards];
      const q = queueAwards(awards);
      if (q.activeAward) {
        return {
          ...s,
          career,
          pendingFinals: null,
          clutch: null,
          ...q,
          awaitingOffseason: true,
          phase: "career",
        };
      }
      return maybeNationalOrOffseason(s, career);
    },
    [],
  );

  const watchFinals = useCallback(() => {
    setState((s) => {
      if (!s.pendingFinals) return s;
      if (!s.pendingDream && Math.random() < 0.4) {
        const good = Math.random() < 0.55;
        return {
          ...s,
          pendingDream: {
            kind: good ? "dream" : "nightmare",
            titleKey: good ? "dream.title" : "nightmare.title",
            bodyKey: good ? "dream.body" : "nightmare.body",
            clutchMod: good ? 0.06 : -0.06,
          },
          centerView: "dream",
        };
      }
      return {
        ...s,
        clutch: createClutchState(s.pendingFinals),
        clutchKind: "finals",
        centerView: "clutch",
      };
    });
  }, []);

  const skipFinals = useCallback(() => {
    setState((s) => {
      const finals = s.pendingFinals;
      if (!finals) return s;
      const won = Math.random() < finals.winChanceOnSkip;
      return finishFinalsFlow(s, won, false);
    });
  }, [finishFinalsFlow]);

  const resolveCrunchOffense = useCallback((action: OffenseAction) => {
    setState((s) => {
      if (!s.clutch || s.clutch.resolved) return s;
      return {
        ...s,
        clutch: resolveOffenseAction(s.clutch, action, liveStats(s)),
      };
    });
  }, []);

  const resolveCrunchDefense = useCallback((action: DefenseAction) => {
    setState((s) => {
      if (!s.clutch || s.clutch.resolved) return s;
      return {
        ...s,
        clutch: resolveDefenseAction(s.clutch, action, liveStats(s)),
      };
    });
  }, []);

  const finishClutch = useCallback(() => {
    setState((s) => {
      if (!s.clutch?.resolved || s.clutch.winsGame === null) return s;
      if (s.clutchKind === "quick") {
        const won = s.clutch.winsGame;
        if (won) sfxSuccess();
        return {
          ...s,
          clutch: null,
          clutchKind: null,
          centerView: "season",
          effectToasts: [
            {
              id: uid("toast"),
              tone: won ? "good" : "bad",
              labelKey: won ? "impact.keyWin" : "impact.keyLose",
            },
          ],
        };
      }
      if (s.clutchKind === "key_game") {
        const won = s.clutch.winsGame;
        if (won) sfxSuccess();
        const mods = { ...(s.career?.seasonMods ?? emptySeasonMods()) };
        if (won) {
          mods.chemistry = (mods.chemistry ?? 0) + 1;
          mods.energy = (mods.energy ?? 0) + 2;
          mods.clu = (mods.clu ?? 0) + 1;
        } else {
          mods.energy = (mods.energy ?? 0) - 2;
          mods.ath = (mods.ath ?? 0) - 1;
        }
        const career = s.career
          ? { ...s.career, seasonMods: mods }
          : s.career;
        return continueSeasonQueue(
          {
            ...s,
            career: career!,
            clutch: null,
            clutchKind: null,
            fullGame: null,
            effectToasts: [
              {
                id: uid("toast"),
                tone: won ? "good" : "bad",
                labelKey: won ? "impact.keyWin" : "impact.keyLose",
              },
            ],
          },
          pendingSimRef,
        );
      }
      if (s.clutchKind === "national") {
        const won = !!s.clutch.winsGame;
        if (won) sfxSuccess();
        const wins = (s.nationalWins ?? 0) + (won ? 1 : 0);
        const nextState = {
          ...s,
          nationalWins: wins,
          clutch: null,
          clutchKind: null,
          fullGame: null,
          effectToasts: [
            {
              id: uid("toast"),
              tone: won ? ("good" as const) : ("bad" as const),
              labelKey: won ? "impact.nationalWin" : "impact.nationalLose",
            },
          ],
        };
        const cont = continueNationalQueue(nextState);
        if (cont) return cont;
        const kind =
          s.clutch.finals.competition === "olympics" ||
          s.clutch.finals.competition === "world_cup"
            ? s.clutch.finals.competition
            : null;
        return finishNationalSlate(nextState, s.career!, kind);
      }
      if (s.clutch.winsGame) sfxSuccess();
      return finishFinalsFlow(s, s.clutch.winsGame, true);
    });
  }, [finishFinalsFlow]);

  const resolveNationalCallup = useCallback(
    (choice: "accept" | "decline") => {
      setState((s) => {
        if (!s.career || !s.pendingNational || !s.player) return s;
        const call = s.pendingNational;
        let career = { ...s.career };
        const toasts: GameState["effectToasts"] = [];
        if (choice === "accept") {
          const o = computeOverall(liveStats(s), s.player.posId);
          const games = buildNationalGames(call, o);
          career = {
            ...career,
            nationalCaps: (career.nationalCaps ?? 0) + 1,
            fatigue: clamp(
              (career.fatigue ?? 0) +
                (call.role === "star" ? 14 : call.role === "rotation" ? 10 : 6),
              0,
              100,
            ),
            marketBoost: (career.marketBoost ?? 0) + 1,
            press: [
              {
                id: uid("press"),
                season: career.season,
                age: career.age,
                headline: t(s.locale, call.titleKey, { year: call.year }),
                body: t(s.locale, "national.pressBody", {
                  year: call.year,
                  min: call.expectedMinutes ?? 10,
                  role: t(
                    s.locale,
                    call.role === "star"
                      ? "national.role.star"
                      : call.role === "rotation"
                        ? "national.role.rotation"
                        : "national.role.fringe",
                  ),
                }),
              },
              ...career.press,
            ],
          };
          const stats = completeStats(liveStats(s));
          stats.clu = clamp(stats.clu + 1, 40, 99);
          toasts.push({
            id: uid("toast"),
            tone: "good",
            labelKey: "impact.nationalYes",
          });
          sfxSuccess();
          const base = {
            ...s,
            ...syncStats(stats),
            career,
            pendingNational: null,
            nationalGamesQueue: games,
            nationalWins: 0,
            effectToasts: toasts,
            awaitingOffseason: true,
          };
          const first = continueNationalQueue(base);
          return first ?? openOffseason(base, career);
        }
        toasts.push({
          id: uid("toast"),
          tone: "warn",
          labelKey: "impact.nationalNo",
        });
        career = {
          ...career,
          fatigue: Math.max(0, (career.fatigue ?? 0) - 5),
        };
        return openOffseason(
          {
            ...s,
            pendingNational: null,
            nationalGamesQueue: [],
            effectToasts: toasts,
          },
          career,
        );
      });
    },
    [],
  );

  const resolveFullOff = useCallback((action: FullOffCall) => {
    setState((s) => {
      if (!s.fullGame || s.fullGame.resolved) return s;
      return {
        ...s,
        fullGame: resolveFullOffense(
          s.fullGame,
          action,
          liveStats(s),
          s.career?.signature,
        ),
      };
    });
  }, []);

  const resolveFullDef = useCallback((action: FullDefCall) => {
    setState((s) => {
      if (!s.fullGame || s.fullGame.resolved) return s;
      return {
        ...s,
        fullGame: resolveFullDefense(s.fullGame, action, liveStats(s)),
      };
    });
  }, []);

  const nextFullQuarter = useCallback(() => {
    setState((s) => {
      if (!s.fullGame || s.fullGame.phase !== "quarter_break") return s;
      return { ...s, fullGame: advanceFullQuarter(s.fullGame) };
    });
  }, []);

  const finishFullGame = useCallback(() => {
    setState((s) => {
      if (!s.fullGame?.resolved || s.fullGame.winsGame === null || !s.career) {
        return s;
      }
      const won = s.fullGame.winsGame;
      const comp = s.fullGame.finals.competition;
      if (won) sfxSuccess();

      if (comp === "key_game") {
        const mods = { ...(s.career.seasonMods ?? emptySeasonMods()) };
        if (won) {
          mods.chemistry = (mods.chemistry ?? 0) + 2;
          mods.energy = (mods.energy ?? 0) + 3;
          mods.clu = (mods.clu ?? 0) + 2;
        } else {
          mods.energy = (mods.energy ?? 0) - 2;
        }
        return continueSeasonQueue(
          {
            ...s,
            career: { ...s.career, seasonMods: mods },
            fullGame: null,
            clutch: null,
            clutchKind: null,
            effectToasts: [
              {
                id: uid("toast"),
                tone: won ? "good" : "bad",
                labelKey: won ? "impact.fullWin" : "impact.fullLose",
              },
            ],
          },
          pendingSimRef,
        );
      }

      if (comp === "olympics" || comp === "world_cup") {
        const wins = (s.nationalWins ?? 0) + (won ? 1 : 0);
        const nextState = {
          ...s,
          nationalWins: wins,
          fullGame: null,
          clutch: null,
          clutchKind: null,
          effectToasts: [
            {
              id: uid("toast"),
              tone: won ? ("good" as const) : ("bad" as const),
              labelKey: won ? "impact.nationalWin" : "impact.nationalLose",
            },
          ],
        };
        const cont = continueNationalQueue(nextState);
        if (cont) return cont;
        return finishNationalSlate(nextState, s.career, comp);
      }

      return finishFinalsFlow(
        { ...s, fullGame: null, clutch: null },
        won,
        true,
      );
    });
  }, [finishFinalsFlow]);

  const confirmIdentity = useCallback(
    (input: {
      nickname: string;
      signature: SignatureMove;
      drip: DripStyle;
      coachStyle: CoachStyle;
      preferNcaa: boolean;
    }) => {
      setState((s) => applyIdentity(s, input));
    },
    [],
  );

  const simulateEntireCareer = useCallback(() => {
    setState((s) => {
      if (!s.career) return s;
      sfxSuccess();
      return runSimulateCareer(s);
    });
  }, []);

  const startQuickCrunch = useCallback(() => {
    setState((s) => startQuickCrunchState(s));
  }, []);

  const openDailyChallenge = useCallback(() => {
    setState((s) => ({
      ...s,
      dailyChallenge: {
        dateKey: new Date().toISOString().slice(0, 10),
        seed: todayChallengeSeed(),
        kind: "crunch",
        bestScore: null,
      },
      centerView: "daily_posse",
    }));
  }, []);

  const resolvePressChoice = useCallback((optionId: string) => {
    setState((s) => applyPressChoice(s, optionId));
  }, []);

  const resolveDream = useCallback(() => {
    setState((s) => {
      if (!s.pendingDream || !s.career) return s;
      return {
        ...s,
        career: {
          ...s.career,
          clutchMod: (s.career.clutchMod ?? 0) + s.pendingDream.clutchMod,
        },
        pendingDream: null,
        centerView: s.pendingFinals ? "finals_prompt" : "season",
        effectToasts: [
          {
            id: uid("toast"),
            tone: s.pendingDream.clutchMod >= 0 ? "good" : "warn",
            labelKey:
              s.pendingDream.kind === "dream"
                ? "impact.dream"
                : "impact.nightmare",
          },
        ],
      };
    });
  }, []);

  const finishStreet3x3 = useCallback((play: boolean) => {
    setState((s) => {
      if (!s.career) return s;
      if (!play) {
        return { ...s, centerView: "season" };
      }
      const hit = Math.random() < 0.55;
      const injured = Math.random() < (s.career.injuryRisk ?? 0.15);
      let career = {
        ...s.career,
        marketBoost: (s.career.marketBoost ?? 0) + (hit ? 2 : 0),
        museum: [
          ...s.career.museum,
          museumUnlock("clip", "museum.streetClip", s.career.season),
        ],
      };
      if (injured) {
        career = {
          ...career,
          pendingGamesMissed: (career.pendingGamesMissed ?? 0) + 3,
        };
      }
      const stats = completeStats(liveStats(s));
      if (hit) stats.ath = clamp(stats.ath + 1, 40, 99);
      return {
        ...s,
        ...syncStats(stats),
        career,
        centerView: "season",
        effectToasts: [
          {
            id: uid("toast"),
            tone: injured ? "bad" : hit ? "good" : "warn",
            labelKey: injured
              ? "impact.streetHurt"
              : hit
                ? "impact.streetWin"
                : "impact.streetLose",
          },
        ],
      };
    });
  }, []);

  const finishAllStar = useCallback(() => {
    setState((s) => {
      if (!s.career) return s;
      return {
        ...s,
        career: {
          ...s.career,
          allStarCount: (s.career.allStarCount ?? 0) + 1,
          trophies: {
            ...s.career.trophies,
            allStars: s.career.trophies.allStars + 1,
          },
          museum: [
            ...s.career.museum,
            museumUnlock("jersey", "museum.allstarJersey", s.career.season),
          ],
        },
        centerView: "season",
        effectToasts: [
          {
            id: uid("toast"),
            tone: "good",
            labelKey: "impact.allstar",
          },
        ],
      };
    });
  }, []);

  const resolveContractTalk = useCallback(
    (choice: "stay" | "trade" | "renegotiate") => {
      setState((s) => {
        if (!s.career) return s;
        let career = { ...s.career };
        if (choice === "renegotiate") {
          career = {
            ...career,
            annualSalary: Math.round((career.annualSalary ?? 0) * 1.12),
            contractYearsRemaining: Math.max(
              2,
              career.contractYearsRemaining ?? 1,
            ),
          };
        } else if (choice === "trade") {
          return {
            ...s,
            career: {
              ...career,
              marketBoost: (career.marketBoost ?? 0) + 2,
              seasonMods: {
                ...(career.seasonMods ?? emptySeasonMods()),
                chemistry: (career.seasonMods?.chemistry ?? 0) - 2,
              },
            },
            centerView: "transfers",
            effectToasts: [
              {
                id: uid("toast"),
                tone: "warn",
                labelKey: "impact.tradeRequest",
              },
            ],
          };
        }
        return {
          ...s,
          career,
          centerView: "season",
          effectToasts: [
            {
              id: uid("toast"),
              tone: "good",
              labelKey:
                choice === "renegotiate"
                  ? "impact.renegotiate"
                  : "impact.stayLoyal",
            },
          ],
        };
      });
    },
    [],
  );

  const copyClipMoment = useCallback(async () => {
    const s = stateRef.current;
    const text = s.career
      ? `${s.player?.name ?? "Player"} (${s.career.nickname ?? ""}) · OVR ${computeOverall(liveStats(s), s.player?.posId ?? null)} · ${s.career.clubName} · ${s.career.calendarYear}`
      : "Lenda da Quadra";
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const setCareerSeed = useCallback((seed: string) => {
    setState((s) => ({
      ...s,
      careerSeed: normalizeSeed(seed),
      career: s.career
        ? { ...s.career, careerSeed: normalizeSeed(seed) }
        : s.career,
    }));
  }, []);

  const toggleLiveVote = useCallback(() => {
    setState((s) => {
      if (!s.career) return s;
      return {
        ...s,
        career: {
          ...s.career,
          liveVoteEnabled: !s.career.liveVoteEnabled,
        },
      };
    });
  }, []);

  const dismissHubTour = useCallback(() => {
    setState((s) => ({ ...s, hubTourDone: true }));
  }, []);

  const dismissAward = useCallback(() => {
    setState((s) => {
      if (s.awardQueue.length > 0) {
        const [next, ...rest] = s.awardQueue;
        return {
          ...s,
          activeAward: next!,
          awardQueue: rest,
          centerView: "award",
        };
      }
      if (s.awaitingOffseason) {
        return maybeNationalOrOffseason(s, s.career!);
      }
      return {
        ...s,
        activeAward: null,
        awardQueue: [],
        centerView: "season",
      };
    });
  }, []);

  const declareNbaDraft = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: "nba_draft",
      centerView: "nba_draft",
      draftAnimating: true,
    }));
  }, []);

  const finishNbaDraft = useCallback(() => {
    setState((s) => {
      if (!s.player || !s.career) return s;
      const o = computeOverall(liveStats(s), s.player.posId);
      const result = resolveNbaDraftPick(o, s.career.age);
      const press = [
        {
          id: uid("press"),
          season: s.career.season,
          age: s.career.age,
          headline: t(s.locale, "press.draft", {
            name: s.player.name,
            pick: result.pick,
            team: result.teamName,
          }),
          body: t(s.locale, "press.draftBody", {
            name: s.player.name,
            pick: result.pick,
            team: result.teamName,
          }),
        },
        ...s.career.press,
      ];
      return {
        ...s,
        draftAnimating: false,
        career: { ...s.career, nbaDraftResult: result, press },
      };
    });
  }, []);

  const enterNbaFromDraft = useCallback(() => {
    setState((s) => {
      const r = s.career?.nbaDraftResult;
      if (!s.career || !r || !s.player) return s;
      const strength = getClubStrength("nba", r.teamId);
      const years = r.pick <= 14 ? 3 : 2;
      const annualSalary = computeOfferSalary(
        computeOverall(liveStats(s), s.player.posId),
        s.career.age + 1,
        { ...s.career, leagueId: "nba", inNba: true },
        liveStats(s),
        strength,
      );
      const career = {
        ...s.career,
        inNba: true,
        leagueId: "nba" as const,
        clubId: r.teamId,
        clubName: r.teamName,
        age: s.career.age + 1,
        season: s.career.season + 1,
        calendarYear: (s.career.calendarYear ?? START_YEAR) + 1,
        offers: [],
        nbaSeasons: 0,
        seasonMods: emptySeasonMods(),
        midEventsDone: 0,
        pendingAthPenalty: 0,
        pendingCluPenalty: s.career.pendingCluPenalty ?? 0,
        pendingGamesMissed: s.career.pendingGamesMissed ?? 0,
        annualSalary,
        contractYearsRemaining: years,
        contractCurrency: "USD" as const,
      };
      return {
        ...s,
        career,
        phase: "career",
        pendingEvent: pickMidEvent([], false),
        awaitingOffseason: false,
        centerView: "mid_event",
        pendingFinals: null,
        clutch: null,
        awardQueue: [],
        activeAward: null,
        draftAnimating: false,
        statFlash: null,
        effectToasts: [],
      };
    });
  }, []);

  const stayClub = useCallback(() => {
    setState((s) => {
      if (!s.career || !s.player) return s;
      let career = { ...s.career, offers: [] };
      if ((career.contractYearsRemaining ?? 0) <= 0) {
        const strength = getClubStrength(career.leagueId, career.clubId);
        const league = getLeague(career.leagueId);
        const o = computeOverall(liveStats(s), s.player.posId);
        career = {
          ...career,
          annualSalary: computeOfferSalary(
            o,
            career.age,
            career,
            liveStats(s),
            strength,
          ),
          contractYearsRemaining: 2,
          contractCurrency: league.currency,
        };
      }
      if (s.awaitingOffseason) return openOffseason(s, career);
      return { ...s, career, centerView: "season" };
    });
  }, []);

  const acceptOffer = useCallback((offerId: string) => {
    setState((s) => {
      if (!s.career || !s.player) return s;
      const offer = s.career.offers.find((o) => o.id === offerId);
      if (!offer) return s;
      const pressItem = {
        id: uid("press"),
        season: s.career.season,
        age: s.career.age,
        headline: t(s.locale, "press.transfer", {
          name: s.player.name,
          club: offer.clubName,
        }),
        body: t(s.locale, "press.transferBody", {
          name: s.player.name,
          club: offer.clubName,
          years: offer.years,
          league: t(s.locale, `league.${offer.leagueId}`),
        }),
      };
      const press =
        offer.path === "euro"
          ? [
              {
                id: uid("press"),
                season: s.career.season,
                age: s.career.age,
                headline: t(s.locale, "press.euroFinalFour", {
                  name: s.player.name,
                  club: offer.clubName,
                }),
                body: t(s.locale, "press.euroFinalFourBody", {
                  name: s.player.name,
                  club: offer.clubName,
                }),
              },
              pressItem,
              ...s.career.press,
            ]
          : [pressItem, ...s.career.press];
      const league = getLeague(offer.leagueId);
      const rival = [...league.clubs]
        .filter((c) => c.id !== offer.clubId)
        .sort((a, b) => b.strength - a.strength)[0];
      const career = {
        ...s.career,
        clubId: offer.clubId,
        clubName: offer.clubName,
        leagueId: offer.leagueId,
        inNba: offer.isNba || s.career.inNba,
        offers: [],
        press,
        nbaSeasons: offer.isNba ? 0 : s.career.nbaSeasons,
        annualSalary: offer.annualSalary,
        contractYearsRemaining: offer.years,
        contractCurrency: offer.currency,
        rivalClubId: rival?.id ?? null,
        rivalClubName: rival?.name ?? null,
      };
      sfxSuccess();
      const next = s.awaitingOffseason
        ? openOffseason(s, career)
        : {
            ...s,
            career,
            phase: "career" as const,
            centerView: "season" as const,
          };
      queueMicrotask(() => flushGameState(next));
      return next;
    });
  }, []);

  const retire = useCallback(() => {
    setState((s) => {
      if (!s.career) return s;
      const next = {
        ...s,
        career: { ...s.career, retired: true },
        phase: "legacy" as const,
        centerView: "idle" as const,
      };
      queueMicrotask(() => flushGameState(next));
      return next;
    });
  }, []);

  const restart = useCallback(() => {
    clearGameState();
    setState(createInitialState(stateRef.current.locale));
  }, []);

  const getShareText = useCallback(
    () => shareCareerText(stateRef.current),
    [],
  );

  const copySummary = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareCareerText(stateRef.current));
      return true;
    } catch {
      return false;
    }
  }, []);

  const stateValue = useMemo<GameStateValue>(
    () => ({
      state,
      hydrated,
      ovr,
      potentialOvr,
      marketValue,
      draftEligible,
      faEligible,
      euroEligible,
      legacyTierId,
    }),
    [
      state,
      hydrated,
      ovr,
      potentialOvr,
      marketValue,
      draftEligible,
      faEligible,
      euroEligible,
      legacyTierId,
    ],
  );

  const actionsValue = useMemo<GameActionsValue>(
    () => ({
      setLocale,
      startDraft,
      takeAttr,
      rerollLegend,
      clearJustFilled,
      clearStatFlash,
      clearEffectToasts,
      beginCareer,
      beginDraft,
      launchSeason,
      advanceSeason,
      resolveNationalCallup,
      setCenterView,
      declareNbaDraft,
      finishNbaDraft,
      enterNbaFromDraft,
      acceptOffer,
      stayClub,
      retire,
      restart,
      copySummary,
      getShareText,
      watchFinals,
      skipFinals,
      resolveCrunchOffense,
      resolveCrunchDefense,
      finishClutch,
      resolveFullOff,
      resolveFullDef,
      nextFullQuarter,
      finishFullGame,
      confirmIdentity,
      simulateEntireCareer,
      startQuickCrunch,
      openDailyChallenge,
      resolvePressChoice,
      resolveDream,
      finishStreet3x3,
      finishAllStar,
      resolveContractTalk,
      copyClipMoment,
      setCareerSeed,
      toggleLiveVote,
      dismissHubTour,
      dismissAward,
      resolveSeasonEvent,
      tr,
    }),
    [
      setLocale,
      startDraft,
      takeAttr,
      rerollLegend,
      clearJustFilled,
      clearStatFlash,
      clearEffectToasts,
      beginCareer,
      beginDraft,
      launchSeason,
      advanceSeason,
      resolveNationalCallup,
      setCenterView,
      declareNbaDraft,
      finishNbaDraft,
      enterNbaFromDraft,
      acceptOffer,
      stayClub,
      retire,
      restart,
      copySummary,
      getShareText,
      watchFinals,
      skipFinals,
      resolveCrunchOffense,
      resolveCrunchDefense,
      finishClutch,
      resolveFullOff,
      resolveFullDef,
      nextFullQuarter,
      finishFullGame,
      confirmIdentity,
      simulateEntireCareer,
      startQuickCrunch,
      openDailyChallenge,
      resolvePressChoice,
      resolveDream,
      finishStreet3x3,
      finishAllStar,
      resolveContractTalk,
      copyClipMoment,
      setCareerSeed,
      toggleLiveVote,
      dismissHubTour,
      dismissAward,
      resolveSeasonEvent,
      tr,
    ],
  );

  return (
    <GameStateContext.Provider value={stateValue}>
      <GameActionsContext.Provider value={actionsValue}>
        {children}
      </GameActionsContext.Provider>
    </GameStateContext.Provider>
  );
}

/** Reactive game data — re-renders when state/derived values change. */
export function useGameState(): GameStateValue {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error("useGameState outside GameSimulationProvider");
  return ctx;
}

/** Stable action handlers — does not re-render on wallet/clutch/stats ticks. */
export function useGameActions(): GameActionsValue {
  const ctx = useContext(GameActionsContext);
  if (!ctx) throw new Error("useGameActions outside GameSimulationProvider");
  return ctx;
}

/** Combined API — prefer useGameState / useGameActions for performance. */
export function useGameSimulation(): GameApi {
  return { ...useGameState(), ...useGameActions() };
}
