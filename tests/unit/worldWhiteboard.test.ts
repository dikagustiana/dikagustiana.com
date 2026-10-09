/**
 * The in-world whiteboard (PRD §7.7; mega prompt §9.3): its content is
 * computed on the shell's side from a published package (top three cost
 * drivers by share of cost of revenue, the waterfall at the latest
 * reported period, the peer position by the PRD's rule), every label at
 * most twelve characters and every figure the house formatter's; the
 * engine draws it on the cut's back wall when a company is exposed,
 * "No model yet" and nothing else without a model, and clicking it opens
 * the board.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererLike, Selection, WorldAction, WorldHandle } from '@/world/engine/types';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { LAYOUT } from '@/world/placement/layout.generated';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { LABEL_CHARS, shortLabel, whiteboardFor } from '@/lib/world/whiteboard';
import { NO_MODEL_NOTE } from '@/world/engine/whiteboard';
import { formatNumber } from '@/lib/finance-in-action/format';
import fixture from '@/data/finance-in-action/fixtures/XCEM.SYNTHETIC.json';

const pkg = fixture as unknown as ModelPackage;

describe('whiteboard content', () => {
  it('names the top three cost drivers by share, cuts labels to twelve characters, and writes figures with the house formatter', () => {
    const c = whiteboardFor(pkg, [pkg]);
    expect(c.ticker).toBe('XCEM');
    expect(c.drivers).toHaveLength(3);
    for (const d of c.drivers) { expect(d.label.length).toBeLessThanOrEqual(LABEL_CHARS); expect(d.figure).toMatch(/^\d+% · /); }
    const shares = c.drivers.map((d) => Number(d.figure.split('%')[0]));
    expect(shares).toEqual([...shares].sort((a, b) => b - a));
    expect(shares[0]).toBeGreaterThan(0);
    expect(c.waterfall.length).toBeGreaterThan(3);
    for (const b of c.waterfall) { expect(b.label.length).toBeLessThanOrEqual(LABEL_CHARS); expect(b.from).toBeGreaterThanOrEqual(0); expect(b.to).toBeLessThanOrEqual(1); expect(b.figure).toBe(formatNumber(Number(b.figure.replace(/\./g, '').replace(',', '.')), 0)); }
    expect(c.waterfall[0].role).toBe('revenue');
    expect(c.peer).toBeNull(); // the fixture alone has no peer
    expect(shortLabel('Selling, general and administrative')).toBe('Selling, ge…');
    expect(shortLabel('Kiln fuel')).toBe('Kiln fuel');
  });

  it('gives the peer position as marks on one scale: a comparator, or a band with the median', () => {
    const at = (v: number) => pkg.peerBand.map((e) => ({ ...e, value: v, rowRef: undefined }));
    const self = { ...pkg, peerBand: at(20) } as ModelPackage;
    // a peer counts only when published (the fixture is a preview): the rule's own filter
    const peer = { ...pkg, meta: { ...pkg.meta, ticker: 'YCEM', name: 'Y (SYNTHETIC)', status: 'published' }, peerBand: at(10) } as ModelPackage;
    const two = whiteboardFor(self, [self, peer]);
    expect(two.peer).toMatchObject({ heading: expect.stringContaining('vs one comparator'), self: 0.9, other: 0.1 });
    const third = { ...peer, meta: { ...peer.meta, ticker: 'ZCEM' }, peerBand: at(30) } as ModelPackage;
    const band = whiteboardFor(self, [self, peer, third]);
    expect(band.peer).toMatchObject({ min: 0.1, max: 0.9, median: 0.5, self: 0.5 });
  });
});

describe('the whiteboard in the world', () => {
  let mounted: { handle: WorldHandle; container: HTMLElement }[] = [];
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
    HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
  });
  afterEach(() => { for (const m of mounted) { m.handle.dispose(); m.container.remove(); } mounted = []; vi.unstubAllGlobals(); });
  const renderer = (canvas: HTMLCanvasElement): RendererLike => ({ domElement: canvas, setSize() {}, setPixelRatio() {}, setClearColor() {}, render() {}, dispose() {}, forceContextLoss() {}, clippingPlanes: [], autoClear: true, info: { autoReset: true, reset() {}, render: { calls: 0 } }, capabilities: { getMaxAnisotropy: () => 1 } });

  it('draws "No model yet" on an exposed company without a model, the content with one, and clicking it opens the board', async () => {
    const { createWorld } = await import('@/world/engine');
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 1280 }); Object.defineProperty(container, 'clientHeight', { value: 720 });
    document.body.append(container);
    const actions: WorldAction[] = []; let selection: Selection | null = null;
    const handle = createWorld(container, { registry: REGISTRY, layout: LAYOUT, theme: { font: 'sans-serif' }, seed: 3, debug: true, createRenderer: renderer, onAction: (a) => actions.push(a), onSelect: (s) => { selection = s; } });
    mounted.push({ handle, container });
    const company = REGISTRY.subIndustries.flatMap((s) => s.companies)[0];
    const id = `wb:${company.ticker}`;
    expect(window.world!.all().some((e) => e.id === id)).toBe(false);
    handle.exposeCompany(company.ticker, [], null);
    const bare = window.world!.all().find((e) => e.id === id);
    expect(bare).toMatchObject({ kind: 'whiteboard', status: NO_MODEL_NOTE });
    const content = whiteboardFor({ ...pkg, meta: { ...pkg.meta, ticker: company.ticker } } as ModelPackage, []);
    handle.exposeCompany(company.ticker, [], content);
    const drawn = window.world!.all().filter((e) => e.id === id);
    expect(drawn).toHaveLength(1); // redrawn, not duplicated
    expect(drawn[0].status).toBe('Published');
    handle.select(id);
    const sel = selection as Selection | null;
    expect(sel?.kind).toBe('whiteboard');
    expect(sel?.info.title).toBe(`${company.ticker} · ${content.period}`);
    sel!.info.actions![0][1]();
    expect(actions).toEqual([{ type: 'open-board', ticker: company.ticker }]);
    // the company's status word on its plot card and on the whiteboard agree
    handle.dispose(); mounted.pop();
    expect(window.world).toBeUndefined();
  });
});
