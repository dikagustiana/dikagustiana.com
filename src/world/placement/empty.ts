/**
 * An empty layout: the slab and the region templates with nothing on them.
 * Used by tests and by the shell until placement writes layout.generated.ts
 * (Phase D). The regions' geometry here is the target shape of PRD §7.2 at a
 * reduced scale; the placement algorithm owns the real sizes.
 */
import type { GeneratedLayout } from './types';

export function emptyLayout(seed = 20261004): GeneratedLayout {
  return {
    world: { x0: -400, x1: 800, y0: -300, y1: 300 },
    seed,
    registrySha256: '',
    regions: [
      { id: 'ring-geological', label: 'Geological arc', polygon: [[-400, -300], [200, -300], [200, -120], [-400, -120]], anchor: [-100, -210] },
      { id: 'ring-biological', label: 'Biological arc', polygon: [[-400, 120], [200, 120], [200, 300], [-400, 300]], anchor: [-100, 210] },
      { id: 'estate', label: 'Estate', polygon: [[-200, -100], [200, -100], [200, 100], [-200, 100]], anchor: [0, 0] },
      { id: 'gateway', label: 'Gateway', polygon: [[220, -140], [420, -140], [420, 140], [220, 140]], anchor: [320, 0] },
      { id: 'town', label: 'Town', polygon: [[440, -100], [800, -100], [800, 300], [440, 300]], anchor: [620, 100] },
      { id: 'recovery', label: 'Recovery yard', polygon: [[440, -260], [600, -260], [600, -120], [440, -120]], anchor: [520, -190] },
      { id: 'hill', label: 'Think tank', polygon: [[640, -300], [800, -300], [800, -140], [640, -140]], anchor: [720, -220] },
    ],
    blocks: [],
    roads: [],
    gates: [],
    signposts: [],
    labels: [],
    fixtures: [],
    rail: null,
    port: null,
    hill: { centre: [720, -220], radius: 70, height: 40 },
  };
}
