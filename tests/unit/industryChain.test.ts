/**
 * The map's data contract.
 *
 * The four categories are the whole claim of this diagram, so the things that
 * would quietly break it are asserted here: an id that two categories share, a
 * macro lens pointing at an element that does not exist, a node with no group,
 * a by-product that has drifted into the return flows.
 */

import { describe, expect, it } from 'vitest';
import {
  BOUNDARY,
  BYPRODUCT_BRANCH,
  CHAIN_META,
  LAYERS,
  MACRO_ENTRIES,
  NODES,
  NODE_GROUPS,
  NON_PHYSICAL_FLOWS,
  RETURN_FLOWS,
  RETURN_SUMMARY,
  STAGES,
} from '@/data/industryChain';
import { highlightSetFor, labelFor, resolvePanel } from '@/components/industry-chain/chainModel';

const allIds = [
  ...STAGES.map((s) => s.id),
  ...STAGES.flatMap((s) => (s.subLabels ?? []).map((sub) => sub.id)),
  ...NODE_GROUPS.map((g) => g.id),
  ...NODES.map((n) => n.id),
  ...LAYERS.map((l) => l.id),
  ...LAYERS.flatMap((l) => (l.subBands ?? []).map((b) => b.id)),
  ...RETURN_FLOWS.map((r) => r.id),
  ...NON_PHYSICAL_FLOWS.map((f) => f.id),
  ...MACRO_ENTRIES.map((m) => m.id),
  BOUNDARY.id,
  BYPRODUCT_BRANCH.id,
  RETURN_SUMMARY.id,
];

describe('industry chain data', () => {
  it('gives every element a unique id', () => {
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('resolves a panel for every element', () => {
    for (const id of allIds) {
      expect(resolvePanel(id), id).not.toBeNull();
      expect(resolvePanel(id)?.definition, id).toBeTruthy();
    }
  });

  it('returns nothing for an id the map does not know', () => {
    expect(resolvePanel('stage-nonexistent')).toBeNull();
    expect(labelFor('stage-nonexistent')).toBeUndefined();
  });

  it('numbers exactly six transformation stages on the axis', () => {
    const numbered = STAGES.filter((stage) => stage.ordinal !== null);
    expect(numbered.map((stage) => stage.ordinal)).toEqual([1, 2, 3, 4, 5, 6]);
    // Packaging is a parallel branch, so it carries no ordinal.
    expect(STAGES.filter((stage) => stage.ordinal === null).map((s) => s.id)).toEqual([
      'stage-packaging',
    ]);
  });

  it('starts the chain with two parallel beginnings that share a column', () => {
    const beginnings = STAGES.filter((stage) => stage.column === 1);
    expect(beginnings.map((stage) => stage.lane).sort()).toEqual(['lower', 'upper']);
  });

  it('collapses the nodes into exactly three top-level groups', () => {
    expect(NODE_GROUPS).toHaveLength(3);
  });

  it('places every node in a group, and every group member in NODES', () => {
    const groupIds = new Set(NODE_GROUPS.map((group) => group.id));
    const nodeIds = new Set(NODES.map((node) => node.id));
    for (const node of NODES) expect(groupIds.has(node.groupId), node.id).toBe(true);
    for (const group of NODE_GROUPS) {
      for (const member of group.members) expect(nodeIds.has(member), member).toBe(true);
    }
    // No node is orphaned from its group's member list either.
    const listed = new Set(NODE_GROUPS.flatMap((group) => group.members));
    for (const node of NODES) expect(listed.has(node.id), node.id).toBe(true);
  });

  it('keeps the by-product out of the return flows', () => {
    expect(RETURN_FLOWS.map((flow) => flow.id)).not.toContain(BYPRODUCT_BRANCH.id);
    expect(resolvePanel(BYPRODUCT_BRANCH.id)?.category).toBe('branch');
  });

  it('draws four leftward return flows and one loop', () => {
    expect(RETURN_FLOWS.filter((flow) => flow.shape === 'leftward')).toHaveLength(4);
    expect(RETURN_FLOWS.filter((flow) => flow.shape === 'loop')).toHaveLength(1);
  });

  it('counts seven enabling layers, one of which is not a band', () => {
    expect(LAYERS).toHaveLength(6);
    expect(BOUNDARY.crossings).toHaveLength(3);
    expect(LAYERS.map((layer) => layer.id)).not.toContain(BOUNDARY.id);
  });

  it('never mixes the categories', () => {
    for (const stage of STAGES) expect(resolvePanel(stage.id)?.category).toBe('stage');
    for (const group of NODE_GROUPS) expect(resolvePanel(group.id)?.category).toBe('node');
    for (const node of NODES) expect(resolvePanel(node.id)?.category).toBe('node');
    for (const layer of LAYERS) expect(resolvePanel(layer.id)?.category).toBe('layer');
    for (const flow of RETURN_FLOWS) expect(resolvePanel(flow.id)?.category).toBe('return');
  });
});

describe('the macro lens', () => {
  it('carries eight variables, each with a micro counterpart', () => {
    expect(MACRO_ENTRIES).toHaveLength(8);
    for (const entry of MACRO_ENTRIES) {
      expect(entry.micro.label, entry.id).toBeTruthy();
      expect(entry.micro.description, entry.id).toBeTruthy();
      expect(entry.badge.length, entry.id).toBeLessThanOrEqual(2);
    }
  });

  it('only ever highlights elements that exist', () => {
    const known = new Set(allIds);
    for (const entry of MACRO_ENTRIES) {
      for (const target of entry.highlights) expect(known.has(target), `${entry.id} → ${target}`).toBe(true);
    }
  });

  it('lights a node group when the variable enters at one of its nodes', () => {
    // Exchange rate enters at the trader, which is only drawn once Detail is
    // on — so the group it belongs to has to light up at the top level too.
    const lit = highlightSetFor('macro-fx');
    expect(lit.has('node-trader')).toBe(true);
    expect(lit.has('group-distribution')).toBe(true);
    expect(lit.has('stage-extraction')).toBe(true);
  });

  it('lights the parent stage when the variable enters at a sub-label', () => {
    const lit = highlightSetFor('macro-external');
    expect(lit.has('sub-abroad')).toBe(true);
    expect(lit.has('stage-consumption')).toBe(true);
  });

  it('lights nothing when no lens is chosen', () => {
    expect(highlightSetFor(null).size).toBe(0);
    expect(highlightSetFor('macro-nonexistent').size).toBe(0);
  });

  it('shows the micro counterpart in the same panel as the macro entry', () => {
    for (const entry of MACRO_ENTRIES) {
      expect(resolvePanel(entry.id)?.micro).toEqual(entry.micro);
    }
  });
});

describe('the section copy', () => {
  it('states the thesis in sixty words or fewer', () => {
    expect(CHAIN_META.intro.trim().split(/\s+/).length).toBeLessThanOrEqual(60);
  });

  it('carries no figures — the map is structure and mechanism only', () => {
    const prose = [
      CHAIN_META.intro,
      ...STAGES.map((s) => `${s.definition} ${(s.detail ?? []).join(' ')}`),
      ...NODES.map((n) => `${n.definition} ${(n.detail ?? []).join(' ')}`),
      ...LAYERS.map((l) => `${l.definition} ${(l.detail ?? []).join(' ')}`),
      ...MACRO_ENTRIES.map((m) => `${m.definition} ${m.micro.description}`),
    ].join(' ');
    // PSAK 72 is a standard's number, and lives only in the footnote.
    expect(prose).not.toMatch(/\d/);
  });
});
