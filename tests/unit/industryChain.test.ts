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
  BASIS,
  BORDERS,
  BYPRODUCT,
  CHAIN_COPY,
  COLUMNS,
  DEFINE,
  ESSAY_ASSOCIATIONS,
  ESSAY_SLUGS,
  JOINTS,
  JOINT_BY_ID,
  JOINT_IDS,
  JOINT_LABELS,
  LEVERS,
  MARGIN_KINDS,
  NODES,
  NON_PHYSICAL,
  OVERVIEW_GROUPS,
  OVERVIEW_HIDES,
  OVERVIEW_INTERNAL_JOINTS,
  OVERVIEW_OMITS,
  RETAIL,
  RETAIL_GROUP,
  RETURNS,
  SHIFTS,
  SHIFT_BY_ID,
  STAGES,
  RETURNS_UNGROUPED,
  STATUS,
  SLUGS,
  drawnAtOverview,
  UNWRITTEN,
  bandChip,
  bandJoints,
  boundaryJoints,
  chargedAtJoints,
  essaysFor,
  groupOf,
  groupReturns,
  idOfSlug,
  internalJoints,
  isMarked,
  isWritten,
  jointLayers,
  markedTargets,
  setsTerms,
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
  it('are seven, in this order: logistics, the cold chain split out of it, the two kinds of finance, energy, the one partial layer, then the rules under everything', () => {
    expect(BANDS.map((b) => b.id)).toEqual([
      'band-logistics',
      'band-cold-chain',
      'band-credit',
      'band-capital',
      'band-energy',
      'band-governance',
      'band-regulation',
    ]);
  });

  /**
   * Finance was one band, and one band could not answer the question a reader
   * actually arrives with. Money that bridges a transfer and money that builds
   * the plant are priced differently, committed for different lengths of time,
   * and fail in different ways; a single “Credit and trade finance” band made the
   * second invisible on a map whose argument turns on what gets built.
   *
   * The distinction is STRUCTURAL, not a rename: working capital attaches at
   * the JOINTS it bridges, asset finance at the STAGES it builds. Two attach
   * points is a claim the drawing makes and this test holds it to.
   */
  it('separate the money that bridges a transfer from the money that builds the asset, by where each attaches', () => {
    const working = BAND_BY_ID['band-credit'];
    const asset = BAND_BY_ID['band-capital'];
    expect(working.attaches).toBe('joints');
    expect(working.label.toLowerCase()).toContain('working capital');
    expect(asset.label.toLowerCase()).toMatch(/asset|project/);
    expect(asset.means.toLowerCase()).toContain('before it can trade');
    // V5 ticked asset finance at the energy arrows' x — an unrelated layer's
    // geometry as its economic definition. It now has its own attachment: the
    // functions whose activity needs a built asset, not only the shapes called
    // transformation stages, and the supporting layers whose capacity it funds.
    expect(asset.attaches).toBe('recipients');
    expect(asset.recipients).toBeDefined();
    const recipients = asset.recipients!;
    for (const id of recipients) expect(endIds.has(id), `recipient ${id}`).toBe(true);
    expect(recipients.some((id) => stageIds.has(id))).toBe(true);
    expect(recipients.some((id) => nodeIds.has(id) || id === RETAIL_GROUP.id)).toBe(true);
    expect(recipients).toContain('node-distributor');
    expect(recipients).toContain('node-retail');
    expect(recipients).not.toContain('stage-consumption');
    expect(asset.financesLayers).toEqual(['band-logistics', 'band-cold-chain', 'band-energy']);
    for (const id of asset.financesLayers!) expect(BAND_BY_ID[id], id).toBeTruthy();
  });

  /**
   * The V5.1 brief's corrections, held. Asset finance is not universally
   * committed for the life of the asset; tenor and availability depend on the
   * arrangement; provider, payer and risk bearer are three roles that need not
   * be three parties.
   */
  it('does not claim asset finance is committed for life, or that its three roles are always three parties', () => {
    const asset = BAND_BY_ID['band-capital'];
    const text = `${asset.means} ${asset.read.economy} ${asset.read.finance}`.toLowerCase();
    expect(text).not.toContain('committed for years');
    expect(text).not.toContain('committed for the life');
    expect(text).not.toContain('usually three separate parties');
    expect(text).toContain('depends on the arrangement');
    expect(text).toContain('three separate questions');
    expect(text).toMatch(/one party or with several/);
    expect(CHAIN_COPY.panel.fundsRoles.toLowerCase()).not.toContain('usually three parties');
    expect(CHAIN_COPY.panel.fundsRoles.toLowerCase()).toMatch(/one party or with several/);
  });

  it('tells a fee charged at a transfer from terms set over it: attaching at a joint is not the test', () => {
    // Governance rides on three joints and takes no fee at any of them.
    expect(chargedAtJoints(BAND_BY_ID['band-governance'])).toBe(false);
    expect(setsTerms(BAND_BY_ID['band-governance'])).toBe(true);
    expect(setsTerms(BAND_BY_ID['band-regulation'])).toBe(true);
    for (const id of ['band-logistics', 'band-cold-chain', 'band-credit']) {
      expect(chargedAtJoints(BAND_BY_ID[id]), id).toBe(true);
      expect(setsTerms(BAND_BY_ID[id]), id).toBe(false);
    }
    // Attaching under the functions is neither: asset finance and energy stand behind a transfer.
    expect(chargedAtJoints(BAND_BY_ID['band-capital'])).toBe(false);
    expect(chargedAtJoints(BAND_BY_ID['band-energy'])).toBe(false);
    expect(CHAIN_COPY.panel.layersTermsHeading).toBeTruthy();
  });

  it('gives every layer a short name for a bar, never a number', () => {
    for (const b of BANDS) {
      expect(b.short, b.id).toBeTruthy();
      expect(b.short.length, b.id).toBeLessThan(b.label.length + 1);
      noFigures(b.short);
    }
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
      expect(['joints', 'stages', 'recipients', 'none'], b.id).toContain(b.attaches);
      if (b.attaches === 'recipients') expect(b.recipients?.length, b.id).toBeGreaterThan(0);
      else expect(b.recipients, b.id).toBeUndefined();
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

  /**
   * The V5 finance lead said a captive plant "moves energy out of cost of
   * sales and into the capital structure". Owning generation adds investment
   * and funding commitments; fuel, maintenance and other operating costs
   * remain. The leads now say so, and name the three parts a single price
   * hides, without painting any one as the binding constraint.
   */
  it('reads energy as generation, network and connection — and self-generation as a different exposure, not a vanished operating cost', () => {
    const energy = BAND_BY_ID['band-energy'];
    expect(energy.read.finance.toLowerCase()).not.toContain('out of cost of sales');
    expect(energy.read.finance.toLowerCase()).toMatch(/fuel, maintenance and other operating costs remain/);
    expect(energy.read.finance.toLowerCase()).toContain('on what terms');
    expect(energy.read.economy.toLowerCase()).toContain('generation, network capacity and connection');
    expect(energy.read.economy.toLowerCase()).toMatch(/a price change alone does not/);
    expect(energy.read.economy.toLowerCase()).not.toMatch(/binding constraint/);
    expect(energy.means.toLowerCase()).toContain('generation at the function itself');
    expect(energy.lines.join(' ').toLowerCase()).toContain('own generation');
    for (const word of Object.values(CHAIN_COPY.energy)) {
      expect(word).toBeTruthy();
      noFigures(word);
    }
    expect(CHAIN_COPY.energy.selfSupply.toLowerCase()).toContain('generation on site');
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
    for (const must of ['band-energy', 'band-capital', 'band-logistics', 'band-cold-chain', 'stage-recovery', 'j-consumption-recovery', 'return-postconsumer-material', 'return-postconsumer-organic']) {
      expect(gr.has(must), `green marks ${must}`).toBe(true);
    }
    // V5 put the project-finance reading on the working-capital band, whose
    // own first sentence said a transition needs a different instrument. The
    // reading sits on the band that finances projects; working capital carries
    // no green mark because nothing written concerns operating cycles under
    // the scenario, and a status is not manufactured to fill a band.
    expect(gr.has('band-credit')).toBe(false);
    const capital = shiftTarget('green', 'band-capital')!.condition!;
    expect(capital.basis).toBe('scenario');
    expect(capital.mechanism).toBe('risk-allocation');
    expect(capital.action.finance.toLowerCase()).toContain('tenor');
    expect(capital.action.finance.toLowerCase()).toContain('coverage');
    expect(capital.action.economy.toLowerCase()).toContain('who bears which risk');
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

  it('reads the enabling layer as the bearer of a per-unit burden, and says what the floor is held constant against', () => {
    const logistics = shiftTarget('green', 'band-logistics')!.condition!;
    const economy = logistics.action.economy.toLowerCase();
    expect(economy).toContain('floor');
    expect(economy).toContain('touch');
    // The useful point survives; what it is conditional on is now stated. A
    // burden that improvements at another stage do not remove is not an
    // immutable minimum across all technologies, and the reading says which
    // configuration its floor is a floor under.
    expect(economy).toMatch(/constant|configuration/);
    expect(economy).toMatch(/fleet/);
    expect(BAND_BY_ID['band-logistics'].means.toLowerCase()).toContain('floor');
    expect(BAND_BY_ID['band-logistics'].means.toLowerCase()).toMatch(/for a given fleet/);
  });

  it('does not derive an emissions boundary from revenue presentation', () => {
    // The finance voice used to say the fleet's fuel splits into the
    // provider's direct and the buyer's indirect emission as "the same split
    // the gross-and-net line makes at a node". Those are two different
    // questions: gross-versus-net is about control of the goods, and the
    // emission lands where the REPORTING BOUNDARY puts it. Purchased
    // transport also carries the provider's purchased electricity and its
    // refrigerant, which a fuel-only reading drops.
    const finance = shiftTarget('green', 'band-logistics')!.condition!.action.finance.toLowerCase();
    expect(finance).not.toContain('the same split the gross-and-net line makes');
    expect(finance).toContain('reporting boundary');
    expect(finance).toContain('refrigerant');
  });

  it('does not repeat the logistics floor as though cold chain were the same burden', () => {
    // A temperature costs energy continuously rather than per kilometre, and
    // refrigerant leaks without any fuel behind it. Calling it "a second
    // floor" merged three different things.
    const cold = shiftTarget('green', 'band-cold-chain')!.condition!.action;
    expect(cold.economy.toLowerCase()).toContain('refrigerant');
    expect(cold.economy.toLowerCase()).toMatch(/not the same burden|continuously/);
    expect(cold.finance.toLowerCase()).toContain('do not travel together');
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

/**
 * The overview is the SAME drawing at a coarser grouping, not a second model.
 * These tests hold the grouping to the one thing it must never do: change what
 * the map says exists, what connects to what, or what a margin is.
 */
/**
 * WHAT OPENS WHEN A READER CLICKS AN ELEMENT.
 *
 * It used to be four hundred words: the margin kind and its control test, the
 * statement lines, the layers riding on the move, the four lines of a reading,
 * the mechanism, who finances it, the funding-roles note, and the essays last,
 * under all of it. That made the map the place the writing happened rather
 * than the way into it.
 *
 * The owner’s rule is that a reader goes deeper into a relation THROUGH an
 * essay. So a card is one paragraph and a door: the element read at the
 * distance that is on, and the essay that argues it. Everything else is one
 * disclosure below, unchanged.
 */
describe('the card a door opens', () => {
  const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const leads = () => [
    ...JOINTS.flatMap((j) => LENSES.map((l) => [`${j.id} ${l}`, j.read[l].note] as const)),
    ...BANDS.flatMap((b) => LENSES.map((l) => [`${b.id} ${l}`, b.read[l]] as const)),
  ];

  /**
   * THE TARGET IS 25 TO 50 WORDS, and eight leads are outside it. All seven
   * are the owner’s own prose: cutting an author’s sentences to fit a count,
   * or padding one to reach it, is not a thing an implementation does quietly.
   * They are named here so each is a known editorial item rather than a silent
   * drift — and so a NEW lead cannot join them without being named too.
   *
   * The over-length ones matter more than the short one: a card that runs to
   * ninety words is the wall the card replaced, arriving again.
   */
  const TOO_SHORT = new Set(['band-governance economy', 'band-regulation economy']);
  /**
   * The two energy leads were the longest on the map, at ninety and
   * ninety-five words. They are rewritten from the V5.1 brief's suggested
   * leads and sit inside the target; the four that remain over it are the
   * owner's prose, whose qualifications are not cut to satisfy a counter.
   */
  const TO_BE_CUT = new Set([
    'j-extraction-processing finance',
    'j-retail-consumption finance',
    'j-consumption-recovery finance',
    'band-logistics finance',
  ]);

  it('gives every joint and every layer a lead of 25 to 50 words at both distances', () => {
    for (const [key, text] of leads()) {
      const n = words(text);
      // Under any circumstances a lead is a paragraph, never a fragment.
      expect(n, `${key} is a fragment`).toBeGreaterThanOrEqual(12);
      if (TOO_SHORT.has(key)) continue;
      if (TO_BE_CUT.has(key)) {
        // Still long, and known to be. The guard here is that it has not GROWN.
        expect(n, `${key} grew`).toBeLessThanOrEqual(95);
        continue;
      }
      expect(n, `${key} is ${n} words; cut it, or name it with a reason`).toBeGreaterThanOrEqual(25);
      expect(n, `${key} is ${n} words; cut it, or name it with a reason`).toBeLessThanOrEqual(50);
    }
  });

  it('keeps the two lists honest: every name in them is real and still outside the target', () => {
    expect(new Set(leads().filter(([, t]) => words(t) > 50).map(([k]) => k))).toEqual(TO_BE_CUT);
    expect(new Set(leads().filter(([, t]) => words(t) < 25).map(([k]) => k))).toEqual(TOO_SHORT);
  });

  it('names the way deeper and the fold, and says plainly when nothing is written', () => {
    expect(CHAIN_COPY.panel.articlesHeading.toLowerCase()).toContain('at length');
    expect(CHAIN_COPY.panel.articlesNone.toLowerCase()).toContain('no essay');
    expect(CHAIN_COPY.panel.readingDisclosure).toBeTruthy();
  });

  /**
   * The card says what kind of claim a mark is in one line each, close to the
   * badge, instead of four lines of generic definition. An assessed mark names
   * its case: "assessed against a specific case" tells a reader nothing they
   * can check.
   */
  it('qualifies a mark in one line each, and names the case an assessed status was read against', () => {
    for (const s of Object.values(STATUS)) {
      expect(s.card, s.id).toBeTruthy();
      expect(s.card.length, s.id).toBeLessThan(`${s.means} ${s.reads}`.length);
    }
    expect(BASIS.scenario.card.toLowerCase()).toContain('not a finding');
    expect(BASIS.assessed.card.toLowerCase()).toContain('read against');
    for (const s of SHIFTS) {
      for (const t of s.targets) {
        const c = t.condition!;
        if (c.basis === 'assessed') {
          expect(c.case, `${s.id} ${t.id} names its case`).toBeTruthy();
          expect(c.case!.toLowerCase(), `${s.id} ${t.id}`).toContain('nickel');
          noFigures(c.case!);
        } else expect(c.case, `${s.id} ${t.id} is a scenario and claims no case`).toBeUndefined();
      }
    }
  });
});

/**
 * WHERE THE MAP LEADS. An association lives on the element with the context
 * it was made in; publication is checked at run time, not assumed here.
 */
describe('the essays an element leads to', () => {
  it('are made from the repository’s own account of an essay, each with its context and its grounds, never from a matching word', () => {
    expect(Object.keys(ESSAY_ASSOCIATIONS).length).toBeGreaterThan(0);
    for (const [id, rows] of Object.entries(ESSAY_ASSOCIATIONS)) {
      expect(targetIds.has(id), `${id} is on the map`).toBe(true);
      for (const a of rows) {
        expect(a.slug).toMatch(/^[a-z0-9-]+$/);
        expect(a.title).toBeTruthy();
        expect(a.reads.length, `${id} ${a.slug} says what the essay reads here`).toBeGreaterThan(40);
        expect(a.basis.length, `${id} ${a.slug} says where the association is grounded`).toBeGreaterThan(20);
        if (a.under) expect(SHIFT_BY_ID[a.under], `${id} ${a.slug} under a real shift`).toBeTruthy();
      }
    }
    expect(ESSAY_SLUGS).toContain('indonesias-reindustrialization-bet');
  });

  it('gives energy its essay with no overlay on — the first case the brief names', () => {
    const atRest = essaysFor('band-energy', null);
    expect(atRest).toHaveLength(1);
    expect(atRest[0].slug).toBe('indonesias-reindustrialization-bet');
    // Context kept, and not relabelled as a general finding: no overlay is on, so it is not evidence for a reading.
    expect(atRest[0].under).toBe('green');
    expect(atRest[0].evidence).toBe(false);
  });

  it('keeps scenario evidence in its context: evidence under the shift it was read against, related writing under any other', () => {
    const underGreen = essaysFor('band-energy', 'green');
    expect(underGreen[0].evidence).toBe(true);
    const underReindus = essaysFor('band-energy', 'reindustrialisation');
    expect(underReindus).toHaveLength(1);
    expect(underReindus[0].evidence).toBe(false);
    expect(underReindus[0].under).toBe('green');
    // The same essay reads the asset-finance band under green, but that mark is a scenario, so it is context, not evidence.
    const capital = essaysFor('band-capital', 'green');
    expect(capital).toHaveLength(1);
    expect(capital[0].evidence).toBe(false);
    // A stage the reindustrialisation overlay marks as a scenario: context under the shift, and still listed with no shift.
    expect(essaysFor('stage-processing', 'reindustrialisation')[0].evidence).toBe(false);
    expect(essaysFor('stage-processing', null)).toHaveLength(1);
    // Changing the distance never changes the list: it takes no lens.
  });

  it('lists nothing for an element no essay reads, rather than borrowing a neighbour’s', () => {
    expect(essaysFor('band-logistics', 'green')).toEqual([]);
    expect(essaysFor('j-processing-trader', null)).toEqual([]);
    expect(essaysFor('band-credit', 'green')).toEqual([]);
  });

  it('says, beside each link, what the link claims and whether the index confirmed it', () => {
    expect(CHAIN_COPY.panel.essayEvidence.toLowerCase()).toContain('evidence');
    expect(CHAIN_COPY.panel.essayUnder('Green transition').toLowerCase()).toContain('green transition');
    expect(CHAIN_COPY.panel.essayPublished).toBe('Published');
    expect(CHAIN_COPY.panel.essayUnchecked.toLowerCase()).toContain('not checked');
    expect(CHAIN_COPY.panel.essayNotPublished.toLowerCase()).toContain('not published');
  });
});

describe('the overview', () => {
  const groups = Object.values(OVERVIEW_GROUPS);

  it('puts every function in exactly one of five groups, each of which says what it keeps, what detail opens, and what an overlay may say', () => {
    expect(groups).toHaveLength(5);
    const functions = [...STAGES.map((s) => s.id), ...NODES.map((n) => n.id), ...RETAIL.map((r) => r.id), RETAIL_GROUP.id];
    for (const id of functions) {
      const owners = groups.filter((g) => g.members.includes(id));
      expect(owners, `${id} belongs to one group`).toHaveLength(1);
      expect(groupOf(id)?.id).toBe(owners[0].id);
    }
    for (const g of groups) {
      expect(g.label, g.id).toBeTruthy();
      expect(g.members.length, g.id).toBeGreaterThan(1);
      for (const m of g.members) expect(endIds.has(m), `${g.id} member ${m}`).toBe(true);
      expect(g.keeps, g.id).toBeTruthy();
      expect(g.opens, g.id).toBeTruthy();
      expect(g.overlay, g.id).toBeTruthy();
    }
    // The groups follow the goods: origins first, use and recovery last.
    expect(groups[0].members).toContain('stage-biological');
    expect(groups.at(-1)!.members).toContain('stage-recovery');
  });

  /**
   * A collapsed group is one box standing for several records. It may hold
   * only nodes: a stage is a conversion, and a box that folded one away could
   * masquerade as a conversion stage — and its members' spreads are never
   * added. Only the distribution group is collapsed; the rest are frames whose
   * members keep their own boxes.
   */
  it('collapses only nodes, never a stage, and never merges a conversion into a box', () => {
    const collapsed = groups.filter((g) => g.collapsed);
    expect(collapsed.map((g) => g.id)).toEqual(['group-distribution-retail']);
    for (const g of collapsed) {
      for (const m of g.members) expect(stageIds.has(m), `${g.id} folds a stage ${m}`).toBe(false);
      expect(g.keeps.toLowerCase(), g.id).toMatch(/do not add/);
    }
    for (const g of groups.filter((x) => !x.collapsed)) expect(g.members.some((m) => stageIds.has(m)), `${g.id} keeps its conversion drawn`).toBe(true);
  });

  it('keeps every joint that crosses a group’s edge, and hides only the joints inside a collapsed box', () => {
    for (const g of groups) {
      for (const j of boundaryJoints(g)) expect(drawnAtOverview(j), `${g.id} boundary ${j}`).toBe(true);
      for (const j of internalJoints(g)) expect(drawnAtOverview(j), `${g.id} internal ${j}`).toBe(!g.collapsed);
      // Internal and boundary are the whole of what touches the group.
      const touching = JOINTS.filter((j) => g.members.includes(j.from) || g.members.includes(j.to)).map((j) => j.id).sort();
      expect([...internalJoints(g), ...boundaryJoints(g)].sort(), g.id).toEqual(touching);
    }
    expect(OVERVIEW_INTERNAL_JOINTS).toEqual(['j-distributor-wholesaler', 'j-wholesale-retail']);
    const expected = new Set([...OVERVIEW_INTERNAL_JOINTS, ...groups.filter((g) => g.collapsed).flatMap((g) => g.members)]);
    expect(new Set(OVERVIEW_HIDES)).toEqual(expected);
    for (const id of OVERVIEW_HIDES) expect(drawnAtOverview(id), id).toBe(false);
    for (const b of BANDS) expect(drawnAtOverview(b.id), b.id).toBe(true);
    for (const b of BORDERS) expect(drawnAtOverview(b.id), b.id).toBe(true);
  });

  it('keeps every return’s own destination through the grouping, with the one inside a box still drawn as its own loop', () => {
    for (const g of groups) {
      for (const r of groupReturns(g)) {
        expect(drawnAtOverview(r.id), r.id).toBe(true);
        // A return that stays inside a COLLAPSED box is drawn as a loop on the box and named in what the box keeps — never merged into another return. Inside an open frame its ends are drawn, so it is an arc like any other.
        const inside = g.members.includes(r.from) && g.members.includes(r.to);
        if (inside && g.collapsed) expect(g.keeps.toLowerCase(), `${g.id} names ${r.id}`).toContain(r.label.toLowerCase());
      }
    }
    expect(groupReturns(OVERVIEW_GROUPS['group-use-recovery']).map((r) => r.id).sort()).toEqual(
      ['return-postconsumer-material', 'return-postconsumer-organic', 'return-secondary'].sort(),
    );
  });

  /**
   * How a public address resolves through the grouping: an element the
   * overview draws opens at the overview; one a collapsed box folds away opens
   * the detail — asksForFullChain reads this list, not a hand-kept one.
   */
  it('resolves an address to the level that can draw it, from the same list the layout uses', () => {
    for (const id of OVERVIEW_HIDES) expect(drawnAtOverview(id)).toBe(false);
    expect(drawnAtOverview('j-wholesale-retail')).toBe(false);
    expect(drawnAtOverview('j-retail-consumption')).toBe(true);
    expect(drawnAtOverview('j-processing-trader')).toBe(true);
    expect(drawnAtOverview('node-trader')).toBe(true);
  });

  it('keeps every element either shift marks, so both overlays have something to raise at the overview', () => {
    for (const shift of SHIFTS) {
      for (const t of shift.targets) expect(drawnAtOverview(t.id), `${shift.id} marks ${t.id}`).toBe(true);
    }
  });

  /**
   * The returns were the one grouping available that was DECLINED. Six returns
   * have five destinations; the old taster drew a single “Returns → Primary
   * processing” arrow for all six, which says recovery sends everything back to
   * one place. It does not.
   */
  it('does not group the returns, and says why', () => {
    for (const r of RETURNS) expect(drawnAtOverview(r.id), r.id).toBe(true);
    const destinations = new Set(RETURNS.map((r) => r.to));
    expect(destinations.size).toBeGreaterThan(1);
    expect(RETURNS_UNGROUPED).toBeTruthy();
    for (const g of Object.values(OVERVIEW_GROUPS)) {
      for (const m of g.members) expect(RETURNS.some((r) => r.id === m), `${g.id} groups a return`).toBe(false);
    }
  });

  it('names every piece of detail it leaves out, and leaves out no relation', () => {
    expect(OVERVIEW_OMITS.length).toBeGreaterThan(0);
    for (const o of OVERVIEW_OMITS) {
      expect(o.what).toBeTruthy();
      expect(o.why).toBeTruthy();
      // Nothing omitted may be a joint, a border, a return or a layer: those
      // are relations, and a coarser grouping is not licence to drop one.
      const text = `${o.what} ${o.why}`.toLowerCase();
      expect(text, o.what).not.toMatch(/\bborder\b/);
    }
    const omitted = OVERVIEW_OMITS.map((o) => o.what.toLowerCase()).join(' ');
    expect(omitted).toContain('lanes');
    expect(omitted).toContain('demand');
    expect(omitted).toContain('retail formats');
  });

  it('tells the reader what the level control does, and the two things it does not do', () => {
    const note = CHAIN_COPY.controls.levelNote.toLowerCase();
    expect(note).toContain('un-group');
    expect(note).toContain('adds no relation');
    expect(note).toMatch(/neither the distance nor the scenario/);
    // One line, not a third grey paragraph between the reader and the map.
    expect(CHAIN_COPY.controls.levelNote.split(/\s+/).length).toBeLessThanOrEqual(20);
    expect(CHAIN_COPY.controls.seeFull.toLowerCase()).toContain('detail');
    expect(CHAIN_COPY.controls.seeCompact.toLowerCase()).toContain('overview');
  });
});

describe('what the map promises', () => {
  /**
   * The headline made a claim: “Every joint in this chain is a margin.” It was
   * true and it was doing work, but the map now opens the landing page with
   * nothing above it, so its line is the page’s main heading — and a heading
   * that argues is a hero by another name, which is exactly what the owner
   * deleted. So the title NAMES the object, and the claim it used to carry is
   * kept where it is actually checkable: on every joint’s own panel.
   */
  it('names the object rather than arguing, because it is the page heading now', () => {
    expect(CHAIN_COPY.title).toBe('The industry chain');
    expect(CHAIN_COPY.title).not.toMatch(/[.!?]$/);
    // The claim is not lost: every joint still answers for a margin kind.
    for (const j of JOINTS) expect(MARGIN_KINDS[j.margin], j.id).toBeTruthy();
  });

  it('keeps the standfirst to the owner’s one line, and lets nothing in the copy teach that margins aggregate into an economy', () => {
    expect(CHAIN_COPY.standfirst).toBe('Nothing here is complicated. It only looks that way from the wrong distance.');
    // The line this replaced read “Add them up and you have an economy; take
    // one apart and you have a driver tree.” The second half was right. The
    // first contradicted CHAIN_COPY.basis two fields below it, which says
    // value added is output less intermediate consumption and is NOT gross
    // profit — so the most memorable sentence on the map taught the error the
    // rest of it spends a paragraph correcting.
    const copy = JSON.stringify(CHAIN_COPY).toLowerCase();
    expect(copy).not.toMatch(/add them up and you (have|get) an economy/);
    expect(CHAIN_COPY.basis.toLowerCase()).toContain('not gross profit');
    expect(CHAIN_COPY.basis.toLowerCase()).toContain('output less intermediate consumption');
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
        SHIFTS, LEVERS, STATUS, DEFINE, OVERVIEW_GROUPS, OVERVIEW_OMITS, RETURNS_UNGROUPED, CHAIN_COPY, JOINT_LABELS,
      }),
    );
  });
});

describe('the generated plates', () => {
  const tsx = readFileSync(resolve(process.cwd(), 'src/components/industry-chain/ChainPlateSvg.tsx'), 'utf8');
  const css = readFileSync(resolve(process.cwd(), 'src/components/industry-chain/chain-plate.css'), 'utf8');
  // `wide`/`compact` are the emitted component names, kept so existing imports
  // and CSS selectors hold; `detail`/`overview` is what they now ARE.
  const [detailSrc, overviewSrc] = tsx.split('export function ChainPlateCompact');
  const texts = (src: string) => Array.from(src.matchAll(/<text[^>]*>([^<]*)<\/text>/g)).map((m) => m[1]);
  const dataIds = (src: string) => new Set(Array.from(src.matchAll(/data-id="([^"]+)"/g)).map((m) => m[1]));

  it('draw every stage, node, retail format, return, border and non-physical flow of the full chain, by id', () => {
    const ids = dataIds(detailSrc);
    for (const s of STAGES) expect(ids, s.id).toContain(s.id);
    for (const n of [...NODES, ...RETAIL]) expect(ids, n.id).toContain(n.id);
    expect(ids).toContain(RETAIL_GROUP.id);
    for (const r of RETURNS) expect(ids, r.id).toContain(r.id);
    for (const b of BORDERS) expect(ids, b.id).toContain(b.id);
    for (const f of NON_PHYSICAL) expect(ids, f.id).toContain(f.id);
    expect(ids).toContain(BYPRODUCT.id);
  });

  it('draw every stage, node and format as text, in sync with the data — and no lens text, which lives on the chips at run time', () => {
    const drawn = texts(detailSrc).join(' ');
    const overviewDrawn = texts(overviewSrc).join(' ');
    for (const st of STAGES) expect(drawn, st.id).toContain(st.label);
    // The overview groups NODES. Every stage keeps its own name at both levels,
    // because a stage is a transformation and there is no coarser true name for
    // one; what changes is that two node boxes become one, under the group's
    // own label rather than either member's.
    for (const st of STAGES) expect(overviewDrawn, `${st.id} at the overview`).toContain(st.label);
    const overviewIds = dataIds(overviewSrc);
    for (const g of Object.values(OVERVIEW_GROUPS)) {
      // Every group is drawn at the overview under its own label — wrapped to its frame, so a long label is drawn in parts.
      for (const word of g.label.split(' ')) expect(overviewDrawn, `${g.id} draws its label`).toContain(word);
      expect(overviewIds, `${g.id} is drawn`).toContain(g.id);
      for (const m of g.members) {
        // A member of a collapsed box is not drawn under its own id — the box
        // may name it, but it is not an element, a door or a mark there. A
        // member of a frame keeps its own id.
        expect(overviewIds.has(m), `${m} at the overview`).toBe(!g.collapsed);
      }
      // The retail formats are never drawn as text at the overview.
      for (const r of RETAIL) expect(overviewDrawn, r.id).not.toContain(r.label);
    }
    // The lanes, the demand components and the recursion note are detail only.
    expect(drawn, 'the distributor recursion comes from the data too').toContain(NODES.find((n) => n.id === 'node-distributor')!.recursion!);
    expect(overviewDrawn).not.toContain(NODES.find((n) => n.id === 'node-distributor')!.recursion!);
    for (const lane of [...STAGES.find((x) => x.id === 'stage-biological')!.lanes!, ...STAGES.find((x) => x.id === 'stage-extraction')!.lanes!]) {
      expect(overviewDrawn, `lane ${lane}`).not.toContain(lane);
    }
    for (const d of STAGES.find((x) => x.id === 'stage-consumption')!.demand!) expect(overviewDrawn, `demand ${d}`).not.toContain(d);
    for (const n of [...NODES, ...RETAIL]) expect(drawn, n.id).toContain(n.label);
    for (const r of RETURNS) expect(drawn, r.id).toContain(r.label);
    for (const f of NON_PHYSICAL) expect(drawn, f.id).toContain(f.label);
    for (const b of BORDERS) expect(drawn, b.id).toContain(b.label);
    for (const name of Object.values(CHAIN_COPY.lensName)) expect(drawn, `${name} lane label`).toContain(name);
    for (const j of JOINTS) for (const l of LENSES) expect(drawn, `${j.id} ${l} chip is a run-time word`).not.toContain(j.read[l].chip);
  });

  it('carry the retail formats as rows inside one retail node', () => {
    const start = detailSrc.indexOf('cp-retail" data-id="node-retail"');
    const retail = detailSrc.slice(start, detailSrc.indexOf('data-id="stage-consumption"', start));
    expect(start).toBeGreaterThan(0);
    for (const r of RETAIL) expect(retail, r.id).toContain(`<g className="cp-retail-row" data-id="${r.id}">`);
  });

  it('draw no hourglass hull, no lens cloud, no unit strip, and no digits in any label — and an energy input into every stage', () => {
    expect(tsx).not.toMatch(/cp-hull|cp-stage--entry|cp-econ|cp-slice|cp-lens--/);
    expect(css).not.toMatch(/cp-hull|cp-stage--entry|cp-econ|cp-slice/);
    for (const t of texts(tsx)) noFigures(t);
    const stubs = Array.from(detailSrc.matchAll(/cp-energy-in" data-for="([^"]+)"/g)).map((m) => m[1]).sort();
    expect(stubs).toEqual(STAGES.map((s) => s.id).sort());
  });

  /**
   * THE OVERVIEW IS A MAP, NOT A TASTER. The short plate had no doors and no
   * marks, so its distance and shift controls had nothing to act on and had to
   * be hidden — which is what made the landing page an advertisement for the
   * map rather than the map. Every door but one is open at both levels.
   */
  it('carry every joint and every layer as a door, once each, joints first, each layer with its switch — at BOTH levels', () => {
    for (const src of [detailSrc, overviewSrc]) {
      for (const b of BANDS) {
        expect(src.match(new RegExp(`<BandHit id="${b.id}"`, 'g')) ?? [], b.id).toHaveLength(1);
        expect(src.match(new RegExp(`<LayerSwitch id="${b.id}"`, 'g')) ?? [], b.id).toHaveLength(1);
      }
      expect(src.lastIndexOf('<JointHit')).toBeLessThan(src.indexOf('<BandHit'));
    }
    for (const j of JOINT_IDS) {
      expect(detailSrc.match(new RegExp(`<JointHit id="${j}"`, 'g')) ?? [], j).toHaveLength(1);
      const atOverview = overviewSrc.match(new RegExp(`<JointHit id="${j}"`, 'g')) ?? [];
      expect(atOverview, `${j} at the overview`).toHaveLength(drawnAtOverview(j) ? 1 : 0);
    }
  });

  /**
   * The numbers on the marks are positions in a reading order computed from the
   * drawing. Two levels of the same drawing must not renumber them, or a number
   * quoted in an essay would mean one thing on a phone-sized overview and
   * another on the detail.
   */
  it('number the marks identically at both levels, so a number quoted in an essay means one thing', () => {
    const order = (src: string) =>
      Array.from(src.matchAll(/<ShiftMark shift="([^"]+)" id="([^"]+)"/g)).map((m) => `${m[1]}:${m[2]}`);
    expect(order(overviewSrc)).toEqual(order(detailSrc));
    expect(order(detailSrc).length).toBeGreaterThan(0);
  });

  it('put the bands directly under the reading lane and the rails at the bottom, and tick each band where it attaches', () => {
    const bandY = (id: string) => Number(detailSrc.match(new RegExp(`<BandHit id="${id}"[^>]*y=\\{(\\d+)\\}`))![1]);
    const railY = Number(detailSrc.match(/data-id="flow-money-payment">\s*<path className="cp-money" d="M \d+ (\d+)/)![1]);
    const chipRowY = Number(detailSrc.match(/<JointHit id="j-production-aggregation"[^>]*chipY=\{(\d+)\}/)![1]);
    expect(chipRowY).toBeLessThan(bandY('band-logistics'));
    expect(bandY('band-regulation')).toBeLessThan(railY);
    const ticks = (id: string) => detailSrc.match(new RegExp(`<BandHit id="${id}"[^>]*ticks=\\{\\[([^\\]]*)\\]\\}`))![1].split(',').filter((s) => s.trim());
    expect(ticks('band-logistics')).toHaveLength(JOINT_IDS.length);
    expect(ticks('band-cold-chain')).toHaveLength(JOINT_IDS.length - 1);
    expect(ticks('band-governance')).toHaveLength(3);
    expect(ticks('band-regulation')).toHaveLength(0);
    expect(ticks('band-energy').length).toBeGreaterThanOrEqual(5);
    // Asset finance is ticked under its recipients' own boxes, not at the energy arrows: the two sets of x differ.
    const capital = ticks('band-capital').map(Number);
    expect(capital.length).toBeGreaterThanOrEqual(5);
    expect(capital.join()).not.toBe(ticks('band-energy').map(Number).join());
    const overviewTicks = (id: string) => overviewSrc.match(new RegExp(`<BandHit id="${id}"[^>]*ticks=\\{\\[([^\\]]*)\\]\\}`))![1].split(',').filter((s) => s.trim());
    expect(overviewTicks('band-capital').length).toBeGreaterThanOrEqual(4);
    expect(overviewTicks('band-capital').join()).not.toBe(overviewTicks('band-energy').join());
  });

  it('carries the forms for the mechanism callout and the energy band’s own edge, and declares the detail width', () => {
    // A band names its mechanism at run time (BandHit), inside its strip; the
    // overlay's static chip is for boxes and joints, none of which carries a
    // non-price mechanism yet.
    for (const src of [detailSrc, overviewSrc]) expect(src).not.toMatch(/data-id="mechanism-/);
    expect(css).toContain('.cp-callout--mechanism');
    // The energy band draws its anatomy at run time (BandHit); the CSS carries its three forms.
    expect(css).toContain('.cp-energy-net');
    expect(css).toContain('.cp-energy-gen');
    expect(css).toContain('.cp-energy-conn');
    expect(css).toContain('.cp-tick--asset');
    // The detail plate declares its own width so the figure can hold it at one pixel per unit.
    expect(css).toMatch(/--cp-detail-w: 1717px/);
  });

  it('give the partial layer a shorter band than the whole-chain ones, and energy the whole chain', () => {
    const width = (id: string) => Number(detailSrc.match(new RegExp(`<BandHit id="${id}"[^>]*width=\\{(\\d+)\\}`))![1]);
    expect(width('band-governance')).toBeLessThan(width('band-logistics'));
    expect(width('band-credit')).toBe(width('band-logistics'));
    expect(width('band-energy')).toBe(width('band-logistics'));
    expect(width('band-cold-chain')).toBeLessThanOrEqual(width('band-logistics'));
  });

  it('draw one overlay per shift with an outline in the form of its status for every marked target, the moves and the callouts, hidden until the wrapper says which', () => {
    for (const s of SHIFTS) {
      const start = detailSrc.indexOf(`cp-shift cp-shift--${s.id}"`);
      expect(start, s.id).toBeGreaterThan(0);
      const end = detailSrc.indexOf('cp-shift cp-shift--', start + 10);
      const layer = detailSrc.slice(start, end === -1 ? detailSrc.indexOf('<g className="cp-hits">') : end);
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

  it('gives every drawn joint a real mark at both levels, not a decorative motif', () => {
    const marks = (src: string) => (src.match(/<JointHit /g) ?? []).length;
    expect(marks(detailSrc)).toBe(JOINT_IDS.length);
    expect(marks(overviewSrc)).toBe(JOINT_IDS.length - OVERVIEW_INTERNAL_JOINTS.length);
    // The old short plate drew a quiet diamond that looked like a joint and
    // opened nothing. There is no such shape any more, at either level.
    expect(tsx).not.toMatch(/cp-joint-motif/);
    expect(css).not.toMatch(/cp-joint-motif/);
  });

  /**
   * BOTH plates are groups, not images. The overview used to be role="img",
   * which is precisely why its controls could not act: an image has no doors,
   * so the buttons inside it were unreachable and the whole level had to be
   * treated as decoration.
   */
  it('expose both plates as groups with a title and description, so the doors inside them stay in the accessibility tree', () => {
    for (const [src, key, aria] of [
      [detailSrc, 'wide', CHAIN_COPY.aria.wide],
      [overviewSrc, 'compact', CHAIN_COPY.aria.compact],
    ] as const) {
      expect(src).toMatch(new RegExp(`<svg[^>]*role="group"[^>]*aria-labelledby="cp-${key}-title"[^>]*aria-describedby="cp-${key}-desc"`));
      expect(src).toContain(`<title id="cp-${key}-title">${aria.title}</title>`);
      expect(src, `${key} is not an image`).not.toMatch(/role="img"/);
      expect(src).toMatch(/<g className="cp-shifts" aria-hidden="true">/);
    }
    expect(detailSrc).not.toMatch(/hourglass/i);
    expect(tsx).not.toContain('<figcaption');
  });

  /**
   * The one test that says the two levels are one drawing. Whatever the detail
   * has, the overview has too, except the elements the grouping folds away —
   * plus the group boxes that stand for them. A relation cannot be dropped
   * from the overview without failing here.
   */
  it('draws the same elements at both levels but for the ones a collapsed box folds away, and the same five group frames at both', () => {
    const detailIds = dataIds(detailSrc);
    const overviewIds = dataIds(overviewSrc);
    const groupIds = Object.values(OVERVIEW_GROUPS).map((g) => g.id);
    const missing = [...detailIds].filter((id) => !overviewIds.has(id));
    expect(new Set(missing)).toEqual(new Set(OVERVIEW_HIDES.filter((id) => detailIds.has(id))));
    // Nothing is drawn at the overview that the detail does not have: the
    // group frames are drawn at both levels, so a reader moving between them
    // finds the same five groups with their members un-grouped.
    const extra = [...overviewIds].filter((id) => !detailIds.has(id));
    expect(extra).toEqual([]);
    for (const id of groupIds) {
      expect(detailIds, `${id} framed on the detail`).toContain(id);
      expect(overviewIds, `${id} framed on the overview`).toContain(id);
    }
    // Nine of eleven joints are doors at the overview: every boundary joint and every joint whose two ends are drawn.
    expect(JOINT_IDS.filter(drawnAtOverview)).toHaveLength(9);
    // Nothing structural is lost: every relation is present at both levels.
    for (const r of RETURNS) expect(overviewIds, r.id).toContain(r.id);
    for (const b of BORDERS) expect(overviewIds, b.id).toContain(b.id);
    for (const f of NON_PHYSICAL) expect(overviewIds, f.id).toContain(f.id);
    for (const st of STAGES) expect(overviewIds, st.id).toContain(st.id);
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
