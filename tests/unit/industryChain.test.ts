/**
 * The chain's content contract.
 *
 * What would quietly break the page: a joint with no margin to answer for, a
 * joint with only one of its two readings, a layer whose span does not
 * resolve, a border on the wrong joint, a shift that lights a target the map
 * does not have — or lights one the other shift lights too — a figure
 * sneaking into a map that promises none, or the generated plate drifting
 * from the data it was generated from.
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
  JOINTS,
  JOINT_IDS,
  JOINT_LABELS,
  LEGEND,
  LEGEND_NOTE,
  LEVERS,
  MARGIN_KINDS,
  NODES,
  NON_PHYSICAL,
  RETAIL,
  RETAIL_GROUP,
  RETURNS,
  SHIFTS,
  SHIFT_BY_ID,
  STAGES,
  bandChip,
  bandJoints,
  jointLayers,
  shiftTarget,
  type LensId,
} from '@/data/industryChain';

const LENSES: LensId[] = ['economy', 'finance'];
const stageIds = new Set(STAGES.map((s) => s.id));
const nodeIds = new Set([...NODES, ...RETAIL].map((n) => n.id));
const endIds = new Set([...stageIds, ...nodeIds, RETAIL_GROUP.id]);
const targetIds = new Set([
  ...endIds,
  ...JOINT_IDS,
  ...BANDS.map((b) => b.id),
  ...BORDERS.map((b) => b.id),
  ...RETURNS.map((r) => r.id),
]);

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

  it('each carry two readings — from far and from close — with a short chip word and a sentence behind it', () => {
    for (const j of JOINTS) {
      for (const l of LENSES) {
        expect(j.read[l].chip, `${j.id} ${l} chip`).toBeTruthy();
        expect(j.read[l].chip.length, `${j.id} ${l} chip is short enough to sit on the chain`).toBeLessThanOrEqual(20);
        expect(j.read[l].note.length, `${j.id} ${l} note`).toBeGreaterThan(40);
      }
      expect(j.read.economy.chip, `${j.id} reads differently at the two distances`).not.toBe(j.read.finance.chip);
    }
  });

  it('never repeat a chip word within one distance, so the reading lane tells the joints apart', () => {
    for (const l of LENSES) {
      const chips = JOINTS.map((j) => j.read[l].chip);
      expect(new Set(chips).size, l).toBe(chips.length);
    }
  });
});

describe('the three margin kinds', () => {
  it('each have a chip word, a form, a meaning, a test and at least one line', () => {
    const forms = new Set<string>();
    for (const k of Object.values(MARGIN_KINDS)) {
      expect(k.chip).toBeTruthy();
      expect(k.means).toBeTruthy();
      expect(k.test).toBeTruthy();
      expect(k.lines.length).toBeGreaterThan(0);
      forms.add(k.form);
    }
    // Three kinds, three forms: the kind reads from the chip's border without colour.
    expect(forms).toEqual(new Set(['solid', 'dashed', 'filled']));
  });

  it('tell node from layer by the PSAK 72 principal–agent test — the whole sale against the fee', () => {
    expect(MARGIN_KINDS['node-spread'].test).toMatch(/PSAK 72/);
    expect(MARGIN_KINDS['node-spread'].test.toLowerCase()).toContain('gross');
    // A layer is not an agent for its own service — it is the principal for
    // it, and books the fee. The agent proper is the intermediary that fails
    // the control test, and the copy has to say so.
    expect(MARGIN_KINDS['service-fee'].test).toMatch(/PSAK 72/);
    expect(MARGIN_KINDS['service-fee'].test.toLowerCase()).toContain('fee for its own service');
    expect(MARGIN_KINDS['service-fee'].test.toLowerCase()).toContain('control test');
    expect(MARGIN_KINDS['service-fee'].lines.join(' ').toLowerCase()).toContain('net');
    expect(LEGEND_NOTE).toMatch(/PSAK 72/);
  });
});

describe('the enabling layers', () => {
  it('are six, in this order: the three whole-chain costs, the two partial layers, then the rules under everything', () => {
    expect(BANDS.map((b) => b.id)).toEqual([
      'band-logistics',
      'band-credit',
      'band-energy',
      'band-contract-capacity',
      'band-governance',
      'band-regulation',
    ]);
  });

  it('span real columns, in reading order, say so in words, and read at both distances', () => {
    for (const b of BANDS) {
      const [from, to] = b.span;
      expect(COLUMNS.indexOf(from), `${b.id} from ${from}`).toBeGreaterThanOrEqual(0);
      expect(COLUMNS.indexOf(to), `${b.id} to ${to}`).toBeGreaterThanOrEqual(COLUMNS.indexOf(from));
      expect(b.spanLabel, b.id).toBeTruthy();
      expect(b.means, b.id).toBeTruthy();
      expect(b.lines.length, b.id).toBeGreaterThan(0);
      expect(bandChip(b), `${b.id} needs a chip word`).toBeTruthy();
      for (const l of LENSES) expect(b.read[l], `${b.id} ${l}`).toBeTruthy();
    }
  });

  it('make energy a layer every stage buys and none owns: whole chain, a fee, the subsidy named', () => {
    const energy = BANDS.find((b) => b.id === 'band-energy')!;
    expect(energy.span).toEqual(['stage-biological', 'stage-recovery']);
    expect(energy.margin).toBe('service-fee');
    expect(`${energy.note} ${energy.means} ${energy.read.economy}`.toLowerCase()).toContain('subsid');
    expect(bandJoints(energy)).toEqual([...JOINT_IDS]);
  });

  it('put contract capacity under processing → manufacturing only, and governance under manufacturing → retail only', () => {
    const cc = BANDS.find((b) => b.id === 'band-contract-capacity')!;
    expect(cc.span).toEqual(['stage-processing', 'stage-manufacturing']);
    expect(cc.margin).toBe('service-fee');
    expect(cc.note).toContain('makloon');
    expect(bandJoints(cc)).toEqual(['j-processing-trader', 'j-trader-manufacturing', 'j-packaging-manufacturing']);

    const gov = BANDS.find((b) => b.id === 'band-governance')!;
    expect(gov.span).toEqual(['stage-manufacturing', RETAIL_GROUP.id]);
    expect(gov.margin).toBeUndefined();
    expect(bandJoints(gov)).toEqual(['j-manufacturing-distribution', 'j-distributor-wholesaler', 'j-wholesale-retail']);
  });

  it('ride on every joint for the whole-chain layers, and are derived from the span, not listed by hand', () => {
    for (const id of ['band-logistics', 'band-credit', 'band-energy', 'band-regulation']) {
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

  it('agree with the economy reading of the joints they cut', () => {
    for (const b of BORDERS) {
      const joint = JOINTS.find((j) => j.id === b.at)!;
      expect(joint.read.economy.note.toLowerCase(), b.id).toContain(b.direction === 'out' ? 'export' : 'import');
    }
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

describe('the shifts', () => {
  it('are two — reindustrialisation and the green transition — each a word in the sentence, read at both distances', () => {
    expect(SHIFTS.map((s) => s.id)).toEqual(['reindustrialisation', 'green']);
    for (const s of SHIFTS) {
      expect(s.label).toBeTruthy();
      expect(s.word).toBeTruthy();
      for (const l of LENSES) expect(s.read[l].length, `${s.id} ${l}`).toBeGreaterThan(80);
    }
  });

  it('pull only the three levers there are, and between them pull all three', () => {
    expect(Object.keys(LEVERS).sort()).toEqual(['move-border', 'price-unpaid-joint', 'reprice-layer']);
    const pulled = new Set(SHIFTS.flatMap((s) => s.levers));
    expect(pulled).toEqual(new Set(Object.keys(LEVERS)));
    for (const s of SHIFTS) expect(s.levers.length, s.id).toBeGreaterThan(0);
    for (const lever of Object.values(LEVERS)) {
      expect(lever.label).toBeTruthy();
      expect(lever.means).toBeTruthy();
    }
  });

  it('light only things the map has, each read at both distances', () => {
    for (const s of SHIFTS) {
      expect(s.targets.length, s.id).toBeGreaterThanOrEqual(3);
      for (const t of s.targets) {
        expect(targetIds.has(t.id), `${s.id} lights ${t.id}, which the map does not have`).toBe(true);
        for (const l of LENSES) expect(t.read[l], `${t.id} ${l}`).toBeTruthy();
      }
      for (const m of s.moves) {
        expect(targetIds.has(m.from), `${m.id} from`).toBe(true);
        expect(targetIds.has(m.to), `${m.id} to`).toBe(true);
        expect(m.label).toBeTruthy();
      }
      for (const c of s.callouts) {
        expect(targetIds.has(c.at), `${c.id} at`).toBe(true);
        expect(c.label).toBeTruthy();
      }
    }
  });

  it('never light the same target twice, so the two are never read as compatible', () => {
    const [a, b] = SHIFTS;
    const shared = a.targets.filter((t) => b.targets.some((u) => u.id === t.id));
    expect(shared).toEqual([]);
    const overlap = SHIFTS.map((s) => new Set(s.targets.map((t) => t.id)));
    expect([...overlap[0]].some((id) => overlap[1].has(id))).toBe(false);
  });

  it('reindustrialisation lights the border lines, the trader and manufacturing; the green transition lights energy, credit, recovery and the post-consumer loop', () => {
    const lit = (id: string) => new Set(SHIFT_BY_ID[id as 'reindustrialisation' | 'green'].targets.map((t) => t.id));
    const re = lit('reindustrialisation');
    for (const must of ['border-export', 'border-import', 'node-trader', 'stage-manufacturing', 'j-extraction-processing', 'j-trader-manufacturing']) {
      expect(re.has(must), `reindustrialisation lights ${must}`).toBe(true);
    }
    expect(SHIFT_BY_ID.reindustrialisation.moves.map((m) => [m.from, m.to])).toEqual([['border-export', 'j-processing-trader']]);

    const gr = lit('green');
    for (const must of ['band-energy', 'band-credit', 'stage-recovery', 'j-consumption-recovery', 'return-postconsumer-material', 'return-postconsumer-organic']) {
      expect(gr.has(must), `green lights ${must}`).toBe(true);
    }
    expect(SHIFT_BY_ID.green.levers).toEqual(['price-unpaid-joint', 'reprice-layer']);
    expect(SHIFT_BY_ID.reindustrialisation.levers).toEqual(['move-border']);
  });

  it('answer shiftTarget only for a lit id under an active shift', () => {
    expect(shiftTarget(null, 'border-export')).toBeUndefined();
    expect(shiftTarget('reindustrialisation', 'border-export')?.read.economy).toBeTruthy();
    expect(shiftTarget('green', 'border-export')).toBeUndefined();
    expect(shiftTarget('green', 'band-energy')?.read.finance).toBeTruthy();
  });
});

describe('the legend', () => {
  it('names the four categories, the joint and its three chip forms, the non-physical flows, the border and the shift, each with a note', () => {
    const ids = LEGEND.map((l) => l.id);
    for (const must of ['stage', 'node', 'layer', 'return', 'joint', 'conversion', 'spread', 'fee', 'money', 'information', 'border', 'shift']) {
      expect(ids).toContain(must);
    }
    for (const l of LEGEND) expect(l.note, l.id).toBeTruthy();
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

  it('makes the two controls two sentences whose words are the positions', () => {
    expect(CHAIN_COPY.lead.economy).toBe('economy');
    expect(CHAIN_COPY.lead.finance).toBe('finance');
    expect(CHAIN_COPY.shiftLead.before).toBeTruthy();
    expect(CHAIN_COPY.shiftLead.middle).toBeTruthy();
    expect(CHAIN_COPY.shiftLead.after.toLowerCase()).toContain('one at a time');
    expect(CHAIN_COPY.lensName).toEqual({ economy: 'Economy', finance: 'Finance' });
  });

  it('keeps the local terms', () => {
    const all = JSON.stringify({ RETAIL, BANDS, LEVERS }).toLowerCase();
    for (const term of ['warung', 'makloon', 'horeca', 'general trade', 'hilirisasi']) expect(all, term).toContain(term);
  });

  it('carries no figures anywhere — no percentages, amounts or magnitudes — only the name of the standard', () => {
    noFigures(
      JSON.stringify({
        STAGES, NODES, RETAIL, RETAIL_GROUP, JOINTS, MARGIN_KINDS, BANDS, BORDERS, RETURNS, BYPRODUCT, NON_PHYSICAL,
        LEGEND, LEGEND_NOTE, SHIFTS, LEVERS, COMPACT, CHAIN_COPY, JOINT_LABELS,
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

  it('draw every stage, node, retail format, return, border and non-physical flow of the full chain, by id', () => {
    const ids = dataIds(wideSrc);
    for (const s of STAGES) expect(ids, s.id).toContain(s.id);
    for (const n of [...NODES, ...RETAIL]) expect(ids, n.id).toContain(n.id);
    expect(ids).toContain(RETAIL_GROUP.id);
    for (const r of RETURNS) expect(ids, r.id).toContain(r.id);
    for (const b of BORDERS) expect(ids, b.id).toContain(b.id);
    for (const f of NON_PHYSICAL) expect(ids, f.id).toContain(f.id);
    expect(ids).toContain(BYPRODUCT.id);
  });

  it('draw every stage, node and format as text, in sync with the data — and no lens text, which lives on the chips at run time', () => {
    // Joined with a space, not a newline: a long label or note is wrapped onto
    // consecutive <text> lines, so the plate holds the words but not the breaks.
    const drawn = texts(wideSrc).join(' ');
    const compactDrawn = texts(compactSrc).join(' ');
    for (const st of STAGES) expect(drawn, st.id).toContain(st.label);
    for (const st of COMPACT.sequence.flatMap((x) => (x.kind === 'stages' ? x.ids : []))) {
      expect(compactDrawn, st).toContain(STAGES.find((x) => x.id === st)!.label);
    }
    expect(drawn, 'the distributor recursion comes from the data too').toContain(
      NODES.find((n) => n.id === 'node-distributor')!.recursion!,
    );
    for (const n of [...NODES, ...RETAIL]) expect(drawn, n.id).toContain(n.label);
    for (const r of RETURNS) expect(drawn, r.id).toContain(r.label);
    for (const f of NON_PHYSICAL) expect(drawn, f.id).toContain(f.label);
    for (const b of BORDERS) expect(drawn, b.id).toContain(b.label);
    for (const name of Object.values(CHAIN_COPY.lensName)) expect(drawn, `${name} lane label`).toContain(name);
    for (const j of JOINTS) for (const l of LENSES) expect(drawn, `${j.id} ${l} chip is a run-time word`).not.toContain(j.read[l].chip);
  });

  it('carry the retail formats as rows inside one retail node', () => {
    // The retail node is drawn just before the consumption stage; every format row sits between the two.
    const start = wideSrc.indexOf('cp-retail" data-id="node-retail"');
    const retail = wideSrc.slice(start, wideSrc.indexOf('data-id="stage-consumption"', start));
    expect(start).toBeGreaterThan(0);
    for (const r of RETAIL) expect(retail, r.id).toContain(`<g className="cp-retail-row" data-id="${r.id}">`);
  });

  it('draw no hourglass hull, no lens cloud, no unit strip, no energy arrows, and no digits in any label', () => {
    expect(tsx).not.toMatch(/cp-hull|cp-stage--entry|cp-econ|cp-slice|cp-energy|cp-lens--/);
    expect(css).not.toMatch(/cp-hull|cp-stage--entry|cp-econ|cp-slice|cp-energy/);
    for (const t of texts(tsx)) noFigures(t);
  });

  it('carry every joint and every layer as a door, once each, joints first — and none in the short version', () => {
    for (const j of JOINT_IDS) expect(wideSrc.match(new RegExp(`<JointHit id="${j}"`, 'g')) ?? [], j).toHaveLength(1);
    for (const b of BANDS) expect(wideSrc.match(new RegExp(`<BandHit id="${b.id}"`, 'g')) ?? [], b.id).toHaveLength(1);
    expect(wideSrc.lastIndexOf('<JointHit')).toBeLessThan(wideSrc.indexOf('<BandHit'));
    expect(compactSrc).not.toMatch(/<JointHit|<BandHit/);
  });

  it('give the partial layers a shorter band than the whole-chain ones, and energy the whole chain', () => {
    const width = (id: string) => Number(wideSrc.match(new RegExp(`<BandHit id="${id}"[^>]*width=\\{(\\d+)\\}`))![1]);
    expect(width('band-contract-capacity')).toBeLessThan(width('band-logistics'));
    expect(width('band-governance')).toBeLessThan(width('band-logistics'));
    expect(width('band-credit')).toBe(width('band-logistics'));
    expect(width('band-energy')).toBe(width('band-logistics'));
  });

  it('draw one overlay per shift with a lit mark for every target, the moves and the callouts, hidden until the wrapper says which', () => {
    for (const s of SHIFTS) {
      const start = wideSrc.indexOf(`cp-shift cp-shift--${s.id}"`);
      expect(start, s.id).toBeGreaterThan(0);
      const end = wideSrc.indexOf('cp-shift cp-shift--', start + 10);
      const layer = wideSrc.slice(start, end === -1 ? wideSrc.indexOf('<g className="cp-hits">') : end);
      for (const t of s.targets) expect(layer, `${s.id} lights ${t.id}`).toContain(`<g className="cp-lit" data-for="${t.id}">`);
      for (const m of s.moves) {
        expect(layer, m.id).toContain(`data-id="${m.id}"`);
        expect(layer, m.label).toContain(m.label);
      }
      for (const c of s.callouts) {
        expect(layer, c.id).toContain(`data-id="${c.id}"`);
        expect(layer, c.label).toContain(c.label);
      }
      expect(css).toContain(`.chain-plate[data-shift="${s.id}"] .cp-shift--${s.id}{display:block}`);
    }
    expect(css).toMatch(/\.cp-shift\{display:none\}/);
    // Under a shift the base geometry recedes; under a distance nothing does.
    expect(css).toMatch(/\.chain-plate\[data-shift\] \.cp-base :is\(path,rect/);
    expect(css).not.toMatch(/\.chain-plate\[data-lens\] \.cp-base/);
  });

  it('puts a quiet diamond on every join of the short version', () => {
    const joins = compactSrc.match(/cp-joint-motif/g) ?? [];
    // Two origins into what follows, then one join per step after the first.
    expect(joins.length).toBeGreaterThanOrEqual(COMPACT.sequence.length);
  });

  it('expose the full plate as a group with a title and description, so the doors inside it stay in the accessibility tree', () => {
    expect(wideSrc).toMatch(/<svg[^>]*role="group"[^>]*aria-labelledby="cp-wide-title"[^>]*aria-describedby="cp-wide-desc"/);
    expect(wideSrc).toContain(`<title id="cp-wide-title">${CHAIN_COPY.aria.wide.title}</title>`);
    expect(wideSrc).not.toMatch(/hourglass/i);
    expect(tsx).not.toContain('<figcaption');
    expect(wideSrc).toMatch(/<g className="cp-shifts" aria-hidden="true">/);
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

  it('uses tokens only, one accent that means a shift, and no type smaller than fourteen viewBox units', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    const sizes = Array.from(css.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)).map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(14);
    expect(css).toMatch(/@media \(hover:hover\)/);
    expect(css).toMatch(/--cp-shift: hsl\(var\(--accent-editorial\)\)/);
    expect(css).not.toMatch(/--cp-far|--cp-near|--cp-mono/);
    // The flow outweighs the box: the chain reads before its stations.
    const flow = Number(css.match(/\.cp-flow\{[^}]*stroke-width:([\d.]+)/)![1]);
    const box = Number(css.match(/\.cp-stage rect\{[^}]*stroke-width:([\d.]+)/)![1]);
    expect(flow).toBeGreaterThan(box);
  });
});
