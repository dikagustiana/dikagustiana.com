/**
 * The Weave Hero's motion (src/components/hero/weave/motion.ts,
 * docs/hero-weave-prd.md §2 "Motion"): offset = A · falloff(s) ·
 * sin(2π·t/T + φᵢ + k·s). The falloff is 0 at the weave entry and flat
 * there, so the moving thread meets the still cloth without a seam.
 */
import { describe, expect, it } from 'vitest';
import { displacement, falloff, smoothstep, type ThreadMotion } from '@/components/hero/weave/motion';

const thread: ThreadMotion = { amplitude: 10, phase: 0.7, k: (2 * Math.PI) / 520, period: 10, ramp: 750 };

describe('falloff', () => {
  it('is 0 at the weave entry and 1 at the free end', () => {
    expect(falloff(0, 470)).toBe(0);
    expect(falloff(470, 470)).toBe(1);
    expect(falloff(2000, 470)).toBe(1); // held beyond the ramp, out to a drawn extension
    expect(falloff(-5, 470)).toBe(0);
  });

  it('rises monotonically and leaves the entry flat: no visible seam', () => {
    let last = 0;
    for (let s = 0; s <= 470; s += 10) {
      const f = falloff(s, 470);
      expect(f).toBeGreaterThanOrEqual(last);
      last = f;
    }
    const h = 1e-4;
    expect((falloff(h, 470) - falloff(0, 470)) / h).toBeLessThan(1e-6); // zero slope at the entry
    expect((falloff(470, 470) - falloff(470 - h, 470)) / h).toBeLessThan(1e-6); // and at the free end
  });

  it('is a smoothstep', () => {
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0, 1, 0.25)).toBeCloseTo(0.15625, 12);
  });
});

describe('displacement', () => {
  it('is zero at the weave entry at every moment', () => {
    for (let t = 0; t < 20; t += 0.37) expect(displacement(t, 0, thread)).toBe(0);
  });

  it('follows A · falloff(s) · sin(2π·t/T + φ + k·s)', () => {
    const t = 3.2;
    const s = 400;
    const expected = 10 * falloff(s, 750) * Math.sin((2 * Math.PI * t) / 10 + 0.7 + thread.k * s);
    expect(displacement(t, s, thread)).toBeCloseTo(expected, 12);
  });

  it('never exceeds its amplitude, and repeats every period', () => {
    for (let t = 0; t < 10; t += 0.5) {
      for (let s = 0; s <= 900; s += 50) {
        expect(Math.abs(displacement(t, s, thread))).toBeLessThanOrEqual(10);
        expect(displacement(t + 10, s, thread)).toBeCloseTo(displacement(t, s, thread), 9);
      }
    }
  });

  it('ripples along the thread instead of moving it as a whole', () => {
    const at = (s: number) => Math.sign(displacement(2, s, thread));
    const signs = new Set([750, 750 + 130, 750 + 260, 750 + 390].map(at));
    expect(signs.size).toBe(2);
  });
});
