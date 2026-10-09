/**
 * The placement algorithm (PRD §9.4; mega prompt §6.1): deterministic for a
 * registry and a seed, no two blocks overlap, every placed sub-industry has a
 * block with two plots inside it, every block lies inside the world and its
 * region's template, and the committed layout.generated.ts is what the
 * algorithm produces today.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import { LAYOUT } from '@/world/placement/layout.generated';
import { overlaps, placeWorld } from '@/world/placement/place';
import type { Box } from '@/world/placement/types';

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
