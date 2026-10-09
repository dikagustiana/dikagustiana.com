// Original to this repository (Kawasan Industri world engine, fallback kernel).
/**
 * Simulated time. The simulation advances in fixed steps of STEP seconds
 * whatever the frame rate, so a seed and a number of steps always give the
 * same world. A simulated day lasts DAY seconds and starts at 10:00; the
 * debug API can skip hours forward (shift.goal), and the frame loop eases
 * shift.h toward that goal so the light changes smoothly.
 */

/** One simulation step, in simulated seconds. */
export const STEP = 1 / 60;
/** Simulated seconds in one day: six minutes (PRD v2 §3.8). */
export const DAY = 360;
/** Simulated seconds run before the first frame. Vehicles start spaced along their lanes, so one second is enough. */
export const WARMUP_SECONDS = 1;
/** The hour the world opens at. */
const OPENING_HOUR = 10;

export interface Clock {
  /** Simulated seconds since the world was made. */
  t: number;
  /** Hours skipped forward by hand: h eases toward goal. */
  shift: { h: number; goal: number };
  /** The hour of the day at simulated time t, in [0, 24). */
  hourAt(t: number): number;
  /** The time of day at t, as HH:MM. */
  clock(t: number): string;
  /** How dark it is now: 0 by day, 1 in the middle of the night, a ramp at dusk and dawn. */
  night(): number;
}

const ramp = (lo: number, hi: number, v: number) => { const x = Math.max(0, Math.min(1, (v - lo) / (hi - lo))); return x * x * (3 - 2 * x); };

export function createClock(): Clock {
  const clock: Clock = {
    t: 0,
    shift: { h: 0, goal: 0 },
    hourAt(t) { const h = OPENING_HOUR + (t / DAY) * 24 + clock.shift.h; return ((h % 24) + 24) % 24; },
    clock(t) {
      const minutes = Math.floor(clock.hourAt(t) * 60) % (24 * 60);
      const hh = Math.floor(minutes / 60), mm = minutes % 60;
      return `${hh < 10 ? '0' : ''}${hh}:${mm < 10 ? '0' : ''}${mm}`;
    },
    night() {
      const h = clock.hourAt(clock.t);
      // dusk from 18:00 to 20:00, dawn from 05:00 to 07:00
      return h >= 12 ? ramp(18, 20, h) : 1 - ramp(5, 7, h);
    },
  };
  return clock;
}
