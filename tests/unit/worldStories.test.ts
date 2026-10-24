/**
 * Stories (PRD v2 §3.10, Appendix B; mega prompt §6 D3): a story lights end
 * to end, every hop's routes with travelling dashes and every hop's lots
 * outlined, the rest dimmed, and the camera frames it at the district band;
 * each hop says the joints its routes cross; an upstream story reads against
 * the goods, with the banks lit beside it; a selection's chain replaces a
 * story, and clearing a story never clears a chain lit after it; a hop
 * button frames that hop.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JOINT_BY_ID } from '@/data/industryChain';
import { STORIES, storyById } from '@/lib/world/constants';
import { disposeWorlds, frames, installWorldStubs, mountWorld } from './helpers/mountWorld';

describe('the stories (PRD v2 §3.10, D2)', () => {
  beforeEach(installWorldStubs);
  afterEach(disposeWorlds);

  it('lights each of the six stories end to end: every hop drawn on its routes, every hop’s lots outlined, the rest dimmed, framed at the district band', async () => {
    const { handle } = await mountWorld();
    for (const s of STORIES) {
      const hops = handle.lightStory(s);
      expect(hops.map((h) => `${h.from}>${h.to}`), s.id).toEqual(s.hops.slice(1).map((b, i) => `${s.hops[i]}>${b}`));
      const d = window.world!.chainDrawn();
      expect(d.measured + d.expected, s.id).toBe(hops.length);
      expect(d.routes, s.id).toBeGreaterThanOrEqual(hops.length);
      expect(d.outlined, s.id).toBeGreaterThanOrEqual(new Set([...s.hops, ...s.with]).size);
      expect(d.dimmed, s.id).toBeGreaterThan(0);
      expect(new Set(window.world!.chain()), s.id).toEqual(new Set([...s.hops, ...s.with]));
      // the joints each hop crosses are joints of the chain map
      for (const h of hops) for (const j of h.joints) expect(JOINT_BY_ID[j as keyof typeof JOINT_BY_ID], `${s.id}: ${j}`).toBeTruthy();
      frames(60);
      expect(window.world!.band(), s.id).toBe('district');
    }
    // at least one hop of the six crosses a joint: the estate's gates stand between the zones
    expect(STORIES.some((s) => handle.lightStory(s).some((h) => h.joints.length > 0))).toBe(true);
  });

  it('reads the rupiah upstream, against the goods, with the banks lit beside it; a measured hop says so', async () => {
    const { handle } = await mountWorld();
    const s = storyById('rupiah-upstream')!;
    handle.setFlowWeights([{ from: 'D112', to: 'D113', cls: 'measured-light' }]);
    const hops = handle.lightStory(s);
    expect(hops[0]).toMatchObject({ from: 'D113', to: 'D112', goods: 'none', measured: true });
    expect(hops.slice(1).every((h) => !h.measured)).toBe(true);
    expect(window.world!.chain()).toContain('G111');
    expect(window.world!.chainDrawn().measured).toBe(1);
  });

  it('marks a lit story’s hop measured when its class arrives after the story was lit', async () => {
    const { handle } = await mountWorld();
    const hops = handle.lightStory(storyById('palm')!);
    expect(hops.every((h) => !h.measured)).toBe(true);
    handle.setFlowWeights([{ from: 'D232', to: 'D222', cls: 'measured-heavy' }]);
    expect(handle.storyHops().map((h) => h.measured)).toEqual([true, false, false]);
    expect(window.world!.chainDrawn().measured).toBe(1);
    expect(window.world!.chain()).toEqual(expect.arrayContaining(['D232', 'D222', 'D112', 'D113']));
  });

  it('gives way to a selection’s chain, and clearing the story then leaves that chain lit; a hop button frames its hop', async () => {
    const { handle } = await mountWorld();
    const s = storyById('palm')!;
    handle.lightStory(s);
    frames(60);
    const whole = window.world!.zoom();
    handle.frameHop(1);
    frames(60);
    expect(window.world!.zoom()).toBeGreaterThan(whole);
    handle.highlightChain('B121', 1);
    expect(window.world!.chain()[0]).toBe('B121');
    handle.lightStory(null);
    expect(window.world!.chain()[0]).toBe('B121');
    handle.lightStory(s);
    handle.lightStory(null);
    expect(window.world!.chain()).toEqual([]);
    expect(window.world!.chainDrawn().dimmed).toBe(0);
  });
});

describe('the governance and regulation pulses (PRD v2 §3.6, §3.12, D5)', () => {
  beforeEach(installWorldStubs);
  afterEach(disposeWorlds);

  it('runs a pulse up every link’s route from the customer with governance, and down it from the supplier with regulation; nothing until a layer is on', async () => {
    const { handle, scene } = await mountWorld();
    expect(window.world!.pulses('governance').count).toBe(0);
    expect(scene.getObjectByName('pulses-governance')!.visible).toBe(false);
    handle.setLayer('governance', true); handle.setLayer('regulation', true);
    const g0 = window.world!.pulses('governance'), r0 = window.world!.pulses('regulation');
    // pulses on every link with a lot at each end, one every hundred and twenty metres of its route
    expect(g0.count).toBeGreaterThan(150);
    expect(r0.count).toBe(g0.count);
    handle.step(1);
    const g1 = window.world!.pulses('governance'), r1 = window.world!.pulses('regulation');
    // governance runs against the goods (towards the supplier), regulation with them; a pulse at a run's end starts again
    const moved = (a: number[], b: number[], sign: number) => a.filter((x, i) => Math.abs(b[i] - x) < 0.5 && Math.sign(b[i] - x) === sign).length;
    expect(moved(g0.along, g1.along, -1)).toBeGreaterThanOrEqual(g0.along.length - 1);
    expect(moved(r0.along, r1.along, 1)).toBeGreaterThanOrEqual(r0.along.length - 1);
    handle.setLayer('governance', false);
    expect(scene.getObjectByName('pulses-governance')!.visible).toBe(false);
  });
});

describe('search by load (PRD v2 §3.13, D6)', () => {
  beforeEach(installWorldStubs);
  afterEach(disposeWorlds);

  it('finds a vehicle carrying a link’s load, sending one when none is on the road, and none for a link that moves nothing', async () => {
    const { handle } = await mountWorld();
    const id = handle.vehicleOn('A121>J411')!;
    expect(window.world!.all().find((e) => e.id === id)!.facts!.link).toBe('A121>J411');
    // the shops' recovery link: one on the road, or one sent now
    const sent = handle.vehicleOn('D113>C222')!;
    expect(window.world!.all().find((e) => e.id === sent)!.facts!.link).toBe('D113>C222');
    expect(handle.vehicleOn('J411>B121')).toBeNull();
  });
});
