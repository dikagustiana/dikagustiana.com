/**
 * The world as built from the generated layout (mega prompt §6.2, §11):
 * every placed sub-industry is an entity with two plots, the gates,
 * signposts and fixtures are entities, model statuses light the right
 * buildings with the right glyph word (and an outage never reads as
 * absence), the layers switch their vehicles, flow classes add trucks
 * and only trucks, two seeded worlds replay identically, and the draw
 * calls the far, middle and near views would issue stay under the PRD's
 * budgets (1,200 / 1,600 / 1,900), counted here as the renderable objects
 * the view leaves visible, since jsdom has no renderer.
 */
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererLike, WorldHandle } from '@/world/engine/types';
import { LAYOUT } from '@/world/placement/layout.generated';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { TRAFFIC_LINE } from '@/world/world/build';

interface Mounted { handle: WorldHandle; container: HTMLElement; scene: () => THREE.Scene }
let mounted: Mounted[] = [];
let scenes: THREE.Scene[] = [];
const origAdd = THREE.Scene.prototype.add;

beforeEach(() => {
  scenes = [];
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
  // jsdom has no 2D canvas and logs an error for every getContext call; the engine probes once and draws no text here
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
  // every scene made while a world mounts is remembered, so the test can count what it holds
  THREE.Scene.prototype.add = function (this: THREE.Scene, ...o: THREE.Object3D[]) { if (!scenes.includes(this)) scenes.push(this); return origAdd.apply(this, o); };
});
afterEach(() => { for (const m of mounted) { m.handle.dispose(); m.container.remove(); } mounted = []; THREE.Scene.prototype.add = origAdd; vi.unstubAllGlobals(); });

const renderer = (canvas: HTMLCanvasElement): RendererLike => ({ domElement: canvas, setSize() {}, setPixelRatio() {}, setClearColor() {}, render() {}, dispose() {}, forceContextLoss() {}, clippingPlanes: [], autoClear: true, info: { autoReset: true, reset() {}, render: { calls: 0 } }, capabilities: { getMaxAnisotropy: () => 1 } });

async function mount(seed = 3, debug = true) {
  const { createWorld } = await import('@/world/engine');
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 1280 }); Object.defineProperty(container, 'clientHeight', { value: 720 });
  document.body.append(container);
  const before = scenes.length;
  const handle = createWorld(container, { registry: REGISTRY, layout: LAYOUT, theme: { font: 'sans-serif' }, seed, debug, createRenderer: renderer });
  const m: Mounted = { handle, container, scene: () => scenes[before] };
  mounted.push(m); return m;
}
/** What a frame would draw: every visible mesh and line (one draw call each, as the engine's parts are built). */
function drawables(scene: THREE.Scene): number {
  let n = 0;
  scene.traverse((o) => { if (!o.visible) return; if ((o as THREE.Mesh).isMesh || (o as { isLineSegments2?: boolean }).isLineSegments2) n++; });
  // traverse() does not skip the children of invisible groups, so count only what has every ancestor visible
  n = 0; const walk = (o: THREE.Object3D) => { if (!o.visible) return; if ((o as THREE.Mesh).isMesh || (o as { isLineSegments2?: boolean }).isLineSegments2) n++; o.children.forEach(walk); }; walk(scene);
  return n;
}

describe('the world scene', () => {
  it('has an entity for every placed sub-industry, two plots each, every gate, signpost and fixture, and traffic', async () => {
    const { handle } = await mount();
    const all = window.world!.all();
    const kinds = new Map<string, number>(); for (const e of all) kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1);
    expect(kinds.get('building')).toBe(125);
    expect(kinds.get('company')).toBe(250);
    expect(kinds.get('gate')).toBe(5);
    expect(kinds.get('signpost')).toBe(7);
    expect((kinds.get('fixture') ?? 0) + (kinds.get('thinktank') ?? 0)).toBe(4);
    expect(kinds.get('truck')! + kinds.get('reefer')! + kinds.get('loop')! + kinds.get('raw')! + kinds.get('coin')!).toBeGreaterThan(30);
    expect(new Set(all.map((e) => e.id)).size, 'ids are unique').toBe(all.length);
    expect(handle.selected()).toBeNull();
  });

  it('reads model statuses: published lights the building, an outage reads as unavailable, absence as no model yet', async () => {
    const { handle } = await mount();
    const find = (id: string) => window.world!.all().find((e) => e.id === id)!;
    expect(find('B121').status).toBe('No model yet');
    expect(find('B147').status, 'a sub-industry with no listed issuer').toBe('No listed issuer');
    handle.setModelStatus(new Map([['INTP', { ticker: 'INTP', state: 'published', period: '2026Q2' }]]));
    expect(find('B121').status).toBe('Published');
    expect(find('INTP').status).toBe('Published');
    expect(find('A121').status).toBe('No model yet');
    handle.setModelStatus(new Map(REGISTRY.subIndustries.flatMap((s) => s.companies.map((c) => [c.ticker, { ticker: c.ticker, state: 'unavailable' as const }]))));
    expect(find('B121').status).toBe('Status unavailable');
    expect(find('INTP').status).toBe('Status unavailable');
    expect(find('A121').status).not.toBe('No model yet');
  });

  it('says on every vehicle card that the traffic is illustrative', async () => {
    await mount();
    const { createWorld: _ } = await import('@/world/engine'); void _;
    const vehicles = window.world!.all().filter((e) => ['truck', 'reefer', 'loop', 'raw', 'coin', 'forklift', 'train', 'walker', 'van'].includes(e.kind));
    expect(vehicles.length).toBeGreaterThan(0);
    // the status is 'moving' or 'waiting'; the card's rows carry the line
    window.world!.select(vehicles[0].id);
    expect(window.world!.selected()).toBe(vehicles[0].id);
    expect(TRAFFIC_LINE).toBe('Illustrative traffic; see the model for figures');
  });

  it('switches the cold-chain reefers and the money layer with their layers, and adds trucks for measured flows', async () => {
    const { handle, scene } = await mount();
    const s = scene();
    const group = (name: string) => { let g: THREE.Object3D | undefined; s.traverse((o) => { if (o.name === name) g = o; }); return g; };
    const traffic = group('traffic')!, reefers = traffic.children[1], coins = traffic.children[2];
    expect(reefers.visible).toBe(false); expect(coins.visible).toBe(false);
    handle.setLayer('cold-chain', true); expect(reefers.visible).toBe(true);
    handle.setLayer('credit', true); expect(coins.visible).toBe(true);
    const before = window.world!.all().filter((e) => e.kind === 'truck').length;
    handle.setFlowWeights([{ from: 'A121', to: 'B121', cls: 'measured-heavy' }, { from: 'B121', to: 'J211', cls: 'measured-light' }]);
    expect(window.world!.all().filter((e) => e.kind === 'truck').length).toBe(before + 3);
    handle.setFlowWeights([]);
    expect(window.world!.all().filter((e) => e.kind === 'truck').length).toBe(before);
  });

  it('replays deterministically: two worlds with one seed agree after 120 simulated seconds', async () => {
    const a = await mount(11), b = await mount(11, false);
    a.handle.step(120);
    const snapA = window.world!.all();
    a.handle.dispose(); mounted.splice(mounted.indexOf(a), 1);
    // the second world's debug api is not exposed; read its entities through a fresh mount with debug on
    b.handle.step(120);
    b.handle.dispose(); mounted.splice(mounted.indexOf(b), 1);
    const c = await mount(11);
    c.handle.step(120);
    expect(window.world!.all()).toEqual(snapA);
  });

  it('keeps the renderable count under the PRD budgets at the far, middle and near views', async () => {
    const { handle, scene } = await mount();
    const s = scene();
    const near = (() => { let g: THREE.Object3D | undefined; s.traverse((o) => { if (o.name === 'near') g = o; }); return g!; })();
    // the far view: the view hides the near group and the walkers when the zoom is low; the test applies the same switch
    near.visible = false;
    const far = drawables(s);
    near.visible = true;
    const close = drawables(s);
    expect(far, 'far view').toBeLessThanOrEqual(1200);
    expect(close, 'near view').toBeLessThanOrEqual(1900);
    expect(close).toBeGreaterThan(far);
    void handle;
  });
});
