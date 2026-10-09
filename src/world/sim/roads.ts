/**
 * The roads at runtime (PRD v2 §3.6; mega prompt §4 task 3): the layout's road
 * graph turned into lanes a vehicle can drive, shortest paths between any two
 * nodes, and the room-ahead rule that keeps vehicles queued behind each other.
 *
 *   - Every graph edge is two lanes, one per direction, each the centreline
 *     offset to the right of travel by a quarter of the road's width (PRD v2
 *     §3.6: vehicles keep right).
 *   - route(from, to) is Dijkstra over the lanes, cached by the pair of nodes
 *     (and the road a route prefers, for the raw-export trucks); a route is one
 *     Path with rounded corners, its lanes as spans along it, and the
 *     weighbridges it crosses as stops.
 *   - Occupancy: each lane knows which vehicles are on it, so a vehicle finds
 *     the nearest one ahead on its lane and on the next lane of its route, and
 *     slows or waits behind it (v1's room-ahead logic, generalised to a graph).
 *   - Merging: two vehicles bound for one lane from two take turns, the one
 *     nearer the junction first; a vehicle leaving a driveway also gives way to
 *     the road's traffic about to pass; a queue standing past a crossing of
 *     roads is not joined until it moves, so a queue never stands across a
 *     crossing.
 *
 * Nothing here reads a figure or draws anything; it is geometry and order.
 */
import type { GraphEdge, GraphNode, Pt } from '@/world/placement/types';
import { Path } from '../engine/kernel/path';

/** One direction of an edge: the lane a vehicle drives from node `from` to node `to`. */
export interface Lane {
  id: number;
  edge: GraphEdge;
  from: number;
  to: number;
  pts: Pt[];
  length: number;
}

/** A route: its lanes in order, one rounded path through them, where each lane lies along it, and its stops. */
export interface Route {
  key: string;
  from: number;
  to: number;
  lanes: Lane[];
  path: Path;
  /** Where each lane starts and ends along the path. */
  spans: { lane: Lane; s0: number; s1: number }[];
  /** The weighbridges the route crosses (not at its ends): where along the path, and the gate's id. */
  stops: { s: number; gate: string }[];
  length: number;
}

/** What may stand on a lane: anything with a position along a route. */
export interface Occupant { id: string; trip: Route; s: number; len: number; v: number }

export interface Roads {
  nodes: readonly GraphNode[];
  lanes: readonly Lane[];
  /** The shortest route between two nodes, cached; prefer names a road whose lanes cost less (the raw-export road). */
  route(from: number, to: number, prefer?: string): Route | null;
  /** The bays of a lot, as nodes. */
  bays(lotId: string): { despatch: number; receiving: number } | null;
  /** The node of a gate. */
  gateNode(gateId: string): number | null;
  /** How many routes are cached. */
  cached(): number;
  /** Record that an occupant is on a lane, or has left it. */
  enter(lane: Lane, o: Occupant): void;
  leave(lane: Lane, o: Occupant): void;
  /**
   * Free road ahead of an occupant along its route: to the nearest occupant ahead on its lane or the next, else Infinity;
   * that occupant; and, where a moving one ahead overlaps it (two that merged at once), the speed to fall back to.
   */
  roomAhead(o: Occupant, lane: Lane, spanIndex: number, look: number): { room: number; ahead: Occupant | null; slowTo: number };
  /** Every route through a gate, by gate id: how many flows cross it (the gate's card counts them in words). */
  routesThrough(gateId: string): number;
  /** Whom a vehicle leaving a driveway for `next` gives way to: a moving vehicle on the road bound for the same lane, about to reach the junction. */
  giveWay(lane: Lane, next: Lane): Occupant | null;
  /** Who goes first into `next` from another lane: one nearer the junction (or as near, with the lower id), within sight of it. */
  firstIn(o: Occupant, lane: Lane, next: Lane, toEnd: number): Occupant | null;
  /** How many occupants stand on lanes (a test checks nothing is left behind). */
  occupancy(): number;
}

/** The lane offset of a road of a given width: a quarter of it, kept between one and three metres. */
export const laneOffset = (width: number): number => Math.max(1, Math.min(3.2, width / 4));
/** How much a road a route prefers costs per metre, and how much the raw-export road costs everyone else. */
const PREFERRED = 0.35, RAW_EXPORT = 'raw-export', AVOID_RAW = 3;
/** The corner radius of a route's path. */
const CORNER = 6;
/** How near the junction a road vehicle must be for one leaving a driveway to give way to it, in metres. */
const GIVE_WAY = 30;
/** The room past a junction a vehicle needs, beyond its own length, before it crosses (keep the junction clear). */
const BOX = 3;
/** How near a junction two vehicles bound for the same lane take turns, the nearer first, in metres. */
const MERGE_SIGHT = 10;

/** Points shifted to the right of travel (y south: right of heading h is (−sin h, cos h)). */
export function offsetRight(pts: readonly Pt[], off: number): Pt[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    return [p[0] - dy * off, p[1] + dx * off];
  });
}

/** A binary heap of node ids by cost, for Dijkstra. */
class Heap {
  private items: [number, number][] = [];
  get size() { return this.items.length; }
  push(id: number, cost: number) {
    const a = this.items; a.push([cost, id]);
    for (let i = a.length - 1; i > 0;) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop(): [number, number] {
    const a = this.items, top = a[0], last = a.pop()!;
    if (a.length) { a[0] = last; for (let i = 0; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
}

export function createRoads(graph: { nodes: readonly GraphNode[]; edges: readonly GraphEdge[] }): Roads {
  const { nodes, edges } = graph;
  const lanes: Lane[] = [];
  const out = new Map<number, Lane[]>(), into = new Map<number, Lane[]>();
  for (const e of edges) {
    // a driveway's two lanes stand two metres either side of its line, so two trucks pass on it
    const off = e.road.startsWith('driveway:') ? 2 : laneOffset(e.width);
    for (const [from, to, pts] of [[e.a, e.b, e.points], [e.b, e.a, [...e.points].reverse()]] as [number, number, readonly Pt[]][]) {
      const lane: Lane = { id: lanes.length, edge: e, from, to, pts: offsetRight(pts, off), length: e.length };
      lanes.push(lane);
      const list = out.get(from); if (list) list.push(lane); else out.set(from, [lane]);
      const inl = into.get(to); if (inl) inl.push(lane); else into.set(to, [lane]);
    }
  }
  const bayIndex = new Map<string, { despatch: number; receiving: number }>();
  for (const n of nodes) if ((n.kind === 'despatch' || n.kind === 'receiving') && n.ref) { const b = bayIndex.get(n.ref) ?? { despatch: -1, receiving: -1 }; b[n.kind] = n.id; bayIndex.set(n.ref, b); }
  const gates = new Map(nodes.filter((n) => n.kind === 'gate' && n.ref).map((n) => [n.ref!, n.id]));
  const cache = new Map<string, Route | null>();
  const occupants = new Map<number, Set<Occupant>>();

  function shortest(from: number, to: number, prefer?: string): Lane[] | null {
    const cost = new Map<number, number>([[from, 0]]), via = new Map<number, Lane>(), heap = new Heap();
    heap.push(from, 0);
    while (heap.size) {
      const [c, n] = heap.pop();
      if (n === to) break;
      if (c > (cost.get(n) ?? Infinity)) continue;
      for (const lane of out.get(n) ?? []) {
        const road = lane.edge.road, k = prefer && road === prefer ? PREFERRED : road === RAW_EXPORT && prefer !== RAW_EXPORT ? AVOID_RAW : 1;
        const next = c + lane.length * k;
        if (next < (cost.get(lane.to) ?? Infinity)) { cost.set(lane.to, next); via.set(lane.to, lane); heap.push(lane.to, next); }
      }
    }
    if (!via.has(to) && from !== to) return null;
    const list: Lane[] = [];
    for (let n = to; n !== from;) { const lane = via.get(n)!; list.push(lane); n = lane.from; }
    return list.reverse();
  }

  function build(key: string, from: number, to: number, list: Lane[]): Route {
    // the lanes' points end to end; a lane that starts where the last one ended drops its repeated point
    const pts: Pt[] = [], raw: number[] = [];
    let s = 0;
    const spansRaw: { lane: Lane; s0: number; s1: number }[] = [];
    for (const lane of list) {
      const s0 = s;
      for (const p of lane.pts) {
        const q = pts[pts.length - 1];
        if (q) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < 1e-6) continue; s += d; }
        pts.push(p); raw.push(s);
      }
      spansRaw.push({ lane, s0, s1: s });
    }
    const path = new Path(pts.length > 1 ? pts : [pts[0] ?? [0, 0], pts[0] ?? [0, 0]], CORNER, false);
    // the rounded path is a little shorter than the raw polyline; spans and stops are scaled onto it
    const k = s > 0 ? path.length / s : 1;
    const spans = spansRaw.map((x) => ({ lane: x.lane, s0: x.s0 * k, s1: x.s1 * k }));
    const stops: Route['stops'] = [];
    spans.forEach((x, i) => { if (i === 0) return; const n = nodes[x.lane.from]; if (n.kind === 'gate' && n.ref) stops.push({ s: x.s0, gate: n.ref }); });
    return { key, from, to, lanes: list, path, spans, stops, length: path.length };
  }

  return {
    nodes, lanes,
    route(from, to, prefer) {
      const key = `${from}>${to}${prefer ? `:${prefer}` : ''}`;
      if (cache.has(key)) return cache.get(key)!;
      const list = shortest(from, to, prefer);
      const r = list && list.length ? build(key, from, to, list) : null;
      cache.set(key, r);
      return r;
    },
    bays: (lotId) => bayIndex.get(lotId) ?? null,
    gateNode: (gateId) => gates.get(gateId) ?? null,
    cached: () => cache.size,
    enter(lane, o) { let set = occupants.get(lane.id); if (!set) { set = new Set(); occupants.set(lane.id, set); } set.add(o); },
    leave(lane, o) { occupants.get(lane.id)?.delete(o); },
    roomAhead(o, lane, spanIndex, look) {
      let room = Infinity, ahead: Occupant | null = null, slowTo = Infinity;
      const spans = o.trip.spans;
      // every lane of its route within sight, this one first: a vehicle is longer than many lanes (a driveway's join,
      // a gate), so the one ahead may stand two or three lanes on while its tail is still close
      for (let k = spanIndex; k < spans.length; k++) {
        const sp = spans[k];
        if (k > spanIndex && sp.s0 - o.s > look) break;
        const l = k === spanIndex ? lane : sp.lane;
        // only a crossing of roads is kept clear, and only of a queue that stands; where a driveway joins, a queue
        // closes up across it
        const crossing = k > spanIndex && nodes[l.from].kind === 'junction';
        for (const x of occupants.get(l.id) ?? []) {
          if (x === o) continue;
          const xs = x.trip.spans.find((q) => q.lane === l); if (!xs) continue;
          // where its front and its tail are, along this vehicle's route
          const front = sp.s0 + (x.s - xs.s0) - o.s, d = front - x.len;
          if (d > -0.5) {
            // a queue standing past a crossing: wait short of the crossing, unless the whole vehicle fits beyond it
            const r = crossing && x.v < 1 && (x.s - xs.s0) - x.len < o.len + BOX ? sp.s0 - o.s - 1 : d;
            if (r < room) { room = Math.max(0, r); ahead = x; }
            continue;
          }
          // overlapping one that is ahead (its front is, or, side by side, the lower id): wait while it stands, else fall back
          if (front > 0.5 || (front > -0.5 && x.id < o.id)) {
            if (x.v < 1) { room = 0; ahead = x; } else slowTo = Math.min(slowTo, x.v * 0.6);
          }
        }
      }
      return { room, ahead, slowTo };
    },
    giveWay(lane, next) {
      for (const l of into.get(next.from) ?? []) {
        if (l === lane || l.edge.road.startsWith('driveway:')) continue;
        for (const x of occupants.get(l.id) ?? []) {
          if (x.v < 1) continue;
          const i = x.trip.spans.findIndex((sp) => sp.lane === l);
          if (i < 0 || x.trip.spans[i + 1]?.lane !== next) continue;
          // only to one arriving within a few seconds: a vehicle further off leaves room to pull out
          if (x.trip.spans[i].s1 - x.s < Math.min(GIVE_WAY, x.v * 2.5 + 4)) return x;
        }
      }
      return null;
    },
    firstIn(o, lane, next, toEnd) {
      for (const l of into.get(next.from) ?? []) {
        if (l === lane) continue;
        for (const x of occupants.get(l.id) ?? []) {
          const i = x.trip.spans.findIndex((sp) => sp.lane === l);
          if (i < 0 || x.trip.spans[i + 1]?.lane !== next) continue;
          const xe = x.trip.spans[i].s1 - x.s;
          if (xe <= MERGE_SIGHT && (xe < toEnd - 0.5 || (Math.abs(xe - toEnd) <= 0.5 && x.id < o.id))) return x;
        }
      }
      return null;
    },
    occupancy() { let n = 0; for (const set of occupants.values()) n += set.size; return n; },
    routesThrough(gateId) {
      let n = 0;
      for (const r of cache.values()) if (r && r.stops.some((x) => x.gate === gateId)) n++;
      return n;
    },
  };
}
