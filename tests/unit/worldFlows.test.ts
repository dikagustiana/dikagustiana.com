/**
 * Flows (PRD v2 §3.6, B1–B6; mega prompt §4 tasks 3–6, 8): the road graph at
 * runtime, the registry's links as flows of vehicles from a supplier's lot to
 * a customer's, the vehicles' life (despatch, weighbridges, unloading, the
 * way back empty), the cadence by flow class within the cap, the returns, the
 * port's calls, the credit layer's coins, the cards and the picking of an
 * instanced vehicle.
 */
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RETURNS } from '@/data/industryChain';
import { REGISTRY, subIndustryByCode } from '@/lib/world/registry/subindustries.generated';
import type { Link } from '@/lib/world/registry/types';
import type { Selection } from '@/world/engine/types';
import { createContext } from '@/world/engine/context';
import { createRng } from '@/world/engine/kernel/math';
import { createTheme } from '@/world/engine/theme';
import { LAYOUT } from '@/world/placement/layout.generated';
import { CADENCE, CAP, RETURN_ENDS, UNLOAD, WEIGH, countInWords, createFlows, type FlowSystem, type Vehicle } from '@/world/sim/flows';
import { createRoads } from '@/world/sim/roads';
import { kindFor, VEHICLE_LENGTH, VEHICLE_SCALE } from '@/world/sim/vehicles';
import { TRAFFIC_LINE } from '@/world/world/build';
import { disposeWorlds, frames, installWorldStubs, mountWorld } from './helpers/mountWorld';

const STEP = 1 / 60;
const contextOf = (seed = 3) => createContext({ rng: createRng(seed), theme: createTheme(() => ''), layout: LAYOUT, font: 'sans-serif', reduced: false, debug: false, text2d: false });
const flowsOf = (links: readonly Link[] = REGISTRY.links, o: { phone?: boolean; seed?: number } = {}) => { const ctx = contextOf(o.seed); return { ctx, f: createFlows(ctx, LAYOUT, links, { phone: !!o.phone }) }; };
const run = (f: FlowSystem, seconds: number, each?: () => void) => { for (let k = 0, n = Math.round(seconds / STEP); k < n; k++) { f.update(STEP); each?.(); } };
const lotOf = (code: string, i = 0) => LAYOUT.blocks.find((b) => b.code === code)!.lots[i];

let systems: FlowSystem[] = [];
afterEach(() => { for (const f of systems) f.dispose(); systems = []; });
const keep = <T extends { f: FlowSystem }>(x: T): T => { systems.push(x.f); return x; };

describe('the roads at runtime (PRD v2 §3.6)', () => {
  const roads = createRoads(LAYOUT.graph!);

  it('makes every edge two lanes, one each way, each kept to the right of travel', () => {
    expect(roads.lanes.length).toBe(LAYOUT.graph!.edges.length * 2);
    for (const lane of roads.lanes) {
      const c = lane.edge.points, fwd = lane.from === lane.edge.a;
      const [a, b] = fwd ? [c[0], c[1]] : [c[c.length - 1], c[c.length - 2]];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 1) continue;
      // right of travel with y to the south is (−dy, dx)
      const side = ((lane.pts[0][0] - a[0]) * -dy + (lane.pts[0][1] - a[1]) * dx) / l;
      expect(side, `${lane.edge.road} ${lane.from}>${lane.to}`).toBeGreaterThan(0.9);
    }
  });

  it('routes by the shortest path, end to end, and caches each route', () => {
    const a = roads.bays(lotOf('A121').id)!, b = roads.bays(lotOf('B121').id)!;
    const before = roads.cached();
    const r = roads.route(a.despatch, b.receiving)!;
    expect(r).not.toBeNull();
    expect(roads.route(a.despatch, b.receiving)).toBe(r);
    expect(roads.cached()).toBe(before + 1);
    expect(r.lanes[0].from).toBe(a.despatch);
    expect(r.lanes.at(-1)!.to).toBe(b.receiving);
    for (let i = 1; i < r.spans.length; i++) { expect(r.spans[i].lane.from).toBe(r.spans[i - 1].lane.to); expect(r.spans[i].s0).toBeCloseTo(r.spans[i - 1].s1, 6); }
    expect(r.spans.at(-1)!.s1).toBeCloseTo(r.length, 6);
    const [na, nb] = [roads.nodes[a.despatch].at, roads.nodes[b.receiving].at];
    expect(r.length).toBeGreaterThan(Math.hypot(na[0] - nb[0], na[1] - nb[1]) * 0.95);
    // a cached failure is cached too, and a route to itself is no route
    expect(roads.route(a.despatch, a.despatch)).toBeNull();
  });

  it('puts a stop at every weighbridge a route crosses, and none at its ends', () => {
    const from = roads.bays(lotOf('B121').id)!, to = roads.bays(lotOf('J211').id)!;
    const r = roads.route(from.despatch, to.receiving)!;
    const gates = r.lanes.slice(1).map((l) => roads.nodes[l.from]).filter((n) => n.kind === 'gate').map((n) => n.ref);
    expect(gates.length).toBeGreaterThan(0);
    expect(r.stops.map((x) => x.gate)).toEqual(gates);
    for (const x of r.stops) { expect(x.s).toBeGreaterThan(0); expect(x.s).toBeLessThan(r.length); }
    expect(roads.routesThrough(gates[0]!)).toBeGreaterThan(0);
  });

  it('sends the raw-export trucks along the dashed raw-export road, and keeps a link’s route off it unless its lot’s driveway joins it', () => {
    const pit = roads.bays(lotOf('A121').id)!, quay = roads.bays(lotOf('J113').id)!;
    expect(roads.route(pit.despatch, quay.receiving, 'raw-export')!.lanes.some((l) => l.edge.road === 'raw-export')).toBe(true);
    // the lots whose driveway joins the raw-export road (two pits of the geological arc) must use it to leave
    const joins = new Set(roads.lanes.filter((l) => l.edge.road.startsWith('driveway:') && roads.lanes.some((m) => m.edge.road === 'raw-export' && (m.from === l.from || m.from === l.to))).map((l) => l.edge.road.slice('driveway:'.length)));
    expect(joins.size).toBeLessThanOrEqual(2);
    const { f } = keep(flowsOf());
    for (const fl of f.flows()) if (!fl.prefer) for (const o of fl.origins) for (const d of fl.destinations) {
      if (o === d || joins.has(o.id) || joins.has(d.id)) continue;
      const r = roads.route(roads.bays(o.id)!.despatch, roads.bays(d.id)!.receiving);
      expect(r?.lanes.some((l) => l.edge.road === 'raw-export'), `${fl.key} ${o.id} > ${d.id}`).toBe(false);
    }
  });
});

describe('flows from the registry’s links (PRD v2 §3.6, Appendix A)', () => {
  beforeEach(() => { HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']; });

  it('picks the vehicle by the goods: dump or hopper, tanker, reefer, box or container trailer, van, bus, none', () => {
    expect(kindFor('bulk', 'ring-geological', 'estate')).toBe('dump');
    expect(kindFor('bulk', 'ring-biological', 'estate')).toBe('dump');
    expect(kindFor('bulk', 'estate', 'estate')).toBe('hopper');
    expect(kindFor('liquid', 'estate', 'town')).toBe('tanker');
    expect(kindFor('cold', 'ring-biological', 'estate')).toBe('reefer');
    expect(kindFor('boxed', 'estate', 'gateway')).toBe('container');
    expect(kindFor('boxed', 'gateway', 'town')).toBe('container');
    expect(kindFor('boxed', 'estate', 'town')).toBe('box');
    expect(kindFor('parcel', 'gateway', 'town')).toBe('van');
    expect(kindFor('people', 'town', 'town')).toBe('bus');
    expect(kindFor('none', 'town', 'estate')).toBeNull();
    // drawn at 1.25 times their size, every truck reads at 18 px or more at the hero's 1.25 px/m (PRD v2 §3.2, B2)
    expect(VEHICLE_SCALE).toBe(1.25);
    for (const k of ['dump', 'hopper', 'tanker', 'reefer', 'box', 'container', 'bus', 'loop'] as const) expect(VEHICLE_LENGTH[k] * 1.25, k).toBeGreaterThanOrEqual(18);
  });

  it('makes a flow of every link whose goods move, of the six returns between their lots, of the raw export and of the imports', () => {
    const { f } = keep(flowsOf());
    const moving = REGISTRY.links.filter((l) => l.goods !== 'none');
    const linkFlows = f.flows().filter((x) => x.link);
    expect(linkFlows.map((x) => x.key).sort()).toEqual(moving.map((l) => `${l.from}>${l.to}`).sort());
    for (const x of f.flows()) {
      expect(x.origins.length, x.key).toBeGreaterThan(0); expect(x.destinations.length, x.key).toBeGreaterThan(0);
      for (const lot of [...x.origins, ...x.destinations]) expect(f.roads.bays(lot.id), lot.id).not.toBeNull();
    }
    const returns = f.flows().filter((x) => x.kind === 'loop');
    expect(returns.map((x) => x.id).sort()).toEqual(RETURNS.map((r) => r.id).sort());
    for (const r of returns) {
      const [a, b] = RETURN_ENDS[r.id];
      expect(r.load).toBe(RETURNS.find((x) => x.id === r.id)!.label);
      // a return runs from its first sub-industry's lots to its last's, and only between companies' lots where there are companies
      expect(r.origins.every((l) => l.id.startsWith(`${a}-`))).toBe(true);
      expect(r.destinations.every((l) => l.id.startsWith(`${b}-`))).toBe(true);
      expect(r.origins.length).toBe(Math.max(1, Math.min(2, subIndustryByCode(a)!.companies.length)));
    }
    expect(f.flows().filter((x) => x.prefer === 'raw-export').length).toBe(3);
    expect(f.flows().filter((x) => x.id.startsWith('import:')).length).toBe(2);
  });

  it('gives every goods vehicle an origin lot, a destination lot and a load named after its link (B1)', () => {
    const { f } = keep(flowsOf());
    run(f, 20);
    const vs = f.vehicles();
    expect(vs.length).toBeGreaterThan(200);
    for (const v of vs) {
      const facts = v.facts();
      expect(facts.from && facts.to && facts.load, v.id).toBeTruthy();
      expect(v.flow.origins).toContain(v.origin); expect(v.flow.destinations).toContain(v.dest);
      if (v.flow.link) expect(v.flow.load).toBe(v.flow.link.note ?? `${v.flow.link.goods} goods`);
    }
  });

  it('starts the world full and keeps it within the cap: three hundred on a laptop, a hundred and twenty on a phone', () => {
    for (const phone of [false, true]) {
      const { f } = keep(flowsOf(REGISTRY.links, { phone }));
      const cap = phone ? CAP.phone : CAP.laptop;
      expect(f.cap()).toBe(cap);
      expect(f.live()).toBeGreaterThanOrEqual(cap * 0.75);
      let most = 0;
      run(f, 90, () => { most = Math.max(most, f.live()); });
      expect(most).toBeLessThanOrEqual(cap);
      expect(most).toBe(cap);
    }
  });

  it('sends one vehicle per 30 s on an expected link, per 18 s measured light and per 10 s heavy; a phone half as many', () => {
    const links = REGISTRY.links.filter((l) => ['B121>J211', 'A121>B121', 'C131>C132'].includes(`${l.from}>${l.to}`));
    expect(links.length).toBe(3);
    // the links' flows only (the returns, the raw export and the imports run at their own slower cadence)
    const sentIn = (f: FlowSystem, seconds: number) => { const before = new Map(f.flows().map((x) => [x.key, x.sent])); run(f, seconds); return new Map(f.flows().filter((x) => x.link).map((x) => [x.key, x.sent - before.get(x.key)!])); };
    const { f } = keep(flowsOf(links));
    const expected = sentIn(f, 300);
    for (const [key, n] of expected) { expect(n, key).toBeGreaterThanOrEqual(9); expect(n, key).toBeLessThanOrEqual(11); }
    f.setFlows([{ from: 'B121', to: 'J211', cls: 'measured-heavy' }, { from: 'A121', to: 'B121', cls: 'measured-light' }]);
    const measured = sentIn(f, 360);
    expect(measured.get('B121>J211')).toBeGreaterThanOrEqual(Math.floor(360 / CADENCE['measured-heavy']) - 2);
    expect(measured.get('A121>B121')).toBeGreaterThanOrEqual(Math.floor(360 / CADENCE['measured-light']) - 1);
    expect(measured.get('A121>B121')).toBeLessThanOrEqual(Math.ceil(360 / CADENCE['measured-light']) + 1);
    expect(measured.get('C131>C132')).toBeLessThanOrEqual(13);
    const phone = keep(flowsOf(links, { phone: true })).f;
    for (const [key, n] of sentIn(phone, 300)) { expect(n, key).toBeGreaterThanOrEqual(4); expect(n, key).toBeLessThanOrEqual(6); }
  });

  it('at the cap gives the free places to the flows by their cadence: a heavy flow sends more than an expected one', () => {
    const { f } = keep(flowsOf());
    // a link inside the estate, crossing no gate, so no weighbridge's queue holds it
    const heavy = f.flows().find((x) => x.link && x.gates.length === 0 && x.origins.length === 1 && x.destinations.length === 1)!;
    f.setFlows([{ from: heavy.link!.from, to: heavy.link!.to, cls: 'measured-heavy' }]);
    const before = new Map(f.flows().map((x) => [x.key, x.sent]));
    run(f, 600);
    const sent = f.flows().filter((x) => x.link).map((x) => [x.key, x.sent - before.get(x.key)!] as const);
    const others = sent.filter(([k]) => k !== heavy.key).map(([, n]) => n).sort((a, b) => a - b);
    expect(sent.find(([k]) => k === heavy.key)![1]).toBeGreaterThanOrEqual(2 * others[Math.floor(others.length / 2)]);
  });

  it('keeps the roads moving at the cap: over the sixth simulated minute, three in four vehicles are on the move', () => {
    const { f } = keep(flowsOf());
    run(f, 300);
    let standing = 0, n = 0;
    run(f, 60, () => { for (const v of f.vehicles()) { n++; if (v.v < 0.1 && (v.state === 'out' || v.state === 'back')) standing++; } });
    expect(standing / n).toBeLessThan(0.25);
    expect(n / (60 / STEP)).toBeGreaterThan(CAP.laptop * 0.8);
  });

  it('stops a vehicle crossing a gate on the weighbridge for a second and a half, and unloads one at the bay for two (B3)', () => {
    const { f } = keep(flowsOf());
    const weighed = new Map<Vehicle, number>(), unloaded = new Map<Vehicle, number>();
    let seen: { v: Vehicle; gate: string; x: number; y: number } | null = null;
    run(f, 120, () => {
      for (const v of f.vehicles()) {
        if (v.state === 'weighing') { weighed.set(v, (weighed.get(v) ?? 0) + STEP); expect(v.v).toBe(0); if (!seen) seen = { v, gate: v.trip.stops[v.stop - 1].gate, x: v.x, y: v.y }; }
        if (v.state === 'unloading') { unloaded.set(v, (unloaded.get(v) ?? 0) + STEP); expect(v.leg).toBe('out'); }
      }
    });
    expect(weighed.size).toBeGreaterThan(5); expect(unloaded.size).toBeGreaterThan(5);
    // a whole stop lasts the weighbridge's time; a stop cut by the run's start or end is shorter
    const full = [...weighed.values()].filter((t) => t > WEIGH * 0.9);
    expect(full.length).toBeGreaterThan(3);
    for (const t of full) expect(t).toBeLessThanOrEqual(WEIGH + 2 * STEP);
    for (const t of [...unloaded.values()].filter((x) => x > UNLOAD * 0.9)) expect(t).toBeLessThanOrEqual(UNLOAD + 2 * STEP);
    // it stood on the gate's plate, and every vehicle that weighed was laden
    const gate = LAYOUT.gates.find((g) => g.id === seen!.gate)!;
    expect(Math.hypot(seen!.x - gate.at[0], seen!.y - gate.at[1])).toBeLessThan(6);
    for (const v of weighed.keys()) expect(v.flow.key).toBeTruthy();
  });

  it('drives back empty in a lighter tone and is gone at home, leaving nothing behind (spawn and despawn)', () => {
    const { ctx, f } = keep(flowsOf());
    const ids = new Set(f.vehicles().map((v) => v.id));
    run(f, 300);
    // most of the first fleet has gone home and new vehicles took its places
    expect(f.vehicles().filter((v) => ids.has(v.id)).length).toBeLessThan(ids.size / 2);
    const vehicles = ctx.entities.filter((e) => e.kind === 'vehicle');
    expect(vehicles.length).toBe(f.live());
    expect(f.roads.occupancy()).toBe(f.live());
    let proxies = 0, instances = 0;
    ctx.scene.traverse((o) => { if (o.name === 'vehicle') proxies++; if ((o as THREE.InstancedMesh).isInstancedMesh && /^fleet-(?!walker|coin)/.test(o.name)) instances += (o as THREE.InstancedMesh).count; });
    expect(proxies).toBe(f.live()); expect(instances).toBe(f.live());
    // the tone: laden at 1, empty lighter
    const mesh = (v: Vehicle) => { let m: THREE.InstancedMesh | null = null; ctx.scene.traverse((o) => { if (o.name === `fleet-${v.vkind}`) m = o as THREE.InstancedMesh; }); return m!; };
    const col = new THREE.Color();
    const back = f.vehicles().find((v) => v.leg === 'back')!, out = f.vehicles().find((v) => v.leg === 'out')!;
    mesh(back).getColorAt(back.member.slot, col); expect(col.r).toBeGreaterThan(1.05);
    mesh(out).getColorAt(out.member.slot, col); expect(col.r).toBeCloseTo(1, 5);
    f.dispose(); systems = systems.filter((x) => x !== f);
    expect(f.roads.occupancy()).toBe(0);
    expect(ctx.scene.getObjectByName('flows')).toBeUndefined();
  });

  it('rides a coin against every laden vehicle with the credit layer on, and none with it off', () => {
    const { ctx, f } = keep(flowsOf());
    const coins = () => { let n = 0; ctx.scene.traverse((o) => { if (o.name === 'fleet-coin') n = (o as THREE.InstancedMesh).count; }); return n; };
    run(f, 1);
    expect(coins()).toBe(0);
    f.setLayer('credit', true); run(f, 1);
    expect(coins()).toBe(f.vehicles().filter((v) => v.laden).length);
    expect(ctx.scene.getObjectByName('coins')!.visible).toBe(true);
    f.setLayer('credit', false); run(f, 1);
    expect(coins()).toBe(0);
  });

  it('calls ships at the quays, runs the rail shuttle, and walks the town’s pavements on a laptop only (B5)', () => {
    const { ctx, f } = keep(flowsOf());
    const ent = (id: string) => ctx.entities.find((e) => e.id === id)!;
    const bulk = ent('SHIP-BULK'), box = ent('SHIP-CONTAINER'), train = ent('TRAIN-SHUTTLE');
    expect(bulk.info().status).toBe('arriving');
    const at = (e: typeof train) => e.groups[0].position.clone();
    const t0 = at(train), s0 = at(bulk);
    run(f, 40);
    expect(bulk.info().status).toBe('loading');
    expect(at(bulk).distanceTo(s0)).toBeGreaterThan(20);
    expect(at(train).distanceTo(t0)).toBeGreaterThan(20);
    expect(box.info().rows.find(([k]) => k === 'Cargo')![1]).toMatch(/imports/);
    expect(ctx.entities.filter((e) => e.kind === 'walker').length).toBeGreaterThan(20);
    const phone = keep(flowsOf(REGISTRY.links, { phone: true }));
    expect(phone.ctx.entities.filter((e) => e.kind === 'walker').length).toBe(0);
  });

  it('draws the whole fleet in a handful of draw calls, whatever its size (B6)', () => {
    const { ctx, f } = keep(flowsOf());
    const drawn = () => { let n = 0; const walk = (o: THREE.Object3D) => { if (!o.visible) return; if ((o as THREE.Mesh).isMesh || (o as { isLineSegments2?: boolean }).isLineSegments2) n++; o.children.forEach(walk); }; walk(ctx.scene.getObjectByName('flows')!); return n; };
    // at the moment the fleet is full
    for (let k = 0; k < 90 / STEP && f.live() < CAP.laptop; k++) f.update(STEP);
    expect(f.live()).toBe(CAP.laptop);
    const full = drawn();
    expect(full).toBeLessThanOrEqual(40);
    const few = keep(flowsOf(REGISTRY.links.slice(0, 4)));
    let n = 0; const walk = (o: THREE.Object3D) => { if (!o.visible) return; if ((o as THREE.Mesh).isMesh || (o as { isLineSegments2?: boolean }).isLineSegments2) n++; o.children.forEach(walk); }; walk(few.ctx.scene.getObjectByName('flows')!);
    expect(full).toBe(n);
  });

  it('counts in words, never in figures', () => {
    expect(countInWords(0)).toBe('no'); expect(countInWords(1)).toBe('one'); expect(countInWords(12)).toBe('twelve');
    expect(countInWords(20)).toBe('twenty'); expect(countInWords(21)).toBe('more than twenty');
  });
});

describe('the cards and the pointer on flows (PRD v2 §3.4, §3.11)', () => {
  beforeEach(installWorldStubs);
  afterEach(disposeWorlds);

  it('says on a vehicle’s card its kind, load, ends and link state, that the traffic is illustrative, and no figure', async () => {
    let sel: Selection | null = null;
    const { handle } = await mountWorld({ onSelect: (s) => { sel = s; } });
    const ids = window.world!.all().filter((e) => e.kind === 'vehicle').map((e) => e.id);
    expect(ids.length).toBeGreaterThan(200);
    for (const id of ids.slice(0, 60)) {
      handle.select(id);
      const card = sel!.info;
      expect(card.rows.map(([k]) => k)).toEqual(['Load', 'From', 'To', 'Link', 'Traffic']);
      expect(card.rows.find(([k]) => k === 'Traffic')![1]).toBe(TRAFFIC_LINE);
      for (const [, v] of card.rows) expect(v, `${id}: ${v}`).not.toMatch(/\d/);
      expect(card.title).not.toMatch(/\d/);
      expect(card.rows.find(([k]) => k === 'Link')![1]).toMatch(/^(Expected, not measured|Measured by a published model|A return or a port call)/);
      expect(card.actions!.map(([k]) => k)).toEqual(['Open the supplier', 'Open the customer']);
    }
    // the supplier's button selects the supplier's lot
    handle.select(ids[0]);
    const from = window.world!.all().find((e) => e.id === ids[0])!.facts!.from;
    sel!.info.actions![0][1]();
    expect(handle.selected()).toBe(from);
  });

  it('counts the flows crossing a gate in words on its card', async () => {
    let sel: Selection | null = null;
    const { handle } = await mountWorld({ onSelect: (s) => { sel = s; } });
    handle.select('gate-east');
    const row = sel!.info.rows.find(([k]) => k === 'Flows')!;
    expect(row[1]).toMatch(/^(One flow crosses|(Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|More than twenty) flows cross) it$/);
    expect(sel!.info.rows.find(([k]) => k === 'Weighbridge')![1]).toMatch(/stops on it/);
  });

  it('finds a vehicle under the pointer through its instance, labels it by its load and ends, and frames it', async () => {
    await mountWorld();
    const v = window.world!.all().find((e) => e.kind === 'vehicle' && e.facts!.state === 'out' && e.facts!.road !== '' && !String(e.facts!.road).startsWith('driveway'))!;
    window.world!.centre(v.id, 12); frames(2);
    const [x, y] = window.world!.screenOf(v.id)!;
    const hit = window.world!.hoverAt(x, y)!;
    expect(hit.kind).toBe('vehicle');
    expect(hit.label).toMatch(/ · from .+ to .+$/);
    window.world!.select(hit.id);
    expect(window.world!.selected()).toBe(hit.id);
  });
});
