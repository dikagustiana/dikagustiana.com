/**
 * Phase I (mega prompt §11), the parts jsdom can hold: the LOD switch at
 * each zoom (the near group hides at the far view and shows at the middle
 * and near views), the reduced-motion fallback (the schematic and one line,
 * no engine), the phone's start by hand (no engine until the first
 * interaction), the house formatter as the world's only number formatter,
 * and a glyph beside the word on every status the shell shows.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import type { RendererLike, WorldHandle } from '@/world/engine/types';
import { LAYOUT } from '@/world/placement/layout.generated';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { STATUS_VOCAB, STORIES } from '@/lib/world/constants';

const { reduced, phone } = vi.hoisted(() => ({ reduced: { value: false }, phone: { value: false } }));
vi.mock('@/lib/motion', async (orig) => ({ ...(await orig<object>()), prefersReducedMotion: () => reduced.value }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => phone.value }));
vi.mock('@/integrations/supabase/client', () => { const b: Record<string, unknown> = {}; for (const m of ['select', 'eq', 'order', 'limit', 'in']) b[m] = () => b; (b as { then: unknown }).then = Promise.resolve({ data: [], error: null }).then.bind(Promise.resolve({ data: [], error: null })); return { supabase: { from: () => b } }; });
vi.mock('@/lib/finance-in-action/published', async (orig) => ({ ...(await orig<object>()), fetchPublishedPackages: async () => [] }));

import WorldFrame from '@/components/world/WorldFrame';
import { WorldPoster } from '@/components/world/Poster';

function mount(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

describe('the LOD switch', () => {
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

  it('hides the near group at the far view and shows it at the middle and near distances, frame by frame', async () => {
    const { createWorld } = await import('@/world/engine');
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 1280 }); Object.defineProperty(container, 'clientHeight', { value: 720 });
    document.body.append(container);
    const before = scenes.length;
    const handle = createWorld(container, { registry: REGISTRY, layout: LAYOUT, theme: { font: 'sans-serif' }, seed: 3, debug: true, createRenderer: renderer });
    mounted.push({ handle, container });
    const scene = scenes[before];
    const near = () => { let g: THREE.Object3D | undefined; scene.traverse((o) => { if (o.name === 'near') g = o; }); return g!; };
    for (let i = 0; i < 5; i++) window.world!.tick(1 / 60);
    expect(window.world!.distance()).toBe(0);
    expect(near().visible).toBe(false); // the far view: plots and their signs are hidden
    handle.select('B121'); handle.setDistance(0.5);
    for (let i = 0; i < 240; i++) window.world!.tick(1 / 60); // the camera eases to its goal
    expect(window.world!.distance()).toBeGreaterThan(0.4);
    expect(near().visible).toBe(true);
    handle.setDistance(1);
    for (let i = 0; i < 240; i++) window.world!.tick(1 / 60);
    expect(window.world!.distance()).toBeGreaterThan(0.9);
    expect(near().visible).toBe(true);
    handle.lookAt('whole');
    for (let i = 0; i < 300; i++) window.world!.tick(1 / 60);
    expect(window.world!.distance()).toBeLessThan(0.1);
    expect(near().visible).toBe(false);
  });
});

describe('the shell’s fallbacks', () => {
  beforeEach(() => { reduced.value = false; phone.value = false; HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('under reduced motion renders the schematic and one line, and mounts no engine', async () => {
    reduced.value = true;
    mount(<WorldFrame variant="full" heading="h1" />);
    expect(document.querySelector('.world-frame[data-world="reduced"]')).not.toBeNull();
    expect(screen.getByText(/not shown while your system asks for reduced motion/)).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('canvas')).toBeNull();
    expect(screen.getByRole('heading', { name: 'The industry chain', level: 1 })).toBeInTheDocument();
  });

  it('on a phone keeps the poster and offers to start the world by hand; the places fold into a disclosure', async () => {
    phone.value = true;
    mount(<WorldFrame variant="full" heading="h1" />);
    expect(screen.getByRole('button', { name: 'Start the world' })).toBeInTheDocument();
    expect(document.querySelector('details summary')).toHaveTextContent('Places');
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('.world-frame__canvas-host')!.children.length).toBe(0);
  });
});

describe('the first paint (gate 4, O8)', () => {
  beforeEach(() => { reduced.value = false; phone.value = false; HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']; });
  afterEach(() => { document.body.innerHTML = ''; });
  // useId differs between two trees; everything else must be the same markup
  const html = (el: Element | null) => (el?.outerHTML ?? '').replace(/ws:?r[0-9a-z]+:?/g, 'ws-id');
  const firstPaint = (ui: ReactElement) => { const { container, unmount } = mount(ui); const out = { header: html(container.querySelector('.world-frame > header')), poster: html(container.querySelector('.world-frame__stage > img')), frame: container.querySelector('.world-frame')!.className }; unmount(); return out; };

  for (const [variant, heading, onPhone] of [['preview', 'h1', false], ['full', 'h2', false], ['preview', 'h1', true]] as const) {
    it(`draws the frame's own header and poster before the frame arrives, so nothing moves when it takes over (${variant}, ${heading}${onPhone ? ', phone' : ''})`, () => {
      phone.value = onPhone;
      const poster = firstPaint(<WorldPoster variant={variant} heading={heading} />);
      const frame = firstPaint(<WorldFrame variant={variant} heading={heading} />);
      expect(poster.header).toContain('Reading the published models');
      expect(poster.header).toBe(frame.header);
      expect(poster.poster.replace(' data-hidden="false"', '')).toBe(frame.poster.replace(' data-hidden="false"', ''));
      expect(poster.frame).toBe(frame.frame);
    });
  }

  it('names the header’s control groups for a screen reader, the Stories with its six stories; a phone has a Stories select (PRD v2 §3.10, §3.15)', () => {
    const { unmount } = mount(<WorldFrame variant="preview" heading="h1" />);
    for (const name of ['Places', 'Zoom', 'Layers', 'Stories']) expect(screen.getByRole('group', { name })).toBeTruthy();
    expect(within(screen.getByRole('group', { name: 'Stories' })).getAllByRole('button').map((b) => b.textContent)).toEqual(STORIES.map((x) => x.title));
    unmount();
    phone.value = true;
    mount(<WorldFrame variant="preview" heading="h1" />);
    const select = screen.getByRole('combobox', { name: 'Stories' });
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['None', ...STORIES.map((x) => x.title)]);
  });

  it('fetches the frame on the first touch of the poster, before any paint is reported', () => {
    const wake = vi.fn();
    mount(<WorldPoster variant="preview" heading="h1" onWake={wake} />);
    expect(wake).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Skema' }));
    expect(wake).toHaveBeenCalled();
  });
});

describe('shell rules', () => {
  const ROOTS = ['src/components/world', 'src/lib/world', 'src/pages/world'].map((d) => path.resolve(__dirname, '../..', d));
  const files = ROOTS.flatMap((r) => (fs.existsSync(r) ? fs.readdirSync(r, { recursive: true }).map((f) => path.join(r, String(f))).filter((f) => /\.tsx?$/.test(f) && fs.statSync(f).isFile()) : []));
  const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

  it('formats every figure through the house formatter: no toFixed, toLocaleString or Intl.NumberFormat in the world’s shell', () => {
    const hits = files.flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').flatMap((line, i) => (!isComment(line) && /\.toFixed\(|toLocaleString\(|Intl\.NumberFormat/.test(line) ? [`${path.relative(process.cwd(), f)}:${i + 1}`] : [])));
    expect(hits).toEqual([]);
    const importers = files.filter((f) => /from '@\/lib\/finance-in-action\/format'/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.basename(f));
    expect(importers).toEqual(expect.arrayContaining(['Board.tsx', 'whiteboard.ts', 'useWorldData.ts']));
  });

  it('shows a glyph beside the word for every status, and no two statuses share a glyph', () => {
    const glyphs = Object.values(STATUS_VOCAB).map((v) => v.glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
    for (const v of Object.values(STATUS_VOCAB)) expect(v.word).not.toMatch(/^[■□⬚⊟—▢▣-]/);
  });
});
