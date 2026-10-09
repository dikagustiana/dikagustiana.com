/**
 * Flows (PRD v2 §3.6, D-V2-5; mega prompt §4 task 5): goods leave a supplier
 * and arrive at a customer along the registry's links, on the layout's road
 * graph. This replaces v1's traffic, whose vehicles looped on generic lanes
 * carrying "goods" from nowhere to nowhere.
 *
 *   - Every link whose goods move (Appendix A) is a flow: a vehicle of the kind
 *     its goods call for leaves the supplier's lot from its despatch bay, drives
 *     the shortest route, stops laden at every weighbridge it crosses (1.5 s),
 *     unloads at the customer's receiving bay (2 s), drives back empty in a
 *     lighter tone, not stopping, and is gone at home. Where a sub-industry has two companies, the
 *     flow alternates between them, at both ends. A link whose supplier or
 *     customer is not placed runs from or to the container quay (an import or
 *     an export).
 *   - A flow sends one vehicle every 30 simulated seconds while expected, every
 *     18 s when a published package measures it light and every 10 s heavy
 *     (setFlows); a phone sends half as many. Live vehicles are capped at 300
 *     (120 on a phone); at the cap, spawning waits; a queue of five at a
 *     flow's bay holds that flow until it clears.
 *   - The six returns of the chain file run as flows of their own, in the loop
 *     vehicle's tone, labelled by the return. Raw ore and coal run from the
 *     geological arc's pits along the dashed raw-export road to the bulk quay,
 *     where a ship loads and leaves and another comes; imports arrive by
 *     container ship and leave the container quay by truck. A shuttle train
 *     runs between the rail yard and the port; the quay's crane works.
 *   - With the credit layer on, a coin rides every laden route the other way,
 *     the payment against the goods, with v1's money dashes; walkers keep the
 *     town's pavements and the think tank's terrace at the street band.
 *
 * Motion is illustrative. No cadence, speed or count is ever shown as a
 * number (the gate's card counts its flows in words); every vehicle's card
 * says "Illustrative traffic; see the model for figures". All randomness is
 * the instance's seeded generator, and the fleet starts spread along its
 * routes, so the first frame is already full.
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { RETURNS } from '@/data/industryChain';
import { subIndustryByCode } from '@/lib/world/registry/subindustries.generated';
import type { Link } from '@/lib/world/registry/types';
import type { FlowClass, FlowWeight } from '@/world/data/types';
import type { Block, GeneratedLayout, Lot, Pt, RegionId } from '@/world/placement/types';
import type { EngineContext } from '../engine/context';
import { W } from '../engine/kernel/iso';
import { Part, pose } from '../engine/kernel/part';
import { Path } from '../engine/kernel/path';
import type { Entity, EntityInfo, EntityRoute, LayerName } from '../engine/types';
import { TRAFFIC_LINE } from '../world/build';
import { createRoads, laneOffset, offsetRight, type Roads, type Route } from './roads';
import { createFleet, kindFor, VEHICLE_LABEL, VEHICLE_LENGTH, VEHICLE_SPEED, type Fleet, type FleetKind, type FleetMember, type VehicleKind } from './vehicles';

/** Seconds between vehicles on one flow, by its class (PRD v2 §3.6). */
export const CADENCE: Record<FlowClass, number> = { expected: 30, 'measured-light': 18, 'measured-heavy': 10 };
/** Live vehicles at most: a laptop's and a phone's (PRD v2 §3.6, §6). */
export const CAP = { laptop: 300, phone: 120 } as const;
/** How long a vehicle stands at a weighbridge, and unloading at a bay, in simulated seconds. */
export const WEIGH = 1.5, UNLOAD = 2;
/** A flow waits while this many of its vehicles queue at its customer's bay, or this many stand on one lane of its way. */
export const QUEUE_HOLD = 5, LANE_HOLD = 3;
/** No vehicle is sent while more than this share of the fleet stands in queues: the roads clear before more join them. */
export const JAM_HOLD = 0.15;
/** The cadence of the returns, the raw-export trucks and the import trucks: slower than a link's. */
const SIDE_CADENCE = 45;
/** Speed on a driveway, the gap a vehicle keeps to the one ahead, and how near the end of its lane a vehicle looks at the junction, in metres. */
const DRIVEWAY_SPEED = 5, GAP = 3, LOOK_OUT = 10;
/** A vehicle held this long by a ring of vehicles each waiting on the next (a knot at a junction) drives through for a moment. */
const STUCK = 8, UNSTICK = 3;

/** Where each return of the chain file runs (PRD v2 §3.6): its first lot's sub-industry and its last's. */
export const RETURN_ENDS: Record<string, readonly [string, string]> = {
  'return-scrap': ['E121', 'B144'],
  'return-commercial': ['E731', 'E711'],
  'return-packaging': ['D113', 'B131'],
  'return-postconsumer-material': ['C222', 'B111'],
  'return-postconsumer-organic': ['C222', 'D232'],
  'return-secondary': ['E522', 'E742'],
};
/** The pits whose output leaves by the raw-export road, the bulk quay, the container quay and where imports go. */
export const RAW_PITS = ['A121', 'B142', 'B146'], BULK_QUAY = 'J113', CONTAINER_QUAY = 'K121', IMPORT_TO = ['C211', 'E711'];

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
/** A number of things in words, for a card (no count is shown as a figure). */
export function countInWords(n: number): string {
  return n <= 20 ? NUMBER_WORDS[Math.max(0, Math.floor(n))] : 'more than twenty';
}

/** A flow: what it carries, between which lots, in which vehicle, how often. */
export interface Flow {
  id: string;
  kind: VehicleKind;
  /** What the cards and the label call the load: the link's note, or the return's label. */
  load: string;
  link: Link | null;
  /** The register's link key, `from>to`, or the return's or side flow's id. */
  key: string;
  origins: Lot[];
  destinations: Lot[];
  /** A road the flow's routes prefer (the raw-export trucks'). */
  prefer?: string;
  cadence: number;
  /** Simulated seconds since it last sent a vehicle. */
  t: number;
  sent: number;
  live: number;
  layer: 'goods' | 'cold' | 'loops';
  /** The lanes its vehicles drive laden, and the gates they weigh at: a queue standing on any of them holds the flow. */
  lanes: number[];
  gates: string[];
}

type State = 'out' | 'weighing' | 'unloading' | 'back';
const STATE_WORD: Record<State, string> = { out: 'on its way', weighing: 'at the weighbridge', unloading: 'unloading', back: 'returning empty' };
const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** What a vehicle asks of its flows for its card: names, the link's class, and selecting an end. */
export interface VehicleHost {
  nameOf(lot: Lot): string;
  describe(lot: Lot): string;
  lotEntityId(lot: Lot): string;
  classOf(link: Link): FlowClass;
  select(lot: Lot): void;
}

/** A goods vehicle on a flow: an entity a click on its instance finds. */
export class Vehicle implements Entity {
  readonly kind = 'vehicle';
  readonly moves = true;
  readonly id: string;
  readonly groups: THREE.Object3D[];
  readonly pick = [0, 0, 2.2] as const;
  readonly member: FleetMember;
  /** The leg it is driving: out laden to the customer, or back empty. */
  trip: Route;
  leg: 'out' | 'back' = 'out';
  state: State = 'out';
  s = 0; v = 0; span = 0; stop = 0; timer = 0; held = 0; through = 0;
  /** What it waits behind, if anything: the occupant nearest ahead. */
  ahead: { trip: Route } | null = null;
  x = 0; y = 0; h = 0;
  constructor(id: string, readonly flow: Flow, readonly origin: Lot, readonly dest: Lot, trip: Route, readonly proxy: THREE.Object3D, private readonly host: VehicleHost) {
    this.id = id; this.trip = trip; this.groups = [this.proxy];
    this.member = { fleetKind: this.flow.kind, slot: -1, entity: this };
    this.proxy.userData.entity = this;
  }
  get vkind(): VehicleKind { return this.flow.kind; }
  get len(): number { return VEHICLE_LENGTH[this.flow.kind]; }
  get laden(): boolean { return this.leg === 'out'; }
  private status(): string { return this.v < 0.1 && (this.state === 'out' || this.state === 'back') ? 'waiting' : STATE_WORD[this.state]; }
  private linkState(): string {
    const l = this.flow.link;
    if (!l) return 'a return or a port call, not a link of the register';
    return l.state === 'measured' || this.host.classOf(l) !== 'expected' ? 'measured by a published model' : 'expected, not measured';
  }
  info(): EntityInfo {
    return {
      kind: VEHICLE_LABEL[this.vkind], title: capital(this.flow.load), status: this.status(),
      rows: [
        ['Load', this.laden ? capital(this.flow.load) : 'Nothing: returning empty'],
        ['From', this.host.describe(this.origin)], ['To', this.host.describe(this.dest)],
        ['Link', capital(this.linkState())], ['Traffic', TRAFFIC_LINE],
      ],
      actions: [['Open the supplier', () => this.host.select(this.origin)], ['Open the customer', () => this.host.select(this.dest)]],
    };
  }
  label(): string { return `${capital(this.flow.load)} · from ${this.host.nameOf(this.origin)} to ${this.host.nameOf(this.dest)}`; }
  readout(): string { return `${this.label()} · ${this.status()}`; }
  route(): EntityRoute { return { path: this.trip.path, s: this.s, closed: false }; }
  facts(): Record<string, string | number> {
    return { from: this.host.lotEntityId(this.origin), to: this.host.lotEntityId(this.dest), load: this.flow.load, link: this.flow.key, kind: this.vkind, len: Math.round(this.len * 10) / 10, state: this.state, leg: this.leg, road: this.trip.spans[this.span]?.lane.edge.road ?? '', speed: Math.round(this.v * 10) / 10, x: Math.round(this.x * 10) / 10, y: Math.round(this.y * 10) / 10 };
  }
  /** The box round it where it stands, for the selection's frame and the hover's outline. */
  extent(): THREE.Box3 { const r = this.len * 0.6; return new THREE.Box3(W(this.x - r, this.y - r, 0), W(this.x + r, this.y + r, 4.5)); }
}

/** One of the movers that are not vehicles on flows: ships, the train, walkers. */
class Mover implements Entity {
  readonly moves = true;
  readonly groups: THREE.Object3D[];
  readonly pick: readonly [number, number, number];
  isPerson?: boolean;
  constructor(readonly kind: string, readonly id: string, group: THREE.Object3D, private readonly card: () => EntityInfo, private readonly text: () => string, pick: readonly [number, number, number] = [0, 0, 2]) {
    this.groups = [group]; group.userData.entity = this; this.pick = pick;
  }
  info(): EntityInfo { return this.card(); }
  label(): string { return this.text(); }
  readout(): string { return this.text(); }
}

export interface FlowSystem {
  update(dt: number): void;
  setLayer(name: LayerName, on: boolean): void;
  setFlows(flows: readonly FlowWeight[]): void;
  setDetail(tiny: boolean, far: boolean): void;
  vehicles(): Vehicle[];
  flows(): Flow[];
  roads: Roads;
  /** How many flows cross a gate (its card counts them in words). */
  flowsThrough(gateId: string): number;
  live(): number;
  cap(): number;
  dispose(): void;
}

export function createFlows(ctx: EngineContext, layout: GeneratedLayout, links: readonly Link[], o: { phone: boolean }): FlowSystem {
  const { scene, rng, theme } = ctx;
  const root = new THREE.Group(); root.name = 'flows'; scene.add(root);
  const groups = { goods: new THREE.Group(), cold: new THREE.Group(), loops: new THREE.Group(), coins: new THREE.Group(), walkers: new THREE.Group(), port: new THREE.Group() };
  for (const [name, g] of Object.entries(groups)) { g.name = name; root.add(g); }
  groups.cold.visible = false; groups.coins.visible = false;
  const roads = createRoads(layout.graph ?? { nodes: [], edges: [] });
  const cap = o.phone ? CAP.phone : CAP.laptop, slow = o.phone ? 2 : 1;
  const parents: Record<FleetKind, THREE.Group> = { dump: groups.goods, hopper: groups.goods, tanker: groups.goods, reefer: groups.cold, box: groups.goods, container: groups.goods, van: groups.goods, bus: groups.goods, loop: groups.loops, walker: groups.walkers, coin: groups.coins };
  const fleet: Fleet = createFleet(ctx, parents, { dump: cap, hopper: cap, tanker: cap, reefer: cap, box: cap, container: cap, van: cap, bus: cap, loop: cap, walker: 80, coin: cap });

  // ---- the lots, by sub-industry: those with a company (a flow alternates between them), else the first ----
  const blocks = new Map<string, Block>(layout.blocks.map((b) => [b.code, b]));
  const regionOf = (code: string): RegionId | null => blocks.get(code)?.region ?? null;
  const lotsOf = (code: string): Lot[] => {
    const b = blocks.get(code), s = subIndustryByCode(code); if (!b) return [];
    const named = b.lots.filter((_, i) => !!s?.companies[i]);
    return (named.length ? named : b.lots.slice(0, 1)).filter((l) => roads.bays(l.id));
  };
  const tickerOf = new Map<string, string>(), lotCode = new Map<string, string>();
  for (const b of layout.blocks) { const s = subIndustryByCode(b.code); b.lots.forEach((l, i) => { lotCode.set(l.id, b.code); const c = s?.companies[i]; if (c) tickerOf.set(l.id, c.ticker); }); }

  // ---- what a vehicle's card asks: names, the class the boundary gave its link, selecting an end ----
  const classes = new Map<string, FlowClass>();
  let lotIndex: Map<string, Entity> | null = null;
  const host: VehicleHost = {
    nameOf: (lot) => tickerOf.get(lot.id) ?? subIndustryByCode(lotCode.get(lot.id) ?? '')?.nameEn ?? lot.id,
    describe: (lot) => { const t = tickerOf.get(lot.id), n = subIndustryByCode(lotCode.get(lot.id) ?? '')?.nameEn ?? lot.id; return t ? `${t} · ${n}` : n; },
    lotEntityId: (lot) => tickerOf.get(lot.id) ?? lot.id,
    classOf: (link) => classes.get(`${link.from}>${link.to}`) ?? 'expected',
    select: (lot) => {
      lotIndex ??= new Map(ctx.entities.filter((e) => e.kind === 'company').map((e) => [(e as Entity & { lot?: Lot }).lot?.id ?? '', e]));
      const e = lotIndex.get(lot.id); if (e) ctx.hooks.select(e);
    },
  };

  // ---- the flows: every link whose goods move, the six returns, the raw export and the imports ----
  const flows: Flow[] = [];
  const quay = lotsOf(CONTAINER_QUAY);
  const flow = (f: Omit<Flow, 't' | 'sent' | 'live' | 'cadence' | 'lanes' | 'gates'> & { cadence?: number }) => {
    if (!f.origins.length || !f.destinations.length || (f.origins.length === 1 && f.destinations.length === 1 && f.origins[0] === f.destinations[0])) return;
    const cadence = (f.cadence ?? CADENCE.expected) * slow;
    const lanes = new Set<number>(), gates = new Set<string>();
    for (const a of f.origins) for (const b of f.destinations) {
      const ba = roads.bays(a.id), bb = roads.bays(b.id); if (!ba || !bb || a === b) continue;
      const r = roads.route(ba.despatch, bb.receiving, f.prefer);
      for (const l of r?.lanes ?? []) lanes.add(l.id);
      for (const x of r?.stops ?? []) gates.add(x.gate);
    }
    flows.push({ ...f, cadence, t: rng.rand(0, cadence), sent: 0, live: 0, lanes: [...lanes], gates: [...gates] });
  };
  for (const l of links) {
    const kind = kindFor(l.goods, regionOf(l.from), regionOf(l.to)); if (!kind) continue;
    // an unplaced end is the port: an import arrives at the container quay, an export leaves from it
    const origins = lotsOf(l.from), destinations = lotsOf(l.to);
    flow({ id: `${l.from}>${l.to}`, key: `${l.from}>${l.to}`, kind, load: l.note ?? `${l.goods} goods`, link: l, origins: origins.length ? origins : quay, destinations: destinations.length ? destinations : quay, layer: kind === 'reefer' ? 'cold' : 'goods' });
  }
  for (const r of RETURNS) { const ends = RETURN_ENDS[r.id]; if (ends) flow({ id: r.id, key: r.id, kind: 'loop', load: r.label, link: null, origins: lotsOf(ends[0]), destinations: lotsOf(ends[1]), layer: 'loops', cadence: SIDE_CADENCE }); }
  for (const code of RAW_PITS) flow({ id: `raw-export:${code}`, key: `raw-export:${code}`, kind: 'dump', load: 'raw ore and coal for export', link: null, origins: lotsOf(code), destinations: lotsOf(BULK_QUAY), prefer: 'raw-export', layer: 'goods', cadence: SIDE_CADENCE });
  for (const code of IMPORT_TO) flow({ id: `import:${code}`, key: `import:${code}`, kind: 'container', load: 'imported goods off the container ship', link: null, origins: quay, destinations: lotsOf(code), layer: 'goods', cadence: SIDE_CADENCE });

  // ---- the vehicles ----
  const live: Vehicle[] = [];
  let seq = 0;
  function tripFor(from: Lot, to: Lot, f: Flow, leg: 'out' | 'back'): Route | null {
    const a = roads.bays(from.id), b = roads.bays(to.id); if (!a || !b) return null;
    return leg === 'back' ? roads.route(b.receiving, a.despatch, f.prefer) : roads.route(a.despatch, b.receiving, f.prefer);
  }
  const enterSpan = (v: Vehicle) => { const sp = v.trip.spans[v.span]; if (sp) roads.enter(sp.lane, v); };
  const leaveSpan = (v: Vehicle) => { const sp = v.trip.spans[v.span]; if (sp) roads.leave(sp.lane, v); };
  /**
   * Where a vehicle starts a trip: its tail at the lot's door (or where it turned round at the bay), its front on the
   * driveway short of the road, so it joins the road by giving way rather than appearing on it.
   */
  const tailAt = (v: Vehicle) => { const road = v.trip.spans.find((sp) => !sp.lane.edge.road.startsWith('driveway:'))?.s0 ?? v.trip.length; return Math.max(0, Math.min(v.len, road - 1, v.trip.length * 0.5)); };
  const spanAt = (r: Route, s: number) => Math.max(0, r.spans.findIndex((sp) => s <= sp.s1));
  /** Send a flow's next vehicle; `phase` seconds into its cycle for the fleet the world starts with. */
  function spawn(f: Flow, phase = 0): Vehicle | null {
    const k = f.sent++;
    const origin = f.origins[k % f.origins.length], dest = f.destinations[Math.floor(k / f.origins.length) % f.destinations.length];
    if (origin === dest) return null;
    const out = tripFor(origin, dest, f, 'out'); if (!out) return null;
    const proxy = new THREE.Object3D(); proxy.name = 'vehicle'; parents[f.kind].add(proxy);
    const v = new Vehicle(`V-${String(++seq).padStart(4, '0')}`, f, origin, dest, out, proxy, host);
    fleet.add(v.member);
    if (v.member.slot < 0) { proxy.removeFromParent(); return null; }
    live.push(v); f.live++; ctx.entities.push(v);
    if (phase > 0) advanceTo(v, phase); else { v.s = tailAt(v); v.span = spanAt(v.trip, v.s); v.stop = nextStop(v.trip, v.s, 'out'); }
    enterSpan(v); placeVehicle(v);
    return v;
  }
  function despawn(v: Vehicle) {
    leaveSpan(v); fleet.remove(v.member); v.proxy.removeFromParent();
    const i = live.indexOf(v); if (i >= 0) live.splice(i, 1);
    const j = ctx.entities.indexOf(v); if (j >= 0) ctx.entities.splice(j, 1);
    v.flow.live--; ctx.hooks.forget(v);
  }
  // only a laden vehicle weighs (PRD v2 §3.6: the vehicle's life stops at the weighbridges on the way out); an empty one drives on
  const nextStop = (r: Route, s: number, leg: 'out' | 'back') => { if (leg === 'back') return r.stops.length; const i = r.stops.findIndex((x) => x.s > s); return i < 0 ? r.stops.length : i; };
  /** Stand a vehicle where it would be `t` seconds into its cycle, ignoring other traffic. */
  function advanceTo(v: Vehicle, t: number) {
    const speed = VEHICLE_SPEED[v.vkind], outT = v.trip.length / speed + v.trip.stops.length * WEIGH;
    if (t < outT) { v.s = Math.min(v.trip.length - 1, tailAt(v) + t * speed); v.stop = nextStop(v.trip, v.s, 'out'); v.v = speed; }
    else if (t < outT + UNLOAD) { v.s = v.trip.length; v.state = 'unloading'; v.timer = outT + UNLOAD - t; v.stop = v.trip.stops.length; }
    else {
      const back = tripFor(v.origin, v.dest, v.flow, 'back'); if (!back) return;
      v.trip = back; v.leg = 'back'; v.state = 'back'; v.s = Math.min(back.length - 1, tailAt(v) + (t - outT - UNLOAD) * speed); v.stop = nextStop(back, v.s, 'back'); v.v = speed;
    }
    v.span = spanAt(v.trip, v.s);
  }
  function placeVehicle(v: Vehicle) {
    const p = v.trip.path.at(v.s);
    v.x = p.x; v.y = p.y; v.h = p.h;
    pose(v.proxy, p.x, p.y, p.h);
    // empty on the way back: a lighter tone (PRD v2 §3.6)
    fleet.place(v.member, p.x, p.y, p.h, 0, v.laden ? 1 : 1.18);
  }
  /** Whether following what each vehicle waits behind comes back to this one. */
  function knotted(v: Vehicle): boolean {
    let x: unknown = v.ahead;
    for (let k = 0; k < 64 && x instanceof Vehicle; k++) { if (x === v) return true; if (x.state !== 'out' && x.state !== 'back') return false; if (x.v > 0.1) return false; x = x.ahead; }
    return false;
  }
  function step(v: Vehicle, dt: number): boolean {
    if (v.state === 'weighing' || v.state === 'unloading') {
      v.v = 0; v.timer -= dt;
      if (v.timer > 0) return true;
      if (v.state === 'weighing') v.state = v.leg;
      else {
        // unloaded: back the way it came, empty
        const back = tripFor(v.origin, v.dest, v.flow, 'back');
        if (!back) { despawn(v); return false; }
        leaveSpan(v); v.trip = back; v.leg = 'back'; v.state = 'back'; v.s = tailAt(v); v.span = spanAt(back, v.s); v.stop = nextStop(back, v.s, 'back'); enterSpan(v);
      }
    }
    const sp = v.trip.spans[v.span];
    const cruise = sp && sp.lane.edge.road.startsWith('driveway:') ? DRIVEWAY_SPEED : VEHICLE_SPEED[v.vkind];
    const ra = v.through > 0 || !sp ? { room: Infinity, ahead: null, slowTo: Infinity } : roads.roomAhead(v, sp.lane, v.span, 40);
    if (v.through > 0) v.through -= dt;
    let room = ra.room;
    v.ahead = ra.ahead;
    // near a junction: one nearer it bound for the same lane goes first; leaving a driveway, it also gives way to the
    // road's traffic about to pass; either way it waits short of the junction
    const next = v.trip.spans[v.span + 1], toEnd = sp ? sp.s1 - v.s : Infinity;
    if (sp && next && v.through <= 0 && toEnd < LOOK_OUT) {
      const other = roads.firstIn(v, sp.lane, next.lane, toEnd) ?? (sp.lane.edge.road.startsWith('driveway:') && !next.lane.edge.road.startsWith('driveway:') ? roads.giveWay(sp.lane, next.lane) : null);
      if (other) { const r = Math.max(0, toEnd - 1); if (r < room) { room = r; v.ahead = other; } }
    }
    const target = Math.min(ra.slowTo, room < GAP ? 0 : room < GAP * 4 ? cruise * ((room - GAP) / (GAP * 3)) : cruise);
    v.v += (target - v.v) * Math.min(1, dt * 5);
    // held for long by a ring of vehicles each waiting on the next (a knot at a junction): it drives through for a moment;
    // a queue that ends at a weighbridge, a bay or a moving vehicle is a queue, and waits
    v.held = v.v < 0.1 ? v.held + dt : 0;
    if (v.held > STUCK) { v.held = 0; if (knotted(v)) v.through = UNSTICK; }
    let s = v.s + v.v * dt;
    // a weighbridge on the way: stop on it
    const stop = v.trip.stops[v.stop];
    if (stop && s >= stop.s) { s = stop.s; v.stop++; v.state = 'weighing'; v.timer = WEIGH; v.v = 0; }
    v.s = Math.min(s, v.trip.length);
    while (v.span < v.trip.spans.length - 1 && v.s > v.trip.spans[v.span].s1) { leaveSpan(v); v.span++; enterSpan(v); }
    if (v.s >= v.trip.length - 1e-6 && v.state !== 'weighing') {
      if (v.leg === 'out') { v.state = 'unloading'; v.timer = UNLOAD; v.v = 0; }
      else { despawn(v); return false; }
    }
    return true;
  }

  // ---- the credit layer: a coin against every laden vehicle, and v1's money dashes along the main roads ----
  const coins = new Map<Vehicle, FleetMember>();
  function syncCoins() {
    if (!groups.coins.visible) { if (coins.size) { for (const m of coins.values()) fleet.remove(m); coins.clear(); } return; }
    for (const [v, m] of coins) if (v.member.slot < 0 || !v.laden) { fleet.remove(m); coins.delete(v); }
    for (const v of live) {
      if (!v.laden) continue;
      let m = coins.get(v);
      if (!m) { m = { fleetKind: 'coin', slot: -1, entity: null }; fleet.add(m); if (m.slot < 0) continue; coins.set(v, m); }
      // the payment runs the route the other way, on the far lane
      const p = v.trip.path.at(v.trip.length - v.s), back = p.h + Math.PI, off = 2 * laneOffset(9);
      fleet.place(m, p.x - Math.sin(back) * off, p.y + Math.cos(back) * off, back, 1.2, 1);
    }
  }
  const money = (() => {
    const s: number[] = [];
    for (const id of ['ring', 'main']) {
      const r = layout.roads.find((x) => x.id === id); if (!r) continue;
      const path = new Path(offsetRight(r.closed ? [...r.points, r.points[0]] : r.points, -(laneOffset(r.width) + 2)), 14, false);
      for (let d = 0; d < path.length; d += 6) { const a = path.at(d), b = path.at(Math.min(d + 2.5, path.length)); s.push(a.x, 0.4, a.y, b.x, 0.4, b.y); }
    }
    const line = new LineSegments2(new LineSegmentsGeometry().setPositions(s.length ? s : [0, 0, 0, 0, 0, 0]), theme.line.live);
    line.raycast = () => {}; line.frustumCulled = false; groups.coins.add(line);
    return line;
  })();

  // ---- ships at the quays: a bulk ship loads the raw export, a container ship brings the imports ----
  interface Ship { ent: Mover; g: THREE.Group; hold: THREE.Object3D; berth: Pt; t: number; cycle: number; loads: boolean }
  const ships: Ship[] = [];
  const water = layout.port?.water;
  const SHIP_CYCLE = 150, ARRIVE = 30, LEAVE = 110;
  function shipModel(container: boolean): { g: THREE.Group; hold: THREE.Object3D } {
    // ships, the train and the crane turn: every face is kept
    const p = new Part(ctx), L = 56, B = 11; p.cull = false;
    p.extrude([[0, -B / 2, -1], [-L + 6, -B / 2, -1], [-L, -B / 2 + 2, -1], [-L, B / 2 - 2, -1], [-L + 6, B / 2, -1], [0, B / 2, -1], [6, 0, -1]], [0, 0, 4.2], 'n', { seams: false });
    p.box(-L + 3, -B / 2 + 1, 3.2, 9, B - 2, 8, 'w'); p.box(-L + 5, -1, 11.2, 2, 2, 3, 'k');
    if (container) for (let k = 0; k < 5; k++) p.box(-L + 15 + k * 7.5, -B / 2 + 1.2, 3.2, 6.6, B - 2.4, 2.6 + (k % 2) * 2.6, 'g');
    else for (let k = 0; k < 4; k++) p.box(-L + 16 + k * 9, -B / 2 + 1.5, 3.2, 7.6, B - 3, 1.1, 'k');
    const g = p.build(container ? 'container-ship' : 'bulk-ship');
    // the bulk ship's hold mark: a heap that grows as it loads
    const hp = new Part(ctx); hp.cull = false; hp.box(0, -(B - 4) / 2, 0, 30, B - 4, 3.2, 's');
    const hold = hp.build('hold'); hold.position.set(-L + 15, 3.4, 0);
    if (!container) g.add(hold);
    return { g, hold };
  }
  const shipState = (s: Ship) => { const u = s.t % s.cycle; return u < ARRIVE ? 'arriving' : u < LEAVE ? (s.loads ? 'loading' : 'unloading') : 'leaving'; };
  if (water) {
    for (const [code, container] of [[BULK_QUAY, false], [CONTAINER_QUAY, true]] as const) {
      const qb = blocks.get(code)?.box; if (!qb) continue;
      const { g, hold } = shipModel(container);
      const berth: Pt = [Math.min(water.x1 - 10, Math.max(water.x0 + 60, (qb.x0 + qb.x1) / 2 + 28)), water.y0 + 12];
      groups.port.add(g);
      const quayName = subIndustryByCode(code)?.nameEn ?? 'the quay';
      const s: Ship = { ent: null as unknown as Mover, g, hold, berth, t: container ? 70 : 0, cycle: SHIP_CYCLE, loads: !container };
      s.ent = new Mover('ship', container ? 'SHIP-CONTAINER' : 'SHIP-BULK', g,
        () => ({ kind: container ? 'Container ship' : 'Bulk ship', title: container ? 'Container ship' : 'Bulk ship', status: shipState(s),
          rows: [['Quay', quayName], ['Cargo', container ? 'Boxed goods: imports in, finished goods out' : 'Bulk: raw ore and coal for export'], ['Goes', container ? 'To and from other ports, by sea' : 'Abroad, by sea'], ['Traffic', TRAFFIC_LINE]] }),
        () => (container ? 'Container ship · imports at the container quay' : 'Bulk ship · loading raw ore and coal for export'), [-25, 0, 6]);
      ships.push(s); ctx.entities.push(s.ent);
    }
  }
  /** A ship's call: sailing in from the far end of the water, berthed, sailing out again. */
  function placeShip(s: Ship) {
    if (!water) return;
    const u = s.t % s.cycle, far: Pt = [water.x1 - 40, water.y1 - 30];
    let x = s.berth[0], y = s.berth[1], z = 0, h = Math.PI;
    if (u < ARRIVE) { const k = u / ARRIVE; x = far[0] + (s.berth[0] - far[0]) * k; y = far[1] + (s.berth[1] - far[1]) * k; z = -8 * (1 - Math.min(1, k * 3)); h = Math.atan2(s.berth[1] - far[1], s.berth[0] - far[0]); }
    else if (u >= LEAVE) { const k = (u - LEAVE) / (s.cycle - LEAVE); x = s.berth[0] + (far[0] - s.berth[0]) * k; y = s.berth[1] + (far[1] - s.berth[1]) * k; z = -8 * Math.max(0, k * 3 - 2); h = Math.atan2(far[1] - s.berth[1], far[0] - s.berth[0]); }
    pose(s.g, x, y, h, z);
    const fill = u < ARRIVE ? 0 : u < LEAVE ? (u - ARRIVE) / (LEAVE - ARRIVE) : 1;
    s.hold.scale.set(1, Math.max(0.05, s.loads ? fill : 1 - fill), 1);
  }

  // ---- the shuttle train between the rail yard and the port, and the quay's crane ----
  let train: { ent: Mover; g: THREE.Group; path: Path; s: number; dir: number; wait: number } | null = null;
  if (layout.rail && layout.rail.points.length > 1) {
    const p = new Part(ctx); p.cull = false;
    p.box(-12, -1.5, 0.8, 12, 3, 3.4, 'k'); p.box(-9.5, -1.6, 4.2, 2.4, 3.2, 0.5, 'k');
    for (let k = 0; k < 4; k++) { p.box(-27 - k * 15 + 1, -1.5, 0.9, 13, 3, 2.2, 'n'); p.box(-27 - k * 15 + 2, -1.2, 3.1, 11, 2.4, 0.8, 's'); }
    const g = p.build('train'); groups.port.add(g);
    const path = new Path(layout.rail.points, 20, false);
    const ent = new Mover('train', 'TRAIN-SHUTTLE', g,
      () => ({ kind: 'Shuttle train', title: 'Rail shuttle', status: train && train.wait > 0 ? 'loading wagons' : 'running', rows: [['Yard', 'The rail yard by the gateway'], ['Cargo', 'Bulk and containers in wagons'], ['Goes', 'Between the rail yard and the port'], ['Traffic', TRAFFIC_LINE]] }),
      () => 'Rail shuttle · between the rail yard and the port', [-30, 0, 3]);
    train = { ent, g, path, s: path.length * 0.3, dir: 1, wait: 0 }; ctx.entities.push(ent);
  }
  let crane: THREE.Group | null = null;
  if (layout.port) {
    const q = layout.port.quay, p = new Part(ctx); p.cull = false;
    p.box(-0.8, -0.8, 24, 1.6, 1.6, 2); p.box(-1, -0.6, 26, 30, 1.2, 1.2); p.seg('line', W(26, 0, 27.2), W(26, 0, 8)); p.box(25.2, -0.9, 7, 1.6, 1.8, 1, 'k');
    crane = p.build('crane'); pose(crane, (q.x0 + q.x1) / 2 + 40, q.y0 + 4, 0); groups.port.add(crane);
  }

  // ---- walkers: the town's pavements and the think tank's terrace, at the street band ----
  interface Walker { m: FleetMember; ent: Mover; path: Path; s: number; dir: number; speed: number; z: number }
  const walkers: Walker[] = [];
  const addWalker = (path: Path, z: number, where: string) => {
    const proxy = new THREE.Object3D(); proxy.name = 'walker'; groups.walkers.add(proxy);
    const ent = new Mover('walker', `WALKER-${String(walkers.length + 1).padStart(2, '0')}`, proxy, () => ({ kind: 'Walker', title: 'A walker', status: 'walking', rows: [['Where', capital(where)], ['Traffic', TRAFFIC_LINE]] }), () => `A walker · ${where}`, [0, 0, 1.5]);
    ent.isPerson = true;
    const m: FleetMember = { fleetKind: 'walker', slot: -1, entity: ent }; fleet.add(m);
    if (m.slot < 0) { proxy.removeFromParent(); return; }
    walkers.push({ m, ent, path, s: rng.rand(0, path.length), dir: rng.next() < 0.5 ? 1 : -1, speed: rng.rand(1.1, 1.6), z }); ctx.entities.push(ent);
  };
  if (!o.phone) {
    const pavements = layout.roads.filter((r) => r.kind === 'town' && r.id.startsWith('town-street-')).map((r) => new Path(offsetRight(r.points, 5.5), 4, false)).filter((pth) => pth.length > 30);
    pavements.forEach((pth) => { for (let k = 0; k < 2; k++) addWalker(pth, 0, 'on the town’s pavement'); });
    const tank = layout.fixtures.find((f) => f.kind === 'think-tank');
    if (tank) { const terrace = new Path([[tank.box.x0 - 4, tank.box.y1 + 8], [tank.box.x1 + 4, tank.box.y1 + 8]], 0, false); for (let k = 0; k < 6; k++) addWalker(terrace, layout.hill?.height ?? 0, 'on the think tank’s terrace'); }
  }

  // ---- the fleet at the start: every flow's vehicles spread along their cycles, within the cap ----
  {
    const want = flows.map((f) => {
      const r = tripFor(f.origins[0], f.destinations[0], f, 'out');
      const cycle = r ? (2 * r.length) / VEHICLE_SPEED[f.kind] + UNLOAD + 2 * r.stops.length * WEIGH : 0;
      return { f, cycle, n: cycle / f.cadence };
    });
    const total = want.reduce((x, w) => x + w.n, 0), k = total > 0 ? Math.min(1, (cap * 0.9) / total) : 0;
    for (const w of want) {
      const n = Math.floor(w.n * k + rng.next());
      for (let i = 0; i < n && live.length < cap; i++) spawn(w.f, rng.rand(0.5, Math.max(1, w.cycle - 1)));
    }
  }

  let t = 0;
  /** Per flow: its vehicles queued at the customer's bay, and whether its last one is still near the despatch bay; per gate, its queue. */
  const queuedAt = new Map<Flow, number>(), atDoor = new Set<Lot>(), laneQueue = new Map<number, number>(), gateQueue = new Map<string, number>();
  return {
    roads,
    update(dt) {
      t += dt;
      // each flow's next vehicle is due every cadence; while the fleet is under the cap the most overdue flow sends
      // first, so at the cap the free places go to the flows in proportion to their cadence (a heavy flow three times
      // an expected one's); a flow whose bay queues five, or whose last vehicle is still at its door, waits
      for (const f of flows) f.t = Math.min(f.t + dt, 8 * f.cadence);
      let standing = 0;
      for (const v of live) if (v.v < 0.1 && (v.state === 'out' || v.state === 'back')) standing++;
      if (live.length < cap && standing <= JAM_HOLD * live.length) {
        queuedAt.clear(); atDoor.clear(); laneQueue.clear(); gateQueue.clear();
        for (const v of live) {
          if (v.v < 0.1) { const lane = v.trip.spans[v.span]?.lane; if (lane) laneQueue.set(lane.id, (laneQueue.get(lane.id) ?? 0) + 1); }
          // a lot's door is busy while a vehicle leaving it, or one turned round at its bay, is still on its driveway
          if (v.trip.spans[v.span]?.lane.edge.road.startsWith('driveway:')) atDoor.add(v.leg === 'out' ? v.origin : v.dest);
          if (v.leg !== 'out') continue;
          if (v.v < 0.1 && v.trip.length - v.s < 40) queuedAt.set(v.flow, (queuedAt.get(v.flow) ?? 0) + 1);
          // waiting to weigh: on the plate, or slow within reach of the next weighbridge
          const g = v.state === 'weighing' ? v.trip.stops[v.stop - 1]?.gate : v.v < 1 && v.trip.stops[v.stop] && v.trip.stops[v.stop].s - v.s < 150 ? v.trip.stops[v.stop].gate : null;
          if (g) gateQueue.set(g, (gateQueue.get(g) ?? 0) + 1);
        }
        // a flow waits while five of its vehicles queue at its customer's bay, five wait at a weighbridge on its way, or a
        // queue stands on a lane of its way: the next vehicle would only join it
        const free = (f: Flow) => (queuedAt.get(f) ?? 0) < QUEUE_HOLD && f.gates.every((g) => (gateQueue.get(g) ?? 0) < QUEUE_HOLD) && !f.lanes.some((l) => (laneQueue.get(l) ?? 0) >= LANE_HOLD);
        const due = flows.filter((f) => f.t >= f.cadence && !atDoor.has(f.origins[f.sent % f.origins.length]) && free(f)).sort((a, b) => b.t / b.cadence - a.t / a.cadence);
        for (const f of due) { if (live.length >= cap) break; f.t -= f.cadence; spawn(f); }
      }
      for (const v of [...live]) if (step(v, dt)) placeVehicle(v);
      for (const s of ships) { s.t += dt; placeShip(s); }
      if (train) {
        if (train.wait > 0) train.wait -= dt;
        else { train.s += train.dir * 6 * dt; if (train.s >= train.path.length) { train.s = train.path.length; train.dir = -1; train.wait = 20; } else if (train.s <= 0) { train.s = 0; train.dir = 1; train.wait = 20; } }
        const p = train.path.at(train.s); pose(train.g, p.x, p.y, train.dir > 0 ? p.h : p.h + Math.PI);
      }
      if (crane) crane.rotation.y = Math.sin(t * 0.25) * 0.9;
      for (const w of walkers) {
        w.s += w.dir * w.speed * dt;
        if (w.s >= w.path.length) { w.s = w.path.length; w.dir = -1; } else if (w.s <= 0) { w.s = 0; w.dir = 1; }
        const p = w.path.at(w.s), h = w.dir > 0 ? p.h : p.h + Math.PI;
        pose(w.ent.groups[0], p.x, p.y, h, w.z);
        fleet.place(w.m, p.x, p.y, h, w.z);
      }
      syncCoins();
      fleet.commit();
    },
    setLayer(name, on) {
      // the port's movers (the ships, the rail shuttle, the quay's crane) are logistics too
      if (name === 'logistics') { groups.goods.visible = on; groups.loops.visible = on; groups.port.visible = on; }
      if (name === 'cold-chain') groups.cold.visible = on;
      if (name === 'credit') groups.coins.visible = on;
    },
    setFlows(next) {
      // a measured link sends its vehicles more often (PRD v2 §3.6); nothing else about it changes here
      classes.clear(); for (const x of next) classes.set(`${x.from}>${x.to}`, x.cls);
      for (const f of flows) if (f.link) f.cadence = CADENCE[classes.get(f.key) ?? 'expected'] * slow;
    },
    setDetail(tiny) { groups.walkers.visible = !tiny; },
    vehicles: () => [...live],
    flows: () => flows,
    flowsThrough(gateId) {
      // every route a flow alternates between counts: two companies' lots may leave by different gates
      let n = 0;
      for (const f of flows) if (f.gates.includes(gateId)) n++;
      return n;
    },
    live: () => live.length,
    cap: () => cap,
    dispose() { for (const v of live) leaveSpan(v); live.length = 0; walkers.length = 0; ships.length = 0; fleet.dispose(); money.geometry.dispose(); root.removeFromParent(); },
  };
}
