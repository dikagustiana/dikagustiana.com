/**
 * Follow (PRD v2 §3.10; mega prompt §6 D4, D7): the state machine in jsdom.
 * A story ride mounts on a vehicle leaving the story's first lot, stops at
 * each bay with the lot's card (four seconds, or Space), rides the next
 * hop's vehicle out of that lot, glides a hop no vehicle carries, and ends
 * with the story's card, in 60 to 90 seconds; the world runs faster while
 * riding but the clock keeps its pace; F rides a selected vehicle to its
 * bay and shows its customer's card; Escape, a drag (or the arrows) and
 * follow(null) let go.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FollowReading, Selection } from '@/world/engine/types';
import { storyById } from '@/lib/world/constants';
import { disposeWorlds, installWorldStubs, mountWorld } from './helpers/mountWorld';

/** Run the frame's clock forward (no drawing) until the ride ends or `limit` seconds pass; what each frame read. */
function ride(limit = 200, dt = 1 / 10): { log: (FollowReading | null)[]; seconds: number } {
  const log: (FollowReading | null)[] = [];
  let t = 0;
  for (; t < limit; t += dt) {
    window.world!.tick(dt, false);
    const r = window.world!.follow(); log.push(r);
    if (!r || r.mode === 'end') break;
  }
  return { log, seconds: t };
}
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('Follow (PRD v2 §3.10, D4)', () => {
  beforeEach(installWorldStubs);
  afterEach(disposeWorlds);

  it('rides a story from its first lot to its last: a vehicle out of each lot, the lot’s card at each bay, the story’s card at the end, in 60 to 90 seconds', async () => {
    const selected: (Selection | null)[] = [];
    const events: (FollowReading | null)[] = [];
    const { handle } = await mountWorld({ onSelect: (s) => selected.push(s), onFollow: (f) => events.push(f) });
    const s = storyById('palm')!;
    handle.follow(`story:${s.id}`);
    const first = window.world!.follow()!;
    expect(first).toMatchObject({ mode: 'ride', story: 'palm', hop: 0, hops: 3 });
    // the vehicle leaves one of the first sub-industry's lots, carrying the first hop's link
    const v = window.world!.all().find((e) => e.id === first.vehicle)!;
    expect(String(v.facts!.link)).toBe('D232>D222');
    expect(window.world!.chain()).toEqual(expect.arrayContaining(s.hops as string[]));
    const { log, seconds } = ride();
    const end = log[log.length - 1]!;
    expect(end.mode).toBe('end');
    expect(seconds).toBeGreaterThanOrEqual(60);
    expect(seconds).toBeLessThanOrEqual(90);
    // a stop at each of the two middle lots and the last, each with that lot's card, in the story's order
    const stops = [...new Map(events.filter((e): e is FollowReading => e?.mode === 'stop').map((e) => [e.hop, e])).values()];
    expect(stops.map((e) => e.hop)).toEqual([0, 1, 2]);
    for (const st of stops) expect(selected.some((x) => x?.id === st.lot), String(st.lot)).toBe(true);
    // each hop after the first leaves from the lot the last one stopped at
    const rides = events.filter((e): e is FollowReading => e?.mode === 'ride');
    const hopsRidden = [...new Set(rides.map((r) => r.hop))];
    expect(hopsRidden).toEqual([0, 1, 2]);
    for (const h of [1, 2]) {
      const r = rides.find((x) => x.hop === h && x.vehicle)!;
      const from = window.world!.all().find((e) => e.id === r.vehicle)?.facts?.from;
      if (from) expect(from).toBe(stops[h - 1].lot);
    }
    // the end: nothing selected, so the shell shows the story's card
    expect(selected[selected.length - 1]).toBeNull();
    expect(end.progress).toBe(1);
  });

  it('glides a hop no vehicle carries, and keeps the clock at its own pace while the world runs faster', async () => {
    const { handle } = await mountWorld();
    const h0 = window.world!.activity().hour;
    handle.follow('story:cement');
    const { log, seconds } = ride();
    const modes = [...new Set(log.filter(Boolean).map((r) => `${r!.hop}:${r!.mode}`))];
    expect(modes).toEqual(expect.arrayContaining(['0:ride', '0:stop', '1:glide', '1:stop']));
    expect(log[log.length - 1]!.mode).toBe('end');
    expect(seconds).toBeGreaterThanOrEqual(60);
    expect(seconds).toBeLessThanOrEqual(90);
    // the day ran at its own pace: the hours passed match the seconds ridden (a day is six minutes)
    const hours = window.world!.activity().hour - h0;
    expect(hours).toBeCloseTo((seconds / 360) * 24, 0);
  });

  it('moves on from a stop at Space; lets go at Escape, at the arrows (a drag) and at follow(null)', async () => {
    const { handle, container } = await mountWorld();
    const canvas = container.querySelector('canvas')!;
    handle.follow('story:palm');
    let r = window.world!.follow()!;
    for (let t = 0; t < 120 && r.mode !== 'stop'; t += 0.1) { window.world!.tick(0.1, false); r = window.world!.follow()!; }
    expect(r.mode).toBe('stop');
    key(canvas, ' ');
    window.world!.tick(0.1, false);
    expect(window.world!.follow()!.mode).toBe('ride');
    expect(window.world!.follow()!.hop).toBe(1);
    key(canvas, 'Escape');
    expect(window.world!.follow()).toBeNull();
    handle.follow('story:palm');
    key(canvas, 'ArrowLeft');
    expect(window.world!.follow()).toBeNull();
    handle.follow('story:palm');
    handle.follow(null);
    expect(window.world!.follow()).toBeNull();
  });

  it('F rides the selected vehicle to its customer’s bay and shows the customer’s card', async () => {
    let sel: Selection | null = null;
    const { handle, container } = await mountWorld({ onSelect: (s) => { sel = s; } });
    const canvas = container.querySelector('canvas')!;
    const v = window.world!.all().find((e) => e.kind === 'vehicle' && e.facts?.leg === 'out' && String(e.facts.link).includes('>'))!;
    handle.select(v.id);
    key(canvas, 'f');
    expect(window.world!.follow()).toMatchObject({ mode: 'ride', story: null, vehicle: v.id });
    const { log } = ride(120);
    expect(log[log.length - 1]!.mode).toBe('end');
    expect(sel!.id).toBe(v.facts!.to);
    // the vehicle's card offers Follow too (PRD v2 §3.11)
    const other = window.world!.all().find((e) => e.kind === 'vehicle' && e.id !== v.id)!;
    handle.select(other.id);
    sel!.info.actions!.find(([k]) => k === 'Follow')![1]();
    expect(window.world!.follow()).toMatchObject({ mode: 'ride', vehicle: other.id });
  });
});
