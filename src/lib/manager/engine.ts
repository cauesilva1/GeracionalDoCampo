import {
  clubsByLeague,
  ECONOMY,
  foreignTopLeagues,
  getClub,
  LEAGUES,
  startingLeagueForCountry,
  topLeagueForCountry,
} from "@/lib/manager/clubs";
import {
  buildRealMarket,
  canBuyPlayer,
  canSellPlayer,
  syncBudgetAlias,
} from "@/lib/manager/market";
import {
  annualWage,
  autoPickStarters,
  loadClubSquad,
} from "@/lib/manager/players";
import {
  applyResult,
  boardConfidenceDelta,
  buildEvents,
  buildFixtures,
  emptyTable,
  reverseResult,
  simulateMatchday,
  sortTable,
} from "@/lib/manager/match";
import {
  applyCoachOvr,
  coachOvrDeltaFromMatch,
  coachOvrDeltaFromTitle,
  computeManagerLegacyScore,
  emptyTrophyCabinet,
  getManagerLegacyTier,
  originStartMods,
  philosophyToTactics,
} from "@/lib/manager/legacy";
import {
  buildNationalPool,
  maybeCreateCareerEvent,
  tournamentForCountry,
} from "@/lib/manager/events";
import { clamp, rand, uid } from "@/lib/utils";
import {
  FORMATION_SLOTS,
  type CareerEvent,
  type CoachCountry,
  type CoachOrigin,
  type CoachPhilosophy,
  type FormationId,
  type JobOffer,
  type ManagerState,
  type MarketBlockReason,
  type NationalTeamState,
  type SquadPlayer,
  type TacticsState,
} from "@/types/manager";
import type { Locale } from "@/types/game";

function buildMatchRatings(
  squad: SquadPlayer[],
  starters: string[],
  result: import("@/types/manager").MatchResult,
  userClubId: string,
): import("@/types/manager").MatchPlayerRating[] {
  const userGoals = result.events.filter(
    (e) => e.kind === "goal" && e.clubId === userClubId,
  );
  return starters
    .slice(0, 11)
    .map((id) => {
      const p = squad.find((s) => s.id === id);
      if (!p) return null;
      const goals = userGoals.filter((g) => g.playerName === p.name).length;
      const rating = clamp(
        Math.round(
          (6.0 +
            (p.ovr - 70) * 0.045 +
            (p.fitness / 100) * 0.5 +
            goals * 0.55 +
            (p.morale - 70) * 0.01) *
            10,
        ) / 10,
        4.5,
        9.8,
      );
      return { playerId: p.id, name: p.name, rating };
    })
    .filter(Boolean)
    .sort((a, b) => b!.rating - a!.rating) as import("@/types/manager").MatchPlayerRating[];
}

export function createFreshManagerState(locale: Locale): ManagerState {
  return {
    phase: "setup",
    tab: "overview",
    locale,
    career: null,
    squad: [],
    starters: [],
    bench: [],
    tactics: philosophyToTactics("balanced"),
    season: null,
    market: [],
    aiSquads: {},
    news: [],
    seasonLog: [],
    offers: [],
    liveMatch: null,
    careerEvent: null,
    nationalTeam: null,
  };
}

function clubNameMap(leagueId: import("@/types/manager").LeagueId): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of clubsByLeague(leagueId)) {
    map[c.id] = c.name;
  }
  return map;
}

function buildAiAndMarket(leagueId: import("@/types/manager").LeagueId, userClubId: string) {
  const aiSquads: Record<string, SquadPlayer[]> = {};
  for (const c of clubsByLeague(leagueId)) {
    if (c.id === userClubId) continue;
    aiSquads[c.id] = loadClubSquad(c.id);
  }
  const market = buildRealMarket(aiSquads, clubNameMap(leagueId), 14);
  return { aiSquads, market };
}

export function startCareer(
  state: ManagerState,
  country: CoachCountry,
  clubId: string,
  coachName: string,
  origin: CoachOrigin,
  philosophy: CoachPhilosophy,
  difficulty: "easy" | "medium" | "hard" = "medium",
): ManagerState {
  const startLeague = startingLeagueForCountry(country);
  const club = getClub(clubId);
  if (!club || club.leagueId !== startLeague) return state;

  const league = LEAGUES[club.leagueId];
  const squad = loadClubSquad(clubId);
  const tactics = philosophyToTactics(philosophy);
  const { starters, bench } = autoPickStarters(
    squad,
    FORMATION_SLOTS[tactics.formation],
  );
  const { aiSquads, market } = buildAiAndMarket(club.leagueId, clubId);
  const originMods = originStartMods(origin);

  const transferBudget = Math.round(club.transferBudgetM * 1_000_000);
  const wageBudget = Math.round(club.wageBudgetM * 1_000_000);
  const wageBill = squad.reduce((s, p) => s + annualWage(p.wage), 0);
  const startOvr = originMods.startOvr;

  const career = syncBudgetAlias({
    coachName: coachName.trim() || "Técnico",
    country,
    origin,
    philosophy,
    clubId: club.id,
    clubName: club.name,
    leagueId: club.leagueId,
    season: 1,
    transferBudget,
    wageBudget,
    wageBill,
    budget: transferBudget,
    boardGoal: club.boardGoal,
    boardConfidence: originMods.confidence,
    reputation: clamp(
      Math.round(club.prestige * 0.45 * originMods.reputationMul),
      20,
      70,
    ),
    ovr: startOvr,
    careerWins: 0,
    careerDraws: 0,
    careerLosses: 0,
    seasonsAtClub: 1,
    trophies: 0,
    trophyCabinet: emptyTrophyCabinet(),
    clubsManaged: 1,
    peakTier: league.tier,
    signingsThisWindow: 0,
    seasonsInCareer: 1,
    difficulty,
  });

  return {
    ...state,
    phase: "hub",
    tab: "overview",
    career,
    squad,
    starters,
    bench,
    tactics,
    aiSquads,
    market,
    offers: [],
    season: {
      year: 2026,
      matchday: 1,
      matchdaysTotal: league.matchdays,
      fixtures: buildFixtures(club.leagueId),
      table: emptyTable(club.leagueId),
      lastResult: null,
      transferWindowOpen: true,
    },
    news: [originMods.storyKey, "mgr.news.welcomeLow"],
    seasonLog: [],
    liveMatch: null,
    careerEvent: null,
    nationalTeam: null,
  };
}

export function setTab(state: ManagerState, tab: ManagerState["tab"]): ManagerState {
  return { ...state, tab };
}

export function setTactics(
  state: ManagerState,
  patch: Partial<TacticsState>,
): ManagerState {
  const tactics = { ...state.tactics, ...patch };
  if (patch.formation && patch.formation !== state.tactics.formation) {
    const { starters, bench } = autoPickStarters(
      state.squad,
      FORMATION_SLOTS[patch.formation as FormationId],
    );
    return { ...state, tactics, starters, bench };
  }
  return { ...state, tactics };
}

export function setStarterSlot(
  state: ManagerState,
  slotIndex: number,
  playerId: string,
): ManagerState {
  if (slotIndex < 0 || slotIndex >= state.starters.length) return state;
  const starters = [...state.starters];
  const prev = starters[slotIndex];
  const already = starters.indexOf(playerId);
  if (already >= 0) starters[already] = prev!;
  starters[slotIndex] = playerId;
  const bench = state.bench.filter((id) => !starters.includes(id));
  const extra = state.squad
    .map((p) => p.id)
    .filter((id) => !starters.includes(id) && !bench.includes(id));
  return {
    ...state,
    starters,
    bench: [...bench, ...extra].slice(0, 7),
  };
}

export function autoLineup(state: ManagerState): ManagerState {
  const { starters, bench } = autoPickStarters(
    state.squad,
    FORMATION_SLOTS[state.tactics.formation],
  );
  return { ...state, starters, bench };
}

export function buyPlayer(
  state: ManagerState,
  listingId: string,
): { state: ManagerState; reason: MarketBlockReason } {
  const listing = state.market.find((m) => m.id === listingId);
  if (!listing || !state.career) {
    return { state, reason: "not_found" };
  }
  const reason = canBuyPlayer(state, listing);
  if (reason !== "ok") return { state, reason };

  const player = {
    ...listing.player,
    id: listing.player.id.includes("bought")
      ? listing.player.id
      : `${listing.player.id}-in`,
    morale: 72,
    fitness: 100,
    contractYears:
      listing.player.contractYears ?? 2 + Math.floor(Math.random() * 3),
  };

  let aiSquads = { ...state.aiSquads };
  if (listing.fromClubId && aiSquads[listing.fromClubId]) {
    aiSquads = {
      ...aiSquads,
      [listing.fromClubId]: aiSquads[listing.fromClubId]!.filter(
        (p) => p.name !== listing.player.name,
      ),
    };
  }

  const transferBudget = state.career.transferBudget - listing.askingPrice;
  const wageBill = state.career.wageBill + annualWage(player.wage);

  return {
    reason: "ok",
    state: {
      ...state,
      squad: [...state.squad, player],
      market: state.market.filter((m) => m.id !== listingId),
      aiSquads,
      career: syncBudgetAlias({
        ...state.career,
        transferBudget,
        wageBill,
        signingsThisWindow: state.career.signingsThisWindow + 1,
      }),
      news: ["mgr.news.signed", ...state.news].slice(0, 8),
    },
  };
}

export function sellPlayer(
  state: ManagerState,
  playerId: string,
): { state: ManagerState; reason: MarketBlockReason } {
  const reason = canSellPlayer(state, playerId);
  if (reason !== "ok" || !state.career) return { state, reason };

  const player = state.squad.find((p) => p.id === playerId)!;
  const fee = Math.round(player.value * ECONOMY.sellValueFactor);

  return {
    reason: "ok",
    state: {
      ...state,
      squad: state.squad.filter((p) => p.id !== playerId),
      bench: state.bench.filter((id) => id !== playerId),
      career: syncBudgetAlias({
        ...state.career,
        transferBudget: state.career.transferBudget + fee,
        wageBill: Math.max(0, state.career.wageBill - annualWage(player.wage)),
      }),
      news: ["mgr.news.sold", ...state.news].slice(0, 8),
    },
  };
}

export function tradePlayer(
  state: ManagerState,
  giveId: string,
  listingId: string,
): { state: ManagerState; reason: MarketBlockReason } {
  if (!state.career || !state.season?.transferWindowOpen) {
    return { state, reason: "window_closed" };
  }
  const sellCheck = canSellPlayer(state, giveId);
  if (sellCheck !== "ok") return { state, reason: sellCheck };

  const give = state.squad.find((p) => p.id === giveId)!;
  const listing = state.market.find((m) => m.id === listingId);
  if (!listing) return { state, reason: "not_found" };

  const cash = listing.askingPrice - give.value;
  const wageOk =
    state.career.wageBill - annualWage(give.wage) + annualWage(listing.player.wage) <=
    state.career.wageBudget;
  if (!wageOk) return { state, reason: "wage_cap" };
  if (cash > 0 && state.career.transferBudget < cash) {
    return { state, reason: "no_budget" };
  }
  if (state.career.signingsThisWindow >= ECONOMY.maxSigningsPerWindow) {
    return { state, reason: "signing_limit" };
  }

  const incoming = {
    ...listing.player,
    id: `${listing.player.id}-tr`,
    morale: 68,
    fitness: 100,
  };

  return {
    reason: "ok",
    state: {
      ...state,
      squad: [...state.squad.filter((p) => p.id !== giveId), incoming],
      bench: state.bench.filter((id) => id !== giveId),
      market: state.market.filter((m) => m.id !== listingId),
      career: syncBudgetAlias({
        ...state.career,
        transferBudget: state.career.transferBudget - Math.max(0, cash),
        wageBill:
          state.career.wageBill -
          annualWage(give.wage) +
          annualWage(incoming.wage),
        signingsThisWindow: state.career.signingsThisWindow + 1,
      }),
      news: ["mgr.news.trade", ...state.news].slice(0, 8),
    },
  };
}

export function refreshMarket(state: ManagerState): ManagerState {
  if (!state.career || !state.season?.transferWindowOpen) return state;
  return {
    ...state,
    market: buildRealMarket(
      state.aiSquads,
      clubNameMap(state.career.leagueId),
      14,
    ),
  };
}

export function playMatchday(state: ManagerState): ManagerState {
  if (!state.career || !state.season) return state;
  if (state.phase !== "hub") return state;
  if (state.starters.length < 11) return state;
  const s = state.season;
  if (s.matchday > s.matchdaysTotal) return state;

  const sim = simulateMatchday({
    fixtures: s.fixtures,
    matchday: s.matchday,
    table: s.table,
    userClubId: state.career.clubId,
    userSquad: state.squad,
    userStarters: state.starters,
    userTactics: state.tactics,
    coachPhilosophy: state.career.philosophy,
    coachOvr: state.career.ovr ?? 58,
    aiSquads: state.aiSquads,
    difficulty: state.career.difficulty,
  });

  if (!sim.userResult) {
    // No user fixture this MD — advance silently
    return finishMatchAftermath(
      {
        ...state,
        season: {
          ...s,
          fixtures: sim.fixtures,
          table: sim.table,
          lastResult: null,
        },
      },
      sim.table,
      null,
    );
  }

  return {
    ...state,
    phase: "match_live",
    liveMatch: sim.userResult,
    season: {
      ...s,
      fixtures: sim.fixtures,
      table: sim.table,
      // Keep previous lastResult until FT — avoid showing final score under the button mid-match.
      lastResult: s.lastResult,
    },
  };
}

/** Called after chronometer animation ends. Optional score override from live tactics. */
export function finishLiveMatch(
  state: ManagerState,
  override?: {
    homeGoals: number;
    awayGoals: number;
    events?: import("@/types/manager").MatchEvent[];
  },
): ManagerState {
  if (!state.career || !state.season) return state;
  if (state.phase !== "match_live") return state;

  let live = state.liveMatch;
  let table = state.season.table;
  let fixtures = state.season.fixtures;

  if (live && override) {
    const scoreChanged =
      override.homeGoals !== live.homeGoals ||
      override.awayGoals !== live.awayGoals;

    if (scoreChanged) {
      table = reverseResult(
        table,
        live.homeId,
        live.awayId,
        live.homeGoals,
        live.awayGoals,
      );
      table = sortTable(
        applyResult(
          table,
          live.homeId,
          live.awayId,
          override.homeGoals,
          override.awayGoals,
        ),
      );
      fixtures = fixtures.map((fx) =>
        fx.id === live!.fixtureId
          ? {
              ...fx,
              homeGoals: override.homeGoals,
              awayGoals: override.awayGoals,
            }
          : fx,
      );
    }

    const uHome = live.homeId === state.career.clubId;
    const gf = uHome ? override.homeGoals : override.awayGoals;
    const ga = uHome ? override.awayGoals : override.homeGoals;
    const won = gf > ga;
    const drawn = gf === ga;
    const gd = Math.abs(gf - ga);
    let summaryKey = won
      ? "mgr.match.win"
      : drawn
        ? "mgr.match.draw"
        : "mgr.match.loss";
    if (won && gd >= 3) summaryKey = "mgr.match.bigWin";
    if (!won && !drawn && gd >= 3) summaryKey = "mgr.match.bigLoss";
    live = {
      ...live,
      homeGoals: override.homeGoals,
      awayGoals: override.awayGoals,
      events:
        override.events ??
        buildEvents(
          live.homeId,
          live.awayId,
          override.homeGoals,
          override.awayGoals,
          state.career.clubId,
          state.squad,
        ),
      summaryKey,
    };
  }

  return finishMatchAftermath(
    {
      ...state,
      liveMatch: live,
      season: {
        ...state.season,
        table,
        fixtures,
        lastResult: live,
      },
    },
    table,
    live,
  );
}

function finishMatchAftermath(
  state: ManagerState,
  tableIn: import("@/types/manager").TableRow[],
  userResult: import("@/types/manager").MatchResult | null,
  opts?: { skipEvents?: boolean; protectJob?: boolean },
): ManagerState {
  if (!state.career || !state.season) return state;
  const s = state.season;

  let boardConfidence = state.career.boardConfidence;
  let coachOvr = state.career.ovr ?? 58;
  let careerWins = state.career.careerWins ?? 0;
  let careerDraws = state.career.careerDraws ?? 0;
  let careerLosses = state.career.careerLosses ?? 0;

  const squad = state.squad.map((p) => {
    if (!state.starters.includes(p.id)) {
      return {
        ...p,
        fitness: Math.round(
          clamp(p.fitness + (opts?.protectJob ? 10 : 6), 55, 100),
        ),
        injuredWeeks: Math.max(0, p.injuredWeeks - 1),
      };
    }
    // Skip-season: softer drain so the squad survives the fast-forward.
    let fitness = Math.round(
      clamp(
        p.fitness - (opts?.protectJob ? rand(1, 2) : rand(2, 5)),
        opts?.protectJob ? 58 : 52,
        100,
      ),
    );
    let injuredWeeks = p.injuredWeeks;
    let morale = p.morale;
    if (!opts?.protectJob && Math.random() < 0.04) {
      injuredWeeks = Math.round(rand(1, 3));
    }
    if (userResult) {
      const uHome = userResult.homeId === state.career!.clubId;
      const gf = uHome ? userResult.homeGoals : userResult.awayGoals;
      const ga = uHome ? userResult.awayGoals : userResult.homeGoals;
      morale = clamp(morale + (gf > ga ? 4 : gf === ga ? 1 : -3), 30, 99);
    }
    return { ...p, fitness, injuredWeeks, morale };
  });

  let resultWithNotes = userResult;
  if (userResult && state.career) {
    resultWithNotes = {
      ...userResult,
      ratings: buildMatchRatings(
        state.squad,
        state.starters,
        userResult,
        state.career.clubId,
      ),
    };
  }

  if (userResult && state.career) {
    const uHome = userResult.homeId === state.career.clubId;
    const gf = uHome ? userResult.homeGoals : userResult.awayGoals;
    const ga = uHome ? userResult.awayGoals : userResult.homeGoals;
    const result = gf > ga ? "W" : gf === ga ? "D" : "L";
    if (result === "W") careerWins += 1;
    else if (result === "D") careerDraws += 1;
    else careerLosses += 1;
    coachOvr = applyCoachOvr(coachOvr, coachOvrDeltaFromMatch(result));
    const pos =
      sortTable(tableIn).findIndex((r) => r.clubId === state.career!.clubId) + 1;
    const clubs = clubsByLeague(state.career.leagueId).length;
    const delta = boardConfidenceDelta(
      state.career.boardGoal,
      pos,
      clubs,
      result,
    );
    boardConfidence = clamp(
      boardConfidence + (opts?.protectJob ? Math.max(delta, -2) : delta),
      opts?.protectJob ? 22 : 0,
      100,
    );
  }

  const nextMd = s.matchday + 1;
  const seasonDone = nextMd > s.matchdaysTotal;
  const windowOpen = nextMd <= 5 || (nextMd >= 12 && nextMd <= 15);

  let next: ManagerState = {
    ...state,
    phase: "hub",
    liveMatch: null,
    squad,
    career: syncBudgetAlias({
      ...state.career,
      boardConfidence,
      ovr: coachOvr,
      careerWins,
      careerDraws,
      careerLosses,
      reputation: clamp(
        Math.round((state.career.reputation + coachOvr) / 2),
        20,
        99,
      ),
      signingsThisWindow: windowOpen ? state.career.signingsThisWindow : 0,
    }),
    season: {
      ...s,
      matchday: seasonDone ? s.matchday : nextMd,
      transferWindowOpen: windowOpen && !seasonDone,
      lastResult: resultWithNotes ?? s.lastResult,
    },
    news: (() => {
      const keys: string[] = [];
      if (resultWithNotes) {
        if (resultWithNotes.summaryKey === "mgr.match.bigWin") {
          keys.push("mgr.news.bigWin");
        } else if (resultWithNotes.summaryKey === "mgr.match.bigLoss") {
          keys.push("mgr.news.bigLoss");
        } else if (resultWithNotes.summaryKey === "mgr.match.win") {
          const uHome = resultWithNotes.homeId === state.career.clubId;
          const gf = uHome
            ? resultWithNotes.homeGoals
            : resultWithNotes.awayGoals;
          const ga = uHome
            ? resultWithNotes.awayGoals
            : resultWithNotes.homeGoals;
          if (gf - ga === 1 && ga >= 2) keys.push("mgr.news.thriller");
        }
      }
      return [...keys, ...state.news].slice(0, 8);
    })(),
    seasonLog: userResult
      ? [`${userResult.homeGoals}-${userResult.awayGoals}`, ...state.seasonLog].slice(
          0,
          20,
        )
      : state.seasonLog,
  };

  if (windowOpen && next.career) {
    // Refresh listings while the window is open so market actually changes
    next = {
      ...next,
      career: syncBudgetAlias({
        ...next.career,
        signingsThisWindow: !s.transferWindowOpen
          ? 0
          : next.career.signingsThisWindow,
      }),
      market: buildRealMarket(
        next.aiSquads,
        clubNameMap(next.career.leagueId),
        14,
      ),
    };
  }

  if (boardConfidence <= 15 && !opts?.protectJob) {
    return {
      ...next,
      phase: "fired",
      career: next.career
        ? syncBudgetAlias({ ...next.career, endReason: "fired" })
        : null,
    };
  }

  if (seasonDone) {
    return finishSeason(next, { protectJob: opts?.protectJob });
  }

  if (!opts?.skipEvents) {
    const ev = maybeCreateCareerEvent(next);
    if (ev) {
      return { ...next, phase: "career_event", careerEvent: ev };
    }
  }

  return next;
}

/** Simulate remaining matchdays without live UI / mid-season events. */
export function skipSeason(state: ManagerState): ManagerState {
  if (!state.career || !state.season) return state;
  if (state.phase !== "hub") return state;
  if (state.starters.length < 11) return state;

  let cur: ManagerState = state;
  let guard = 0;
  while (
    cur.career &&
    cur.season &&
    cur.phase === "hub" &&
    cur.starters.length >= 11 &&
    cur.season.matchday <= cur.season.matchdaysTotal &&
    guard++ < 80
  ) {
    const s = cur.season;
    const sim = simulateMatchday({
      fixtures: s.fixtures,
      matchday: s.matchday,
      table: s.table,
      userClubId: cur.career.clubId,
      userSquad: cur.squad,
      userStarters: cur.starters,
      userTactics: cur.tactics,
      coachPhilosophy: cur.career.philosophy,
      coachOvr: cur.career.ovr ?? 58,
      aiSquads: cur.aiSquads,
      difficulty: cur.career.difficulty,
    });
    cur = finishMatchAftermath(
      {
        ...cur,
        liveMatch: null,
        season: {
          ...s,
          fixtures: sim.fixtures,
          table: sim.table,
          lastResult: sim.userResult,
        },
      },
      sim.table,
      sim.userResult,
      { skipEvents: true, protectJob: true },
    );
  }
  return cur;
}

export function resolveCareerEvent(
  state: ManagerState,
  choiceId: string,
): ManagerState {
  if (state.phase !== "career_event" || !state.careerEvent || !state.career) {
    return state;
  }
  const ev = state.careerEvent;
  let squad = [...state.squad];
  let career = { ...state.career };
  let nationalTeam = state.nationalTeam;
  const news = [...state.news];

  if (ev.kind === "transfer_request" && ev.playerId) {
    if (choiceId === "motivate") {
      squad = squad.map((p) =>
        p.id === ev.playerId
          ? { ...p, morale: clamp(p.morale + 12, 40, 95), wantsTransfer: false }
          : p,
      );
      news.unshift("mgr.news.eventMotivate");
    } else {
      const player = squad.find((p) => p.id === ev.playerId);
      if (player && squad.length > ECONOMY.minSquadSize) {
        const fee = Math.round(player.value * ECONOMY.sellValueFactor);
        squad = squad.filter((p) => p.id !== ev.playerId);
        career.transferBudget += fee;
        career.wageBill = Math.max(0, career.wageBill - annualWage(player.wage));
        news.unshift("mgr.news.eventSold");
      }
    }
  }

  const starters = state.starters.filter((id) =>
    squad.some((p) => p.id === id),
  );

  if (ev.kind === "captain_band" && ev.playerId) {
    if (choiceId === "give") {
      squad = squad.map((p) => ({
        ...p,
        isCaptain: p.id === ev.playerId,
        morale:
          p.id === ev.playerId
            ? clamp(p.morale + 8, 40, 99)
            : p.isCaptain
              ? clamp(p.morale - 4, 30, 99)
              : p.morale,
      }));
      news.unshift("mgr.news.eventCaptain");
    } else {
      news.unshift("mgr.news.eventCaptainKeep");
    }
  }

  if (ev.kind === "set_pieces" && ev.playerId) {
    if (choiceId === "assign") {
      squad = squad.map((p) => ({
        ...p,
        takesPk: p.id === ev.playerId,
        takesFk: p.id === ev.playerId,
        takesCorner: p.id === ev.playerId,
        morale:
          p.id === ev.playerId ? clamp(p.morale + 5, 40, 99) : p.morale,
      }));
      news.unshift("mgr.news.eventSetPieces");
    }
  }

  if (ev.kind === "dressing_room") {
    if (choiceId === "speech") {
      squad = squad.map((p) => ({
        ...p,
        morale: clamp(p.morale + 6, 40, 95),
      }));
      career.boardConfidence = clamp(career.boardConfidence + 2, 0, 100);
      news.unshift("mgr.news.eventSpeech");
    } else {
      squad = squad.map((p) => ({
        ...p,
        fitness: clamp(p.fitness + 5, 50, 100),
        morale: clamp(p.morale + 2, 40, 95),
      }));
      news.unshift("mgr.news.eventTrain");
    }
  }

  if (ev.kind === "national_invite") {
    if (choiceId === "accept") {
      career.nationalCoach = true;
      const pool = buildNationalPool(
        career.country,
        squad,
        state.aiSquads,
      );
      nationalTeam = {
        country: career.country,
        isCoach: true,
        calledUpIds: pool.slice(0, 11).map((p) => p.id),
        pool,
        titles: career.nationalTitles ?? 0,
        lastTournamentKey: null,
        pendingTournament: tournamentForCountry(
          career.country,
          career.season,
        ),
      };
      news.unshift("mgr.news.eventNationalYes");
    } else {
      news.unshift("mgr.news.eventNationalNo");
    }
  }

  return {
    ...state,
    phase: "hub",
    careerEvent: null,
    squad,
    starters,
    nationalTeam,
    career: syncBudgetAlias(career),
    news: news.slice(0, 8),
  };
}

export function openNationalCamp(state: ManagerState): ManagerState {
  if (!state.career?.nationalCoach || !state.nationalTeam) return state;
  return { ...state, phase: "national" };
}

export function closeNationalCamp(state: ManagerState): ManagerState {
  if (state.phase !== "national") return state;
  return { ...state, phase: "hub" };
}

export function toggleNationalCallUp(
  state: ManagerState,
  playerId: string,
): ManagerState {
  if (!state.nationalTeam) return state;
  const nt = state.nationalTeam;
  const has = nt.calledUpIds.includes(playerId);
  let calledUpIds = has
    ? nt.calledUpIds.filter((id) => id !== playerId)
    : [...nt.calledUpIds, playerId];
  if (calledUpIds.length > 23) calledUpIds = calledUpIds.slice(0, 23);
  return {
    ...state,
    nationalTeam: { ...nt, calledUpIds },
  };
}

export function playNationalTournament(state: ManagerState): ManagerState {
  if (!state.career || !state.nationalTeam?.isCoach) return state;
  const nt = state.nationalTeam;
  if (!nt.pendingTournament || nt.calledUpIds.length < 11) return state;

  const called = nt.pool.filter((p) => nt.calledUpIds.includes(p.id));
  const avg =
    called.reduce((s, p) => s + p.ovr, 0) / Math.max(called.length, 1);
  const coachBonus = ((state.career.ovr ?? 60) - 60) * 0.15;
  const strength = avg + coachBonus;
  const opp = 74 + Math.random() * 12;
  const won = strength + Math.random() * 8 > opp;
  const titles = won ? nt.titles + 1 : nt.titles;

  return {
    ...state,
    phase: "hub",
    career: syncBudgetAlias({
      ...state.career,
      nationalTitles: titles,
      ovr: applyCoachOvr(state.career.ovr ?? 60, won ? 1.8 : 0.2),
      reputation: clamp(
        state.career.reputation + (won ? 6 : 1),
        20,
        99,
      ),
    }),
    nationalTeam: {
      ...nt,
      titles,
      lastTournamentKey: nt.pendingTournament.nameKey,
      pendingTournament: null,
    },
    news: [
      won ? "mgr.news.ntWon" : "mgr.news.ntLost",
      ...state.news,
    ].slice(0, 8),
  };
}

export function scheduleNextNationalTournament(
  state: ManagerState,
): ManagerState {
  if (!state.career || !state.nationalTeam?.isCoach) return state;
  return {
    ...state,
    nationalTeam: {
      ...state.nationalTeam,
      pendingTournament: tournamentForCountry(
        state.career.country,
        state.career.season + 1,
      ),
      pool: buildNationalPool(
        state.career.country,
        state.squad,
        state.aiSquads,
      ),
    },
  };
}

function finishSeason(
  state: ManagerState,
  opts?: { protectJob?: boolean },
): ManagerState {
  if (!state.career || !state.season) return state;
  const table = sortTable(state.season.table);
  const pos = table.findIndex((r) => r.clubId === state.career!.clubId) + 1;
  const league = LEAGUES[state.career.leagueId];
  const goal = state.career.boardGoal;
  const club = getClub(state.career.clubId);

  let ok = false;
  if (goal === "title") ok = pos === 1;
  else if (goal === "top4") ok = pos <= 4;
  else if (goal === "midtable") ok = pos <= Math.ceil(league.clubs / 2) + 2;
  else ok = league.relegate === 0 || pos <= league.clubs - league.relegate;

  const cabinet = {
    ...(state.career.trophyCabinet ?? emptyTrophyCabinet()),
  };
  let trophies = state.career.trophies ?? cabinet.leagueTitles;
  let coachOvr = state.career.ovr ?? 58;
  if (pos === 1) {
    trophies += 1;
    cabinet.leagueTitles += 1;
    if (league.tier === 1) cabinet.topFlightTitles += 1;
    else cabinet.secondDivTitles += 1;
    if ((club?.prestige ?? 0) >= 88) cabinet.bigClubTitles += 1;
    coachOvr = applyCoachOvr(
      coachOvr,
      coachOvrDeltaFromTitle({
        tier: league.tier,
        prestige: club?.prestige ?? 70,
      }),
    );
  }

  const confidence = clamp(
    state.career.boardConfidence + (ok ? 12 : opts?.protectJob ? -6 : -18),
    opts?.protectJob ? 22 : 0,
    100,
  );

  const reputation = clamp(
    Math.round(
      coachOvr +
        (ok ? 4 : -2) +
        (pos === 1 ? 6 : 0) +
        (pos <= 2 ? 2 : 0),
    ),
    20,
    99,
  );

  const peakTier =
    league.tier < (state.career.peakTier ?? 2)
      ? league.tier
      : (state.career.peakTier ?? league.tier);

  const careerPatch = {
    boardConfidence: confidence,
    trophies,
    trophyCabinet: cabinet,
    reputation,
    ovr: coachOvr,
    peakTier,
  };

  // Skip-season never ends the career — you still get offers / season wrap.
  if (!ok && confidence < 35 && !opts?.protectJob) {
    return endCareer(
      {
        ...state,
        offers: [],
        career: syncBudgetAlias({
          ...state.career,
          ...careerPatch,
        }),
      },
      "fired",
    );
  }

  const offers = buildJobOffers(state, pos, coachOvr);
  const nextPhase = offers.length > 0 ? "offers" : "season_end";

  return {
    ...state,
    phase: nextPhase,
    offers,
    career: syncBudgetAlias({
      ...state.career,
      ...careerPatch,
      seasonsInCareer: state.career.seasonsInCareer + 1,
    }),
    news: [
      opts?.protectJob ? "mgr.news.seasonSkipped" : null,
      ok ? "mgr.news.seasonOk" : "mgr.news.seasonBad",
      pos === 1 ? "mgr.news.titleWon" : null,
      ...(offers.length ? ["mgr.news.offers"] : []),
      ...state.news,
    ]
      .filter((n): n is string => Boolean(n))
      .slice(0, 8),
  };
}

function endCareer(
  state: ManagerState,
  reason: "fired" | "retired",
): ManagerState {
  if (!state.career) return state;
  const score = computeManagerLegacyScore(state.career);
  const tier = getManagerLegacyTier(score);
  return {
    ...state,
    phase: "legacy",
    offers: [],
    career: syncBudgetAlias({
      ...state.career,
      legacyScore: score,
      legacyTier: tier,
      endReason: reason,
    }),
  };
}

/** Voluntary retirement → legacy summary */
export function retireCareer(state: ManagerState): ManagerState {
  if (!state.career) return state;
  if (state.phase !== "hub" && state.phase !== "season_end") return state;
  return endCareer(state, "retired");
}

/** After sacked screen confirm → legacy */
export function goToLegacy(state: ManagerState): ManagerState {
  if (!state.career) return state;
  if (state.phase === "legacy") return state;
  if (state.phase !== "fired" && state.phase !== "hub") return state;
  return endCareer(state, state.career.endReason ?? "fired");
}

function buildJobOffers(
  state: ManagerState,
  tablePos: number,
  coachOvr: number,
): JobOffer[] {
  if (!state.career) return [];
  const league = LEAGUES[state.career.leagueId];
  const offers: JobOffer[] = [];
  const used = new Set<string>([state.career.clubId]);

  const pushClub = (clubId: string, reasonKey: string) => {
    const c = getClub(clubId);
    if (!c || used.has(c.id)) return;
    used.add(c.id);
    offers.push({
      id: uid("job"),
      clubId: c.id,
      clubName: c.name,
      leagueId: c.leagueId,
      reasonKey,
    });
  };

  // Promotion zone in tier 2 → top-flight clubs from same country
  if (league.tier === 2 && tablePos <= league.promote) {
    const topId = topLeagueForCountry(state.career.country);
    const topClubs = clubsByLeague(topId)
      .filter((c) => c.prestige < 92)
      .sort((a, b) => a.prestige - b.prestige);
    for (const c of topClubs.slice(0, 3)) {
      pushClub(c.id, "mgr.offer.promoted");
    }
  }

  // Strong season in lower league even without auto-promotion slot
  if (league.tier === 2 && tablePos <= 4 && coachOvr >= 62) {
    const topId = topLeagueForCountry(state.career.country);
    const mid = clubsByLeague(topId)
      .filter((c) => c.prestige >= 70 && c.prestige <= 84)
      .sort(() => Math.random() - 0.5);
    for (const c of mid.slice(0, 2)) {
      pushClub(c.id, "mgr.offer.domestic");
    }
  }

  // Abroad: need OVR + at least 2 seasons in career
  if (coachOvr >= 68 && state.career.seasonsInCareer >= 2) {
    for (const lid of foreignTopLeagues(state.career.country)) {
      const pool = clubsByLeague(lid)
        .filter((c) => c.prestige < 90)
        .sort(() => Math.random() - 0.5);
      if (pool[0] && Math.random() < 0.55 + (coachOvr - 68) / 40) {
        pushClub(pool[0].id, "mgr.offer.abroad");
      }
    }
  }

  // Big clubs after proving yourself in top flight
  if (league.tier === 1 && tablePos <= 4 && coachOvr >= 76) {
    const giants = clubsByLeague(state.career.leagueId)
      .filter((c) => c.prestige >= 88 && c.id !== state.career!.clubId)
      .sort(() => Math.random() - 0.5);
    for (const c of giants.slice(0, 2)) {
      pushClub(c.id, "mgr.offer.big");
    }
  }

  return offers.slice(0, 4);
}

/** Stay at current club and roll into next season. */
export function advanceToNextSeason(state: ManagerState): ManagerState {
  if (!state.career) return state;
  if (state.phase !== "season_end" && state.phase !== "offers") return state;
  return continueAtClub(state, state.career.clubId, false);
}

export function acceptJobOffer(state: ManagerState, offerId: string): ManagerState {
  if (!state.career || state.phase !== "offers") return state;
  const offer = state.offers.find((o) => o.id === offerId);
  if (!offer) return state;
  return continueAtClub(state, offer.clubId, true);
}

export function declineOffers(state: ManagerState): ManagerState {
  if (state.phase !== "offers") return state;
  return {
    ...state,
    phase: "season_end",
    offers: [],
    news: ["mgr.news.stayClub", ...state.news].slice(0, 8),
  };
}

function continueAtClub(
  state: ManagerState,
  clubId: string,
  isTransfer: boolean,
): ManagerState {
  if (!state.career) return state;
  const club = getClub(clubId);
  if (!club) return state;
  const league = LEAGUES[club.leagueId];

  const contractNews: string[] = [];
  let squad: SquadPlayer[];
  if (isTransfer) {
    squad = loadClubSquad(clubId);
  } else {
    squad = state.squad.flatMap((p) => {
      const aged = {
        ...p,
        age: p.age + 1,
        ovr:
          p.age + 1 <= 28
            ? clamp(p.ovr + (p.potential > p.ovr ? 1 : 0), 45, p.potential)
            : clamp(p.ovr - (p.age + 1 >= 33 ? 1 : 0), 45, 94),
        value: Math.round(
          p.value * (p.age + 1 >= 32 ? 0.88 : p.age + 1 <= 23 ? 1.05 : 0.98),
        ),
        fitness: 100,
        injuredWeeks: 0,
      };
      const years = (p.contractYears ?? 2) - 1;
      if (years > 0) {
        return [{ ...aged, morale: clamp(p.morale + 2, 40, 90), contractYears: years }];
      }
      if (state.starters.includes(p.id)) {
        const extend = Math.random() < 0.55;
        return [
          {
            ...aged,
            morale: clamp(p.morale + (extend ? 2 : -6), 40, 90),
            contractYears: 1,
            wantsTransfer: extend ? p.wantsTransfer : true,
          },
        ];
      }
      contractNews.push("mgr.news.contractEnded");
      return [];
    });
  }

  const { aiSquads, market } = buildAiAndMarket(club.leagueId, club.id);
  const { starters, bench } = autoPickStarters(
    squad,
    FORMATION_SLOTS[state.tactics.formation],
  );

  const transferBudget = isTransfer
    ? Math.round(club.transferBudgetM * 1_000_000)
    : state.career.transferBudget +
      Math.round(club.transferBudgetM * 0.35 * 1_000_000);
  const wageBudget = Math.round(club.wageBudgetM * 1_000_000);
  const wageBill = squad.reduce((s, p) => s + annualWage(p.wage), 0);

  const wasLower = LEAGUES[state.career.leagueId].tier === 2;
  const goingTop = league.tier === 1;
  const cabinet = {
    ...(state.career.trophyCabinet ?? emptyTrophyCabinet()),
  };
  if (isTransfer && wasLower && goingTop) {
    cabinet.promotions += 1;
  }

  const clubsManaged = isTransfer
    ? (state.career.clubsManaged ?? 1) + 1
    : (state.career.clubsManaged ?? 1);

  const peakTier =
    league.tier < (state.career.peakTier ?? 2)
      ? league.tier
      : (state.career.peakTier ?? league.tier);

  const ovr =
    isTransfer && wasLower && goingTop
      ? applyCoachOvr(state.career.ovr ?? 58, 1.4)
      : (state.career.ovr ?? 58);

  let next: ManagerState = {
    ...state,
    phase: "hub",
    tab: "overview",
    offers: [],
    liveMatch: null,
    careerEvent: null,
    squad,
    starters,
    bench,
    aiSquads,
    market,
    career: syncBudgetAlias({
      ...state.career,
      clubId: club.id,
      clubName: club.name,
      leagueId: club.leagueId,
      season: state.career.season + 1,
      seasonsAtClub: isTransfer ? 1 : state.career.seasonsAtClub + 1,
      transferBudget,
      wageBudget,
      wageBill,
      boardGoal: club.boardGoal,
      boardConfidence: isTransfer
        ? 65
        : clamp(state.career.boardConfidence + 5, 25, 90),
      signingsThisWindow: 0,
      ovr,
      reputation: clamp(
        Math.round(
          (ovr + (isTransfer ? 3 : 0) + (state.career.reputation ?? ovr)) / 2,
        ),
        20,
        99,
      ),
      trophyCabinet: cabinet,
      clubsManaged,
      peakTier,
    }),
    season: {
      year: (state.season?.year ?? 2026) + 1,
      matchday: 1,
      matchdaysTotal: league.matchdays,
      fixtures: buildFixtures(club.leagueId),
      table: emptyTable(club.leagueId),
      lastResult: null,
      transferWindowOpen: true,
    },
    news: [
      isTransfer ? "mgr.news.newClub" : "mgr.news.newSeason",
      ...contractNews.slice(0, 2),
      ...state.news,
    ].slice(0, 8),
    seasonLog: [],
  };

  if (next.career?.nationalCoach) {
    next = scheduleNextNationalTournament(next);
  }
  return next;
}
