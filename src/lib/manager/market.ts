import { ECONOMY } from "@/lib/manager/clubs";
import { annualWage, seedToPlayer } from "@/lib/manager/players";
import { uid } from "@/lib/utils";
import type {
  ManagerCareer,
  ManagerState,
  MarketBlockReason,
  MarketListing,
  SquadPlayer,
} from "@/types/manager";
import type { PlayerSeed } from "@/data/realRosters";

export function syncBudgetAlias(career: ManagerCareer): ManagerCareer {
  return { ...career, budget: career.transferBudget };
}

const SUPER_STARS: PlayerSeed[] = [
  { name: "Kylian Mbappé", age: 26, nat: "FR", pos: "ST", ovr: 91, valueM: 180, wageK: 220 },
  { name: "Erling Haaland", age: 24, nat: "NO", pos: "ST", ovr: 91, valueM: 170, wageK: 200 },
  { name: "Vinícius Jr", age: 24, nat: "BR", pos: "W", ovr: 90, valueM: 160, wageK: 180 },
  { name: "Jude Bellingham", age: 21, nat: "EN", pos: "CM", ovr: 89, valueM: 150, wageK: 160 },
  { name: "Pedri", age: 22, nat: "ES", pos: "CM", ovr: 88, valueM: 120, wageK: 140 },
  { name: "Lautaro Martínez", age: 27, nat: "AR", pos: "ST", ovr: 88, valueM: 110, wageK: 150 },
];

export function canBuyPlayer(
  state: ManagerState,
  listing: MarketListing,
): MarketBlockReason {
  if (!state.career || !state.season) return "not_found";
  if (!state.season.transferWindowOpen) return "window_closed";
  if (state.squad.length >= ECONOMY.maxSquadSize) return "squad_full";
  if (state.career.signingsThisWindow >= ECONOMY.maxSigningsPerWindow) {
    return "signing_limit";
  }
  if (state.career.transferBudget < listing.askingPrice) return "no_budget";

  const newBill = state.career.wageBill + annualWage(listing.player.wage);
  if (newBill > state.career.wageBudget) return "wage_cap";

  if (listing.isSuper) {
    // Galáctico: elite coach + board trust + deep pockets
    if ((state.career.ovr ?? 50) < 80) return "super_block";
    if (state.career.boardConfidence < 80) return "super_block";
    if (listing.askingPrice > state.career.transferBudget * 0.45) {
      return "board_block";
    }
  }

  const share = listing.askingPrice / Math.max(state.career.transferBudget, 1);
  if (
    share >= ECONOMY.bigFeeShare &&
    state.career.boardConfidence < ECONOMY.minConfidenceForBigFee
  ) {
    return "board_block";
  }
  return "ok";
}

export function canSellPlayer(
  state: ManagerState,
  playerId: string,
): MarketBlockReason {
  if (!state.career || !state.season) return "not_found";
  if (!state.season.transferWindowOpen) return "window_closed";
  if (state.starters.includes(playerId)) return "starter";
  if (state.squad.length <= ECONOMY.minSquadSize) return "min_squad";
  if (!state.squad.some((p) => p.id === playerId)) return "not_found";
  return "ok";
}

/** List sellable players from AI clubs + rare superstar. Mix of tiers so buys matter. */
export function buildRealMarket(
  aiSquads: Record<string, SquadPlayer[]>,
  clubNames: Record<string, string>,
  n: number,
): MarketListing[] {
  const pool: { player: SquadPlayer; clubId: string }[] = [];
  for (const [clubId, squad] of Object.entries(aiSquads)) {
    const sorted = [...squad].sort((a, b) => b.ovr - a.ovr);
    // Top third + middle third + some fringe — not only the worst players.
    const top = sorted.slice(0, Math.max(2, Math.floor(squad.length * 0.25)));
    const mid = sorted.slice(
      Math.floor(squad.length * 0.25),
      Math.floor(squad.length * 0.65),
    );
    const fringe = sorted.slice(Math.floor(squad.length * 0.65));
    const pick = (arr: SquadPlayer[], chance: number) => {
      for (const player of arr) {
        if (Math.random() < chance) pool.push({ player, clubId });
      }
    };
    pick(top, 0.18);
    pick(mid, 0.4);
    pick(fringe, 0.55);
  }

  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, n);
  const listings: MarketListing[] = shuffled.map(({ player, clubId }) => {
    const mul =
      ECONOMY.askMin + Math.random() * (ECONOMY.askMax - ECONOMY.askMin);
    return {
      id: uid("mkt"),
      player: { ...player },
      askingPrice: Math.round(player.value * mul),
      fromClubId: clubId,
      fromClubName: clubNames[clubId] ?? clubId,
    };
  });

  // ~8% chance a Galáctico appears — rare and very expensive
  if (Math.random() < 0.08) {
    const star = SUPER_STARS[Math.floor(Math.random() * SUPER_STARS.length)]!;
    const player = seedToPlayer(star, "super-market");
    player.value = Math.round(star.valueM * 1_000_000);
    player.wage = Math.round(star.wageK * 1000);
    listings.unshift({
      id: uid("super"),
      player,
      askingPrice: Math.round(player.value * (1.25 + Math.random() * 0.35)),
      fromClubId: null,
      fromClubName: "★ Galáctico",
      isSuper: true,
    });
  }

  return listings;
}
