/**
 * The chain's content contract.
 *
 * What would quietly break the page: a joint with no margin to answer for, a
 * layer whose span does not resolve, a border on the wrong joint, a lens
 * reading anchored to something that does not exist, a figure sneaking into
 * a map that promises none, or the generated plate drifting from the data it
 * was generated from.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BANDS,
  BORDERS,
  BYPRODUCT,
  CHAIN_COPY,
  COLUMNS,
  COMPACT,
  ECONOMY_LENS,
  ENERGY,
  JOINTS,
  JOINT_IDS,
  JOINT_LABELS,
  LEGEND,
  LEGEND_NOTE,
  MARGIN_KINDS,
  NODES,
  NON_PHYSICAL,
  RETAIL,
  RETAIL_GROUP,
  RETURNS,
  STAGES,
  UNIT_LENS,
  UNIT_LOGISTICS,
  bandJoints,
  jointLayers,
} from '@/data/industryChain';

const stageIds = new Set(STAGES.map((s) => s.id));
const nodeIds = new Set([...NODES, ...RETAIL].map((n) => n.id));
const endIds = new Set([...stageIds, ...nodeIds, RETAIL_GROUP.id]);
const anchorIds = new Set([...endIds, ...JOINT_IDS, ENERGY.id]);

/** The one number the map carries is the standard's own name. Strip it, then nothing else may be a digit. */
const noFigures = (text: string) => expect(text.replace(/PSAK 72/g, 'PSAK')).not.toMatch(/\d/);

describe('the joints', () => {
  it('are named exactly once, labelled, and run between real ends', () => {
    expect(new Set(JOINT_IDS).size).toBe(JOINT_IDS.length);
    expect(JOINTS.map((j) => j.id)).toEqual([...JOINT_IDS]);
    for (const j of JOINTS) {
      expect(JOINT_LABELS[j.id], j.id).toBeTruthy();
      expect(endIds.has(j.from), `${j.id} from ${j.from}`).toBe(true);
      expect(endIds.has(j.to), `${j.id} to ${j.to}`).toBe(true);
    }
  });

  it('each answer "what margin sits here" and point at a line of the accounts', () => {
    for (const j of JOINTS) {
      expect(Object.keys(MARGIN_KINDS), j.id).toContain(j.margin);
      expect(j.lines.length, j.id).toBeGreaterThan(0);
      expect(j.note, j.id).toBeTruthy();
    }
  });

  it("carry the seller's slice: a node sells a spread, a stage sells its conversion, recovery is paid a fee", () => {
    for (const j of JOINTS) {
      const sellerIsNode = nodeIds.has(j.from) || j.from === RETAIL_GROUP.id;
      const expected = sellerIsNode ? 'node-spread' : j.id === 'j-consumption-recovery' ? 'service-fee' : 'conversion';
      expect(j.margin, j.id).toBe(expected);
    }
  });

  it('read manufacturing → distribution both ways, because title can sit with the principal', () => {
    const j = JOINTS.find((x) => x.id === 'j-manufacturing-distribution')!;
    expect(j.margin).toBe('conversion');
    expect(j.alt?.margin).toBe('node-spread');
  });
});

describe('the three margin kinds', () => {
  it('each have a chip word, a meaning, a test and at least one line', () => {
    for (const k of Object.values(MARGIN_KINDS)) {
      expect(k.chip).toBeTruthy();
      expect(k.means).toBeTruthy();
      expect(k.test).toBeTruthy();
      expect(k.lines.length).toBeGreaterThan(0);
    }
  });

  it('tell node from layer by the PSAK 72 principal–agent test — gross against net', () => {
    expect(MARGIN_KINDS['node-spread'].test).toMatch(/PSAK 72/);
    expect(MARGIN_KINDS['node-spread'].test.toLowerCase()).toContain('gross');
    expect(MARGIN_KINDS['service-fee'].test).toMatch(/PSAK 72/);
    expect(MARGIN_KINDS['service-fee'].test.toLowerCase()).toContain('net');
    expect(LEGEND_NOTE).toMatch(/PSAK 72/);
  });
});

describe('the enabling layers', () => {
  it('are five, in this order, with credit directly under logistics', () => {
    expect(BANDS.map((b) => b.id)).toEqual([
      'band-logistics',
      'band-credit',
      'band-contract-capacity',
      'band-governance',
      'band-regulation',
    ]);
  });

  it('span real columns, in reading order, and say so in words', () => {
    for (const b of BANDS) {
      const [from, to] = b.span;
      expect(COLUMNS.indexOf(from), `${b.id} from ${from}`).toBeGreaterThanOrEqual(0);
      expect(COLUMNS.indexOf(to), `${b.id} to ${to}`).toBeGreaterThanOrEqual(COLUMNS.indexOf(from));
      expect(b.spanLabel, b.id).toBeTruthy();
      expect(b.means, b.id).toBeTruthy();
      expect(b.lines.length, b.id).toBeGreaterThan(0);
      expect(b.margin || b.chip, `${b.id} needs a chip word`).toBeTruthy();
    }
  });

  it('put contract capacity under processing → manufacturing only, and governance under manufacturing → retail only', () => {
    const cc = BANDS.find((b) => b.id === 'band-contract-capacity')!;
    expect(cc.span).toEqual(['stage-processing', 'stage-manufacturing']);
    expect(cc.margin).toBe('service-fee');
    expect(bandJoints(cc)).toEqual(['j-processing-trader', 'j-trader-manufacturing', 'j-packaging-manufacturing']);

    const gov = BANDS.find((b) => b.id === 'band-governance')!;
    expect(gov.span).toEqual(['stage-manufacturing', RETAIL_GROUP.id]);
    expect(gov.margin).toBeUndefined();
    expect(bandJoints(gov)).toEqual(['j-manufacturing-distribution', 'j-distributor-wholesaler', 'j-wholesale-retail']);
  });

  it('ride on every joint for the whole-chain layers, and are derived from the span, not listed by hand', () => {
    for (const id of ['band-logistics', 'band-credit', 'band-regulation']) {
      expect(bandJoints(BANDS.find((b) => b.id === id)!)).toEqual([...JOINT_IDS]);
    }
    for (const j of JOINT_IDS) expect(jointLayers(j).map((b) => b.id), j).toContain('band-logistics');
    expect(jointLayers('j-retail-consumption').map((b) => b.id)).not.toContain('band-contract-capacity');
    expect(jointLayers('j-production-aggregation').map((b) => b.id)).not.toContain('band-governance');
  });
});

describe('the borders', () => {
  it('cut the chain at exactly two joints: export at extraction, import at the trader into manufacturing', () => {
    expect(BORDERS.map((b) => [b.id, b.at, b.direction])).toEqual([
      ['border-export', 'j-extraction-processing', 'out'],
      ['border-import', 'j-trader-manufacturing', 'in'],
    ]);
  });

  it('agree with the economy lens about where the external balance is read', () => {
    const exportLine = BORDERS.find((b) => b.direction === 'out')!;
    const importLine = BORDERS.find((b) => b.direction === 'in')!;
    expect(ECONOMY_LENS.find((e) => e.id === 'econ-external-export')!.anchor).toBe(exportLine.at);
    expect(ECONOMY_LENS.find((e) => e.id === 'econ-external-import')!.anchor).toBe(importLine.at);
    expect(ECONOMY_LENS.find((e) => e.id === 'econ-import-share')!.anchor).toBe(importLine.at);
  });
});

describe('the flows against the goods', () => {
  it('route every return between real ends, and keep the by-product out of them', () => {
    for (const r of RETURNS) {
      expect(endIds.has(r.from), `${r.id} from ${r.from}`).toBe(true);
      expect(endIds.has(r.to), `${r.id} to ${r.to}`).toBe(true);
    }
    expect(RETURNS.map((r) => r.id)).not.toContain(BYPRODUCT.id);
  });

  it('land the post-consumer loop by material: recyclate on primary processing, organic on biological production', () => {
    const material = RETURNS.find((r) => r.id === 'return-postconsumer-material')!;
    const organic = RETURNS.find((r) => r.id === 'return-postconsumer-organic')!;
    expect(material.from).toBe('stage-recovery');
    expect(material.to).toBe('stage-processing');
    expect(organic.from).toBe('stage-recovery');
    expect(organic.to).toBe('stage-biological');
    expect(RETURNS.filter((r) => r.to === 'stage-biological')).toHaveLength(1);
  });

  it('run money both ways and information both ways', () => {
    const dirs = (kind: string) => NON_PHYSICAL.filter((f) => f.kind === kind).map((f) => f.direction).sort();
    expect(dirs('money')).toEqual(['downstream', 'upstream']);
    expect(dirs('information')).toEqual(['downstream', 'upstream']);
    expect(NON_PHYSICAL.find((f) => f.id === 'flow-money-credit')!.label.toLowerCase()).toContain('trade credit');
  });
});

describe('the legend', () => {
  it('names the four categories and the non-physical flows, each with a note', () => {
    const ids = LEGEND.map((l) => l.id);
    for (const must of ['stage', 'node', 'layer', 'return', 'money', 'information', 'border', 'joint']) expect(ids).toContain(must);
    for (const l of LEGEND) expect(l.note, l.id).toBeTruthy();
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
    for (const s of UNIT_LENS) expect(endIds.has(s.column), `${s.id} → ${s.column}`).toBe(true);
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

describe('the short version', () => {
  it('is six stages, three node groups, two layers and one return arrow, all resolving to records above', () => {
    const stages = COMPACT.sequence.flatMap((s) => (s.kind === 'stages' ? s.ids : []));
    const groups = COMPACT.sequence.filter((s) => s.kind === 'group');
    expect(stages).toHaveLength(6);
    for (const id of stages) expect(stageIds.has(id), id).toBe(true);
    expect(groups).toHaveLength(3);
    for (const g of groups) {
      if (g.kind !== 'group') continue;
      expect(g.label).toBeTruthy();
      for (const m of g.members) expect(nodeIds.has(m), `${g.id} member ${m}`).toBe(true);
      for (const f of g.from ?? []) expect(stageIds.has(f), `${g.id} from ${f}`).toBe(true);
    }
    expect(COMPACT.bands).toEqual(['band-logistics', 'band-credit']);
    expect(stageIds.has(COMPACT.returnArrow.from)).toBe(true);
    expect(stageIds.has(COMPACT.returnArrow.to)).toBe(true);
  });
});

describe('what the map promises', () => {
  it('keeps the headline verbatim', () => {
    expect(CHAIN_COPY.headline).toBe('Nothing here is complicated. It only looks that way from the wrong distance.');
  });

  it('carries no figures anywhere — no percentages, amounts or magnitudes — only the name of the standard', () => {
    noFigures(
      JSON.stringify({
        STAGES, NODES, RETAIL, JOINTS, MARGIN_KINDS, BANDS, BORDERS, RETURNS, BYPRODUCT, ENERGY, NON_PHYSICAL,
        LEGEND, LEGEND_NOTE, ECONOMY_LENS, UNIT_LENS, UNIT_LOGISTICS, COMPACT, CHAIN_COPY, JOINT_LABELS,
      }),
    );
    expect(JSON.stringify(MARGIN_KINDS)).toMatch(/PSAK 72/);
  });
});

describe('the generated plates', () => {
  const tsx = readFileSync(resolve(process.cwd(), 'src/components/industry-chain/ChainPlateSvg.tsx'), 'utf8');
  const css = readFileSync(resolve(process.cwd(), 'src/components/industry-chain/chain-plate.css'), 'utf8');
  const [wideSrc, compactSrc] = tsx.split('export function ChainPlateCompact');
  const texts = (src: string) => Array.from(src.matchAll(/<text[^>]*>([^<]*)<\/text>/g)).map((m) => m[1]);
  const dataIds = (src: string) => new Set(Array.from(src.matchAll(/data-id="([^"]+)"/g)).map((m) => m[1]));

  it('draw every stage, node, return, border and non-physical flow of the full chain, by id', () => {
    const ids = dataIds(wideSrc);
    for (const s of STAGES) expect(ids, s.id).toContain(s.id);
    for (const n of [...NODES, ...RETAIL]) expect(ids, n.id).toContain(n.id);
    for (const r of RETURNS) expect(ids, r.id).toContain(r.id);
    for (const b of BORDERS) expect(ids, b.id).toContain(b.id);
    for (const f of NON_PHYSICAL) expect(ids, f.id).toContain(f.id);
    for (const e of ECONOMY_LENS) expect(ids, e.id).toContain(e.id);
    for (const s of UNIT_LENS) expect(ids, s.id).toContain(s.id);
    expect(ids).toContain(BYPRODUCT.id);
  });

  it('draw every node, slice and economy note as text, in sync with the data', () => {
    // Joined with a space, not a newline: a long note is wrapped onto consecutive <text> lines.
    const drawn = texts(wideSrc).join(' ');
    for (const n of [...NODES, ...RETAIL]) expect(drawn, n.id).toContain(n.label);
    for (const s of UNIT_LENS) expect(drawn, s.id).toContain(s.label);
    for (const e of ECONOMY_LENS) expect(drawn, e.id).toContain(e.note);
    for (const r of RETURNS) expect(drawn, r.id).toContain(r.label);
    for (const f of NON_PHYSICAL) expect(drawn, f.id).toContain(f.label);
    for (const b of BORDERS) expect(drawn, b.id).toContain(b.label);
  });

  it('draw no hourglass hull, no filled entry stage, and no digits in any label', () => {
    expect(tsx).not.toMatch(/cp-hull/);
    expect(tsx).not.toMatch(/cp-stage--entry/);
    expect(css).not.toMatch(/cp-hull|cp-stage--entry/);
    for (const t of texts(tsx)) noFigures(t);
  });

  it('carry every joint and every layer as a door, once each, joints first — and none in the short version', () => {
    for (const j of JOINT_IDS) expect(wideSrc.match(new RegExp(`<JointHit id="${j}"`, 'g')) ?? [], j).toHaveLength(1);
    for (const b of BANDS) expect(wideSrc.match(new RegExp(`<BandHit id="${b.id}"`, 'g')) ?? [], b.id).toHaveLength(1);
    expect(wideSrc.lastIndexOf('<JointHit')).toBeLessThan(wideSrc.indexOf('<BandHit'));
    expect(compactSrc).not.toMatch(/<JointHit|<BandHit/);
  });

  it('give the partial layers a shorter band than the whole-chain ones', () => {
    const width = (id: string) => Number(wideSrc.match(new RegExp(`<BandHit id="${id}"[^>]*width=\\{(\\d+)\\}`))![1]);
    expect(width('band-contract-capacity')).toBeLessThan(width('band-logistics'));
    expect(width('band-governance')).toBeLessThan(width('band-logistics'));
    expect(width('band-credit')).toBe(width('band-logistics'));
  });

  it('expose the full plate as a group with a title and description, so the doors inside it stay in the accessibility tree', () => {
    expect(wideSrc).toMatch(/<svg[^>]*role="group"[^>]*aria-labelledby="cp-wide-title"[^>]*aria-describedby="cp-wide-desc"/);
    expect(wideSrc).toContain(`<title id="cp-wide-title">${CHAIN_COPY.aria.wide.title}</title>`);
    expect(wideSrc).not.toMatch(/hourglass/i);
    expect(tsx).not.toContain('<figcaption');
  });

  it('draws the short version from COMPACT and nothing more', () => {
    const ids = dataIds(compactSrc);
    const expected = new Set<string>([
      ...COMPACT.sequence.flatMap((s) => (s.kind === 'stages' ? s.ids : [s.id])),
      ...COMPACT.bands,
      COMPACT.returnArrow.id,
    ]);
    expect(ids).toEqual(expected);
  });

  it('never share a marker id between the two plates', () => {
    const ids = Array.from(tsx.matchAll(/<marker id="([^"]+)"/g)).map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.endsWith('--wide') || id.endsWith('--compact'))).toBe(true);
  });

  it('uses tokens only, and no type smaller than fourteen viewBox units', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    const sizes = Array.from(css.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)).map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(14);
    expect(css).toMatch(/@media \(hover:hover\)/);
  });
});
