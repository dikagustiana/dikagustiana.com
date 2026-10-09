/**
 * Mounting the world engine in jsdom for the v2 suites: a fake renderer that
 * counts nothing, no 2D canvas (the engine probes once and draws no text),
 * no animation frame, and every scene remembered so a test can walk what it
 * holds. installWorldStubs() in a beforeEach, disposeWorlds() in an
 * afterEach; mountWorld() returns the handle, the container and the scene.
 */
import * as THREE from 'three';
import { vi } from 'vitest';
import type { RendererLike, WorldHandle, WorldOptions } from '@/world/engine/types';
import { LAYOUT } from '@/world/placement/layout.generated';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';

export interface MountedWorld { handle: WorldHandle; container: HTMLElement; scene: THREE.Scene; sky: THREE.Scene }

let mounted: MountedWorld[] = [];
let scenes: THREE.Scene[] = [];
const origAdd = THREE.Scene.prototype.add;

export const fakeRenderer = (canvas: HTMLCanvasElement): RendererLike => ({
  domElement: canvas, setSize() {}, setPixelRatio() {}, setClearColor() {}, render() {}, dispose() {}, forceContextLoss() {},
  clippingPlanes: [], autoClear: true, info: { autoReset: true, reset() {}, render: { calls: 0 } }, capabilities: { getMaxAnisotropy: () => 1 },
});

export function installWorldStubs(): void {
  scenes = [];
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
  THREE.Scene.prototype.add = function (this: THREE.Scene, ...o: THREE.Object3D[]) { if (!scenes.includes(this)) scenes.push(this); return origAdd.apply(this, o); };
}

export function disposeWorlds(): void {
  for (const m of mounted) { m.handle.dispose(); m.container.remove(); }
  mounted = [];
  THREE.Scene.prototype.add = origAdd;
  vi.unstubAllGlobals();
}

export async function mountWorld(o: { width?: number; height?: number; seed?: number; debug?: boolean } & Partial<WorldOptions> = {}): Promise<MountedWorld> {
  const { createWorld } = await import('@/world/engine');
  const { width = 1246, height = 700, seed = 3, debug = true, ...rest } = o;
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: width }); Object.defineProperty(container, 'clientHeight', { value: height });
  document.body.append(container);
  const before = scenes.length;
  const handle = createWorld(container, { registry: REGISTRY, layout: LAYOUT, theme: { font: 'sans-serif' }, seed, debug, createRenderer: fakeRenderer, ...rest });
  const m: MountedWorld = { handle, container, scene: scenes[before], sky: scenes[before + 1] };
  mounted.push(m);
  return m;
}

/** Run the view by hand for n frames of a sixtieth of a second (the camera eases, the LOD switches). */
export function frames(n: number): void { for (let i = 0; i < n; i++) window.world!.tick(1 / 60); }
