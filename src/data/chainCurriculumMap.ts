/**
 * Which curriculum modules read which joint of the chain.
 *
 * THIS TABLE IS DATA, NOT A DESIGN DECISION. It ships empty on purpose: the
 * owner decides which module belongs to which joint, and a module linked to
 * the wrong joint does more damage than a joint with no module yet. Nothing
 * in the map is guessed from module titles.
 *
 * Schema — one row per (joint, module):
 *
 *   joint        one of JOINT_IDS in src/data/industryChain.ts
 *   moduleSlug   finance_modules.slug — the module, never an essay. Essays
 *                stay one level down, under their module, exactly as the
 *                finance_sections → finance_modules → essays structure has them.
 *   moduleClass  how the module relates to the chain:
 *                  'chain-located'  sits at this joint; ATTACHES to the map
 *                  'chain-wide'     applies along the whole chain; listed,
 *                                   never pinned to one joint
 *                  'off-chain'      not about the chain; never shown here
 *
 * Only chain-located rows light a joint. A joint with no chain-located row is
 * inert: it cannot be highlighted, opens no panel, and does not look broken.
 * A module whose essays are still drafts is linked all the same — the panel
 * says "Coming soon" before anyone clicks, using the same `published` flag the
 * rest of the site uses.
 *
 * To fill it in, add rows like the commented example. The unit test in
 * tests/unit/chainCurriculumMap.test.ts checks every row against JOINT_IDS
 * and the class union, so a typo fails the build instead of shipping.
 */

import { JOINT_IDS, type JointId } from './industryChain';

export type ModuleClass = 'chain-located' | 'chain-wide' | 'off-chain';

export interface ChainModuleLink {
  joint: JointId;
  moduleSlug: string;
  moduleClass: ModuleClass;
}

export const CHAIN_MODULE_LINKS: ChainModuleLink[] = [
  // Example of the shape — a real row would look like this. Left commented so
  // the map ships with nothing guessed:
  // { joint: 'j-manufacturing-distribution', moduleSlug: 'working-capital', moduleClass: 'chain-located' },
];

/** Modules pinned to a joint, keyed by joint. Only chain-located rows count. */
export function locatedModulesByJoint(
  links: readonly ChainModuleLink[] = CHAIN_MODULE_LINKS,
): Partial<Record<JointId, string[]>> {
  const out: Partial<Record<JointId, string[]>> = {};
  for (const link of links) {
    if (link.moduleClass !== 'chain-located') continue;
    if (!(JOINT_IDS as readonly string[]).includes(link.joint)) continue;
    (out[link.joint] ??= []).push(link.moduleSlug);
  }
  return out;
}

/** True when a joint has at least one module pinned to it. */
export function jointHasModules(joint: JointId, links: readonly ChainModuleLink[] = CHAIN_MODULE_LINKS): boolean {
  return (locatedModulesByJoint(links)[joint]?.length ?? 0) > 0;
}
