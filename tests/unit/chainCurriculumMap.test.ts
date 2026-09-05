/**
 * The joint → module mapping is data the owner fills in. These tests make a
 * typo fail the build instead of shipping a link to the wrong place, and pin
 * the one rule the map depends on: only chain-located rows attach.
 */

import { describe, expect, it } from 'vitest';
import { JOINT_IDS } from '@/data/industryChain';
import {
  CHAIN_MODULE_LINKS,
  jointHasModules,
  locatedModulesByJoint,
  type ChainModuleLink,
} from '@/data/chainCurriculumMap';

const CLASSES = ['chain-located', 'chain-wide', 'off-chain'];

describe('the shipped mapping table', () => {
  it('only ever names joints the chain has', () => {
    for (const row of CHAIN_MODULE_LINKS) expect(JOINT_IDS).toContain(row.joint);
  });

  it('only ever uses the three module classes', () => {
    for (const row of CHAIN_MODULE_LINKS) expect(CLASSES).toContain(row.moduleClass);
  });

  it('pins the two working-capital modules to manufacturing → distribution, and nothing else yet', () => {
    // Filled one joint at a time, each row checked against finance_modules.
    // If this fails because a joint was added, extend the expectation — do
    // not loosen it: an unexpected mapping is exactly what this guards.
    expect(locatedModulesByJoint()['j-manufacturing-distribution']).toEqual(['t1-m10', 't3-m06']);
    for (const j of JOINT_IDS) {
      expect(jointHasModules(j), j).toBe(j === 'j-manufacturing-distribution');
    }
  });

  it('never pins the same module to one joint twice', () => {
    const keys = CHAIN_MODULE_LINKS.map((r) => `${r.joint}::${r.moduleSlug}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('locatedModulesByJoint', () => {
  const sample: ChainModuleLink[] = [
    { joint: 'j-manufacturing-distribution', moduleSlug: 'm-working-capital', moduleClass: 'chain-located' },
    { joint: 'j-manufacturing-distribution', moduleSlug: 'm-trade-terms', moduleClass: 'chain-located' },
    { joint: 'j-retail-consumption', moduleSlug: 'm-whole-chain', moduleClass: 'chain-wide' },
    { joint: 'j-retail-consumption', moduleSlug: 'm-elsewhere', moduleClass: 'off-chain' },
    { joint: 'j-wholesale-retail', moduleSlug: 'm-cost-to-serve', moduleClass: 'chain-located' },
  ];

  it('attaches chain-located rows, grouped by joint, in table order', () => {
    const out = locatedModulesByJoint(sample);
    expect(out['j-manufacturing-distribution']).toEqual(['m-working-capital', 'm-trade-terms']);
    expect(out['j-wholesale-retail']).toEqual(['m-cost-to-serve']);
  });

  it('never attaches chain-wide or off-chain rows to a joint', () => {
    const out = locatedModulesByJoint(sample);
    expect(out['j-retail-consumption']).toBeUndefined();
    expect(jointHasModules('j-retail-consumption', sample)).toBe(false);
  });

  it('ignores a row whose joint is not a chain joint', () => {
    const bad = [{ joint: 'j-nowhere', moduleSlug: 'm', moduleClass: 'chain-located' }] as unknown as ChainModuleLink[];
    expect(Object.keys(locatedModulesByJoint(bad))).toHaveLength(0);
  });
});
