import { ECONOMY, getClubSeed } from "@/lib/manager/clubs";
import { clamp, uid } from "@/lib/utils";
import type {
  PitchPos,
  PlayerAttrs,
  SquadPlayer,
} from "@/types/manager";
import type { ClubTemplate } from "@/types/manager";
import type { PlayerSeed } from "@/data/realRosters";

function attrsFromOvr(pos: PitchPos, ovr: number): PlayerAttrs {
  const j = (d: number) => Math.round(clamp(ovr + d, 40, 97));
  const base: PlayerAttrs = {
    pace: j(0),
    shoot: j(0),
    pass: j(0),
    defend: j(0),
    physical: j(0),
    mental: j(0),
  };
  switch (pos) {
    case "GK":
      return { ...base, defend: j(6), shoot: j(-22), pace: j(-8) };
    case "CB":
    case "FB":
    case "DM":
      return { ...base, defend: j(5), shoot: j(-10) };
    case "ST":
    case "W":
      return { ...base, shoot: j(5), pace: j(3), defend: j(-12) };
    case "CM":
    case "AM":
      return { ...base, pass: j(5), shoot: j(-2) };
    default:
      return base;
  }
}

export function computeOvr(pos: PitchPos, attrs: PlayerAttrs): number {
  const w =
    pos === "GK"
      ? { pace: 0.05, shoot: 0.05, pass: 0.15, defend: 0.45, physical: 0.15, mental: 0.15 }
      : pos === "CB" || pos === "FB" || pos === "DM"
        ? { pace: 0.12, shoot: 0.08, pass: 0.15, defend: 0.35, physical: 0.18, mental: 0.12 }
        : pos === "ST" || pos === "W"
          ? { pace: 0.2, shoot: 0.3, pass: 0.15, defend: 0.05, physical: 0.15, mental: 0.15 }
          : { pace: 0.12, shoot: 0.15, pass: 0.3, defend: 0.12, physical: 0.13, mental: 0.18 };
  return Math.round(
    attrs.pace * w.pace +
      attrs.shoot * w.shoot +
      attrs.pass * w.pass +
      attrs.defend * w.defend +
      attrs.physical * w.physical +
      attrs.mental * w.mental,
  );
}

export function seedToPlayer(seed: PlayerSeed, clubId: string): SquadPlayer {
  const attrs = attrsFromOvr(seed.pos, seed.ovr);
  const potential = clamp(
    seed.ovr + (seed.age < 24 ? 4 + Math.floor(Math.random() * 6) : seed.age < 28 ? 2 : 0),
    seed.ovr,
    96,
  );
  return {
    id: uid(`pl-${clubId}`),
    name: seed.name,
    age: seed.age,
    nationality: seed.nat,
    pos: seed.pos,
    attrs,
    ovr: seed.ovr,
    potential,
    value: Math.round(seed.valueM * 1_000_000),
    wage: Math.round(seed.wageK * 1000), // weekly EUR
    morale: 70 + Math.floor(Math.random() * 15),
    fitness: 88 + Math.floor(Math.random() * 12),
    injuredWeeks: 0,
  };
}

/** Annual wage cost from weekly wage. */
export function annualWage(weekly: number): number {
  return weekly * ECONOMY.weeksPerYear;
}

export function loadClubSquad(clubId: string): SquadPlayer[] {
  const club = getClubSeed(clubId);
  if (!club) return [];
  return club.players.map((p) => seedToPlayer(p, clubId));
}

/** @deprecated — real clubs use loadClubSquad */
export function generateSquad(club: ClubTemplate): SquadPlayer[] {
  return loadClubSquad(club.id);
}

export function makePlayer(): SquadPlayer {
  throw new Error("Random free agents disabled — use real market listings");
}

export function autoPickStarters(
  squad: SquadPlayer[],
  slots: PitchPos[],
): { starters: string[]; bench: string[] } {
  const used = new Set<string>();
  const starters: string[] = [];

  for (const slot of slots) {
    const cand = squad
      .filter((p) => !used.has(p.id) && p.injuredWeeks === 0 && p.pos === slot)
      .sort((a, b) => b.ovr - a.ovr)[0];
    if (cand) {
      starters.push(cand.id);
      used.add(cand.id);
      continue;
    }
    const soft = squad
      .filter((p) => !used.has(p.id) && p.injuredWeeks === 0)
      .sort((a, b) => {
        const da = roleDistance(a.pos, slot);
        const db = roleDistance(b.pos, slot);
        return da - db || b.ovr - a.ovr;
      })[0];
    if (soft) {
      starters.push(soft.id);
      used.add(soft.id);
    }
  }

  const bench = squad
    .filter((p) => !used.has(p.id) && p.injuredWeeks === 0)
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 7)
    .map((p) => p.id);

  return { starters, bench };
}

function roleDistance(a: PitchPos, b: PitchPos): number {
  if (a === b) return 0;
  const groups: PitchPos[][] = [
    ["GK"],
    ["CB", "FB", "DM"],
    ["CM", "AM", "DM"],
    ["W", "AM", "ST"],
    ["ST", "W"],
  ];
  for (const g of groups) {
    if (g.includes(a) && g.includes(b)) return 1;
  }
  return 3;
}

export function xiStrength(
  squad: SquadPlayer[],
  starterIds: string[],
  attack: number,
  midfield: number,
  defense: number,
  styleBonus: number,
): number {
  const xi = starterIds
    .map((id) => squad.find((p) => p.id === id))
    .filter(Boolean) as SquadPlayer[];
  if (xi.length === 0) return 50;
  const avg =
    xi.reduce((s, p) => s + p.ovr * (p.fitness / 100) * (0.85 + p.morale / 500), 0) /
    xi.length;
  const bal = (attack + midfield + defense) / 3 / 100;
  return clamp(avg * (0.92 + bal * 0.12) + styleBonus, 45, 96);
}
