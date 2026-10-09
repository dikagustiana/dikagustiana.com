/**
 * The placement algorithm (PRD §9.4; mega prompt §6.1): deterministic for a
 * registry and a seed, no two blocks overlap, every placed sub-industry has a
 * block with two plots inside it, every block lies inside the world and its
 * region's template, and the committed layout.generated.ts is what the
 * algorithm produces today. PRD v2 §3.2 (D-V2-2): the content is packed to at
 * most 1,500 × 900 m with an 80 m margin of slab round it, and no road runs
 * through a block or a fixture.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { LAYOUT } from '@/world/placement/layout.generated';
import { MARGIN, overlaps, placeWorld } from '@/world/placement/place';
import type { Box, Pt } from '@/world/placement/types';

/** Whether a segment passes through the inside of a box (Liang–Barsky). */
function crosses(a: Pt, b: Pt, x: Box): boolean {
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - x.x0], [dx, x.x1 - a[0]], [-dy, a[1] - x.y0], [dy, x.y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; t0 = Math.max(t0, r); } else { if (r < t0) return false; t1 = Math.min(t1, r); }
  }
  return t1 - t0 > 1e-9;
}
const inside = (a: Box, b: Box) => a.x0 >= b.x0 - 1e-6 && a.x1 <= b.x1 + 1e-6 && a.y0 >= b.y0 - 1e-6 && a.y1 <= b.y1 + 1e-6;

describe('placement', () => {
  const layout = placeWorld(REGISTRY, 20261004, LAYOUT.registrySha256);

  it('is deterministic: the same registry and seed give the same layout, and the committed file is current', () => {
    expect(placeWorld(REGISTRY, 20261004, LAYOUT.registrySha256)).toEqual(layout);
    expect(layout).toEqual(LAYOUT);
    expect(fs.readFileSync(path.resolve(__dirname, '../../src/world/placement/layout.generated.ts'), 'utf8')).toContain(LAYOUT.registrySha256);
  });

  it('gives every placed sub-industry one block with two plots inside it', () => {
    const placed = REGISTRY.subIndustries.filter((s) => s.zone !== 'unplaced');
    expect(layout.blocks).toHaveLength(placed.length);
    for (const s of placed) {
      const b = layout.blocks.find((x) => x.code === s.code);
      expect(b, s.code).toBeDefined();
      expect(b!.plots).toHaveLength(2);
      for (const p of b!.plots) expect(inside(p.box, b!.box), `${p.id} inside ${b!.id}`).toBe(true);
      expect(overlaps(b!.plots[0].box, b!.plots[1].box), `${b!.id} plots apart`).toBe(false);
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
      for (let i = 0; i + 1 < pts.length; i++) for (const t of things) if (crosses(pts[i], pts[i + 1], { x0: t.box.x0 + 0.5, x1: t.box.x1 - 0.5, y0: t.box.y0 + 0.5, y1: t.box.y1 - 0.5 })) hits.push(`${r.id} × ${t.id}`);
    }
    expect([...new Set(hits)]).toEqual([]);
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
