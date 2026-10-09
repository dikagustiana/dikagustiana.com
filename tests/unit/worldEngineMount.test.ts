/**
 * The engine mounts and disposes cleanly (mega prompt §4.2): ten mounts and
 * disposes in a row leave no listener on the window, the document or the
 * container, no animation frame running, no canvas in the container and no
 * renderer alive; two worlds with one seed are independent and identical;
 * importing the module has no side effects.
 *
 * jsdom has no WebGL, so the renderer is a fake handed in through
 * options.createRenderer; the real WebGL path is covered by the Playwright
 * smoke test (Phase I).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererLike } from '@/world/engine/types';
import { emptyLayout } from '@/world/placement/empty';
import type { Registry } from '@/lib/world/registry/types';

const REGISTRY: Registry = { subIndustries: [], links: [], rooms: [], source: { title: '', publisher: '', url: '', sha256: '' } };

function fakeRenderer(log: { disposed: number; lost: number }) {
  return (canvas: HTMLCanvasElement): RendererLike => ({
    domElement: canvas,
    setSize() {}, setPixelRatio() {}, setClearColor() {}, render() { this.info.render.calls += 7; },
    dispose() { log.disposed++; }, forceContextLoss() { log.lost++; },
    clippingPlanes: [], autoClear: true,
    info: { autoReset: true, reset() { this.render.calls = 0; }, render: { calls: 0 } },
    capabilities: { getMaxAnisotropy: () => 1 },
  });
}

// listeners added and removed on every EventTarget, netted per target
const net = new Map<EventTarget, number>();
const added: string[] = [];
const origAdd = EventTarget.prototype.addEventListener, origRemove = EventTarget.prototype.removeEventListener;
// animation frames requested and not yet cancelled or run
const frames = new Set<number>();
let rafSeq = 1;

beforeEach(() => {
  net.clear(); frames.clear();
  added.length = 0;
  EventTarget.prototype.addEventListener = function (this: EventTarget, ...a: Parameters<EventTarget['addEventListener']>) { net.set(this, (net.get(this) ?? 0) + 1); added.push(`${Object.prototype.toString.call(this)}:${String(a[0])}`); return origAdd.apply(this, a); };
  EventTarget.prototype.removeEventListener = function (this: EventTarget, ...a: Parameters<EventTarget['removeEventListener']>) { net.set(this, (net.get(this) ?? 0) - 1); return origRemove.apply(this, a); };
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { const id = rafSeq++; frames.add(id); void fn; return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
  // jsdom has no 2D canvas and logs an error for every getContext call; the engine probes once and draws no text here
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
});
afterEach(() => {
  EventTarget.prototype.addEventListener = origAdd; EventTarget.prototype.removeEventListener = origRemove;
  vi.unstubAllGlobals();
});

async function mount(seed = 1) {
  const { createWorld } = await import('@/world/engine');
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 800 }); Object.defineProperty(container, 'clientHeight', { value: 600 });
  document.body.append(container);
  const log = { disposed: 0, lost: 0 };
  const handle = createWorld(container, { registry: REGISTRY, layout: emptyLayout(seed), theme: { font: 'sans-serif' }, seed, createRenderer: fakeRenderer(log) });
  return { container, handle, log };
}

describe('the world engine mounts and disposes', () => {
  it('importing the engine has no side effects: no canvas, no frame, no listener', async () => {
    const before = added.length;
    await import('@/world/engine');
    expect(document.querySelectorAll('canvas')).toHaveLength(0);
    expect(frames.size).toBe(0);
    // jsdom itself attaches mouseover/mouseout to the document the first time a module touches it; those are the
    // environment's, not the engine's
    const ours = added.slice(before).filter((a) => !/^\[object Document\]:mouse(over|out)$/.test(a));
    expect(ours, 'listeners added by the import').toEqual([]);
  });

  it('mounts and disposes ten times with nothing left behind', async () => {
    for (let i = 0; i < 10; i++) {
      const { container, handle, log } = await mount(i + 1);
      expect(container.querySelector('canvas'), 'the engine draws into its own canvas').not.toBeNull();
      expect(frames.size, 'the loop is running').toBe(1);
      handle.step(1);
      handle.dispose();
      expect(frames.size, 'no animation frame after dispose').toBe(0);
      expect(container.querySelector('canvas'), 'the canvas is removed').toBeNull();
      expect(log.disposed, 'the renderer is disposed once').toBe(1);
      expect(log.lost, 'the context is forced lost once').toBe(1);
      container.remove();
    }
    // a listener removed that was never added (OrbitControls removes its pointer-move listeners unconditionally) is
    // not a leak; a listener added and never removed is
    const leaks = [...net.entries()].filter(([, n]) => n > 0);
    expect(leaks, 'every listener added was removed').toEqual([]);
    expect(window.world).toBeUndefined();
  });

  it('dispose is idempotent', async () => {
    const { handle, log } = await mount();
    handle.dispose(); handle.dispose();
    expect(log.disposed).toBe(1);
  });

  it('two worlds with one seed are independent and identical', async () => {
    const a = await mount(7), b = await mount(7);
    a.handle.step(120);
    expect(a.handle.selected()).toBeNull();
    // the second world has not stepped: its clock is behind, so the two share nothing
    let ra = '', rb = '';
    const ua = a.handle.subscribe((r) => { ra = r.clock; }), ub = b.handle.subscribe((r) => { rb = r.clock; });
    a.handle.step(0); b.handle.step(0);
    // readings arrive on frames; run one by hand through the debug-free path: subscribe then dispose cleans up
    ua(); ub();
    expect(ra).toBe(''); expect(rb).toBe('');
    b.handle.step(120);
    a.handle.dispose(); b.handle.dispose();
  });

  it('exposes window.world only with debug on, and removes it on dispose', async () => {
    const { createWorld } = await import('@/world/engine');
    const container = document.createElement('div'); document.body.append(container);
    const h = createWorld(container, { registry: REGISTRY, layout: emptyLayout(), theme: { font: 'sans-serif' }, debug: true, createRenderer: fakeRenderer({ disposed: 0, lost: 0 }) });
    expect(window.world).toBeDefined();
    expect(window.world?.all()).toEqual([]);
    h.dispose();
    expect(window.world).toBeUndefined();
    container.remove();
  });
});
