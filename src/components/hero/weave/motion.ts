/**
 * The motion of the loose threads (docs/hero-weave-prd.md §2, "Motion").
 * Pure: no DOM, no clock. The render loop (WeaveSvg) asks for a thread's
 * displacement at a time and a distance along it.
 *
 *   offset = A · falloff(s) · sin(2π·t/T + φᵢ + k·s)
 *
 * s is the distance along the loose part, measured from where it enters the
 * weave (s = 0) out toward its free end. falloff is a smoothstep from 0 at
 * the weave entry to 1 at the free end, flat at both ends, so the moving
 * thread meets the still cloth with neither a jump nor a kink: no seam.
 * k·s makes each thread ripple instead of translating as a whole; with k > 0
 * the crests travel toward the weave, as if the thread were being drawn in.
 */

export interface ThreadMotion {
  /** A: the largest displacement, in viewBox units. */
  amplitude: number;
  /** φᵢ: the thread's own phase, in radians. */
  phase: number;
  /** k: spatial frequency, radians per viewBox unit. */
  k: number;
  /** T: seconds per cycle. */
  period: number;
  /** The loose length over which the falloff climbs from 0 to 1. */
  ramp: number;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** 0 at the weave entry (s = 0), 1 from `ramp` on, out to the free end. */
export function falloff(s: number, ramp: number): number {
  return smoothstep(0, ramp, s);
}

/** The thread's displacement across itself at time t (seconds), s units from the weave entry. */
export function displacement(t: number, s: number, thread: ThreadMotion): number {
  const f = falloff(s, thread.ramp);
  if (f === 0) return 0;
  return thread.amplitude * f * Math.sin((2 * Math.PI * t) / thread.period + thread.phase + thread.k * s);
}
