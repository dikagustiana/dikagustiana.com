/**
 * Follow (PRD v2 §3.10; mega prompt §6 D4): the camera rides along.
 *
 * A story ride mounts the camera on a vehicle leaving the story's first lot
 * and rides it to its customer's bay; there it pauses with the lot's card
 * for four seconds (or until Space), then rides the next hop's vehicle out
 * of that lot, and so on to the last lot, where it ends with the story's
 * card. A hop no vehicle carries (electricity, a service, money running
 * upstream) is glided along its route instead. A single vehicle (F, or its
 * card's Follow) is ridden to its bay and its customer's card shown. Escape
 * or any drag lets go.
 *
 * A ride takes 60–90 seconds: while the camera rides, the simulation runs
 * faster (the world's traffic in time-lapse, its clock at its own pace), at
 * the rate that fits what remains of the story into what remains of the
 * time, read again every frame, so a vehicle waiting in a queue speeds the
 * world up rather than the ride down. A vehicle that cannot move on (a
 * queue that does not clear) is left where it stands, and the camera
 * glides the rest of its way to the bay. Pure state:
 * the engine gives it what it needs (sending a vehicle, the routes, the
 * lots, selecting, the camera) and calls update() with each frame's time.
 */
import type { Pt } from '@/world/placement/types';
import type { ChainStory } from './chain';
import type { FollowReading } from './types';

export type { FollowReading };

/** How long a story ride aims to take, and how long the camera pauses at a bay, in seconds of the frame's clock. */
export const FOLLOW_TARGET = 75, FOLLOW_STOP = 4;
/** The fastest the world runs while riding; the speed a glide runs at, in metres per simulated second; the camera's zoom. */
const MAX_SCALE = 10, GLIDE_SPEED = 12, FOLLOW_ZOOM = 3;
/** A ridden vehicle that has not moved for this many seconds of the frame's clock is left, and its way glided to the bay. */
const STUCK = 5;

export type FollowMode = FollowReading['mode'];

/** What Follow needs of a vehicle (sim/flows.ts Vehicle). */
export interface Rideable {
  id: string; x: number; y: number; s: number; state: string; leg: string; trip: { length: number };
  facts?(): Record<string, string | number>;
  /** Its trip's path, for the camera to glide the rest of its way when it cannot move on. */
  route?(): { path?: { at(s: number): { x: number; y: number }; length: number } } | null;
}
export interface FollowDeps {
  /** Send a flow's vehicle now from a lot; null when the flow does not exist or cannot send. */
  send(key: string, fromLot: string | null): Rideable | null;
  /** A live vehicle by id; null once it is gone. */
  vehicle(id: string): Rideable | null;
  /** A link's routes (supplier lot to customer lot). */
  routesOf(from: string, to: string): readonly { from: string; to: string; pts: readonly Pt[]; length?: number }[];
  /** The ground centre of a lot. */
  centreOf(lot: string): Pt | null;
  select(id: string | null): void;
  camera(target: (() => readonly [number, number] | null) | null, zoom?: number): void;
  emit(r: FollowReading | null): void;
}
export interface Follow {
  /** Ride a story from its first lot, or a single vehicle to its bay; false when there is nothing to ride. */
  start(t: { story: ChainStory } | { vehicle: string }): boolean;
  stop(): void;
  /** Space at a stop: go on at once. */
  next(): void;
  /** One frame of dt seconds of the frame's clock (not the world's). */
  update(dt: number): void;
  /** How many simulated seconds the world runs for each second of the frame's clock now. */
  scale(): number;
  active(): boolean;
  reading(): FollowReading | null;
}

interface Hop { a: string; b: string; key: string; up: boolean; ride: boolean }

export function createFollow(d: FollowDeps): Follow {
  let story: ChainStory | null = null, hops: Hop[] = [];
  let mode: FollowMode | null = null, hop = 0, elapsed = 0, timer = 0, rate = 1, ridden = 0, fit = 1.3, stuck = 0, lastS = 0;
  /** A single vehicle followed on its way back empty: its ride ends at its supplier's lot. */
  let homeward = false;
  let vehicle: Rideable | null = null, lot: string | null = null, from: string | null = null;
  /** A glide along a polyline; `rest` when it carries on a ride whose vehicle could not, from `base` of the hop. */
  let glide: { pts: readonly Pt[]; cum: number[]; len: number; s: number; end: string; rest?: boolean; base?: number } | null = null;
  let lastEmit = -1;

  const reading = (): FollowReading | null => {
    if (!mode) return null;
    const n = story ? hops.length : 1;
    const within = mode === 'ride' && vehicle ? Math.min(1, vehicle.s / Math.max(1, vehicle.trip.length)) : mode === 'glide' && glide ? (glide.base ?? 0) + (1 - (glide.base ?? 0)) * (glide.s / Math.max(1, glide.len)) : mode === 'stop' || mode === 'end' ? 1 : 0;
    return { mode, story: story?.id ?? null, hop, hops: n, vehicle: vehicle?.id ?? null, lot, progress: Math.min(1, (hop + within) / n), elapsed };
  };
  const emit = (force = false) => { if (force || elapsed - lastEmit >= 0.5) { lastEmit = elapsed; d.emit(reading()); } };

  /** The polyline point at s metres along. */
  const at = (g: NonNullable<typeof glide>, s: number): [number, number] => {
    let i = 1; while (i < g.cum.length - 1 && g.cum[i] < s) i++;
    const a = g.pts[i - 1], b = g.pts[i], k = (s - g.cum[i - 1]) / Math.max(1e-6, g.cum[i] - g.cum[i - 1]);
    return [a[0] + (b[0] - a[0]) * Math.min(1, Math.max(0, k)), a[1] + (b[1] - a[1]) * Math.min(1, Math.max(0, k))];
  };
  /** The route a hop's goods (or its money) take out of the lot the ride stands at. */
  const routeOf = (h: Hop) => {
    const rs = h.up ? d.routesOf(h.b, h.a) : d.routesOf(h.a, h.b);
    const pick = rs.find((r) => (h.up ? r.to : r.from) === from) ?? rs[0];
    if (!pick) return null;
    const pts = h.up ? [...pick.pts].reverse() : pick.pts;
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1], end: h.up ? pick.from : pick.to };
  };
  /** Simulated seconds a hop is expected to take (a ridden one by what the rides so far took against their estimates). */
  const estimates: number[] = [];
  const estimate = (i: number) => { const h = hops[i], r = routeOf(h); return ((r ? r.len : 400) / GLIDE_SPEED) * (h.ride ? fit : 1); };
  /**
   * The world's rate now: what remains of the story (the rest of this hop, the hops after it) into what remains of the
   * time (every bay still to come keeps its four seconds), never slower than the clock.
   */
  function pace(dt: number) {
    if (!story) { rate = 1; return; }
    const rest = mode === 'glide' && glide ? (glide.len - glide.s) / GLIDE_SPEED : vehicle ? (Math.max(0, vehicle.trip.length - vehicle.s) / GLIDE_SPEED) * fit : 0;
    let sim = rest; for (let i = hop + 1; i < hops.length; i++) sim += estimates[i];
    const left = FOLLOW_TARGET - elapsed - FOLLOW_STOP * (hops.length - hop);
    const want = Math.min(MAX_SCALE, Math.max(1, sim / Math.max(3, left)));
    rate += (want - rate) * Math.min(1, dt * 2);
  }

  function begin(i: number) {
    hop = i; vehicle = null; glide = null; lot = null; ridden = 0; stuck = 0;
    const h = hops[i];
    for (let j = i; j < hops.length; j++) estimates[j] = estimate(j);
    const v = h.ride ? d.send(h.key, from) : null;
    if (v) {
      mode = 'ride'; vehicle = v; lastS = v.s;
      d.camera(() => { const x = vehicle ? d.vehicle(vehicle.id) : null; return x ? [x.x, x.y] : null; }, FOLLOW_ZOOM);
    } else {
      const r = routeOf(h);
      if (!r) { const ls = d.routesOf(h.a, h.b); arrive(ls[0]?.to ?? h.b); return; }
      mode = 'glide'; glide = { ...r, s: 0 };
      d.camera(() => (glide ? at(glide, glide.s) : null), FOLLOW_ZOOM);
    }
    // the reading first, so whoever listens knows the ride is on before the last stop's card closes
    emit(true);
    d.select(null);
  }
  /** At a lot: its card for four seconds, then on (or the end). */
  function arrive(at: string) {
    // learn how much longer than its length at cruising speed a ride takes (queues, the weighbridge, the turns)
    if (story && (mode === 'ride' || glide?.rest) && ridden > 0) fit = Math.max(0.6, Math.min(4, (fit + ridden / Math.max(1, estimates[hop] / fit)) / 2));
    lot = at; from = at; vehicle = null; glide = null;
    const c = d.centreOf(at);
    d.camera(c ? () => c : null);
    d.select(at);
    mode = 'stop'; timer = FOLLOW_STOP; rate = 1;
    emit(true);
  }
  function finish() {
    mode = 'end'; rate = 1; vehicle = null; glide = null;
    d.camera(null);
    // a story ends with its own card (the shell shows it when nothing is selected); a single ride with its customer's
    if (story) d.select(null);
    emit(true);
  }

  return {
    start(t) {
      this.stop();
      if ('story' in t) {
        story = t.story;
        hops = t.story.hops.slice(1).map((b, i) => {
          const a = t.story.hops[i], up = t.story.direction === 'upstream';
          return { a, b, key: up ? `${b}>${a}` : `${a}>${b}`, up, ride: !up && t.story.goods[i] !== 'none' };
        });
        if (!hops.length) { story = null; return false; }
        elapsed = 0; lastEmit = -1; fit = 1.3; from = null;
        begin(0);
        return true;
      }
      const v = d.vehicle(t.vehicle); if (!v) return false;
      story = null; hops = []; elapsed = 0; lastEmit = -1; hop = 0; homeward = v.leg === 'back';
      mode = 'ride'; vehicle = v; rate = 1; ridden = 0; stuck = 0; lastS = v.s;
      d.camera(() => { const x = vehicle ? d.vehicle(vehicle.id) : null; return x ? [x.x, x.y] : null; }, FOLLOW_ZOOM);
      emit(true);
      return true;
    },
    stop() {
      const was = mode !== null;
      mode = null; story = null; hops = []; vehicle = null; glide = null; lot = null; rate = 1; homeward = false;
      if (was) { d.camera(null); d.emit(null); }
    },
    next() { if (mode === 'stop') timer = 0; },
    update(dt) {
      if (!mode || mode === 'end') return;
      elapsed += dt;
      if (mode === 'ride' || mode === 'glide') pace(dt);
      if (mode === 'ride' && vehicle) {
        ridden += dt * rate;
        const v = d.vehicle(vehicle.id);
        // at the customer's bay (unloading, or already turned back), or gone: the stop; one followed home stops at its supplier
        const there = homeward ? !v || v.s >= v.trip.length - 1 : !v || v.state === 'unloading' || v.leg === 'back';
        const facts = v?.facts?.() ?? vehicle.facts?.();
        const to = String((homeward ? facts?.from : facts?.to) ?? '');
        if (there || !v) { if (to) arrive(to); else finish(); return; }
        stuck = v.s - lastS > 0.2 ? 0 : stuck + dt; lastS = v.s;
        const path = stuck > STUCK ? v.route?.()?.path : null;
        if (path && to) {
          // it cannot move on: leave it where it stands and glide the rest of its way to the bay
          const pts: Pt[] = []; for (let s = v.s; s < path.length; s += 4) { const p = path.at(s); pts.push([p.x, p.y]); }
          const e = path.at(path.length); pts.push([e.x, e.y]);
          const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
          glide = { pts, cum, len: cum[cum.length - 1], s: 0, end: to, rest: true, base: Math.min(1, v.s / Math.max(1, v.trip.length)) };
          mode = 'glide'; vehicle = null;
          d.camera(() => (glide ? at(glide, glide.s) : null));
          emit(true);
        }
      } else if (mode === 'glide' && glide) {
        ridden += dt * rate;
        glide.s = Math.min(glide.len, glide.s + dt * rate * GLIDE_SPEED);
        if (glide.s >= glide.len) arrive(glide.end);
      } else if (mode === 'stop') {
        timer -= dt;
        if (timer <= 0) { if (story && hop + 1 < hops.length) begin(hop + 1); else finish(); return; }
      }
      emit();
    },
    scale: () => (mode === 'ride' || mode === 'glide' ? rate : 1),
    active: () => mode !== null && mode !== 'end',
    reading,
  };
}
