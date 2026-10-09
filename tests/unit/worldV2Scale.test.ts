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
