/**
 * The value-chain highlight (PRD v2 §3.9; mega prompt §6 D1): selecting a
 * building lights one level of its chain on the roads its goods take, every
 * link's routes with dashes travelling towards the customer (long dashes for
 * a measured link, short for an expected one), the linked lots outlined, and
 * everything else dimmed; no route carries a label (the words "expected, not
 * measured" are said once, in the card), and a hovered route shows its
 * link's note; a company lights its sub-industry's chain; a vehicle lights
 * its own route and its two lots; the full chain lights the whole connected
 * component and frames it at the district band; clearing restores every
 * material; dispose leaves nothing in the scene or the sky.
 *
 * Rewritten for PRD v2 §3.9 from v1's straight lines between buildings with
 * a label on each expected one (§7.9): the counts per link, the dimming, the
 * restore and the dispose are asserted as before.
 */
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { RendererLike, WorldHandle } from '@/world/engine/types';
import { LAYOUT } from '@/world/placement/layout.generated';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { LINKS, linksFrom, linksTo } from '@/lib/world/registry/links.generated';

let mounted: { handle: WorldHandle; container: HTMLElement }[] = [];
let scenes: THREE.Scene[] = [];
const origAdd = THREE.Scene.prototype.add;
beforeEach(() => {
  scenes = [];
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
  THREE.Scene.prototype.add = function (this: THREE.Scene, ...o: THREE.Object3D[]) { if (!scenes.includes(this)) scenes.push(this); return origAdd.apply(this, o); };
});
afterEach(() => { for (const m of mounted) { m.handle.dispose(); m.container.remove(); } mounted = []; THREE.Scene.prototype.add = origAdd; vi.unstubAllGlobals(); });
const renderer = (canvas: HTMLCanvasElement): RendererLike => ({ domElement: canvas, setSize() {}, setPixelRatio() {}, setClearColor() {}, render() {}, dispose() {}, forceContextLoss() {}, clippingPlanes: [], autoClear: true, info: { autoReset: true, reset() {}, render: { calls: 0 } }, capabilities: { getMaxAnisotropy: () => 1 } });
async function mount() {
  const { createWorld } = await import('@/world/engine');
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 1280 }); Object.defineProperty(container, 'clientHeight', { value: 720 });
  document.body.append(container);
  const before = scenes.length;
  const handle = createWorld(container, { registry: REGISTRY, layout: LAYOUT, theme: { font: 'sans-serif' }, seed: 3, debug: true, createRenderer: renderer });
  mounted.push({ handle, container }); return { handle, scene: scenes[before], sky: scenes[before + 1] };
}
// translucent by design, so not a dimmed thing: the cast shadow (PRD v2 §3.2), a lamp's pool of light (§3.8) and the
// cold-chain layer's tint on the cold stores (§3.12)
const DESIGNED = new Set(['shadow', 'glow-pool', 'cold-tint']);
const translucent = (scene: THREE.Scene) => { let n = 0; scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && !Array.isArray(m) && m.transparent && m.opacity < 0.5 && !DESIGNED.has(m.name)) n++; }); return n; };
/** The chain's drawn lines (the routes' pick ribbons are never drawn). */
const lines = (scene: THREE.Scene) => scene.getObjectByName('chain')!.children.filter((c) => c.visible && (c as { isLineSegments2?: boolean }).isLineSegments2) as (THREE.Mesh & { material: LineMaterial })[];
const frames = (n: number) => { for (let i = 0; i < n; i++) window.world!.tick(1 / 30); };

describe('the chain highlight (PRD v2 §3.9)', () => {
  const placed = REGISTRY.subIndustries.filter((s) => s.zone !== 'unplaced');
  const withLinks = placed.find((s) => linksFrom(s.code).length + linksTo(s.code).length >= 2)!;
  const degree = (code: string) => linksFrom(code).length + linksTo(code).length;

  it('lights one level on the roads: every link’s routes with travelling dashes, the linked lots outlined, the rest dimmed, no label on any route; a company lights its sub-industry', async () => {
    const { handle, scene, sky } = await mount();
    expect(window.world!.chain()).toEqual([]);
    expect(translucent(scene)).toBe(0);
    handle.highlightChain(withLinks.code, 1);
    const codes = window.world!.chain();
    expect(codes[0]).toBe(withLinks.code);
    const neighbours = new Set([...linksFrom(withLinks.code).map((l) => l.to), ...linksTo(withLinks.code).map((l) => l.from)]);
    expect(new Set(codes.slice(1))).toEqual(neighbours);
    const drawn = window.world!.chainDrawn();
    expect(drawn.measured + drawn.expected).toBe(degree(withLinks.code));
    expect(drawn.measured).toBe(0); // nothing is measured until the boundary says so
    // every link has its routes on the roads, a route per supplier lot; every lit sub-industry's lots are outlined
    expect(drawn.routes).toBeGreaterThanOrEqual(degree(withLinks.code));
    expect(drawn.outlined).toBeGreaterThanOrEqual(codes.length);
    expect(drawn.dimmed).toBeGreaterThan(0);
    expect(translucent(scene)).toBeGreaterThan(0);
    // one dashed line, the expected links', its dashes travelling while the world runs
    const [dashed] = lines(scene);
    expect(lines(scene).length).toBe(1);
    expect(dashed.material.dashed).toBe(true);
    const off = window.world!.chainDrawn().offset;
    frames(10);
    expect(window.world!.chainDrawn().offset).toBeLessThan(off);
    expect(dashed.material.dashOffset).toBe(window.world!.chainDrawn().offset);
    // no label in the sky: the note is the card's, once (PRD v2 §3.9)
    let sprites = 0; sky.traverse((o) => { if ((o as THREE.Sprite).isSprite && o.parent?.name.startsWith('chain')) sprites++; });
    expect(sprites).toBe(0);
    expect(scene.getObjectByName('chain-outlines') ?? sky.getObjectByName('chain-outlines')).toBeTruthy();
    // a company lights its sub-industry's chain
    const company = withLinks.companies[0];
    if (company) { handle.highlightChain(company.ticker, 1); expect(window.world!.chain()[0]).toBe(withLinks.code); }
    handle.highlightChain(null, 1);
    expect(window.world!.chain()).toEqual([]);
    expect(translucent(scene)).toBe(0);
    expect(lines(scene)).toEqual([]);
    expect(window.world!.all().filter((e) => e.kind === 'route')).toEqual([]);
  });

  it('shows a hovered route’s link note', async () => {
    const { handle } = await mount();
    // the goods vehicles stand on the roads; with the logistics layer off nothing covers a route
    handle.setLayer('logistics', false);
    handle.highlightChain(withLinks.code, 1);
    frames(2);
    const notes = new Set([...linksFrom(withLinks.code), ...linksTo(withLinks.code)].map((l) => l.note && l.note[0].toUpperCase() + l.note.slice(1)));
    let found: { id: string; kind: string; label: string } | null = null;
    for (const r of window.world!.all().filter((e) => e.kind === 'route')) {
      window.world!.centre(r.id, 2); frames(1);
      const p = window.world!.screenOf(r.id)!;
      const h = window.world!.hoverAt(p[0], p[1]);
      if (h?.kind === 'route') { found = h; break; }
    }
    expect(found).not.toBeNull();
    expect(notes.has(found!.label)).toBe(true);
  });

  it('draws every road a link’s goods take: every supplier lot to every customer lot, as the vehicles drive them', async () => {
    await mount();
    const link = LINKS.find((l) => l.from === 'A121' && l.to === 'B121')!;
    const routes = window.world!.routes(link.from, link.to);
    const pairs = new Set(routes.map((r) => `${r.from}>${r.to}`));
    expect(routes.length).toBeGreaterThanOrEqual(2);
    // no pair twice, and every vehicle on the link drives one of them
    expect(pairs.size).toBe(routes.length);
    let seen = 0;
    for (let k = 0; k < 6 && seen < 4; k++) {
      for (const v of window.world!.all().filter((e) => e.facts?.link === `${link.from}>${link.to}`)) { expect(pairs.has(`${v.facts!.from}>${v.facts!.to}`), `${v.facts!.from}>${v.facts!.to}`).toBe(true); seen++; }
      window.world!.step(30);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('draws what is lit again when a measured class arrives later', async () => {
    const { handle } = await mount();
    handle.highlightChain(withLinks.code, 1);
    expect(window.world!.chainDrawn().measured).toBe(0);
    const l = linksFrom(withLinks.code)[0] ?? linksTo(withLinks.code)[0];
    handle.setFlowWeights([{ from: l.from, to: l.to, cls: 'measured-light' }]);
    expect(window.world!.chainDrawn().measured).toBe(1);
    expect(window.world!.chain()[0]).toBe(withLinks.code);
  });

  it('lights a selected vehicle’s route, ahead and behind, and its two lots only', async () => {
    const { handle } = await mount();
    const v = window.world!.all().find((e) => e.kind === 'vehicle' && e.facts && String(e.facts.link).includes('>'))!;
    handle.highlightChain(v.id, 1);
    const d = window.world!.chainDrawn();
    expect(d.routes).toBe(1);
    expect(d.outlined).toBe(2);
    const ends = window.world!.all().filter((e) => e.id === v.facts!.from || e.id === v.facts!.to);
    expect(ends.length).toBe(2);
    expect(new Set(window.world!.chain())).toEqual(new Set(String(v.facts!.link).split('>')));
    expect(d.dimmed).toBeGreaterThan(0);
  });

  it('a measured link draws its long dashes; the full chain lights the connected component and frames it at the district band; dispose leaves nothing', async () => {
    const { handle, scene } = await mount();
    const l = linksFrom(withLinks.code)[0] ?? linksTo(withLinks.code)[0];
    handle.setFlowWeights([{ from: l.from, to: l.to, cls: 'measured-heavy' }]);
    handle.highlightChain(withLinks.code, 1);
    expect(window.world!.chainDrawn().measured).toBe(1);
    expect(lines(scene).length).toBe(2);
    const [a, b] = lines(scene).map((x) => x.material.dashSize);
    expect(a).not.toBe(b);
    window.world!.centre(withLinks.code, 8); frames(1);
    handle.highlightChain(withLinks.code, 'all');
    const all = window.world!.chain();
    expect(all.length).toBeGreaterThan(degree(withLinks.code) + 1);
    // every code in the component is reachable over the link register in either direction
    const comp = new Set<string>([withLinks.code]); const q = [withLinks.code];
    while (q.length) { const c = q.shift()!; for (const x of LINKS) { if (x.from !== c && x.to !== c) continue; const o = x.from === c ? x.to : x.from; if (!comp.has(o)) { comp.add(o); q.push(o); } } }
    expect(new Set(all)).toEqual(comp);
    // the camera eases out to frame it, at the district band
    frames(60);
    expect(window.world!.band()).toBe('district');
    handle.dispose(); mounted.pop();
    expect(scene.getObjectByName('chain')).toBeUndefined();
    expect(translucent(scene)).toBe(0);
  });
});
