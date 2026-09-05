/**
 * The chain's content contract.
 *
 * What would quietly break the page: a lens reading anchored to something
 * that does not exist, a slice under a column the layout does not have, a
 * figure sneaking into a map that promises none, or the generated plate
 * drifting from the data it was generated from.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BANDS,
  BYPRODUCT,
  CHAIN_COPY,
  ECONOMY_LENS,
  ENERGY,
  JOINT_ATTRIBUTES,
  JOINT_IDS,
  JOINT_LABELS,
  MONEY,
  NODES,
  RETAIL,
  RETURNS,
  STAGES,
  UNIT_LENS,
  UNIT_LOGISTICS,
} from '@/data/industryChain';

const stageIds = new Set(STAGES.map((s) => s.id));
const nodeIds = new Set([...NODES, ...RETAIL].map((n) => n.id));
const anchorIds = new Set([...stageIds, ...nodeIds, ...JOINT_IDS, ENERGY.id, 'node-retail']);

describe('the chain', () => {
  it('names every joint exactly once, and labels each one', () => {
    expect(new Set(JOINT_IDS).size).toBe(JOINT_IDS.length);
    for (const j of JOINT_IDS) expect(JOINT_LABELS[j], j).toBeTruthy();
  });

  it('draws exactly two spanning layers, and contract capacity is nowhere', () => {
    expect(BANDS.map((b) => b.id)).toEqual(['band-logistics', 'band-regulation']);
    const everything = JSON.stringify({ STAGES, NODES, RETAIL, BANDS, JOINT_ATTRIBUTES, RETURNS, ECONOMY_LENS, UNIT_LENS, CHAIN_COPY });
    expect(everything.toLowerCase()).not.toMatch(/makloon|toll manufacturing|contract capacity/);
  });

  it('pins every joint attribute to a real joint', () => {
    for (const a of JOINT_ATTRIBUTES) expect(JOINT_IDS).toContain(a.joint);
  });

  it('routes every return between real ends', () => {
    const ends = new Set([...stageIds, ...nodeIds, 'node-retail']);
    for (const r of RETURNS) {
      expect(ends.has(r.from), `${r.id} from ${r.from}`).toBe(true);
      expect(ends.has(r.to), `${r.id} to ${r.to}`).toBe(true);
    }
    expect(RETURNS.map((r) => r.id)).not.toContain(BYPRODUCT.id);
  });
});

describe('the lenses', () => {
  it('anchors every economy reading to a stage, node, joint or the energy input', () => {
    for (const item of ECONOMY_LENS) expect(anchorIds.has(item.anchor), `${item.id} → ${item.anchor}`).toBe(true);
  });

  it('covers every variable the economy lens promises', () => {
    const labels = new Set(ECONOMY_LENS.map((i) => i.label));
    for (const must of ['Inflation', 'Exchange rate', 'Labour', 'Business cycle', 'Growth', 'External balance', 'Monetary policy', 'Fiscal', 'Capital goods', 'Import share', 'Energy intensity']) {
      expect(labels.has(must), must).toBe(true);
    }
  });

  it('sits every unit-economics slice under a real column, in chain order', () => {
    const columns = new Set([...stageIds, ...nodeIds, 'node-retail']);
    for (const s of UNIT_LENS) expect(columns.has(s.column), `${s.id} → ${s.column}`).toBe(true);
    expect(UNIT_LENS[0].column).toBe('stage-biological');
    expect(UNIT_LENS[UNIT_LENS.length - 1].column).toBe('stage-consumption');
  });

  it('covers the five things a slice is made of', () => {
    const text = [...UNIT_LENS.map((s) => `${s.label} ${s.note ?? ''}`), UNIT_LOGISTICS.label].join(' ').toLowerCase();
    for (const must of ['value added', 'logistics', 'cost to serve', 'contribution margin', 'dso']) {
      expect(text, must).toContain(must);
    }
  });
});

describe('what the map promises', () => {
  it('keeps the headline verbatim', () => {
    expect(CHAIN_COPY.headline).toBe('Nothing here is complicated. It only looks that way from the wrong distance.');
  });

  it('carries no figures anywhere — no percentages, amounts or magnitudes', () => {
    const text = JSON.stringify({ STAGES, NODES, RETAIL, BANDS, JOINT_ATTRIBUTES, RETURNS, BYPRODUCT, MONEY, ENERGY, ECONOMY_LENS, UNIT_LENS, UNIT_LOGISTICS, CHAIN_COPY, JOINT_LABELS });
    expect(text).not.toMatch(/\d/);
  });
});

describe('the generated plate', () => {
  const tsx = readFileSync(resolve(process.cwd(), 'src/components/industry-chain/ChainPlateSvg.tsx'), 'utf8');
  const texts = Array.from(tsx.matchAll(/<text[^>]*>([^<]*)<\/text>/g)).map((m) => m[1]);

  it('is in sync with the data: every node, band and slice label is drawn', () => {
    const drawn = texts.join('\n');
    for (const n of [...NODES, ...RETAIL]) expect(drawn, n.id).toContain(n.label);
    for (const b of BANDS) expect(drawn, b.id).toContain(b.label);
    for (const s of UNIT_LENS) expect(drawn, s.id).toContain(s.label);
    for (const e of ECONOMY_LENS) expect(drawn, e.id).toContain(e.note);
  });

  it('draws no digits in any label', () => {
    for (const t of texts) expect(t, t).not.toMatch(/\d/);
  });

  it('carries every joint as a possible curriculum door, in both layouts', () => {
    for (const j of JOINT_IDS) {
      const hits = tsx.match(new RegExp(`<JointHit id="${j}"`, 'g')) ?? [];
      expect(hits.length, j).toBe(2);
    }
  });

  it('never shows a caption sentence under the plate', () => {
    expect(tsx).not.toMatch(/accounting instrument/i);
    expect(tsx).not.toContain('<figcaption');
  });
});
