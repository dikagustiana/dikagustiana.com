/**
 * Condition marks and the distance control (PRD §7.3–§7.5; mega prompt §7):
 * every marked element of both shifts has a carrier the world can place (a
 * gate or signpost entity, or a region's anchor) or is read from the strip
 * (a layer, a return vehicle); the engine draws one disc per placed mark in
 * the sky, numbered in reading order, selectable, offering the condition;
 * clearing the overlay removes them all and disposing leaves nothing; the
 * camera reports its distance for the slider, 0 at home.
 */
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererLike, Selection, WorldAction, WorldHandle, WorldMark } from '@/world/engine/types';
import { LAYOUT } from '@/world/placement/layout.generated';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { marksFor } from '@/lib/world/presentation';
import { SHIFTS, STATUS } from '@/data/industryChain';
import { REGION_VIEW } from '@/lib/world/constants';

let mounted: { handle: WorldHandle; container: HTMLElement }[] = [];
let skies: THREE.Scene[] = [];
const origAdd = THREE.Scene.prototype.add;
beforeEach(() => {
  skies = [];
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
  // the scene that receives the marks group is the sky
  THREE.Scene.prototype.add = function (this: THREE.Scene, ...o: THREE.Object3D[]) { if (o.some((x) => x.name === 'marks') && !skies.includes(this)) skies.push(this); return origAdd.apply(this, o); };
});
afterEach(() => { for (const m of mounted) { m.handle.dispose(); m.container.remove(); } mounted = []; THREE.Scene.prototype.add = origAdd; vi.unstubAllGlobals(); });
const renderer = (canvas: HTMLCanvasElement): RendererLike => ({ domElement: canvas, setSize() {}, setPixelRatio() {}, setClearColor() {}, render() {}, dispose() {}, forceContextLoss() {}, clippingPlanes: [], autoClear: true, info: { autoReset: true, reset() {}, render: { calls: 0 } }, capabilities: { getMaxAnisotropy: () => 1 } });
async function mount(o: { onAction?: (a: WorldAction) => void; onSelect?: (s: Selection | null) => void } = {}) {
  const { createWorld } = await import('@/world/engine');
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 1280 }); Object.defineProperty(container, 'clientHeight', { value: 720 });
  document.body.append(container);
  const handle = createWorld(container, { registry: REGISTRY, layout: LAYOUT, theme: { font: 'sans-serif' }, seed: 3, debug: true, createRenderer: renderer, ...o });
  mounted.push({ handle, container }); return handle;
}
const sprites = () => { const g = skies[skies.length - 1].getObjectByName('marks'); return g ? (g.children.filter((c) => (c as THREE.Sprite).isSprite) as THREE.Sprite[]) : []; };
/** The shell's placement of a shift's marks: what WorldFrame hands the engine. */
const placed = (shift: (typeof SHIFTS)[number]['id']): WorldMark[] => marksFor(shift).flatMap((m): WorldMark[] => {
  const form = STATUS[m.target.condition!.status].form;
  if (m.carrier.kind === 'gate' || m.carrier.kind === 'signpost') return [{ targetId: m.targetId, n: m.n, label: m.label, form, at: { kind: 'entity' as const, id: m.carrier.id } }];
  if (m.carrier.kind === 'region') return [{ targetId: m.targetId, n: m.n, label: m.label, form, at: { kind: 'region' as const, id: m.carrier.id } }];
  return [];
});

describe('condition marks', () => {
  it('every marked element of both shifts has a carrier: a gate or signpost in the layout, a region with a view, a layer or a return vehicle', () => {
    for (const s of SHIFTS) {
      const marks = marksFor(s.id);
      expect(marks.length).toBeGreaterThan(0);
      expect(marks.map((m) => m.n)).toEqual(marks.map((_, i) => i + 1));
      for (const m of marks) {
        if (m.carrier.kind === 'gate') expect(LAYOUT.gates.some((g) => g.id === m.carrier.id), m.targetId).toBe(true);
        else if (m.carrier.kind === 'signpost') expect(LAYOUT.signposts.some((g) => g.id === m.carrier.id), m.targetId).toBe(true);
        else if (m.carrier.kind === 'region') { expect(LAYOUT.regions.some((r) => r.id === m.carrier.id), m.targetId).toBe(true); expect(REGION_VIEW[m.carrier.id], m.targetId).toBeDefined(); }
        else expect(['layer', 'vehicle'], m.targetId).toContain(m.carrier.kind);
      }
    }
  });

  it('draws one disc per placed mark, numbered and selectable, offering the condition; the overlay clears them and dispose leaves nothing', async () => {
    const actions: WorldAction[] = []; let selection: Selection | null = null;
    const handle = await mount({ onAction: (a) => actions.push(a), onSelect: (s) => { selection = s; } });
    const marks = placed('reindustrialisation');
    expect(marks.length).toBeGreaterThan(0);
    handle.setMarks(marks);
    expect(sprites().length).toBe(marks.length);
    for (const d of sprites()) { expect(d.scale.x).toBeGreaterThan(0); expect(d.scale.x).toBe(d.scale.y); }
    // two marks on one carrier stand side by side, never one under the other
    const positions = sprites().map((d) => `${d.position.x.toFixed(2)},${d.position.y.toFixed(2)},${d.position.z.toFixed(2)}`);
    expect(new Set(positions).size).toBe(positions.length);
    const ids = window.world!.all().filter((e) => e.kind === 'mark').map((e) => e.id);
    expect(ids).toEqual(marks.map((m) => `mark:${m.targetId}`));
    handle.select(ids[0]);
    expect(handle.selected()).toBe(ids[0]);
    const sel = selection as Selection | null;
    expect(sel?.info.rows).toContainEqual(['Mark', '1']);
    expect(sel?.info.rows).toContainEqual(['Target', marks[0].targetId]);
    sel!.info.actions![0][1]();
    expect(actions).toEqual([{ type: 'open-condition', targetId: marks[0].targetId }]);
    handle.setOverlay('none');
    expect(sprites().length).toBe(0);
    expect(window.world!.all().filter((e) => e.kind === 'mark')).toEqual([]);
    expect(handle.selected()).toBeNull();
    handle.setMarks(placed('green'));
    expect(sprites().length).toBe(placed('green').length);
    handle.dispose(); mounted.pop();
    expect(skies[skies.length - 1].getObjectByName('marks')).toBeUndefined();
  });

  it('reads the camera distance for the slider: 0 at the home view, within [0, 1] always, and carried on every frame reading', async () => {
    const handle = await mount();
    expect(window.world!.distance()).toBe(0);
    handle.setDistance(1);
    const d = window.world!.distance();
    expect(d).toBeGreaterThanOrEqual(0); expect(d).toBeLessThanOrEqual(1);
    const readings: number[] = [];
    const off = handle.subscribe((r) => readings.push(r.distance));
    off();
    expect(readings.every((x) => x >= 0 && x <= 1)).toBe(true);
  });
});
