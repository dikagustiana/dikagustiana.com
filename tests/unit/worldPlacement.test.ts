/**
 * The placement algorithm (PRD §9.4; mega prompt §6.1): deterministic for a
 * registry and a seed, no two blocks overlap, every placed sub-industry has a
 * block with two company lots inside it, every block lies inside the world and its
 * region's template, and the committed layout.generated.ts is what the
 * algorithm produces today. PRD v2 §3.2 (D-V2-2): the content is packed to at
 * most 1,500 × 900 m with an 80 m margin of slab round it, and no road runs
 * through a block or a fixture. PRD v2 §3.5: every lot is at least 18 m by
 * 24 m (an office unit of 10 m by 8 m beside a large family's shared form),
 * its two bays stand on its driveway, and the driveway reaches a road's
 * centreline without passing through another block, fixture or lot.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { LAYOUT } from '@/world/placement/layout.generated';
import { LARGE_FAMILIES, MARGIN, OFFICE_UNIT, overlaps, placeWorld, segmentCrosses } from '@/world/placement/place';
import type { Box, Pt } from '@/world/placement/types';

const inside = (a: Box, b: Box) => a.x0 >= b.x0 - 1e-6 && a.x1 <= b.x1 + 1e-6 && a.y0 >= b.y0 - 1e-6 && a.y1 <= b.y1 + 1e-6;

describe('placement', () => {
  const layout = placeWorld(REGISTRY, 20261004, LAYOUT.registrySha256);

  it('is deterministic: the same registry and seed give the same layout, and the committed file is current', () => {
    expect(placeWorld(REGISTRY, 20261004, LAYOUT.registrySha256)).toEqual(layout);
    expect(layout).toEqual(LAYOUT);
    expect(fs.readFileSync(path.resolve(__dirname, '../../src/world/placement/layout.generated.ts'), 'utf8')).toContain(LAYOUT.registrySha256);
  });

  it('gives every placed sub-industry one block with two company lots inside it', () => {
    const placed = REGISTRY.subIndustries.filter((s) => s.zone !== 'unplaced');
    expect(layout.blocks).toHaveLength(placed.length);
    for (const s of placed) {
      const b = layout.blocks.find((x) => x.code === s.code);
      expect(b, s.code).toBeDefined();
      expect(b!.lots.map((l) => l.id)).toEqual([`${s.code}-lot-1`, `${s.code}-lot-2`]);
      for (const l of b!.lots) expect(inside(l.box, b!.box), `${l.id} inside ${b!.id}`).toBe(true);
      expect(overlaps(b!.lots[0].box, b!.lots[1].box), `${b!.id} lots apart`).toBe(false);
    }
  });

  it('sizes every lot to at least 18 by 24 m, or an office unit beside a large family (PRD v2 §3.5)', () => {
    for (const b of layout.blocks) for (const l of b.lots) {
      const w = l.box.x1 - l.box.x0, d = l.box.y1 - l.box.y0;
      if (LARGE_FAMILIES.includes(b.family)) { expect(l.office, l.id).toBe(true); expect([Math.max(w, d), Math.min(w, d)], l.id).toEqual([OFFICE_UNIT.front, OFFICE_UNIT.depth]); continue; }
      expect(l.office, l.id).toBe(false);
      expect(Math.min(w, d), l.id).toBeGreaterThanOrEqual(18);
      expect(Math.max(w, d), l.id).toBeGreaterThanOrEqual(24);
    }
  });

  it('puts both bays on the lot’s driveway, and the driveway on a road without passing another block, fixture or lot', () => {
    const onSegment = (p: Pt, a: Pt, b: Pt) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)); return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
    const onPath = (p: Pt, path: readonly Pt[]) => Math.min(...path.slice(1).map((q, i) => onSegment(p, path[i], q)));
    const roadDistance = (p: Pt) => Math.min(...layout.roads.flatMap((r) => { const pts = r.closed ? [...r.points, r.points[0]] : r.points; return pts.slice(1).map((q, i) => onSegment(p, pts[i], q)); }));
    const lots = layout.blocks.flatMap((b) => b.lots.map((l) => ({ block: b, lot: l })));
    const shrink = (x: Box): Box => ({ x0: x.x0 + 0.5, x1: x.x1 - 0.5, y0: x.y0 + 0.5, y1: x.y1 - 0.5 });
    for (const { block, lot } of lots) {
      expect(lot.driveway.length, lot.id).toBeGreaterThanOrEqual(2);
      expect(onPath(lot.bays.despatch, lot.driveway), `${lot.id} despatch`).toBeLessThan(0.05);
      expect(onPath(lot.bays.receiving, lot.driveway), `${lot.id} receiving`).toBeLessThan(0.05);
      expect(roadDistance(lot.driveway[lot.driveway.length - 1]), `${lot.id} reaches a road`).toBeLessThan(0.05);
      const others = [...layout.blocks.filter((b) => b !== block).map((b) => ({ id: b.id, box: b.box })), ...layout.fixtures.map((f) => ({ id: f.id, box: f.box })), ...lots.filter((x) => x.lot !== lot).map((x) => ({ id: x.lot.id, box: x.lot.box }))];
      const hits = others.filter((o) => lot.driveway.slice(1).some((q, i) => segmentCrosses(lot.driveway[i], q, shrink(o.box)))).map((o) => o.id);
      expect(hits, `${lot.id} driveway`).toEqual([]);
    }
  });

  it('never overlaps two blocks, or a block and a fixture', () => {
    const boxes = [...layout.blocks.map((b) => ({ id: b.id, box: b.box })), ...layout.fixtures.map((f) => ({ id: f.id, box: f.box }))];
    const clashes: string[] = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlaps(boxes[i].box, boxes[j].box)) clashes.push(`${boxes[i].id} × ${boxes[j].id}`);
    expect(clashes).toEqual([]);
  });

  it('packs the content within 1,500 × 900 m and keeps an 80 m margin of slab round it (PRD v2 §3.2)', () => {
    const w = layout.world, cw = w.x1 - w.x0 - 2 * MARGIN, ch = w.y1 - w.y0 - 2 * MARGIN;
    expect(MARGIN).toBe(80);
    expect(cw).toBeLessThanOrEqual(1500);
    expect(ch).toBeLessThanOrEqual(900);
    // the margin is measured from what is drawn: every region, block and fixture lies inside the content box
    const content: Box = { x0: w.x0 + MARGIN, x1: w.x1 - MARGIN, y0: w.y0 + MARGIN, y1: w.y1 - MARGIN };
    for (const r of layout.regions) for (const [x, y] of r.polygon) expect(inside({ x0: x, x1: x, y0: y, y1: y }, content), r.id).toBe(true);
    const touch = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (const b of [...layout.blocks.map((x) => x.box), ...layout.fixtures.map((f) => f.box)]) { touch.x0 = Math.min(touch.x0, b.x0); touch.x1 = Math.max(touch.x1, b.x1); touch.y0 = Math.min(touch.y0, b.y0); touch.y1 = Math.max(touch.y1, b.y1); }
    expect(inside(touch, content)).toBe(true);
  });

  it('runs no road through a block or a fixture', () => {
    const things = [...layout.blocks.map((b) => ({ id: b.id, box: b.box })), ...layout.fixtures.map((f) => ({ id: f.id, box: f.box }))];
    const hits: string[] = [];
    for (const r of layout.roads) {
      const pts = r.closed ? [...r.points, r.points[0]] : r.points;
      for (let i = 0; i + 1 < pts.length; i++) for (const t of things) if (segmentCrosses(pts[i], pts[i + 1], { x0: t.box.x0 + 0.5, x1: t.box.x1 - 0.5, y0: t.box.y0 + 0.5, y1: t.box.y1 - 0.5 })) hits.push(`${r.id} × ${t.id}`);
    }
    expect([...new Set(hits)]).toEqual([]);
  });

  it('builds a road graph on which every bay reaches every other bay, every gate is a node, and no edge crosses a lot (PRD v2 §3.6, B4)', () => {
    const g = layout.graph!;
    const adj = new Map<number, number[]>();
    for (const e of g.edges) { adj.set(e.a, [...(adj.get(e.a) ?? []), e.b]); adj.set(e.b, [...(adj.get(e.b) ?? []), e.a]); }
    const bays = g.nodes.filter((n) => n.kind === 'despatch' || n.kind === 'receiving');
    expect(bays).toHaveLength(layout.blocks.length * 2 * 2);
    // every edge is two-way, so one search from any bay finds the component every bay must be in
    const seen = new Set([bays[0].id]), queue = [bays[0].id];
    while (queue.length) for (const m of adj.get(queue.shift()!) ?? []) if (!seen.has(m)) { seen.add(m); queue.push(m); }
    expect(bays.filter((b) => !seen.has(b.id)).map((b) => `${b.ref} ${b.kind}`)).toEqual([]);
    // each lot's bays are nodes where the layout puts them
    for (const b of layout.blocks) for (const l of b.lots) {
      const d = g.nodes.find((n) => n.kind === 'despatch' && n.ref === l.id)!, r = g.nodes.find((n) => n.kind === 'receiving' && n.ref === l.id)!;
      expect(Math.hypot(d.at[0] - l.bays.despatch[0], d.at[1] - l.bays.despatch[1]), l.id).toBeLessThan(0.05);
      expect(Math.hypot(r.at[0] - l.bays.receiving[0], r.at[1] - l.bays.receiving[1]), l.id).toBeLessThan(0.05);
    }
    for (const gate of layout.gates) expect(g.nodes.some((n) => n.kind === 'gate' && n.ref === gate.id), gate.id).toBe(true);
    // no edge passes through a lot (a driveway leaves its own lot's front)
    const lots = layout.blocks.flatMap((b) => b.lots);
    const hits: string[] = [];
    for (const e of g.edges) for (const l of lots) {
      if (e.road === `driveway:${l.id}`) continue;
      const box = { x0: l.box.x0 + 0.25, x1: l.box.x1 - 0.25, y0: l.box.y0 + 0.25, y1: l.box.y1 - 0.25 };
      if (e.points.slice(1).some((q, i) => segmentCrosses(e.points[i], q, box))) hits.push(`${e.road} × ${l.id}`);
    }
    expect(hits).toEqual([]);
    for (const e of g.edges) expect(e.length, `${e.road} ${e.id}`).toBeGreaterThan(0);
  });

  it('keeps every block inside the world', () => {
    for (const b of layout.blocks) expect(inside(b.box, layout.world), b.id).toBe(true);
    for (const f of layout.fixtures) expect(inside(f.box, layout.world), f.id).toBe(true);
  });

  it('draws the raw-export road dashed and every other road solid, and puts a weighbridge gate on every road leaving the estate', () => {
    expect(layout.roads.filter((r) => r.dashed).map((r) => r.id)).toEqual(['raw-export']);
    for (const g of layout.gates) { expect(g.weighbridge).toBe(true); expect(layout.roads.some((r) => r.id === g.road), g.road).toBe(true); }
    expect(layout.gates.map((g) => g.id)).toEqual(['gate-north', 'gate-south', 'gate-west', 'gate-east', 'gate-port']);
  });

  it('names the seven economy signposts and labels every region and block', () => {
    expect(layout.signposts).toHaveLength(7);
    expect(layout.labels.filter((l) => l.level === 'far')).toHaveLength(layout.regions.length);
    expect(layout.labels.filter((l) => l.level === 'middle')).toHaveLength(layout.blocks.length);
  });
});
