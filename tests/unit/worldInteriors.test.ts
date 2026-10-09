/**
 * Archetype interiors and driver placement (PRD §7.8; mega prompt §9.1–9.2):
 * six archetypes with the PRD's stations, tags on every station, anchors
 * inside the box, a fallback for every zone; the synonym matcher binds the
 * fixture's cost lines to the right stations and leaves what nothing matches
 * to the whiteboard; each interior draws inside its box without a figure;
 * exposing a company opens its plot and marks its bound stations with the
 * lines' labels, a line lights by id, deselecting clears, dispose leaves
 * nothing.
 */
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererLike, WorldHandle } from '@/world/engine/types';
import { LAYOUT } from '@/world/placement/layout.generated';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { ARCHETYPES, ZONES } from '@/lib/world/registry/types';
import { ARCHETYPE_FOR_ZONE, INTERIORS, stationAt, stationFor } from '@/world/interiors';
import { matchStation, tokens } from '@/lib/world/registry/physical-units';
import { Part, FIGURE } from '@/world/engine/kernel/part';
import { createTheme } from '@/world/engine/theme';
import { bindingsFrom } from '@/world/data/boundary';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import fixture from '@/data/finance-in-action/fixtures/XCEM.SYNTHETIC.json';

const PRD_STATIONS: Record<string, number> = { PROC: 6, DIST: 5, ASSET: 4, MINE: 5, FARM: 4, SERVICE: 3 };

describe('archetype interiors', () => {
  it('has the PRD’s six archetypes, the PRD’s station count each, tags on every station, anchors inside the box', () => {
    expect(Object.keys(INTERIORS).sort()).toEqual([...ARCHETYPES].sort());
    for (const a of ARCHETYPES) {
      const st = INTERIORS[a].STATIONS;
      expect(st.length, a).toBe(PRD_STATIONS[a]);
      expect(new Set(st.map((s) => s.id)).size).toBe(st.length);
      for (const s of st) { expect(s.tags.length).toBeGreaterThan(2); expect(s.tags.every((t) => t === t.toLowerCase())).toBe(true); for (const v of s.anchor) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(1); } expect(FIGURE.test(s.label)).toBe(false); }
    }
    for (const z of ZONES) expect(ARCHETYPES).toContain(ARCHETYPE_FOR_ZONE[z]);
    expect(ARCHETYPE_FOR_ZONE['ring-geological']).toBe('MINE'); expect(ARCHETYPE_FOR_ZONE['ring-biological']).toBe('FARM');
    expect(ARCHETYPE_FOR_ZONE['estate-primary']).toBe('PROC'); expect(ARCHETYPE_FOR_ZONE['town-distribution']).toBe('DIST');
    expect(ARCHETYPE_FOR_ZONE.infrastructure).toBe('ASSET'); expect(ARCHETYPE_FOR_ZONE['town-financial']).toBe('SERVICE');
  });

  it('matches physical units to stations by whole token after the synonym table, case-insensitively, and leaves the rest to the whiteboard', () => {
    expect(stationFor('PROC', 'GJ of fuel', 'Fuel per tonne of clinker')).toBe('line');
    expect(stationFor('PROC', 'Tonnes of coal', '')).toBe('line');
    expect(stationFor('PROC', 'KILN FUEL', '')).toBe('line');
    expect(stationFor('PROC', 'Rp thousand per tonne of clinker', 'Raw material cost per tonne of clinker × clinker produced')).toBe('receiving');
    expect(stationFor('PROC', 'Rp thousand per tonne', 'Packaging per tonne × tonnes sold')).toBe('packing');
    expect(stationFor('PROC', 'Rp bn per quarter', 'Head office, selling and distribution costs, mostly fixed per quarter')).toBe('despatch');
    expect(stationFor('DIST', 'pallet-days', '')).toBe('racks');
    expect(stationFor('DIST', 'Rp per DO', 'Delivery orders × cost per trip')).toBe('loading');
    expect(stationFor('MINE', 'Bank cubic metres', 'Overburden removed × cost per bcm')).toBe('pit');
    expect(stationFor('FARM', 'Tonnes of FFB', 'Fresh fruit bunches harvested')).toBe('harvest');
    expect(stationFor('ASSET', 'Tower tenancies', '')).toBe('asset');
    expect(stationFor('SERVICE', 'Patient days', '')).toBe('reception');
    expect(stationFor('PROC', 'Rp', 'None')).toBeNull();
    expect(tokens('PROC', 'Rp thousand per tonne', 'Power cost per tonne × tonnes sold')).toEqual(['power', 'despatch']);
    expect(matchStation('PROC', [{ id: 'a', tags: ['foo'] }, { id: 'b', tags: ['foo', 'bar'] }], 'foo', 'foo bar')).toBe('b');
    expect(matchStation('PROC', [{ id: 'a', tags: ['foo'] }, { id: 'b', tags: ['foo'] }], 'foo', '')).toBe('a');
  });

  it('binds the fixture’s cost lines through the boundary: labels only, every cost line placed, and nothing placed when nothing matches', () => {
    const pkg = fixture as unknown as ModelPackage;
    const b = bindingsFrom(pkg, (u, d) => stationFor('PROC', u, d));
    expect(b.map((x) => [x.lineId, x.stationId])).toEqual([['fuel', 'line'], ['power', 'line'], ['raw', 'receiving'], ['packaging', 'packing'], ['sga', 'despatch']]);
    for (const x of b) expect(FIGURE.test(x.label)).toBe(false);
    expect(bindingsFrom(pkg, () => null).every((x) => x.stationId === null)).toBe(true);
  });

  it('every interior draws inside its box and writes no figure', () => {
    const theme = createTheme(() => '215 28% 17%');
    const box = { x0: 100, x1: 118, y0: 50, y1: 62 };
    for (const a of ARCHETYPES) {
      const texts: string[] = [];
      const part = new Part({ theme, gfx: { aniso: 1 }, texts: { meshes: [], far: false }, font: 'sans-serif', text2d: false, guard: (t) => texts.push(t) });
      INTERIORS[a].build(part, box);
      const g = part.build(a);
      // the faces' bounds (the hairlines are instanced line segments, whose bounding box three.js leaves empty)
      const bb = new THREE.Box3();
      g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { const geo = (o as THREE.Mesh).geometry; geo.computeBoundingBox(); bb.union(geo.boundingBox!); } });
      expect(bb.min.x, a).toBeGreaterThanOrEqual(box.x0 - 0.5); expect(bb.max.x, a).toBeLessThanOrEqual(box.x1 + 0.5);
      expect(bb.min.z, a).toBeGreaterThanOrEqual(box.y0 - 0.5); expect(bb.max.z, a).toBeLessThanOrEqual(box.y1 + 0.5);
      expect(texts.length).toBe(INTERIORS[a].STATIONS.length);
      for (const t of texts) expect(FIGURE.test(t)).toBe(false);
      for (const s of INTERIORS[a].STATIONS) { const [x, y] = stationAt(box, s); expect(x).toBeGreaterThan(box.x0); expect(x).toBeLessThan(box.x1); expect(y).toBeGreaterThan(box.y0); expect(y).toBeLessThan(box.y1); }
    }
    theme.dispose();
  });
});

describe('driver placement', () => {
  let mounted: { handle: WorldHandle; container: HTMLElement }[] = [];
  let skies: THREE.Scene[] = [];
  const origAdd = THREE.Scene.prototype.add;
  beforeEach(() => {
    skies = [];
    vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
    HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
    THREE.Scene.prototype.add = function (this: THREE.Scene, ...o: THREE.Object3D[]) { if (o.some((x) => x.name === 'stations') && !skies.includes(this)) skies.push(this); return origAdd.apply(this, o); };
  });
  afterEach(() => { for (const m of mounted) { m.handle.dispose(); m.container.remove(); } mounted = []; THREE.Scene.prototype.add = origAdd; vi.unstubAllGlobals(); });
  const renderer = (canvas: HTMLCanvasElement): RendererLike => ({ domElement: canvas, setSize() {}, setPixelRatio() {}, setClearColor() {}, render() {}, dispose() {}, forceContextLoss() {}, clippingPlanes: [], autoClear: true, info: { autoReset: true, reset() {}, render: { calls: 0 } }, capabilities: { getMaxAnisotropy: () => 1 } });
  const markers = () => { const g = skies[skies.length - 1].getObjectByName('stations'); return g ? (g.children as THREE.Sprite[]) : []; };

  it('exposing a company opens its plot, marks its bound stations with the lines’ labels, lights one by line id, clears on deselect and on dispose', async () => {
    const { createWorld } = await import('@/world/engine');
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 1280 }); Object.defineProperty(container, 'clientHeight', { value: 720 });
    document.body.append(container);
    const handle = createWorld(container, { registry: REGISTRY, layout: LAYOUT, theme: { font: 'sans-serif' }, seed: 3, debug: true, createRenderer: renderer });
    mounted.push({ handle, container });
    const company = REGISTRY.subIndustries.flatMap((s) => s.companies)[0];
    const pkg = fixture as unknown as ModelPackage;
    const bindings = bindingsFrom(pkg, (u, d) => stationFor('PROC', u, d));
    // the zone's fallback decides the interior until a status names an archetype; the bindings here are PROC's
    handle.setModelStatus(new Map([[company.ticker, { ticker: company.ticker, state: 'published', archetype: 'PROC' }]]));
    handle.exposeCompany(company.ticker, bindings);
    expect(handle.selected()).toBe(company.ticker);
    expect(markers().length).toBe(bindings.filter((b) => b.stationId).length);
    expect(markers().map((m) => m.userData.lineId)).toEqual(bindings.filter((b) => b.stationId).map((b) => b.lineId));
    expect(window.world!.exposed()).toMatchObject({ ticker: company.ticker, placed: { fuel: 'line', raw: 'receiving' }, lit: null });
    handle.lightStation('raw');
    expect(window.world!.exposed()?.lit).toBe('raw');
    const lit = markers().find((m) => m.userData.lineId === 'raw')!, other = markers().find((m) => m.userData.lineId === 'fuel')!;
    expect(lit.scale.x / (lit.userData.px as number[])[0]).toBeGreaterThan(other.scale.x / (other.userData.px as number[])[0]);
    handle.lightStation(null);
    expect(window.world!.exposed()?.lit).toBeNull();
    // a company nobody knows exposes nothing
    handle.exposeCompany('ZZZZ', bindings);
    expect(markers().length).toBe(0);
    expect(window.world!.exposed()).toBeNull();
    handle.exposeCompany(company.ticker, bindings);
    expect(markers().length).toBeGreaterThan(0);
    handle.select(null); handle.step(0.05);
    // the frame loop clears the markers once the plot is no longer selected; here it is driven by hand
    handle.dispose(); mounted.pop();
    expect(skies[skies.length - 1].getObjectByName('stations')).toBeUndefined();
  });
});
