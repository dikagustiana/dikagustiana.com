// Adapted from Factory Yard (github.com/Khalidabdi1/factory, commit 148758a), after ai-iso-skill (MIT, © 2026 Tolga Cohce).

// ---- the clock ----
export const STEP = 1 / 60;
// One day passes in six minutes of simulation; the visible run starts at 10:00. The skip button adds six hours.
export const DAY = 360;
/**
 * Warm-up before the first frame, in simulated seconds. Factory Yard ran 80
 * (its vehicles had to spread out from a depot); here every vehicle is spaced
 * along its lane at build time (src/world/sim/traffic.ts), so the far view is
 * populated at the first frame: measured, zero steps are needed, and one
 * second is run so the spacing has settled. 60 steps of 1/60 s.
 */
export const WARMUP_SECONDS = 1;
/** The hour at t = 0, so that the first visible frame, after the warm-up, reads 10:00. */
const START_HOUR = 10 - (WARMUP_SECONDS * 24) / DAY;
const ease = (t: number) => t * t * (3 - 2 * t);

export interface Clock {
  /** Simulated seconds since the start. */
  t: number;
  /** Hours added by the skip control; h eases toward goal. */
  shift: { h: number; goal: number };
  hourAt(t: number): number;
  /** "HH:MM" at a simulated time. */
  clock(t: number): string;
  /** 0 by day, 1 by night, easing through dusk (18:30–20:30) and dawn (05:00–07:00). */
  night(): number;
}

const hhmm = (h: number) => { const m = Math.floor(h * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const nightOf = (h: number) => (h < 5 ? 1 : h < 7 ? 1 - ease((h - 5) / 2) : h < 18.5 ? 0 : h < 20.5 ? ease((h - 18.5) / 2) : 1);

export function createClock(): Clock {
  const c: Clock = {
    t: 0,
    shift: { h: 0, goal: 0 },
    hourAt: (t) => (((START_HOUR + (t * 24) / DAY + c.shift.h) % 24) + 24) % 24,
    clock: (t) => hhmm(c.hourAt(t)),
    night: () => nightOf(c.hourAt(c.t)),
  };
  return c;
}
export const kmh = (v: number): string => `${Math.round(v * 3.6)} km/h`;
