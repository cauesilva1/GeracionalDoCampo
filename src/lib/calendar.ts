/** Career calendar & national-team cycles */

export const START_AGE = 16;
export const START_YEAR = 2016;
export const RETIRE_AGE = 38;

/** FIBA Basketball World Cup years */
export const WORLD_CUP_YEARS = [2019, 2023, 2027] as const;

/** Summer Olympics basketball years (Tokyo slid to 2021) */
export const OLYMPICS_YEARS = [2016, 2021, 2024, 2028] as const;

export type NationalEventKind = "world_cup" | "olympics";

export function nationalEventForYear(
  year: number,
): NationalEventKind | null {
  if ((WORLD_CUP_YEARS as readonly number[]).includes(year)) return "world_cup";
  if ((OLYMPICS_YEARS as readonly number[]).includes(year)) return "olympics";
  return null;
}

/** Soft call-up gate — even fringe minutes for developing prospects. */
export function isNationalCallupEligible(
  ovr: number,
  age: number,
  seasonsPlayed: number,
  kind: NationalEventKind,
): boolean {
  if (seasonsPlayed < 1) return false;
  if (kind === "olympics") {
    // 2016: ultra-young camp invite possible at 16 with OVR 58+
    return ovr >= (age <= 17 ? 58 : 64);
  }
  return ovr >= 62;
}
