/**
 * The value-chain highlight (PRD §7.9; mega prompt §7): selecting a building
 * lights one level of its chain (a line per link: solid for a measured
 * flow, dashed and labelled "expected, not measured" otherwise) and dims
 * everything outside it; a company lights its sub-industry's chain; the
 * full chain lights the whole connected component; clearing restores every
 * material; dispose leaves nothing in the scene or the sky.
 */
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  mounted.push({ handle, container }); return { handle, scene: scenes[before] };
}
// the cast shadow is translucent by design (PRD v2 §3.2), so it is not a dimmed thing
const translucent = (scene: THREE.Scene) => { let n = 0; scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && !Array.isArray(m) && m.transparent && m.opacity < 0.5 && m.name !== 'shadow') n++; }); return n; };

describe('the chain highlight', () => {
  const placed = REGISTRY.subIndustries.filter((s) => s.zone !== 'unplaced');
  const withLinks = placed.find((s) => linksFrom(s.code).length + linksTo(s.code).length >= 2)!;
  const degree = (code: string) => linksFrom(code).length + linksTo(code).length;

  it('lights one level: a line per link, expected ones dashed and labelled, everything else dimmed; a company lights its sub-industry', async () => {
    const { handle, scene } = await mount();
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
    expect(drawn.dimmed).toBeGreaterThan(0);
    expect(translucent(scene)).toBeGreaterThan(0);
    const dashed = scene.getObjectByName('chain')!.children.filter((c) => c.visible);
    expect(dashed.length).toBe(1);
    // a company lights its sub-industry's chain
    const company = withLinks.companies[0];
    if (company) { handle.highlightChain(company.ticker, 1); expect(window.world!.chain()[0]).toBe(withLinks.code); }
    handle.highlightChain(null, 1);
    expect(window.world!.chain()).toEqual([]);
    expect(translucent(scene)).toBe(0);
    expect(scene.getObjectByName('chain')!.children.filter((c) => c.visible)).toEqual([]);
  });

  it('a measured flow draws solid; the full chain lights the connected component; dispose leaves nothing', async () => {
    const { handle, scene } = await mount();
    const l = linksFrom(withLinks.code)[0] ?? linksTo(withLinks.code)[0];
    handle.setFlowWeights([{ from: l.from, to: l.to, cls: 'measured-heavy' }]);
    handle.highlightChain(withLinks.code, 1);
    expect(window.world!.chainDrawn().measured).toBe(1);
    expect(scene.getObjectByName('chain')!.children.filter((c) => c.visible).length).toBe(2);
    handle.highlightChain(withLinks.code, 'all');
    const all = window.world!.chain();
    expect(all.length).toBeGreaterThan(degree(withLinks.code) + 1);
    // every code in the component is reachable over the link register in either direction
    const comp = new Set<string>([withLinks.code]); const q = [withLinks.code];
    while (q.length) { const c = q.shift()!; for (const x of LINKS) { if (x.from !== c && x.to !== c) continue; const o = x.from === c ? x.to : x.from; if (!comp.has(o)) { comp.add(o); q.push(o); } } }
    expect(new Set(all)).toEqual(comp);
    handle.dispose(); mounted.pop();
    expect(scene.getObjectByName('chain')).toBeUndefined();
    expect(translucent(scene)).toBe(0);
  });
});
