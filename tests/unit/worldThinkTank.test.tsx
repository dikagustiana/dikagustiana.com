/**
 * The think tank (PRD §7.10; mega prompt §10): the building on the hill
 * lists its rooms, the registry's programmes that are on, and opens as a
 * section drawing with one room each; the panel lists each room's
 * published essays by title and date with the owner's kind, an untagged
 * piece lights nothing, a thesis shows its evidence and falsifier, a
 * model-based piece its models, and a piece's tags select the buildings
 * they name; the rooms and the interim tag file are the registry's and
 * the owner's, never the database's.
 */
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RendererLike, WorldHandle } from '@/world/engine/types';
import { LAYOUT } from '@/world/placement/layout.generated';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { ROOMS } from '@/lib/world/registry/generate';
import { buildRooms } from '@/world/interiors/thinktank';
import { Part } from '@/world/engine/kernel/part';
import { createTheme } from '@/world/engine/theme';
import { STATUS_VOCAB } from '@/lib/world/constants';
import type { Piece } from '@/lib/world/thinkTank';
import ThinkTank from '@/components/world/ThinkTank';

const on = ROOMS.filter((r) => r.on);

describe('the think tank in the world', () => {
  let mounted: { handle: WorldHandle; container: HTMLElement }[] = [];
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
    HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
  });
  afterEach(() => { for (const m of mounted) { m.handle.dispose(); m.container.remove(); } mounted = []; vi.unstubAllGlobals(); });
  const renderer = (canvas: HTMLCanvasElement): RendererLike => ({ domElement: canvas, setSize() {}, setPixelRatio() {}, setClearColor() {}, render() {}, dispose() {}, forceContextLoss() {}, clippingPlanes: [], autoClear: true, info: { autoReset: true, reset() {}, render: { calls: 0 } }, capabilities: { getMaxAnisotropy: () => 1 } });

  it('the building on the hill lists its rooms and offers the think tank', async () => {
    const { createWorld } = await import('@/world/engine');
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 1280 }); Object.defineProperty(container, 'clientHeight', { value: 720 });
    document.body.append(container);
    let selected: { info: { rows: readonly (readonly [string, string])[]; actions?: readonly (readonly [string, () => void])[] } } | null = null;
    const actions: unknown[] = [];
    const handle = createWorld(container, { registry: REGISTRY, layout: LAYOUT, theme: { font: 'sans-serif' }, seed: 3, debug: true, createRenderer: renderer, onSelect: (s) => { selected = s; }, onAction: (a) => actions.push(a) });
    mounted.push({ handle, container });
    expect(on.length).toBe(2);
    handle.select('think-tank');
    const sel = selected as unknown as { info: { rows: readonly (readonly [string, string])[]; actions?: readonly (readonly [string, () => void])[] } };
    expect(sel.info.rows.filter(([k]) => k === 'Room').map(([, v]) => v)).toEqual(on.map((r) => r.label));
    sel.info.actions![0][1]();
    expect(actions).toEqual([{ type: 'open-thinktank' }]);
  });

  it('its section drawing has one room per programme, each labelled, partitioned by low walls, inside the box', () => {
    const theme = createTheme(() => '215 28% 17%');
    const texts: string[] = [];
    const part = new Part({ theme, gfx: { aniso: 1 }, texts: { meshes: [], far: false }, font: 'sans-serif', text2d: false, guard: (t) => texts.push(t) });
    const box = { x0: 1450, x1: 1510, y0: -560, y1: -520 };
    const rooms = buildRooms(part, box, on.map((r) => ({ id: r.id, label: r.label })));
    expect(rooms.map((r) => r.id)).toEqual(on.map((r) => r.id));
    expect(texts).toEqual(on.map((r) => r.label));
    for (const r of rooms) { expect(r.box.x0).toBeGreaterThanOrEqual(box.x0); expect(r.box.x1).toBeLessThanOrEqual(box.x1); }
    expect(rooms[1].box.x0).toBe(rooms[0].box.x1);
    const g = part.build('rooms'); let meshes = 0; g.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
    expect(meshes).toBeGreaterThan(0);
    theme.dispose();
  });
});

describe('the think tank panel', () => {
  const piece = (o: Partial<Piece> & { slug: string; title: string }): Piece => ({ section: 'next-big-thing', date: '2026-09-01', phase: null, room: 'next-big-thing', kind: 'thesis', tags: [], evidence: [], falsifier: null, tagged: false, ...o });
  const sub = REGISTRY.subIndustries.find((s) => s.zone !== 'unplaced')!;
  const pieces: Piece[] = [
    piece({ slug: 'untagged', title: 'An untagged essay' }),
    piece({ slug: 'thesis', title: 'A thesis', tagged: true, tags: [sub.code, 'INTP'], evidence: [{ label: 'A named source', href: 'https://example.org/source' }], falsifier: 'A smelter financed without captive coal' }),
    piece({ slug: 'model', title: 'A model-based piece', kind: 'model-based', tagged: true, tags: ['INTP', 'SMGR'], room: 'industry-analysis', section: 'green-transition' }),
  ];

  it('lists each room’s pieces by title and date with the owner’s kind; an untagged piece lights nothing', () => {
    const onPiece = vi.fn(), onSelect = vi.fn(), onClose = vi.fn();
    render(<MemoryRouter><ThinkTank pieces={pieces} piece="untagged" onPiece={onPiece} onClose={onClose} onSelect={onSelect} /></MemoryRouter>);
    for (const r of on) expect(screen.getByRole('heading', { name: r.label })).toBeInTheDocument();
    const nbt = screen.getByRole('region', { name: on[0].label });
    expect(within(nbt).getByRole('button', { name: 'An untagged essay' })).toBeInTheDocument();
    expect(nbt.textContent).toContain('1 September 2026');
    expect(nbt.textContent).toContain(`${STATUS_VOCAB.thesis.glyph} ${STATUS_VOCAB.thesis.word}`);
    expect(nbt.textContent).toContain('untagged');
    const ia = screen.getByRole('region', { name: on[1].label });
    expect(within(ia).getByRole('button', { name: 'A model-based piece' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'The piece' }).textContent).toContain('Untagged: this piece lights nothing yet.');
  });

  it('a thesis shows its evidence and falsifier; a model-based piece its models; a tag selects its building', () => {
    const onPiece = vi.fn(), onSelect = vi.fn(), onClose = vi.fn();
    const { rerender } = render(<MemoryRouter><ThinkTank pieces={pieces} piece="thesis" onPiece={onPiece} onClose={onClose} onSelect={onSelect} /></MemoryRouter>);
    const open = screen.getByRole('region', { name: 'The piece' });
    expect(within(open).getByRole('heading', { name: STATUS_VOCAB.thesis.word })).toBeInTheDocument();
    expect(within(open).getByRole('link', { name: 'A named source' })).toHaveAttribute('href', 'https://example.org/source');
    expect(open.textContent).toContain('A smelter financed without captive coal');
    within(open).getByRole('button', { name: sub.nameEn }).click();
    expect(onSelect).toHaveBeenCalledWith(sub.code);
    rerender(<MemoryRouter><ThinkTank pieces={pieces} piece="model" onPiece={onPiece} onClose={onClose} onSelect={onSelect} /></MemoryRouter>);
    const model = screen.getByRole('region', { name: 'The piece' });
    expect(within(model).getByRole('heading', { name: STATUS_VOCAB['model-based'].word })).toBeInTheDocument();
    expect(within(model).getByRole('link', { name: 'INTP' })).toHaveAttribute('href', expect.stringContaining('intp'));
    expect(within(model).getByRole('link', { name: 'SMGR' })).toBeInTheDocument();
    screen.getByRole('button', { name: 'Close the think tank' }).click();
    expect(onClose).toHaveBeenCalled();
  });
});
