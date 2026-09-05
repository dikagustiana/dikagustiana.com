/**
 * Which curriculum modules read which joint of the chain.
 *
 * THIS TABLE IS DATA, NOT A DESIGN DECISION. The owner decides which module
 * belongs to which joint, and a module linked to the wrong joint does more
 * damage than a joint with no module yet. Nothing here is guessed from module
 * titles: every row was checked against the live finance_modules table (slug,
 * title, thesis) before it was added, and the joint it names is where the
 * chain's own lens content already sites that reading.
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
 * To extend it, add rows in the same shape, one joint at a time, after
 * checking the module against the database. The unit test in
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
  // ── Manufacturing → distribution ──────────────────────────────────────────
  // The joint where the unit-economics lens sites "DSO · DPO — who finances
  // whom" and the economy lens sites monetary transmission through trade
  // credit. Two modules read exactly that: receivables, payables and
  // inventory as capital decisions, and the cash conversion cycle they form.
  // Considered and NOT added: t2-m01 Corporate Governance and Agency Theory
  // (the joint's attribute is CONTRACT governance between two firms —
  // territory, exclusivity, trade terms — not board-level agency), t2-m07
  // Credit Risk, Covenant Management, and Financial Distress (framed on
  // corporate debt and covenants, not trade receivables), t4-m05 Unit
  // Economics and Contribution Margin Analysis (the lens's own method, so
  // chain-wide rather than one joint's).
  { joint: 'j-manufacturing-distribution', moduleSlug: 't1-m10', moduleClass: 'chain-located' },
  { joint: 'j-manufacturing-distribution', moduleSlug: 't3-m06', moduleClass: 'chain-located' },
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
