/**
 * The chain's content contract.
 *
 * What would quietly break the page: a joint with no margin to answer for, a
 * joint with only one of its two readings, a layer whose span does not
 * resolve, a border on the wrong joint, a shift that marks a target the map
 * does not have — or marks one the other shift marks too — a marked target
 * with no status, a figure sneaking into a map that promises none, or the
 * generated plate drifting from the data it was generated from.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BANDS,
  BAND_BY_ID,
  BORDERS,
  BYPRODUCT,
  CHAIN_COPY,
  COLUMNS,
  COMPACT,
  DEFINE,
  JOINTS,
  JOINT_BY_ID,
  JOINT_IDS,
  JOINT_LABELS,
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
  STATUS,
  SLUGS,
  UNWRITTEN,
  bandChip,
  bandJoints,
  idOfSlug,
  isMarked,
  isWritten,
  jointLayers,
  markedTargets,
  shiftTarget,
  slugOf,
  targetStatus,
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

/** No figures at all. Not a magnitude, not an illustrative one, and not a standard's number either. */
const noFigures = (text: string) => expect(text).not.toMatch(/\d/);

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

  it('name a macro entry point on every economy chip — never a sector or a kind of good', () => {
    const chips = JOINTS.map((j) => j.read.economy.chip);
    expect(chips).not.toContain('Basic industry');
    expect(chips).not.toContain('Intermediate input');
    expect(JOINT_BY_ID['j-processing-trader'].read.economy.chip).toBe('Producer prices');
    expect(JOINT_BY_ID['j-packaging-manufacturing'].read.economy.chip).toBe('Input–output link');
  });
});

describe('the three margin kinds', () => {
  it('each have a chip word, a mark form, a meaning, a test and at least one line', () => {
    const forms = new Set<string>();
    const marks = new Set<string>();
    for (const k of Object.values(MARGIN_KINDS)) {
      expect(k.chip).toBeTruthy();
      expect(k.means).toBeTruthy();
      expect(k.test).toBeTruthy();
      expect(k.lines.length).toBeGreaterThan(0);
      forms.add(k.form);
      marks.add(k.mark);
    }
    // Three kinds, three forms of joint mark: the kind reads on the flow without colour or a legend.
    expect(forms).toEqual(new Set(['solid', 'dashed', 'filled']));
    expect(marks).toEqual(new Set(['filled-diamond', 'open-diamond', 'square']));
    expect(MARGIN_KINDS.conversion.mark).toBe('filled-diamond');
    expect(MARGIN_KINDS['node-spread'].mark).toBe('open-diamond');
    expect(MARGIN_KINDS['service-fee'].mark).toBe('square');
  });

  it('tell node from layer by the principal–agent control test — the whole sale against the fee — and name no standard', () => {
    expect(MARGIN_KINDS['node-spread'].test.toLowerCase()).toContain('control');
    expect(MARGIN_KINDS['node-spread'].test.toLowerCase()).toContain('the whole sale as revenue');
    expect(MARGIN_KINDS['node-spread'].lines.join(' ').toLowerCase()).toContain('gross');
    expect(MARGIN_KINDS['service-fee'].test.toLowerCase()).toContain('service');
    expect(MARGIN_KINDS['service-fee'].test.toLowerCase()).toContain('control');
    expect(MARGIN_KINDS['service-fee'].lines.join(' ').toLowerCase()).toContain('net');
    // The footnote became the one line over the map.
    expect(CHAIN_COPY.scopeLead.toLowerCase()).toContain('principal from agent');
    expect(CHAIN_COPY.scopeLead.toLowerCase()).toContain('functions, not firms');
    for (const k of Object.values(MARGIN_KINDS)) expect(k.test).not.toMatch(/PSAK/);
  });
});

describe('the enabling layers', () => {
  it('are six, in this order: logistics, the cold chain split out of it, credit, energy, the one partial layer, then the rules under everything', () => {
    expect(BANDS.map((b) => b.id)).toEqual(['band-logistics', 'band-cold-chain', 'band-credit', 'band-energy', 'band-governance', 'band-regulation']);
  });

  it('do not carry contract capacity as a layer of its own — withdrawn — while makloon survives where a toller actually appears', () => {
    expect(BANDS.map((b) => b.id)).not.toContain('band-contract-capacity');
    const alt = JOINT_BY_ID['j-manufacturing-distribution'].alt!;
    expect(alt.margin).toBe('node-spread');
    expect(alt.when).toContain('makloon');
    expect(alt.when.toLowerCase()).toContain('tolling fee');
  });

  it('span real columns, in reading order, say so in words, say where they attach, and read at both distances', () => {
    for (const b of BANDS) {
      const [from, to] = b.span;
      expect(COLUMNS.indexOf(from), `${b.id} from ${from}`).toBeGreaterThanOrEqual(0);
      expect(COLUMNS.indexOf(to), `${b.id} to ${to}`).toBeGreaterThanOrEqual(COLUMNS.indexOf(from));
      expect(b.spanLabel, b.id).toBeTruthy();
      expect(b.means, b.id).toBeTruthy();
      expect(b.lines.length, b.id).toBeGreaterThan(0);
      expect(['joints', 'stages', 'none'], b.id).toContain(b.attaches);
      for (const l of LENSES) expect(b.read[l], `${b.id} ${l}`).toBeTruthy();
    }
  });

  it('carry a chip word only where they earn a fee: a layer that sets the terms is not a fourth kind of margin', () => {
    for (const b of BANDS) {
      if (b.margin) expect(bandChip(b), b.id).toBe(MARGIN_KINDS[b.margin].chip);
      else expect(bandChip(b), b.id).toBe('');
    }
    expect(bandChip(BAND_BY_ID['band-governance'])).toBe('');
    expect(bandChip(BAND_BY_ID['band-regulation'])).toBe('');
  });

  it('make energy a layer every stage buys and none owns: whole chain, a fee, an input into the stages, the subsidy named', () => {
    const energy = BANDS.find((b) => b.id === 'band-energy')!;
    expect(energy.span).toEqual(['stage-biological', 'stage-recovery']);
    expect(energy.margin).toBe('service-fee');
    expect(energy.attaches).toBe('stages');
    expect(`${energy.note} ${energy.means} ${energy.read.economy}`.toLowerCase()).toContain('subsid');
    expect(`${energy.note} ${energy.means}`.toLowerCase()).toContain('every stage');
    expect(bandJoints(energy)).toEqual([...JOINT_IDS]);
  });

  it('split the cold chain out of logistics: production → consumption, a fee, attaching at the moves, deciding which nodes can hold stock', () => {
    const cold = BAND_BY_ID['band-cold-chain'];
    expect(cold.span).toEqual(['stage-biological', 'stage-consumption']);
    expect(cold.margin).toBe('service-fee');
    expect(cold.attaches).toBe('joints');
    expect(bandJoints(cold)).toEqual(JOINT_IDS.filter((j) => j !== 'j-consumption-recovery'));
    expect(`${cold.note} ${cold.means}`.toLowerCase()).toMatch(/node/);
    expect(BAND_BY_ID['band-logistics'].note?.toLowerCase()).not.toContain('cold');
  });

  it('put governance under manufacturing → retail only, and regulation everywhere with no tick', () => {
    const gov = BANDS.find((b) => b.id === 'band-governance')!;
    expect(gov.span).toEqual(['stage-manufacturing', RETAIL_GROUP.id]);
    expect(gov.margin).toBeUndefined();
    expect(bandJoints(gov)).toEqual(['j-manufacturing-distribution', 'j-distributor-wholesaler', 'j-wholesale-retail']);
    expect(BAND_BY_ID['band-regulation'].attaches).toBe('none');
  });

  it('ride on every joint for the whole-chain layers, and are derived from the span, not listed by hand', () => {
    for (const id of ['band-logistics', 'band-credit', 'band-energy', 'band-regulation']) {
      expect(bandJoints(BANDS.find((b) => b.id === id)!)).toEqual([...JOINT_IDS]);
    }
    for (const j of JOINT_IDS) expect(jointLayers(j).map((b) => b.id), j).toContain('band-logistics');
    expect(jointLayers('j-retail-consumption').map((b) => b.id)).not.toContain('band-governance');
    expect(jointLayers('j-production-aggregation').map((b) => b.id)).not.toContain('band-governance');
    expect(jointLayers('j-consumption-recovery').map((b) => b.id)).not.toContain('band-cold-chain');
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

  it('mark only things the map has, each with a status and a lever the shift pulls', () => {
    for (const s of SHIFTS) {
      expect(s.targets.length, s.id).toBeGreaterThanOrEqual(3);
      for (const t of s.targets) {
        expect(targetIds.has(t.id), `${s.id} marks ${t.id}, which the map does not have`).toBe(true);
        expect(t.condition, `${s.id} ${t.id} has a condition`).toBeDefined();
        expect(Object.keys(STATUS), `${s.id} ${t.id} status`).toContain(t.condition!.status);
        expect(s.levers, `${s.id} ${t.id} pulls a lever this shift has`).toContain(t.condition!.lever);
      }
      for (const m of s.moves) {
        if (m.kind === 'cut') {
          expect(targetIds.has(m.from), `${m.id} from`).toBe(true);
          expect(targetIds.has(m.to), `${m.id} to`).toBe(true);
        } else {
          expect(targetIds.has(m.at), `${m.id} at`).toBe(true);
        }
        expect(m.label).toBeTruthy();
      }
      for (const c of s.callouts) {
        expect(targetIds.has(c.at), `${c.id} at`).toBe(true);
        expect(c.label).toBeTruthy();
      }
    }
  });

  it('never mark the same target twice, so the two are never read as compatible', () => {
    const [a, b] = SHIFTS;
    const shared = a.targets.filter((t) => b.targets.some((u) => u.id === t.id));
    expect(shared).toEqual([]);
  });

  it('reindustrialisation moves the border cut; the green transition prices recovery and re-prices the layers', () => {
    const lit = (id: string) => new Set(SHIFT_BY_ID[id as 'reindustrialisation' | 'green'].targets.map((t) => t.id));
    const re = lit('reindustrialisation');
    for (const must of ['border-export', 'border-import', 'node-trader', 'stage-manufacturing', 'j-extraction-processing', 'j-trader-manufacturing']) {
      expect(re.has(must), `reindustrialisation marks ${must}`).toBe(true);
    }
    expect(SHIFT_BY_ID.reindustrialisation.moves).toEqual([
      { id: 'move-export-cut', kind: 'cut', from: 'border-export', to: 'j-processing-trader', label: 'The export cut moves right' },
    ]);

    const gr = lit('green');
    for (const must of ['band-energy', 'band-credit', 'band-logistics', 'band-cold-chain', 'stage-recovery', 'j-consumption-recovery', 'return-postconsumer-material', 'return-postconsumer-organic']) {
      expect(gr.has(must), `green marks ${must}`).toBe(true);
    }
    expect(SHIFT_BY_ID.green.moves.map((m) => [m.kind, 'at' in m ? m.at : ''])).toEqual([['price', 'j-consumption-recovery']]);
    expect(SHIFT_BY_ID.green.levers).toEqual(['price-unpaid-joint', 'reprice-layer']);
    expect(SHIFT_BY_ID.reindustrialisation.levers).toEqual(['move-border']);
  });

  it('answer shiftTarget only for a marked id under an active shift', () => {
    expect(shiftTarget(null, 'border-export')).toBeUndefined();
    expect(shiftTarget('reindustrialisation', 'border-export')?.condition?.action.economy).toBeTruthy();
    expect(shiftTarget('green', 'border-export')).toBeUndefined();
    expect(shiftTarget('green', 'band-energy')?.condition?.action.finance).toBeTruthy();
    expect(targetStatus('green', 'band-logistics')).toBe('stuck');
    expect(targetStatus('reindustrialisation', 'band-logistics')).toBeUndefined();
  });
});

describe('the condition layer', () => {
  it('has three statuses and only three, each told by a form, not a colour', () => {
    expect(Object.keys(STATUS).sort()).toEqual(['moving', 'stuck', 'unpriced']);
    expect(new Set(Object.values(STATUS).map((s) => s.form))).toEqual(new Set(['filled', 'open', 'dashed']));
    for (const s of Object.values(STATUS)) {
      expect(s.label).toBeTruthy();
      expect(s.means).toBeTruthy();
    }
  });

  it("follows the brief's own examples: the floor logistics sets is stuck; formal recovery is unpriced", () => {
    expect(targetStatus('green', 'band-logistics')).toBe('stuck');
    expect(targetStatus('green', 'band-cold-chain')).toBe('stuck');
    expect(targetStatus('green', 'j-consumption-recovery')).toBe('unpriced');
    expect(targetStatus('green', 'stage-recovery')).toBe('unpriced');
  });

  it('keeps the four lines as two-voice slots, with the lever line always written and the rest left empty rather than faked', () => {
    for (const s of SHIFTS) {
      for (const t of s.targets) {
        const c = t.condition!;
        for (const l of LENSES) {
          expect(isWritten(c.action, l), `${s.id} ${t.id} ${l} action`).toBe(true);
          for (const slot of [c.now, c.holds, c.funds]) {
            // Written or empty — never a placeholder a reader could see.
            expect(slot[l]).not.toMatch(/todo|placeholder|owner|lorem/i);
          }
        }
      }
    }
    expect(UNWRITTEN).toEqual({ economy: '', finance: '' });
    expect(isWritten(UNWRITTEN, 'economy')).toBe(false);
    expect(isWritten(undefined, 'finance')).toBe(false);
  });

  it('marks a target if and only if it has a condition, so the distance control never renumbers anything', () => {
    for (const s of SHIFTS) {
      expect(markedTargets(s.id).length, s.id).toBe(s.targets.length);
      for (const t of s.targets) expect(isMarked(t), `${s.id} ${t.id}`).toBe(true);
    }
    expect(isMarked({ id: 'x' })).toBe(false);
    expect(isMarked({ id: 'x', condition: { status: 'stuck', now: UNWRITTEN, holds: UNWRITTEN, lever: 'move-border', action: UNWRITTEN, funds: UNWRITTEN } })).toBe(true);
  });

  it('leaves the essay list empty until the owner fills it, and never invents one', () => {
    for (const s of SHIFTS) {
      for (const t of s.targets) {
        for (const a of t.articles ?? []) {
          expect(a.slug, `${s.id} ${t.id}`).toMatch(/^[a-z0-9-]+$/);
          expect(a.title, `${s.id} ${t.id}`).toBeTruthy();
        }
      }
    }
  });

  it('reads the enabling layer as the bearer of a per-unit burden: a floor no single stage can remove', () => {
    const logistics = shiftTarget('green', 'band-logistics')!.condition!;
    expect(logistics.action.economy.toLowerCase()).toContain('floor');
    expect(logistics.action.economy.toLowerCase()).toContain('touch');
    // One physical fact, booked in two places — the gross/net split, again.
    expect(logistics.action.finance.toLowerCase()).toContain('two places');
    expect(BAND_BY_ID['band-logistics'].means.toLowerCase()).toContain('floor');
    expect(shiftTarget('green', 'band-cold-chain')!.condition!.action.economy.toLowerCase()).toContain('floor');
  });
});

describe('the definitions that replaced the legend', () => {
  it('say what each form is, in one line, on the element itself', () => {
    expect(DEFINE.stage.toLowerCase()).toContain('conversion');
    expect(DEFINE.node.toLowerCase()).toContain('takes title');
    expect(DEFINE.node.toLowerCase()).toContain('transforms nothing');
    expect(DEFINE.layerFee.toLowerCase()).toContain('no title');
    expect(DEFINE.layerTerms.toLowerCase()).toContain('terms');
    expect(DEFINE.return.toLowerCase()).toContain('back up the chain');
    expect(DEFINE.byproduct.toLowerCase()).toContain('not a return');
    expect(DEFINE.border.toLowerCase()).toContain('external sector');
    expect(DEFINE.joint.toLowerCase()).toContain('sells');
    for (const line of Object.values(DEFINE)) expect(line.length).toBeGreaterThan(8);
  });

  it('keeps the shift sentence honest: a shift is a reading, not anatomy, and one at a time', () => {
    expect(CHAIN_COPY.shiftLead.after.toLowerCase()).toContain('one at a time');
    expect(CHAIN_COPY.shiftLead.after.toLowerCase()).toContain('reading');
    expect(CHAIN_COPY.panel.readingKicker).toBe('Reading');
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
  it('keeps the headline and the standfirst verbatim: the joint is the subject, the two distances are the claim', () => {
    expect(CHAIN_COPY.headline).toBe('Every joint in this chain is a margin.');
    expect(CHAIN_COPY.standfirst).toBe('Add them up and you have an economy; take one apart and you have a driver tree.');
  });

  it('makes the two controls two sentences whose words are the positions', () => {
    expect(CHAIN_COPY.lead.economy).toBe('economy');
    expect(CHAIN_COPY.lead.finance).toBe('finance');
    expect(CHAIN_COPY.shiftLead.before).toBeTruthy();
    expect(CHAIN_COPY.shiftLead.middle).toBeTruthy();
    expect(CHAIN_COPY.lensName).toEqual({ economy: 'Economy', finance: 'Finance' });
  });

  it('keeps the local terms', () => {
    const all = JSON.stringify({ RETAIL, BANDS, LEVERS, JOINTS }).toLowerCase();
    for (const term of ['warung', 'makloon', 'horeca', 'general trade', 'hilirisasi']) expect(all, term).toContain(term);
  });

  it('carries no figures anywhere — no percentages, amounts or magnitudes', () => {
    noFigures(
      JSON.stringify({
        STAGES, NODES, RETAIL, RETAIL_GROUP, JOINTS, MARGIN_KINDS, BANDS, BORDERS, RETURNS, BYPRODUCT, NON_PHYSICAL,
        SHIFTS, LEVERS, STATUS, DEFINE, COMPACT, CHAIN_COPY, JOINT_LABELS,
      }),
    );
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
    const drawn = texts(wideSrc).join(' ');
    const compactDrawn = texts(compactSrc).join(' ');
    for (const st of STAGES) expect(drawn, st.id).toContain(st.label);
    for (const st of COMPACT.sequence.flatMap((x) => (x.kind === 'stages' ? x.ids : []))) {
      expect(compactDrawn, st).toContain(STAGES.find((x) => x.id === st)!.label);
    }
    expect(drawn, 'the distributor recursion comes from the data too').toContain(NODES.find((n) => n.id === 'node-distributor')!.recursion!);
    for (const n of [...NODES, ...RETAIL]) expect(drawn, n.id).toContain(n.label);
    for (const r of RETURNS) expect(drawn, r.id).toContain(r.label);
    for (const f of NON_PHYSICAL) expect(drawn, f.id).toContain(f.label);
    for (const b of BORDERS) expect(drawn, b.id).toContain(b.label);
    for (const name of Object.values(CHAIN_COPY.lensName)) expect(drawn, `${name} lane label`).toContain(name);
    for (const j of JOINTS) for (const l of LENSES) expect(drawn, `${j.id} ${l} chip is a run-time word`).not.toContain(j.read[l].chip);
  });

  it('carry the retail formats as rows inside one retail node', () => {
    const start = wideSrc.indexOf('cp-retail" data-id="node-retail"');
    const retail = wideSrc.slice(start, wideSrc.indexOf('data-id="stage-consumption"', start));
    expect(start).toBeGreaterThan(0);
    for (const r of RETAIL) expect(retail, r.id).toContain(`<g className="cp-retail-row" data-id="${r.id}">`);
  });

  it('draw no hourglass hull, no lens cloud, no unit strip, and no digits in any label — and an energy input into every stage', () => {
    expect(tsx).not.toMatch(/cp-hull|cp-stage--entry|cp-econ|cp-slice|cp-lens--/);
    expect(css).not.toMatch(/cp-hull|cp-stage--entry|cp-econ|cp-slice/);
    for (const t of texts(tsx)) noFigures(t);
    const stubs = Array.from(wideSrc.matchAll(/cp-energy-in" data-for="([^"]+)"/g)).map((m) => m[1]).sort();
    expect(stubs).toEqual(STAGES.map((s) => s.id).sort());
  });

  it('carry every joint and every layer as a door, once each, joints first, each layer with its switch — and none in the short version', () => {
    for (const j of JOINT_IDS) expect(wideSrc.match(new RegExp(`<JointHit id="${j}"`, 'g')) ?? [], j).toHaveLength(1);
    for (const b of BANDS) {
      expect(wideSrc.match(new RegExp(`<BandHit id="${b.id}"`, 'g')) ?? [], b.id).toHaveLength(1);
      expect(wideSrc.match(new RegExp(`<LayerSwitch id="${b.id}"`, 'g')) ?? [], b.id).toHaveLength(1);
    }
    expect(wideSrc.lastIndexOf('<JointHit')).toBeLessThan(wideSrc.indexOf('<BandHit'));
    expect(compactSrc).not.toMatch(/<JointHit|<BandHit|<LayerSwitch|<ShiftMark/);
  });

  it('put the bands directly under the reading lane and the rails at the bottom, and tick each band where it attaches', () => {
    const bandY = (id: string) => Number(wideSrc.match(new RegExp(`<BandHit id="${id}"[^>]*y=\\{(\\d+)\\}`))![1]);
    const railY = Number(wideSrc.match(/data-id="flow-money-payment">\s*<path className="cp-money" d="M \d+ (\d+)/)![1]);
    const chipRowY = Number(wideSrc.match(/<JointHit id="j-production-aggregation"[^>]*chipY=\{(\d+)\}/)![1]);
    expect(chipRowY).toBeLessThan(bandY('band-logistics'));
    expect(bandY('band-regulation')).toBeLessThan(railY);
    const ticks = (id: string) => wideSrc.match(new RegExp(`<BandHit id="${id}"[^>]*ticks=\\{\\[([^\\]]*)\\]\\}`))![1].split(',').filter((s) => s.trim());
    expect(ticks('band-logistics')).toHaveLength(JOINT_IDS.length);
    expect(ticks('band-cold-chain')).toHaveLength(JOINT_IDS.length - 1);
    expect(ticks('band-governance')).toHaveLength(3);
    expect(ticks('band-regulation')).toHaveLength(0);
    expect(ticks('band-energy').length).toBeGreaterThanOrEqual(5);
  });

  it('give the partial layer a shorter band than the whole-chain ones, and energy the whole chain', () => {
    const width = (id: string) => Number(wideSrc.match(new RegExp(`<BandHit id="${id}"[^>]*width=\\{(\\d+)\\}`))![1]);
    expect(width('band-governance')).toBeLessThan(width('band-logistics'));
    expect(width('band-credit')).toBe(width('band-logistics'));
    expect(width('band-energy')).toBe(width('band-logistics'));
    expect(width('band-cold-chain')).toBeLessThanOrEqual(width('band-logistics'));
  });

  it('draw one overlay per shift with an outline in the form of its status for every marked target, the moves and the callouts, hidden until the wrapper says which', () => {
    for (const s of SHIFTS) {
      const start = wideSrc.indexOf(`cp-shift cp-shift--${s.id}"`);
      expect(start, s.id).toBeGreaterThan(0);
      const end = wideSrc.indexOf('cp-shift cp-shift--', start + 10);
      const layer = wideSrc.slice(start, end === -1 ? wideSrc.indexOf('<g className="cp-hits">') : end);
      for (const t of s.targets) {
        expect(layer, `${s.id} marks ${t.id}`).toContain(`<g className="cp-lit" data-for="${t.id}" data-status="${t.condition!.status}">`);
        expect(layer, `${s.id} ${t.id} status form`).toContain(`cp-lit--${t.condition!.status}`);
      }
      for (const m of s.moves) expect(layer, m.id).toContain(`data-id="${m.id}"`);
      for (const c of s.callouts) {
        expect(layer, c.id).toContain(`data-id="${c.id}"`);
        expect(layer, c.label).toContain(c.label);
      }
      expect(css).toContain(`.chain-plate[data-shift="${s.id}"] .cp-shift--${s.id}{display:block}`);
    }
    expect(css).toMatch(/\.cp-shift\{display:none\}/);
    expect(css).toMatch(/\.chain-plate\[data-shift\] \.cp-base :is\(path,rect/);
    expect(css).not.toMatch(/\.chain-plate\[data-lens\] \.cp-base/);
    // Status by form, on the outline and on the disc.
    expect(css).toMatch(/\.cp-lit--stuck/);
    expect(css).toMatch(/\.cp-lit--unpriced[^{]*\{[^}]*stroke-dasharray/);
    expect(css).toMatch(/\.cp-mark--stuck circle\{fill:var\(--cp-shift\)\}/);
    expect(css).toMatch(/\.cp-mark--unpriced circle\{stroke-dasharray/);
  });

  it('puts a quiet diamond on every join of the short version', () => {
    const joins = compactSrc.match(/cp-joint-motif/g) ?? [];
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
    const expected = new Set<string>([...COMPACT.sequence.flatMap((s) => (s.kind === 'stages' ? s.ids : [s.id])), ...COMPACT.bands, COMPACT.returnArrow.id]);
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
    const flow = Number(css.match(/\.cp-flow\{[^}]*stroke-width:([\d.]+)/)![1]);
    const box = Number(css.match(/\.cp-stage rect\{[^}]*stroke-width:([\d.]+)/)![1]);
    expect(flow).toBeGreaterThan(box);
  });
});

describe('identity: the slug table', () => {
  const addressable = [
    ...STAGES.map((x) => x.id),
    ...NODES.map((x) => x.id),
    ...RETAIL.map((x) => x.id),
    RETAIL_GROUP.id,
    ...BANDS.map((x) => x.id),
    ...BORDERS.map((x) => x.id),
    ...JOINT_IDS,
    ...RETURNS.map((x) => x.id),
    BYPRODUCT.id,
  ];

  it('gives every element on the map a slug, and never the same slug twice', () => {
    for (const id of addressable) expect(SLUGS[id], id).toBeTruthy();
    const slugs = Object.values(SLUGS);
    expect(new Set(slugs).size, 'a repeated slug would make two elements share one address').toBe(slugs.length);
    for (const slug of slugs) expect(slug, slug).toMatch(/^[a-z][a-z-]*[a-z]$/);
  });

  it('round-trips, and answers nothing for an address it does not know', () => {
    for (const id of addressable) expect(idOfSlug(slugOf(id))).toBe(id);
    expect(idOfSlug('not-a-thing')).toBeUndefined();
  });

  it('pins the addresses the brief names, so a link written today still resolves tomorrow', () => {
    expect(slugOf('band-energy')).toBe('energy');
    expect(slugOf('band-credit')).toBe('credit');
    expect(slugOf('band-logistics')).toBe('logistics');
    expect(slugOf('band-cold-chain')).toBe('cold-chain');
    expect(slugOf('border-import')).toBe('border-import');
    expect(slugOf('stage-recovery')).toBe('recovery');
  });

  it('never shows a number as identity: a slug is letters and hyphens only', () => {
    expect(JSON.stringify(SLUGS)).not.toMatch(/\d/);
  });
});

describe('the finance distance reads a joint as the service performed there', () => {
  it('names what is done at the joint before it names the margin that measures it', () => {
    for (const j of JOINTS) {
      expect(j.read.finance.note, j.id).toContain('What is done here');
      expect(j.read.finance.chip, j.id).not.toBe(j.read.economy.chip);
      expect(j.read.finance.chip.length, j.id).toBeLessThanOrEqual(18);
    }
  });

  it('reads each layer as a service too: capacity, the cold, the wait, power, terms, reliance', () => {
    for (const b of BANDS) expect(b.read.finance.toLowerCase(), b.id).toMatch(/what is sold here|what this settles|what this provides/);
  });
});
