/**
 * Traffic (PRD §7.12; mega prompt §6.2): trucks on the ring, the radials and
 * the main road; reefers when the cold-chain layer is on; the loop vehicles
 * on the outer ring for the schematic's return flows; raw trucks on the
 * dashed export road; forklifts at the estate warehouse; a train shunting
 * in the rail yard; a crane working the quay; walkers in the town; and the
 * money layer's coins running against the goods with its dashed lines.
 *
 * Motion is illustrative. Every vehicle's card says so, and nothing here
 * ever reads a figure: flow classes from the boundary change how many
 * trucks run on the main road, nothing else. All randomness is the
 * instance's seeded generator, and vehicles start spaced along their lanes,
 * so the far view is populated at the first frame and no warm-up is needed.
 * (After Factory Yard's sim/trucks, roads, person and train, made small.)
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { RETURNS } from '@/data/industryChain';
import type { FlowWeight } from '@/world/data/types';
import type { GeneratedLayout, Pt } from '@/world/placement/types';
import type { EngineContext } from '../engine/context';
import { W } from '../engine/kernel/iso';
import { Part, pose, type Tone } from '../engine/kernel/part';
import { Path } from '../engine/kernel/path';
import type { Entity, EntityInfo, EntityRoute, LayerName } from '../engine/types';
import { TRAFFIC_LINE } from '../world/build';

type MoverKind = 'truck' | 'reefer' | 'loop' | 'raw' | 'coin' | 'forklift' | 'train' | 'walker' | 'van';
const LABEL: Record<MoverKind, string> = { truck: 'Truck', reefer: 'Reefer truck', loop: 'Return flow', raw: 'Raw-export truck', coin: 'Payment', forklift: 'Forklift', train: 'Shunting train', walker: 'Walker', van: 'Delivery van' };

/** A lane: a path with a direction and the movers on it, kept apart. */
class Lane {
  movers: Mover[] = [];
  constructor(readonly id: string, readonly path: Path, readonly bounce: boolean) {}
}

class Mover implements Entity {
  readonly kind: MoverKind; readonly id: string; readonly lane: Lane; readonly group: THREE.Group; readonly speed: number; readonly len: number; readonly carrying: string;
  groups: THREE.Object3D[];
  pick: readonly [number, number, number] = [0, 0, 1.5];
  isPerson?: boolean;
  s: number; dir = 1; v: number; waiting = false;
  constructor(kind: MoverKind, id: string, lane: Lane, group: THREE.Group, s: number, speed: number, len: number, carrying: string) {
    this.kind = kind; this.id = id; this.lane = lane; this.group = group; this.speed = speed; this.len = len; this.carrying = carrying;
    this.groups = [group]; this.s = s; this.v = speed; group.userData.entity = this; this.isPerson = kind === 'walker';
    lane.movers.push(this);
  }
  place(): void { const p = this.lane.path.at(this.s); pose(this.group, p.x, p.y, this.dir > 0 ? p.h : p.h + Math.PI, this.lane.path.zs?.(this.s) ?? 0); }
  update(dt: number): void {
    // room ahead: the nearest mover on this lane heading the same way, less a gap
    const L = this.lane.path.length; let room = Infinity;
    for (const o of this.lane.movers) { if (o === this || o.dir !== this.dir) continue; let d = (o.s - this.s) * this.dir; if (this.lane.path.closed) d = ((d % L) + L) % L; if (d > 0 && d < room) room = d; }
    const gap = this.len + 4;
    this.waiting = room < gap;
    const target = this.waiting ? 0 : room < gap * 2.5 ? this.speed * ((room - gap) / (gap * 1.5)) : this.speed;
    this.v += (target - this.v) * Math.min(1, dt * 2);
    this.s += this.v * dt * this.dir;
    if (this.lane.path.closed) this.s = ((this.s % L) + L) % L;
    else if (this.lane.bounce) { if (this.s >= L) { this.s = L; this.dir = -1; } else if (this.s <= 0) { this.s = 0; this.dir = 1; } }
    this.place();
  }
  info(): EntityInfo {
    return { kind: LABEL[this.kind], title: this.id, status: this.waiting ? 'waiting' : 'moving',
      rows: [['Road', this.lane.id], ['Carrying', this.carrying], ['Traffic', TRAFFIC_LINE]] };
  }
  readout(): string { return `${this.id} · ${this.waiting ? 'waiting' : 'moving'}`; }
  route(): EntityRoute { return { path: this.lane.path, s: this.s, closed: this.lane.path.closed }; }
}

export interface Traffic {
  update(dt: number): void;
  setLayer(name: LayerName, on: boolean): void;
  setFlows(flows: FlowWeight[]): void;
  setDetail(tiny: boolean, far: boolean): void;
  movers(): Mover[];
  dispose(): void;
}

/** Points shifted to one side of a centreline, so a lane keeps right. */
function offsetPts(pts: readonly Pt[], off: number, closed: boolean): Pt[] {
  return pts.map((p, i) => {
    const a = pts[closed ? (i - 1 + pts.length) % pts.length : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % pts.length : Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    return [p[0] - dy * off, p[1] + dx * off];
  });
}

export function createTraffic(ctx: EngineContext, layout: GeneratedLayout): Traffic {
  const { scene, rng, theme } = ctx;
  const root = new THREE.Group(); root.name = 'traffic'; scene.add(root);
  const groups: Record<'trucks' | 'reefers' | 'coins' | 'walkers' | 'near', THREE.Group> = { trucks: new THREE.Group(), reefers: new THREE.Group(), coins: new THREE.Group(), walkers: new THREE.Group(), near: new THREE.Group() };
  for (const g of Object.values(groups)) root.add(g);
  groups.reefers.visible = false; groups.coins.visible = false;

  // ---- models, built once each ----
  const proto = (draw: (p: Part) => void, name: string) => { const p = new Part(ctx); draw(p); return p.build(name); };
  const truckModel = (tone: Tone, trailerTone: Tone) => proto((p) => {
    p.box(-2.6, -1.2, 0.5, 2.6, 2.4, 2.4, tone); p.box(-2.8, -1.3, 2.9, 2.8, 2.6, 0.2, tone); p.box(-0.1, -1.2, 1.0, 0.1, 2.4, 1.4, 'l');
    p.box(-12, -1.25, 1.1, 9.2, 2.5, 2.9, trailerTone); for (const x of [-1.6, -9.5, -11]) { p.cylY(x, 1.3, 0.55, 0.55, 0.5, 10); p.cylY(x, -1.8, 0.55, 0.55, 0.5, 10); }
  }, 'truck');
  const PROTO = {
    truck: truckModel('n', 'n'), reefer: truckModel('n', 'k'), raw: truckModel('k', 'n'),
    loop: proto((p) => { p.box(-6, -1.2, 0.5, 6, 2.4, 2.6, 'k'); p.box(-0.1, -1.2, 1.0, 0.1, 2.4, 1.2, 'l'); for (const x of [-1.2, -4.8]) { p.cylY(x, 1.3, 0.5, 0.5, 0.5, 10); p.cylY(x, -1.8, 0.5, 0.5, 0.5, 10); } }, 'loop'),
    van: proto((p) => { p.box(-4.6, -1, 0.4, 4.6, 2, 2.2); p.box(-0.1, -1, 0.9, 0.1, 2, 1, 'l'); for (const x of [-0.9, -3.7]) { p.cylY(x, 1.1, 0.4, 0.4, 0.4, 8); p.cylY(x, -1.5, 0.4, 0.4, 0.4, 8); } }, 'van'),
    coin: proto((p) => { p.cylZ(0, 0, 0.8, 0.9, 0.3, 10, 'l'); }, 'coin'),
    forklift: proto((p) => { p.box(-2.2, -0.6, 0.3, 2.2, 1.2, 1.4, 'k'); p.box(0, -0.6, 0.2, 0.1, 1.2, 2.8); p.box(0.1, -0.5, 0.2, 1.2, 1, 0.08); }, 'forklift'),
    walker: proto((p) => { p.box(-0.2, -0.2, 0, 0.4, 0.4, 0.9, 'nb'); p.box(-0.26, -0.26, 0.9, 0.52, 0.52, 0.7, 'kb'); p.box(-0.16, -0.16, 1.6, 0.32, 0.32, 0.3, 'nb'); }, 'walker'),
    train: proto((p) => { p.box(-10, -1.4, 0.8, 10, 2.8, 3.2, 'k'); p.box(-8, -1.5, 4, 2, 3, 0.4, 'k'); for (let k = 0; k < 4; k++) p.box(-24 - k * 14 + 1, -1.4, 0.9, 12, 2.8, 0.6); for (let k = 0; k < 4; k++) for (const x of [-24 - k * 14 + 2, -24 - k * 14 + 11]) p.cylY(x, 1.5, 0.5, 0.5, 0.4, 8); }, 'train'),
  };

  const lanes: Lane[] = [];
  const lane = (id: string, pts: readonly Pt[], closed: boolean, off = 0, bounce = !closed) => { const l = new Lane(id, new Path(off ? offsetPts(pts, off, closed) : pts, 14, closed), bounce); lanes.push(l); return l; };
  const road = (id: string) => layout.roads.find((r) => r.id === id);
  let seq = 0;
  const spawn = (kind: MoverKind, l: Lane, s: number, speed: number, len: number, carrying: string, parent: THREE.Group, dir = 1) => {
    const g = PROTO[kind].clone(); parent.add(g);
    const m = new Mover(kind, `${kind.toUpperCase()}-${String(++seq).padStart(2, '0')}`, l, g, s, speed, len, carrying);
    m.dir = dir; m.place(); ctx.entities.push(m); return m;
  };
  const spread = (l: Lane, n: number, k: number) => ((k + rng.rand(0.1, 0.9)) / n) * l.path.length;

  // ---- the lanes ----
  // a layout without a road (the empty layout the tests mount) has no traffic on it
  const ring = road('ring'), mainRoad = road('main'), rawRoad = road('raw-export'), recoveryRoad = road('recovery');
  const ringCW = ring ? lane('ring road (clockwise)', ring.points, true, 3) : null, ringACW = ring ? lane('ring road (anticlockwise)', [...ring.points].reverse(), true, 3) : null;
  const outerRing = ring ? lane('outer ring road', ring.points, true, 9) : null;
  const main = mainRoad ? lane('main road', mainRoad.points, false, 3) : null;
  const radials = ['radial-north', 'radial-south', 'radial-west'].flatMap((id) => { const r = road(id); return r ? [lane(id.replace('-', ' '), r.points, false, 3)] : []; });
  const raw = rawRoad ? lane('raw-export road', rawRoad.points, false, 2.5) : null;
  const recovery = recoveryRoad ? lane('recovery road', recoveryRoad.points, false, 2.5) : null;
  const streets = layout.roads.filter((r) => r.kind === 'town' && r.id.startsWith('town-')).map((r) => lane(r.id.replace(/-/g, ' '), r.points, false, 2.5));
  const pavements = layout.roads.filter((r) => r.kind === 'town' && r.id.startsWith('town-')).map((r) => lane(`${r.id.replace(/-/g, ' ')} pavement`, r.points, false, 5.5));
  const wh = layout.fixtures.find((f) => f.kind === 'warehouse');
  const forkLane = wh ? lane('estate warehouse', [[wh.box.x0 - 6, wh.box.y1 + 6], [wh.box.x1 + 6, wh.box.y1 + 6], [wh.box.x1 + 6, wh.box.y0 - 6], [wh.box.x0 - 6, wh.box.y0 - 6]], true, 0) : null;
  const railLane = layout.rail ? lane('rail yard', layout.rail.points, false, 0) : null;

  // ---- the fleet, spaced along its lanes ----
  if (ringCW && ringACW) for (let k = 0; k < 5; k++) { spawn('truck', ringCW, spread(ringCW, 5, k), rng.rand(10, 13), 12, 'goods', groups.trucks); spawn('truck', ringACW, spread(ringACW, 5, k), rng.rand(10, 13), 12, 'goods', groups.trucks); }
  const baseMain = 5;
  if (main) for (let k = 0; k < baseMain; k++) spawn('truck', main, spread(main, baseMain, k), rng.rand(11, 14), 12, 'goods', groups.trucks, k % 2 ? -1 : 1);
  for (const r of radials) for (let k = 0; k < 2; k++) spawn('truck', r, spread(r, 2, k), rng.rand(8, 11), 12, 'goods', groups.trucks, k ? -1 : 1);
  if (outerRing) RETURNS.forEach((ret, k) => spawn('loop', outerRing, spread(outerRing, RETURNS.length, k), rng.rand(8, 10), 6, ret.label, groups.trucks));
  if (raw) for (let k = 0; k < 3; k++) spawn('raw', raw, spread(raw, 3, k), rng.rand(9, 12), 12, 'raw material for export', groups.trucks, k % 2 ? -1 : 1);
  if (recovery) for (let k = 0; k < 2; k++) spawn('truck', recovery, spread(recovery, 2, k), rng.rand(8, 10), 12, 'post-consumer material', groups.trucks, k ? -1 : 1);
  if (ringCW) for (let k = 0; k < 3; k++) spawn('reefer', ringCW, spread(ringCW, 3, k), rng.rand(10, 12), 12, 'chilled goods', groups.reefers);
  if (main) for (let k = 0; k < 2; k++) spawn('reefer', main, spread(main, 2, k), rng.rand(10, 12), 12, 'chilled goods', groups.reefers, k ? -1 : 1);
  if (ringACW) for (let k = 0; k < 8; k++) spawn('coin', ringACW, spread(ringACW, 8, k), 16, 2, 'payment, against the goods', groups.coins);
  if (main) for (let k = 0; k < 6; k++) spawn('coin', main, spread(main, 6, k), 16, 2, 'payment, against the goods', groups.coins, -1);
  if (forkLane) for (let k = 0; k < 2; k++) spawn('forklift', forkLane, spread(forkLane, 2, k), 3, 3, 'a pallet', groups.near);
  if (railLane) spawn('train', railLane, railLane.path.length * 0.5, 4, 70, 'wagons', groups.trucks);
  streets.forEach((st, i) => { if (i % 2 === 0) spawn('van', st, spread(st, 1, 0), 7, 5, 'parcels', groups.trucks, i % 4 ? -1 : 1); });
  pavements.forEach((pv) => { for (let k = 0; k < 2; k++) spawn('walker', pv, spread(pv, 2, k), 1.4, 1, 'nothing', groups.walkers, k ? -1 : 1); });

  // ---- the quay crane: its boom swings over the ship's berth while the port works ----
  let crane: THREE.Group | null = null;
  if (layout.port) { const q = layout.port.quay; const p = new Part(ctx); p.box(-0.8, -0.8, 24, 1.6, 1.6, 2); p.box(-1, -0.6, 26, 30, 1.2, 1.2); p.seg('line', W(26, 0, 27.2), W(26, 0, 8)); p.box(25.2, -0.9, 7, 1.6, 1.8, 1, 'k'); crane = p.build('crane'); pose(crane, q.x0 + 70, q.y1 - 6, 0); root.add(crane); }

  // ---- the money layer's dashed lines along the lanes the coins run ----
  const money = (() => { const s: number[] = []; for (const l of [ringACW, main]) if (l) for (let d = 0; d < l.path.length; d += 6) { const a = l.path.at(d), b = l.path.at(Math.min(d + 2.5, l.path.length)); s.push(a.x, 0.4, a.y, b.x, 0.4, b.y); }
    const line = new LineSegments2(new LineSegmentsGeometry().setPositions(s), theme.line.live); line.raycast = () => {}; line.frustumCulled = false; line.visible = false; root.add(line); return line; })();

  const extra: Mover[] = [];
  let t = 0;
  return {
    update(dt) {
      t += dt;
      for (const l of lanes) for (const m of l.movers) m.update(dt);
      if (crane) crane.rotation.y = Math.sin(t * 0.25) * 0.9;
    },
    setLayer(name, on) {
      if (name === 'logistics') groups.trucks.visible = on;
      if (name === 'cold-chain') groups.reefers.visible = on;
      if (name === 'credit') { groups.coins.visible = on; money.visible = on; }
    },
    setFlows(flows) {
      // measured links carry more vehicles than expected ones: up to six more trucks on the main road
      const heavy = flows.filter((f) => f.cls === 'measured-heavy').length, light = flows.filter((f) => f.cls === 'measured-light').length;
      const want = Math.min(6, heavy * 2 + light);
      while (main && extra.length < want) extra.push(spawn('truck', main, rng.rand(0, main.path.length), rng.rand(11, 14), 12, 'goods on a measured link', groups.trucks, extra.length % 2 ? -1 : 1));
      while (extra.length > want) { const m = extra.pop()!; m.group.removeFromParent(); m.lane.movers.splice(m.lane.movers.indexOf(m), 1); ctx.entities.splice(ctx.entities.indexOf(m), 1); ctx.hooks.forget(m); }
    },
    setDetail(tiny, far) { groups.walkers.visible = !tiny; groups.near.visible = !far; },
    movers: () => lanes.flatMap((l) => l.movers),
    dispose() { root.removeFromParent(); },
  };
}
