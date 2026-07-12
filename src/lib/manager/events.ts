import { uid } from "@/lib/utils";
import type {
  CareerEvent,
  CoachCountry,
  ManagerState,
  SquadPlayer,
} from "@/types/manager";

const NAT_CODE: Record<CoachCountry, string> = {
  br: "BR",
  en: "EN",
  es: "ES",
  pt: "PT",
  fr: "FR",
  it: "IT",
  de: "DE",
  ar: "AR",
};

export function countryNatCode(country: CoachCountry): string {
  return NAT_CODE[country];
}

/** Maybe spawn a career dilemma after a match. */
export function maybeCreateCareerEvent(state: ManagerState): CareerEvent | null {
  if (!state.career || state.careerEvent) return null;
  if (Math.random() > 0.42) return null;

  const squad = state.squad;
  const kinds = [
    "transfer_request",
    "captain_band",
    "set_pieces",
    "dressing_room",
  ] as const;
  // National invite rarer, needs OVR
  if (
    !state.career.nationalCoach &&
    (state.career.ovr ?? 50) >= 70 &&
    state.career.seasonsInCareer >= 2 &&
    Math.random() < 0.22
  ) {
    return {
      id: uid("ev"),
      kind: "national_invite",
      titleKey: "mgr.event.national_invite.title",
      bodyKey: "mgr.event.national_invite.body",
      choices: [
        { id: "accept", labelKey: "mgr.event.national_invite.accept" },
        { id: "decline", labelKey: "mgr.event.national_invite.decline" },
      ],
    };
  }

  const kind = kinds[Math.floor(Math.random() * kinds.length)]!;

  if (kind === "transfer_request") {
    const restless = [...squad]
      .filter((p) => !state.starters.includes(p.id) || p.morale < 62)
      .sort((a, b) => a.morale - b.morale)[0];
    const p = restless ?? squad[Math.floor(Math.random() * squad.length)];
    if (!p) return null;
    return {
      id: uid("ev"),
      kind,
      titleKey: "mgr.event.transfer_request.title",
      bodyKey: "mgr.event.transfer_request.body",
      playerId: p.id,
      playerName: p.name,
      choices: [
        { id: "motivate", labelKey: "mgr.event.transfer_request.motivate" },
        { id: "sell", labelKey: "mgr.event.transfer_request.sell" },
      ],
    };
  }

  if (kind === "captain_band") {
    const candidates = [...squad].sort((a, b) => b.attrs.mental - a.attrs.mental);
    const p = candidates[0];
    if (!p) return null;
    return {
      id: uid("ev"),
      kind,
      titleKey: "mgr.event.captain_band.title",
      bodyKey: "mgr.event.captain_band.body",
      playerId: p.id,
      playerName: p.name,
      choices: [
        { id: "give", labelKey: "mgr.event.captain_band.give" },
        { id: "keep", labelKey: "mgr.event.captain_band.keep" },
      ],
    };
  }

  if (kind === "set_pieces") {
    const taker = [...squad]
      .filter((p) => p.pos === "AM" || p.pos === "CM" || p.pos === "ST" || p.pos === "W")
      .sort((a, b) => b.attrs.pass - a.attrs.pass)[0];
    if (!taker) return null;
    return {
      id: uid("ev"),
      kind,
      titleKey: "mgr.event.set_pieces.title",
      bodyKey: "mgr.event.set_pieces.body",
      playerId: taker.id,
      playerName: taker.name,
      choices: [
        { id: "assign", labelKey: "mgr.event.set_pieces.assign" },
        { id: "skip", labelKey: "mgr.event.set_pieces.skip" },
      ],
    };
  }

  // dressing_room
  const low = [...squad].sort((a, b) => a.morale - b.morale)[0];
  return {
    id: uid("ev"),
    kind: "dressing_room",
    titleKey: "mgr.event.dressing_room.title",
    bodyKey: "mgr.event.dressing_room.body",
    playerId: low?.id,
    playerName: low?.name,
    choices: [
      { id: "speech", labelKey: "mgr.event.dressing_room.speech" },
      { id: "train", labelKey: "mgr.event.dressing_room.train" },
    ],
  };
}

export function tournamentForCountry(
  country: CoachCountry,
  season: number,
): { id: string; nameKey: string; year: number } {
  const year = 2025 + season;
  const isWc = season % 4 === 0;
  if (isWc) {
    return { id: `wc-${year}`, nameKey: "mgr.nt.tournament.wc", year };
  }
  if (country === "br" || country === "ar") {
    return {
      id: `ca-${year}`,
      nameKey: "mgr.nt.tournament.copaAmerica",
      year,
    };
  }
  return { id: `euro-${year}`, nameKey: "mgr.nt.tournament.euro", year };
}

export function buildNationalPool(
  country: CoachCountry,
  clubSquad: SquadPlayer[],
  aiSquads: Record<string, SquadPlayer[]>,
): SquadPlayer[] {
  const code = NAT_CODE[country];
  const fromClub = clubSquad.filter((p) => p.nationality === code);
  const fromAi: SquadPlayer[] = [];
  for (const squad of Object.values(aiSquads)) {
    for (const p of squad) {
      if (p.nationality === code && p.ovr >= 68) fromAi.push({ ...p });
    }
  }
  const merged = [...fromClub];
  for (const p of fromAi.sort((a, b) => b.ovr - a.ovr)) {
    if (!merged.some((m) => m.name === p.name)) merged.push(p);
    if (merged.length >= 28) break;
  }
  return merged;
}
