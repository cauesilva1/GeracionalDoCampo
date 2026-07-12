import type { FormationId, PitchPos } from "@/types/manager";

/** Pitch % coords: x left→right, y own goal→opp goal (user attacks up). */
export type PitchXY = { x: number; y: number };

/** Slot positions for home (attacking up). Away mirrors y. */
const FORMATION_XY: Record<FormationId, PitchXY[]> = {
  "433": [
    { x: 50, y: 8 },
    { x: 12, y: 22 },
    { x: 35, y: 20 },
    { x: 65, y: 20 },
    { x: 88, y: 22 },
    { x: 28, y: 42 },
    { x: 50, y: 40 },
    { x: 72, y: 42 },
    { x: 18, y: 68 },
    { x: 50, y: 78 },
    { x: 82, y: 68 },
  ],
  "442": [
    { x: 50, y: 8 },
    { x: 12, y: 22 },
    { x: 35, y: 20 },
    { x: 65, y: 20 },
    { x: 88, y: 22 },
    { x: 18, y: 45 },
    { x: 38, y: 42 },
    { x: 62, y: 42 },
    { x: 82, y: 45 },
    { x: 38, y: 75 },
    { x: 62, y: 75 },
  ],
  "352": [
    { x: 50, y: 8 },
    { x: 22, y: 22 },
    { x: 50, y: 18 },
    { x: 78, y: 22 },
    { x: 18, y: 48 },
    { x: 50, y: 42 },
    { x: 82, y: 48 },
    { x: 12, y: 62 },
    { x: 88, y: 62 },
    { x: 38, y: 78 },
    { x: 62, y: 78 },
  ],
  "4231": [
    { x: 50, y: 8 },
    { x: 12, y: 22 },
    { x: 35, y: 20 },
    { x: 65, y: 20 },
    { x: 88, y: 22 },
    { x: 35, y: 38 },
    { x: 65, y: 38 },
    { x: 50, y: 55 },
    { x: 18, y: 68 },
    { x: 82, y: 68 },
    { x: 50, y: 80 },
  ],
};

export function formationSlots(formation: FormationId): PitchXY[] {
  return FORMATION_XY[formation];
}

export function mirrorAway(p: PitchXY): PitchXY {
  return { x: 100 - p.x, y: 100 - p.y };
}

export function jitter(base: PitchXY, amp = 2.2): PitchXY {
  return {
    x: Math.max(4, Math.min(96, base.x + (Math.random() - 0.5) * amp * 2)),
    y: Math.max(4, Math.min(96, base.y + (Math.random() - 0.5) * amp * 2)),
  };
}

export function posLabel(pos: PitchPos): string {
  return pos;
}
