/**
 * Kawasan v2, phase A (PRD v2 §3.1–§3.3; mega prompt §3): the hero is the home
 * view at no less than 1.25 px/m on the 1,246 × 700 stage (a 40 m block at
 * least 60 px), the map (Whole) frames everything drawn at no less than
 * 0.75 px/m, a phone's 390 px stage opens on the estate at no less than
 * 1 px/m, H and the distance control's 0 return to the hero, and the zoom
 * decides the band of detail with hysteresis.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { disposeWorlds, frames, installWorldStubs, mountWorld } from './helpers/mountWorld';

beforeEach(installWorldStubs);
afterEach(disposeWorlds);

describe('the hero and the map (PRD v2 §3.1, A1)', () => {
  it('opens on the hero at ≥ 1.25 px/m, a 40 m block ≥ 60 px wide on screen', async () => {
    await mountWorld();
    frames(2);
    const z = window.world!.zoom();
    expect(z).toBeGreaterThanOrEqual(1.25);
    expect(40 * Math.SQRT2 * z).toBeGreaterThanOrEqual(60);
    expect(window.world!.distance()).toBe(0);
    expect(window.world!.band()).toBe('district');
  });

  it('frames everything drawn on the map at ≥ 0.75 px/m, below the hero', async () => {
    const { handle } = await mountWorld();
    const hero = window.world!.zoom();
    handle.lookAt('whole'); frames(300);
    expect(window.world!.zoom()).toBeGreaterThanOrEqual(0.75);
    expect(window.world!.zoom()).toBeLessThan(hero);
    expect(window.world!.distance()).toBe(0);
  });

  it('on a phone’s 390 px stage opens on the estate at ≥ 1 px/m', async () => {
    await mountWorld({ width: 390, height: 488, reducedDetail: true });
    frames(2);
    expect(window.world!.zoom()).toBeGreaterThanOrEqual(1);
    const [x, y] = window.world!.screenOf('B121')!;
    expect(Math.abs(x - 195)).toBeLessThan(390 * 1.5); expect(Math.abs(y - 244)).toBeLessThan(488 * 1.5);
  });

  it('H, like the distance control’s 0, returns to the hero from anywhere', async () => {
    const { handle, container } = await mountWorld();
    frames(2);
    const hero = window.world!.zoom();
    handle.lookAt('town'); frames(300);
    expect(window.world!.zoom()).not.toBeCloseTo(hero, 3);
    container.querySelector('canvas')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'H' }));
    frames(400);
    expect(window.world!.zoom()).toBeCloseTo(hero, 3);
    handle.lookAt('estate'); frames(300); handle.setDistance(0); frames(400);
    expect(window.world!.zoom()).toBeCloseTo(hero, 3);
  });
});

describe('the bands of detail (PRD v2 §3.3)', () => {
  it('switches district → street → inside by the zoom, with hysteresis at each threshold', async () => {
    const { handle } = await mountWorld();
    const at = (z: number) => { window.world!.look(0, 0, z); frames(1); return window.world!.band(); };
    expect(at(2)).toBe('district');
    expect(at(4.2)).toBe('district'); // inside the hysteresis, coming up
    expect(at(4.5)).toBe('street');
    expect(at(3.8)).toBe('street'); // inside the hysteresis, going down
    expect(at(3.5)).toBe('district');
    expect(at(11.2)).toBe('inside');
    expect(at(9.5)).toBe('inside');
    expect(at(8.8)).toBe('street');
    void handle;
  });
});

describe('companies are buildings (PRD v2 §3.5, A3, A4)', () => {
  it('makes every lot an entity with its box and bays, never hidden, two per block with a sign each', async () => {
    const { scene } = await mountWorld();
    const { LAYOUT } = await import('@/world/placement/layout.generated');
    const all = window.world!.all();
    expect(all.filter((e) => e.kind === 'company')).toHaveLength(LAYOUT.blocks.length * 2);
    for (const b of LAYOUT.blocks) for (const l of b.lots) expect(l.sign.length).toBe(2);
    // the lots are drawn in their zone's part, which the view never hides; only the kerb signs wait for the street band
    frames(2);
    let zones = 0; scene.traverse((o) => { if (o.name.startsWith('zone-part-')) { zones++; expect(o.visible).toBe(true); } });
    expect(zones).toBeGreaterThan(10);
  });

  it('resolves a hit in a zone to the lot whose footprint holds it, else to the block (its signboard and yard)', async () => {
    const THREE = await import('three');
    const { scene } = await mountWorld();
    const { LAYOUT } = await import('@/world/placement/layout.generated');
    const zoneEntity = (zone: string) => { let e: { resolve(p: InstanceType<typeof THREE.Vector3>): { id: string; kind: string } } | undefined; scene.traverse((o) => { if (o.name === `zone-${zone}`) e = o.userData.entity; }); return e!; };
    for (const code of ['B121', 'C141', 'A121', 'G111', 'J113']) {
      const b = LAYOUT.blocks.find((x) => x.code === code)!;
      const z = zoneEntity(b.zone);
      const { REGISTRY } = await import('@/lib/world/registry/subindustries.generated');
      const s = REGISTRY.subIndustries.find((x) => x.code === code)!;
      b.lots.forEach((l, i) => {
        const hit = z.resolve(new THREE.Vector3((l.box.x0 + l.box.x1) / 2, 1, (l.box.y0 + l.box.y1) / 2));
        expect(hit.kind, l.id).toBe('company');
        expect(hit.id, l.id).toBe(s.companies[i]?.ticker ?? l.id);
      });
      // the signboard stands in the middle of the block's front, between the lots
      const [sx, sy] = b.front === 's' ? [(b.box.x0 + b.box.x1) / 2, b.box.y1 - 1.2] : [b.box.x1 - 1.2, (b.box.y0 + b.box.y1) / 2];
      expect(z.resolve(new THREE.Vector3(sx, 4, sy))).toMatchObject({ kind: 'building', id: code });
    }
  });
});

describe('pointing (PRD v2 §3.4, A2)', () => {
  it('hovering a lot labels it TICKER · name with a pointer and an outline; a block, its sub-industry; a gate, its joint; empty ground, nothing', async () => {
    const seen: (string | null)[] = [];
    const { container } = await mountWorld({ onHover: (h) => seen.push(h?.label ?? null) });
    frames(2);
    const at = (id: string) => window.world!.screenOf(id)!;
    const [x, y] = at('INTP');
    expect(window.world!.hoverAt(x, y)).toEqual({ id: 'INTP', kind: 'company', label: 'INTP · Indocement Tunggal Prakarsa Tbk' });
    expect(container.querySelector('canvas')!.style.cursor).toBe('pointer');
    expect(seen.at(-1)).toBe('INTP · Indocement Tunggal Prakarsa Tbk');
    const [bx, by] = at('B121');
    expect(window.world!.hoverAt(bx, by)).toMatchObject({ id: 'B121', kind: 'building', label: 'Construction Materials' });
    window.world!.look(310, 0, 8); frames(2);
    const [gx, gy] = at('gate-east');
    expect(window.world!.hoverAt(gx, gy)).toMatchObject({ id: 'gate-east', kind: 'gate' });
    expect(window.world!.hovered()!.label.length).toBeGreaterThan(3);
    window.world!.look(-2000, -2000, 1); frames(2);
    expect(window.world!.hoverAt(5, 5)).toBeNull();
    expect(container.querySelector('canvas')!.style.cursor).toBe('grab');
    expect(seen.at(-1)).toBeNull();
  });
});
