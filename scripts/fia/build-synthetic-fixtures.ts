/**
 * Builds the SYNTHETIC model packages in src/data/finance-in-action/fixtures/.
 *
 *     npx vite-node scripts/fia/build-synthetic-fixtures.ts
 *
 * Every figure here is invented, in round numbers, to exercise the viewer: two
 * coal miners (XCOA, SCOA) and two cement makers (SCEM, and XCEM, whose
 * volumes are not disclosed, for constraint 9). No company and no filing
 * stands behind any of it, and nothing is taken from the PTBA prototype or the
 * mockups.
 *
 * Sourced and assumption cells are written here; every formula cell's value is
 * worked by the site's own engine from those, so a package's stored values
 * always agree with its formulas. The content hash is the SHA-256 of the
 * package serialised with an empty contentHash.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Cell, CellSource, ModelPackage, Period, Row, SheetId, UELine } from '../../src/lib/finance-in-action/contract/types';
import { periodColumn, rowNumber, Workbook } from '../../src/lib/finance-in-action/model/workbook';
import { isNum } from '../../src/lib/finance-in-action/engine';

const OUT = path.resolve(process.cwd(), 'src/data/finance-in-action/fixtures');
const MARK = 'SYNTHETIC';

/* ── Periods: eight reported quarters, one financial year, two forecasts ── */

const PERIODS: Period[] = [
  { id: '24Q1', label: 'Q1 24', kind: 'quarter', forecast: false },
  { id: '24Q2', label: 'Q2 24', kind: 'quarter', forecast: false },
  { id: '24Q3', label: 'Q3 24', kind: 'quarter', forecast: false },
  { id: '24Q4', label: 'Q4 24', kind: 'quarter', forecast: false },
  { id: '25Q1', label: 'Q1 25', kind: 'quarter', forecast: false },
  { id: '25Q2', label: 'Q2 25', kind: 'quarter', forecast: false },
  { id: '25Q3', label: 'Q3 25', kind: 'quarter', forecast: false },
  { id: '25Q4', label: 'Q4 25', kind: 'quarter', forecast: false },
  { id: 'FY25', label: 'FY 25', kind: 'fy', forecast: false },
  { id: '26Q1E', label: 'Q1 26E', kind: 'quarter', forecast: true },
  { id: '26Q2E', label: 'Q2 26E', kind: 'quarter', forecast: true },
];
const HIST = [0, 1, 2, 3, 4, 5, 6, 7];
const FY = 8;
const FY_QUARTERS = [4, 5, 6, 7];
const FORECAST = [9, 10];
const isHist = (p: number) => HIST.includes(p);
const isForecast = (p: number) => FORECAST.includes(p);

/* ── Sheet builder ─────────────────────────────────────────────────────── */

type CellFn = (p: number) => Cell;
interface RowSpec {
  id: string;
  label: string;
  unit: string;
  style?: 'total' | 'ratio';
  cell: CellFn;
}
type SheetSpecs = Record<SheetId, RowSpec[]>;

/** Resolves (sheet, row id, period) to an address, once every sheet's row order is known. */
class Refs {
  private order: Record<string, string[]> = {};
  set(specs: SheetSpecs) {
    for (const [sheet, rows] of Object.entries(specs)) this.order[sheet] = rows.map((r) => r.id);
  }
  at(sheet: SheetId, rowId: string, p: number): string {
    const i = this.order[sheet]?.indexOf(rowId) ?? -1;
    if (i < 0) throw new Error(`unknown row ${sheet}!${rowId}`);
    return `${sheet}!${periodColumn(p)}${rowNumber(i)}`;
  }
  /** SUM over the four quarters of FY 25 on the same row. */
  fySum(sheet: SheetId, rowId: string): string {
    const i = this.order[sheet].indexOf(rowId);
    return `SUM(${this.at(sheet, rowId, FY_QUARTERS[0])}:${periodColumn(FY_QUARTERS[FY_QUARTERS.length - 1])}${rowNumber(i)})`;
  }
}

const formula = (f: string): Cell => ({ value: null, kind: 'formula', formula: `=${f}` });
const missing = (note: string): Cell => ({ value: null, kind: 'missing', note: `${note} (${MARK})` });
const assumption = (value: number, note: string): Cell => ({ value, kind: 'assumption', note: `${MARK}: ${note}` });

const NOT_REPORTED = 'Forecast period: nothing is reported yet';

interface Issuer {
  name: string;
  statementsPage: Record<string, number>;
}

function statementSource(issuer: Issuer, p: number, rowId: string, note: string | undefined, concept: string | undefined): CellSource {
  const label = PERIODS[p].label;
  const fy = PERIODS[p].kind === 'fy';
  return {
    issuer: issuer.name,
    document: fy ? `${MARK} annual report ${label}` : `${MARK} interim financial statements ${label}`,
    period: label,
    page: issuer.statementsPage[rowId],
    ...(note ? { note } : {}),
    ...(concept ? { xbrlConcept: concept } : {}),
  };
}

function operatingSource(issuer: Issuer, p: number, rowId: string): CellSource {
  return {
    issuer: issuer.name,
    document: `${MARK} quarterly operating update ${PERIODS[p].label}`,
    period: PERIODS[p].label,
    page: issuer.statementsPage[rowId],
  };
}

/** A reported row of figures read from the statements; FY is the sum of the year's quarters unless `fy` says otherwise. */
function reportedRow(
  refs: Refs,
  issuer: Issuer,
  spec: { id: string; label: string; unit: string; style?: 'total'; note?: string; concept?: string; operating?: boolean },
  values: (number | null)[],
  fy?: (sum: number) => Cell,
  gapNote?: string,
): RowSpec {
  return {
    id: spec.id,
    label: spec.label,
    unit: spec.unit,
    style: spec.style,
    cell: (p) => {
      if (isForecast(p)) return missing(NOT_REPORTED);
      if (p === FY) {
        const q = FY_QUARTERS.map((i) => values[i]);
        if (q.every((v) => v === null)) return missing(gapNote ?? 'Not disclosed for the year');
        if (fy && q.every((v): v is number => v !== null)) return fy(round(q.reduce((s, v) => s + v, 0), 4));
        return formula(refs.fySum('reported', spec.id));
      }
      const v = values[p];
      if (v === null) return missing(gapNote ?? 'Not disclosed for this quarter');
      return {
        value: v,
        kind: 'sourced',
        source: spec.operating ? operatingSource(issuer, p, spec.id) : statementSource(issuer, p, spec.id, spec.note, spec.concept),
      };
    },
  };
}

const round = (x: number, d = 0) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

/** A model row: one formula for reported quarters, one for FY, one for forecasts. */
function modelRow(
  spec: { id: string; label: string; unit: string; style?: 'total' | 'ratio' },
  hist: (p: number) => Cell,
  fy: () => Cell,
  forecast: (p: number) => Cell,
): RowSpec {
  return { ...spec, cell: (p) => (isHist(p) ? hist(p) : p === FY ? fy() : forecast(p)) };
}

/* ── Packages ──────────────────────────────────────────────────────────── */

interface CommonMeta {
  ticker: string;
  name: string;
  subIndustry: string;
  chainStage: string;
  pair: string[];
  status: ModelPackage['meta']['status'];
  depth: ModelPackage['meta']['depth'];
  conditionIds: number[];
  conditionNotes: Record<string, string>;
  gates: ModelPackage['workpaper']['gates'];
  approved: boolean;
}

function finish(
  common: CommonMeta,
  refs: Refs,
  specs: SheetSpecs,
  rest: Pick<ModelPackage, 'driverTree' | 'unitEconomics'> & { peerRows: { metric: string; unit: string; rowRef: string }[] },
): ModelPackage {
  refs.set(specs);
  const sheets = (Object.keys(specs) as SheetId[]).map((id) => ({
    id,
    rows: specs[id].map<Row>((r) => ({
      id: r.id,
      label: r.label,
      unit: r.unit,
      ...(r.style ? { style: r.style } : {}),
      cells: PERIODS.map((_, p) => r.cell(p)),
    })),
  }));
  const pkg: ModelPackage = {
    meta: {
      ticker: common.ticker,
      name: common.name,
      subIndustry: common.subIndustry,
      chainStage: common.chainStage,
      pair: common.pair,
      version: `${common.ticker}-2025Q4-r1-${MARK}`,
      contentHash: '',
      asOf: { latestQuarter: '25Q4', fullStatementsTo: '25Q4' },
      provenance: 'synthetic',
      status: common.status,
      depth: common.depth,
      conditionIds: common.conditionIds,
      skillVersions: { 'fs-intake': `0.0.0-${MARK}`, 'fs-driver-decomposition': `0.0.0-${MARK}`, 'financial-modeling': `0.0.0-${MARK}` },
      rounding: { decimals: 0 },
      conditionNotes: common.conditionNotes,
    },
    periods: PERIODS,
    sheets,
    driverTree: rest.driverTree,
    unitEconomics: rest.unitEconomics,
    peerBand: [],
    workpaper: {
      gates: common.gates,
      preparedBy: `FS reverse-engineering suite (${MARK} run)`,
      ...(common.approved ? { approvedBy: `Owner (${MARK})`, approvedAt: '2026-01-15' } : {}),
    },
  };

  // Work every formula with the site's engine and store the results.
  const wb = new Workbook(pkg);
  const values = wb.values();
  for (const sheet of pkg.sheets) {
    sheet.rows.forEach((row, ri) => {
      row.cells.forEach((cell, pi) => {
        if (cell.kind !== 'formula') return;
        const v = values.get(`${sheet.id}!${periodColumn(pi)}${rowNumber(ri)}`);
        if (v !== null && !isNum(v)) throw new Error(`${common.ticker} ${sheet.id}!${row.id}[${PERIODS[pi].id}] evaluates to ${JSON.stringify(v)}`);
        cell.value = v === null || v === undefined ? null : v;
      });
    });
  }
  const fyIndex = PERIODS.findIndex((p) => p.id === 'FY25');
  pkg.peerBand = rest.peerRows.map((r) => ({
    metric: r.metric,
    unit: r.unit,
    period: 'FY25',
    rowRef: r.rowRef,
    value: wb.row(r.rowRef)?.cells[fyIndex].value ?? null,
  }));
  pkg.meta.contentHash = createHash('sha256').update(JSON.stringify(pkg)).digest('hex');
  return pkg;
}

const UE_PERIODS = ['25Q1', '25Q2', '25Q3', '25Q4', 'FY25', '26Q1E', '26Q2E'];

/* ── Coal ──────────────────────────────────────────────────────────────── */

interface CoalInputs {
  common: CommonMeta;
  vol: number[];
  price: number[];
  production: (number | null)[];
  ob: number[];
  costPerBcm: number[];
  fuelPerBcm: number[];
  freightRate: number[];
  royaltyRate: number;
  otherCor: number[];
  sga: number[];
  otherNet: number[];
  taxRate: number;
  nci: number[];
  f: {
    vol: number[];
    price: number[];
    strip: number[];
    costPerBcm: number[];
    fuelPerBcm: number[];
    freightRate: number[];
    royaltyRate: number[];
    otherCor: number[];
    sga: number[];
    otherNet: number[];
    taxRate: number[];
    nciShare: number[];
  };
}

function coal(c: CoalInputs): ModelPackage {
  const refs = new Refs();
  const R = (rowId: string, p: number) => refs.at('reported', rowId, p);
  const M = (rowId: string, p: number) => refs.at('model', rowId, p);
  const A = (rowId: string, p: number) => refs.at('assumptions', rowId, p);
  const issuer: Issuer = {
    name: `${c.common.name}`,
    statementsPage: { revenue: 12, cor_contractor: 41, cor_fuel: 41, cor_freight: 41, cor_royalty: 41, cor_total: 12, sga: 42, other_net: 43, tax: 44, nci: 12, vol_sold: 3, production: 3, ob_removed: 3 },
  };

  const revenue = HIST.map((i) => round(c.vol[i] * c.price[i]));
  const contractor = HIST.map((i) => round(c.ob[i] * c.costPerBcm[i]));
  const fuel = HIST.map((i) => round(c.ob[i] * c.fuelPerBcm[i]));
  const freight = HIST.map((i) => round(c.vol[i] * c.freightRate[i]));
  const royalty = HIST.map((i) => round(revenue[i] * c.royaltyRate));
  const corTotal = HIST.map((i) => contractor[i] + fuel[i] + freight[i] + royalty[i] + c.otherCor[i]);
  const tax = HIST.map((i) => round((revenue[i] - corTotal[i] - c.sga[i] + c.otherNet[i]) * c.taxRate));

  const flows = (id: string, hist: (p: number) => Cell, forecast: (p: number) => Cell, spec: { label: string; unit: string; style?: 'total' }) =>
    modelRow({ id, ...spec }, hist, () => formula(refs.fySum('model', id)), forecast);
  const ratio = (id: string, label: string, unit: string, f: (p: number) => string, forecast: (p: number) => Cell, style?: 'ratio') =>
    modelRow({ id, label, unit, ...(style ? { style } : {}) }, (p) => formula(f(p)), () => formula(f(FY)), forecast);
  const same = (id: string, label: string, unit: string, f: (p: number) => string, style?: 'total' | 'ratio') =>
    modelRow({ id, label, unit, ...(style ? { style } : {}) }, (p) => formula(f(p)), () => formula(f(FY)), (p) => formula(f(p)));

  const fyRevenue = (sum: number): Cell => ({
    value: sum,
    kind: 'sourced',
    source: statementSource(issuer, FY, 'revenue', '24', 'syn:Revenue'),
    tieOut: { externalValue: sum, sourceText: `${MARK} IDX XBRL instance FY 25, syn:Revenue`, difference: 0, status: 'agrees' },
  });
  const fyCor = (sum: number): Cell => ({
    value: sum,
    kind: 'sourced',
    source: statementSource(issuer, FY, 'cor_total', '25', 'syn:CostOfRevenue'),
    tieOut: {
      externalValue: sum - 2,
      sourceText: `${MARK} IDX XBRL instance FY 25, syn:CostOfRevenue, rounded differently from the annual report`,
      difference: 2,
      status: 'differs',
    },
  });

  const specs: SheetSpecs = {
    reported: [
      reportedRow(refs, issuer, { id: 'revenue', label: 'Revenue', unit: 'Rp bn', note: '24', concept: 'syn:Revenue' }, revenue, fyRevenue),
      reportedRow(refs, issuer, { id: 'vol_sold', label: 'Coal sales volume', unit: 'Mt', operating: true }, c.vol),
      reportedRow(refs, issuer, { id: 'production', label: 'Coal production', unit: 'Mt', operating: true }, c.production, undefined, 'Production was not disclosed for this quarter'),
      reportedRow(refs, issuer, { id: 'ob_removed', label: 'Overburden removed', unit: 'Mbcm', operating: true }, c.ob),
      reportedRow(refs, issuer, { id: 'cor_contractor', label: 'Mining contractor services', unit: 'Rp bn', note: '25', concept: 'syn:CostOfRevenueContractor' }, contractor),
      reportedRow(refs, issuer, { id: 'cor_fuel', label: 'Fuel', unit: 'Rp bn', note: '25', concept: 'syn:CostOfRevenueFuel' }, fuel),
      reportedRow(refs, issuer, { id: 'cor_freight', label: 'Coal transport', unit: 'Rp bn', note: '25', concept: 'syn:CostOfRevenueFreight' }, freight),
      reportedRow(refs, issuer, { id: 'cor_royalty', label: 'Royalty', unit: 'Rp bn', note: '25', concept: 'syn:CostOfRevenueRoyalty' }, royalty),
      reportedRow(refs, issuer, { id: 'cor_total', label: 'Cost of revenue', unit: 'Rp bn', style: 'total', note: '25', concept: 'syn:CostOfRevenue' }, corTotal, fyCor),
      reportedRow(refs, issuer, { id: 'sga', label: 'Selling, general and administrative expenses', unit: 'Rp bn', note: '26', concept: 'syn:SellingGeneralAdministrative' }, c.sga),
      reportedRow(refs, issuer, { id: 'other_net', label: 'Finance and other items, net', unit: 'Rp bn', note: '27', concept: 'syn:OtherItemsNet' }, c.otherNet),
      reportedRow(refs, issuer, { id: 'tax', label: 'Income tax expense', unit: 'Rp bn', note: '28', concept: 'syn:IncomeTax' }, tax),
      reportedRow(refs, issuer, { id: 'nci', label: 'Profit attributable to non-controlling interests', unit: 'Rp bn', concept: 'syn:ProfitNci' }, c.nci),
    ],
    model: [
      flows('vol_sold', (p) => formula(R('vol_sold', p)), (p) => formula(A('vol_sold', p)), { label: 'Coal sales volume', unit: 'Mt' }),
      ratio('price', 'Realised price per tonne', 'Rp thousand per tonne', (p) => `${M('revenue', p)}/${M('vol_sold', p)}`, (p) => formula(A('price', p))),
      flows('revenue', (p) => formula(R('revenue', p)), (p) => formula(`${M('vol_sold', p)}*${M('price', p)}`), { label: 'Revenue', unit: 'Rp bn', style: 'total' }),
      modelRow(
        { id: 'strip_ratio', label: 'Strip ratio', unit: 'bcm per tonne' },
        (p) => (c.production[p] === null ? missing('Production was not disclosed, so the strip ratio cannot be worked') : formula(`${M('ob_removed', p)}/${R('production', p)}`)),
        () => formula(`${M('ob_removed', FY)}/${R('production', FY)}`),
        (p) => formula(A('strip_ratio', p)),
      ),
      flows('ob_removed', (p) => formula(R('ob_removed', p)), (p) => formula(`${M('vol_sold', p)}*${M('strip_ratio', p)}`), { label: 'Overburden removed', unit: 'Mbcm' }),
      ratio('cost_per_bcm', 'Contractor cost per bcm', 'Rp thousand per bcm', (p) => `${M('cor_contractor', p)}/${M('ob_removed', p)}`, (p) => formula(A('cost_per_bcm', p))),
      flows('cor_contractor', (p) => formula(R('cor_contractor', p)), (p) => formula(`${M('ob_removed', p)}*${M('cost_per_bcm', p)}`), { label: 'Mining contractor services', unit: 'Rp bn' }),
      ratio('fuel_per_bcm', 'Fuel cost per bcm', 'Rp thousand per bcm', (p) => `${M('cor_fuel', p)}/${M('ob_removed', p)}`, (p) => formula(A('fuel_per_bcm', p))),
      flows('cor_fuel', (p) => formula(R('cor_fuel', p)), (p) => formula(`${M('ob_removed', p)}*${M('fuel_per_bcm', p)}`), { label: 'Fuel', unit: 'Rp bn' }),
      ratio('freight_rate', 'Freight rate per tonne', 'Rp thousand per tonne', (p) => `${M('cor_freight', p)}/${M('vol_sold', p)}`, (p) => formula(A('freight_rate', p))),
      flows('cor_freight', (p) => formula(R('cor_freight', p)), (p) => formula(`${M('vol_sold', p)}*${M('freight_rate', p)}`), { label: 'Coal transport', unit: 'Rp bn' }),
      ratio('royalty_rate', 'Royalty rate', '% of revenue', (p) => `${M('cor_royalty', p)}/${M('revenue', p)}`, (p) => formula(A('royalty_rate', p)), 'ratio'),
      flows('cor_royalty', (p) => formula(R('cor_royalty', p)), (p) => formula(`${M('revenue', p)}*${M('royalty_rate', p)}`), { label: 'Royalty', unit: 'Rp bn' }),
      flows(
        'cor_other',
        (p) => formula(`${R('cor_total', p)}-${M('cor_contractor', p)}-${M('cor_fuel', p)}-${M('cor_freight', p)}-${M('cor_royalty', p)}`),
        (p) => formula(A('other_cor', p)),
        { label: 'Other cost of revenue, not split in the note', unit: 'Rp bn' },
      ),
      same('cor_total', 'Cost of revenue', 'Rp bn', (p) => `${M('cor_contractor', p)}+${M('cor_fuel', p)}+${M('cor_freight', p)}+${M('cor_royalty', p)}+${M('cor_other', p)}`, 'total'),
      same('cor_per_t', 'Cost of revenue per tonne', 'Rp thousand per tonne', (p) => `${M('cor_total', p)}/${M('vol_sold', p)}`),
      same('gross_profit', 'Gross profit', 'Rp bn', (p) => `${M('revenue', p)}-${M('cor_total', p)}`, 'total'),
      same('gross_margin', 'Gross margin', '%', (p) => `${M('gross_profit', p)}/${M('revenue', p)}`, 'ratio'),
      flows('sga', (p) => formula(R('sga', p)), (p) => formula(A('sga', p)), { label: 'Selling, general and administrative expenses', unit: 'Rp bn' }),
      same('operating_profit', 'Operating profit', 'Rp bn', (p) => `${M('gross_profit', p)}-${M('sga', p)}`, 'total'),
      flows('other_net', (p) => formula(R('other_net', p)), (p) => formula(A('other_net', p)), { label: 'Finance and other items, net', unit: 'Rp bn' }),
      same('profit_before_tax', 'Profit before tax', 'Rp bn', (p) => `${M('operating_profit', p)}+${M('other_net', p)}`, 'total'),
      flows('tax', (p) => formula(R('tax', p)), (p) => formula(`${M('profit_before_tax', p)}*${A('tax_rate', p)}`), { label: 'Income tax expense', unit: 'Rp bn' }),
      same('net_profit', 'Profit for the period', 'Rp bn', (p) => `${M('profit_before_tax', p)}-${M('tax', p)}`, 'total'),
      flows('nci', (p) => formula(R('nci', p)), (p) => formula(`${M('net_profit', p)}*${A('nci_share', p)}`), { label: 'Non-controlling interests', unit: 'Rp bn' }),
      same('owners_profit', 'Profit attributable to owners', 'Rp bn', (p) => `${M('net_profit', p)}-${M('nci', p)}`, 'total'),
    ],
    assumptions: [
      ['vol_sold', 'Coal sales volume', 'Mt', (p: number) => M('vol_sold', p), c.f.vol, 'a round number a little above the last quarter.'],
      ['price', 'Realised price per tonne', 'Rp thousand per tonne', (p: number) => M('price', p), c.f.price, 'held a little under the FY 25 average.'],
      ['strip_ratio', 'Strip ratio', 'bcm per tonne', (p: number) => M('strip_ratio', p), c.f.strip, 'the mine plan ratio, rounded.'],
      ['cost_per_bcm', 'Contractor cost per bcm', 'Rp thousand per bcm', (p: number) => M('cost_per_bcm', p), c.f.costPerBcm, 'the contract rate, rounded.'],
      ['fuel_per_bcm', 'Fuel cost per bcm', 'Rp thousand per bcm', (p: number) => M('fuel_per_bcm', p), c.f.fuelPerBcm, 'flat on FY 25.'],
      ['freight_rate', 'Freight rate per tonne', 'Rp thousand per tonne', (p: number) => M('freight_rate', p), c.f.freightRate, 'flat on FY 25.'],
      ['royalty_rate', 'Royalty rate', '% of revenue', (p: number) => M('royalty_rate', p), c.f.royaltyRate, 'the statutory rate in this invented world.'],
      ['other_cor', 'Other cost of revenue, not split', 'Rp bn per quarter', (p: number) => M('cor_other', p), c.f.otherCor, 'a round number per quarter.'],
      ['sga', 'Selling, general and administrative expenses', 'Rp bn per quarter', (p: number) => M('sga', p), c.f.sga, 'a round number per quarter.'],
      ['other_net', 'Finance and other items, net', 'Rp bn per quarter', (p: number) => M('other_net', p), c.f.otherNet, 'a round number per quarter.'],
      ['tax_rate', 'Effective tax rate', '% of profit before tax', (p: number) => `${M('tax', p)}/${M('profit_before_tax', p)}`, c.f.taxRate, 'the FY 25 rate, rounded.'],
      ['nci_share', 'Non-controlling interests', '% of profit', (p: number) => `${M('nci', p)}/${M('net_profit', p)}`, c.f.nciShare, 'a round share.'],
    ].map(([id, label, unit, hist, fc, note]) => assumptionRow(id as string, label as string, unit as string, hist as (p: number) => string, fc as number[], note as string)),
  };

  const tree = coalTree();
  const lines: UELine[] = [
    { id: 'revenue', label: 'Revenue', role: 'revenue', rowRef: 'model!revenue', driver: { description: 'Realised price per tonne × tonnes sold', physicalUnit: 'Rp thousand per tonne', inputRowRefs: ['model!price', 'model!vol_sold'] } },
    { id: 'contractor', label: 'Mining contractor services', role: 'cost', rowRef: 'model!cor_contractor', driver: { description: 'Cost per bcm × overburden removed', physicalUnit: 'Rp thousand per bcm', inputRowRefs: ['model!cost_per_bcm', 'model!ob_removed'] } },
    { id: 'fuel', label: 'Fuel', role: 'cost', rowRef: 'model!cor_fuel', driver: { description: 'Fuel cost per bcm × overburden removed', physicalUnit: 'Rp thousand per bcm', inputRowRefs: ['model!fuel_per_bcm', 'model!ob_removed'] } },
    { id: 'freight', label: 'Coal transport', role: 'cost', rowRef: 'model!cor_freight', driver: { description: 'Freight rate per tonne × tonnes sold', physicalUnit: 'Rp thousand per tonne', inputRowRefs: ['model!freight_rate', 'model!vol_sold'] } },
    { id: 'royalty', label: 'Royalty', role: 'cost', rowRef: 'model!cor_royalty', driver: { description: 'Royalty rate × revenue', physicalUnit: '% of revenue', inputRowRefs: ['model!royalty_rate', 'model!revenue'] } },
    { id: 'other', label: 'Not split in the note', role: 'unsplit', rowRef: 'model!cor_other', contains: ['Depreciation of mine assets', 'Site salaries', 'Inventory movement', 'Other site costs'] },
    { id: 'gross_profit', label: 'Gross profit', role: 'subtotal', rowRef: 'model!gross_profit' },
    { id: 'sga', label: 'Selling, general and administrative', role: 'cost', rowRef: 'model!sga', driver: { description: 'Head office and selling costs, mostly fixed per quarter', physicalUnit: 'Rp bn per quarter', inputRowRefs: [] } },
    { id: 'operating_profit', label: 'Operating profit', role: 'subtotal', rowRef: 'model!operating_profit' },
  ];
  return finish(c.common, refs, specs, {
    driverTree: tree,
    unitEconomics: { unit: 'tonne', basisLabel: 'per tonne of coal sold', denominatorRowRef: 'model!vol_sold', periods: UE_PERIODS, lines },
    peerRows: [
      { metric: 'Realised price per tonne', unit: 'Rp thousand per tonne', rowRef: 'model!price' },
      { metric: 'Cost of revenue per tonne', unit: 'Rp thousand per tonne', rowRef: 'model!cor_per_t' },
      { metric: 'Gross margin', unit: '%', rowRef: 'model!gross_margin' },
      { metric: 'Strip ratio', unit: 'bcm per tonne', rowRef: 'model!strip_ratio' },
    ],
  });

  function assumptionRow(id: string, label: string, unit: string, hist: (p: number) => string, fc: number[], note: string): RowSpec {
    const style = unit.startsWith('%') ? ('ratio' as const) : undefined;
    return {
      id,
      label,
      unit,
      ...(style ? { style } : {}),
      cell: (p) => (isForecast(p) ? assumption(fc[FORECAST.indexOf(p)], note) : formula(hist(p))),
    };
  }
}

function coalTree(): ModelPackage['driverTree'] {
  const nodes = [
    ['vol_sold', 'Tonnes sold', 'model!vol_sold'],
    ['price', 'Realised price per tonne', 'model!price'],
    ['revenue', 'Revenue', 'model!revenue'],
    ['strip_ratio', 'Strip ratio', 'model!strip_ratio'],
    ['ob_removed', 'Overburden removed', 'model!ob_removed'],
    ['cost_per_bcm', 'Contractor cost per bcm', 'model!cost_per_bcm'],
    ['cor_total', 'Cost of revenue', 'model!cor_total'],
    ['cor_per_t', 'Cost of revenue per tonne', 'model!cor_per_t'],
    ['gross_profit', 'Gross profit', 'model!gross_profit'],
    ['gross_margin', 'Gross margin', 'model!gross_margin'],
    ['sga', 'Selling, general and administrative', 'model!sga'],
    ['operating_profit', 'Operating profit', 'model!operating_profit'],
    ['net_profit', 'Profit for the period', 'model!net_profit'],
    ['owners_profit', 'Profit to owners', 'model!owners_profit'],
  ].map(([id, label, rowRef]) => ({ id, label, rowRef }));
  const edges = [
    ['vol_sold', 'revenue'], ['price', 'revenue'],
    ['vol_sold', 'ob_removed'], ['strip_ratio', 'ob_removed'],
    ['ob_removed', 'cor_total'], ['cost_per_bcm', 'cor_total'], ['vol_sold', 'cor_total'], ['revenue', 'cor_total'],
    ['cor_total', 'cor_per_t'], ['vol_sold', 'cor_per_t'],
    ['revenue', 'gross_profit'], ['cor_total', 'gross_profit'],
    ['gross_profit', 'gross_margin'], ['revenue', 'gross_margin'],
    ['gross_profit', 'operating_profit'], ['sga', 'operating_profit'],
    ['operating_profit', 'net_profit'], ['net_profit', 'owners_profit'],
  ].map(([from, to]) => ({ from, to }));
  return { nodes, edges };
}

/* ── Cement ────────────────────────────────────────────────────────────── */

interface CementInputs {
  common: CommonMeta;
  /** null where volumes are not disclosed (constraint 9). */
  vol: number[] | null;
  revenue: number[];
  clinker: number[];
  fuel: number[];
  power: number[];
  raw: number[];
  packaging: number[];
  otherCor: number[];
  sga: number[];
  otherNet: number[];
  taxRate: number;
  nci: number[];
  f: {
    vol: number[];
    price: number[];
    clinkerFactor: number[];
    fuelPerClinker: number[];
    powerPerT: number[];
    rawPerClinker: number[];
    packagingPerT: number[];
    otherCor: number[];
    sga: number[];
    otherNet: number[];
    taxRate: number[];
    nciShare: number[];
  } | null;
}

function cement(c: CementInputs): ModelPackage {
  const refs = new Refs();
  const R = (rowId: string, p: number) => refs.at('reported', rowId, p);
  const M = (rowId: string, p: number) => refs.at('model', rowId, p);
  const A = (rowId: string, p: number) => refs.at('assumptions', rowId, p);
  const issuer: Issuer = {
    name: c.common.name,
    statementsPage: { revenue: 10, vol_sold: 2, clinker: 2, cor_fuel: 38, cor_power: 38, cor_raw: 38, cor_packaging: 38, cor_total: 10, sga: 39, other_net: 40, tax: 41, nci: 10 },
  };
  const hasVol = c.vol !== null;
  const noVol = 'Sales volume is not disclosed in the statements or in an operating update';
  const noForecast = 'No forecast: without volumes the model cannot be run forward';

  const corTotal = HIST.map((i) => c.fuel[i] + c.power[i] + c.raw[i] + c.packaging[i] + c.otherCor[i]);
  const tax = HIST.map((i) => round((c.revenue[i] - corTotal[i] - c.sga[i] + c.otherNet[i]) * c.taxRate));

  const fc = (f: (p: number) => Cell) => (p: number) => (c.f ? f(p) : missing(noForecast));
  const flows = (id: string, label: string, unit: string, hist: (p: number) => Cell, forecast: (p: number) => Cell, style?: 'total') =>
    modelRow({ id, label, unit, ...(style ? { style } : {}) }, hist, () => formula(refs.fySum('model', id)), fc(forecast));
  const same = (id: string, label: string, unit: string, f: (p: number) => string, style?: 'total' | 'ratio', needsVol = false) =>
    modelRow(
      { id, label, unit, ...(style ? { style } : {}) },
      (p) => (needsVol && !hasVol ? missing(noVol) : formula(f(p))),
      () => (needsVol && !hasVol ? missing(noVol) : formula(f(FY))),
      fc((p) => formula(f(p))),
    );
  const ratio = (id: string, label: string, unit: string, f: (p: number) => string, forecast: (p: number) => Cell, needsVol = false, style?: 'ratio') =>
    modelRow(
      { id, label, unit, ...(style ? { style } : {}) },
      (p) => (needsVol && !hasVol ? missing(noVol) : formula(f(p))),
      () => (needsVol && !hasVol ? missing(noVol) : formula(f(FY))),
      fc(forecast),
    );

  const fyRevenue = (sum: number): Cell => ({
    value: sum,
    kind: 'sourced',
    source: statementSource(issuer, FY, 'revenue', '22', 'syn:Revenue'),
    tieOut: { externalValue: sum, sourceText: `${MARK} IDX XBRL instance FY 25, syn:Revenue`, difference: 0, status: 'agrees' },
  });

  const specs: SheetSpecs = {
    reported: [
      reportedRow(refs, issuer, { id: 'revenue', label: 'Revenue', unit: 'Rp bn', note: '22', concept: 'syn:Revenue' }, c.revenue, fyRevenue),
      reportedRow(refs, issuer, { id: 'vol_sold', label: 'Cement sales volume', unit: 'Mt', operating: true }, c.vol ?? HIST.map(() => null), undefined, noVol),
      reportedRow(refs, issuer, { id: 'clinker', label: 'Clinker produced', unit: 'Mt', operating: true }, c.clinker),
      reportedRow(refs, issuer, { id: 'cor_fuel', label: 'Kiln fuel', unit: 'Rp bn', note: '23', concept: 'syn:CostOfRevenueFuel' }, c.fuel),
      reportedRow(refs, issuer, { id: 'cor_power', label: 'Electricity', unit: 'Rp bn', note: '23', concept: 'syn:CostOfRevenuePower' }, c.power),
      reportedRow(refs, issuer, { id: 'cor_raw', label: 'Raw materials', unit: 'Rp bn', note: '23', concept: 'syn:CostOfRevenueRawMaterials' }, c.raw),
      reportedRow(refs, issuer, { id: 'cor_packaging', label: 'Packaging', unit: 'Rp bn', note: '23', concept: 'syn:CostOfRevenuePackaging' }, c.packaging),
      reportedRow(refs, issuer, { id: 'cor_total', label: 'Cost of revenue', unit: 'Rp bn', style: 'total', note: '23', concept: 'syn:CostOfRevenue' }, corTotal),
      reportedRow(refs, issuer, { id: 'sga', label: 'Selling, general and administrative expenses', unit: 'Rp bn', note: '24', concept: 'syn:SellingGeneralAdministrative' }, c.sga),
      reportedRow(refs, issuer, { id: 'other_net', label: 'Finance and other items, net', unit: 'Rp bn', note: '25', concept: 'syn:OtherItemsNet' }, c.otherNet),
      reportedRow(refs, issuer, { id: 'tax', label: 'Income tax expense', unit: 'Rp bn', note: '26', concept: 'syn:IncomeTax' }, tax),
      reportedRow(refs, issuer, { id: 'nci', label: 'Profit attributable to non-controlling interests', unit: 'Rp bn', concept: 'syn:ProfitNci' }, c.nci),
    ],
    model: [
      modelRow(
        { id: 'vol_sold', label: 'Cement sales volume', unit: 'Mt' },
        (p) => (hasVol ? formula(R('vol_sold', p)) : missing(noVol)),
        () => (hasVol ? formula(refs.fySum('model', 'vol_sold')) : missing(noVol)),
        fc((p) => formula(A('vol_sold', p))),
      ),
      ratio('price', 'Realised price per tonne', 'Rp thousand per tonne', (p) => `${M('revenue', p)}/${M('vol_sold', p)}`, (p) => formula(A('price', p)), true),
      flows('revenue', 'Revenue', 'Rp bn', (p) => formula(R('revenue', p)), (p) => formula(`${M('vol_sold', p)}*${M('price', p)}`), 'total'),
      flows('clinker', 'Clinker produced', 'Mt', (p) => formula(R('clinker', p)), (p) => formula(`${M('vol_sold', p)}*${M('clinker_factor', p)}`)),
      ratio('clinker_factor', 'Clinker per tonne of cement', 'tonnes of clinker per tonne', (p) => `${M('clinker', p)}/${M('vol_sold', p)}`, (p) => formula(A('clinker_factor', p)), true),
      ratio('fuel_per_clinker', 'Kiln fuel per tonne of clinker', 'Rp thousand per tonne of clinker', (p) => `${M('cor_fuel', p)}/${M('clinker', p)}`, (p) => formula(A('fuel_per_clinker', p))),
      flows('cor_fuel', 'Kiln fuel', 'Rp bn', (p) => formula(R('cor_fuel', p)), (p) => formula(`${M('clinker', p)}*${M('fuel_per_clinker', p)}`)),
      ratio('power_per_t', 'Electricity per tonne', 'Rp thousand per tonne', (p) => `${M('cor_power', p)}/${M('vol_sold', p)}`, (p) => formula(A('power_per_t', p)), true),
      flows('cor_power', 'Electricity', 'Rp bn', (p) => formula(R('cor_power', p)), (p) => formula(`${M('vol_sold', p)}*${M('power_per_t', p)}`)),
      ratio('raw_per_clinker', 'Raw materials per tonne of clinker', 'Rp thousand per tonne of clinker', (p) => `${M('cor_raw', p)}/${M('clinker', p)}`, (p) => formula(A('raw_per_clinker', p))),
      flows('cor_raw', 'Raw materials', 'Rp bn', (p) => formula(R('cor_raw', p)), (p) => formula(`${M('clinker', p)}*${M('raw_per_clinker', p)}`)),
      ratio('packaging_per_t', 'Packaging per tonne', 'Rp thousand per tonne', (p) => `${M('cor_packaging', p)}/${M('vol_sold', p)}`, (p) => formula(A('packaging_per_t', p)), true),
      flows('cor_packaging', 'Packaging', 'Rp bn', (p) => formula(R('cor_packaging', p)), (p) => formula(`${M('vol_sold', p)}*${M('packaging_per_t', p)}`)),
      flows(
        'cor_other',
        'Other cost of revenue, not split in the note',
        'Rp bn',
        (p) => formula(`${R('cor_total', p)}-${M('cor_fuel', p)}-${M('cor_power', p)}-${M('cor_raw', p)}-${M('cor_packaging', p)}`),
        (p) => formula(A('other_cor', p)),
      ),
      same('cor_total', 'Cost of revenue', 'Rp bn', (p) => `${M('cor_fuel', p)}+${M('cor_power', p)}+${M('cor_raw', p)}+${M('cor_packaging', p)}+${M('cor_other', p)}`, 'total'),
      same('cor_per_t', 'Cost of revenue per tonne', 'Rp thousand per tonne', (p) => `${M('cor_total', p)}/${M('vol_sold', p)}`, undefined, true),
      same('gross_profit', 'Gross profit', 'Rp bn', (p) => `${M('revenue', p)}-${M('cor_total', p)}`, 'total'),
      same('gross_margin', 'Gross margin', '%', (p) => `${M('gross_profit', p)}/${M('revenue', p)}`, 'ratio'),
      flows('sga', 'Selling, general and administrative expenses', 'Rp bn', (p) => formula(R('sga', p)), (p) => formula(A('sga', p))),
      same('operating_profit', 'Operating profit', 'Rp bn', (p) => `${M('gross_profit', p)}-${M('sga', p)}`, 'total'),
      flows('other_net', 'Finance and other items, net', 'Rp bn', (p) => formula(R('other_net', p)), (p) => formula(A('other_net', p))),
      same('profit_before_tax', 'Profit before tax', 'Rp bn', (p) => `${M('operating_profit', p)}+${M('other_net', p)}`, 'total'),
      flows('tax', 'Income tax expense', 'Rp bn', (p) => formula(R('tax', p)), (p) => formula(`${M('profit_before_tax', p)}*${A('tax_rate', p)}`)),
      same('net_profit', 'Profit for the period', 'Rp bn', (p) => `${M('profit_before_tax', p)}-${M('tax', p)}`, 'total'),
      flows('nci', 'Non-controlling interests', 'Rp bn', (p) => formula(R('nci', p)), (p) => formula(`${M('net_profit', p)}*${A('nci_share', p)}`)),
      same('owners_profit', 'Profit attributable to owners', 'Rp bn', (p) => `${M('net_profit', p)}-${M('nci', p)}`, 'total'),
    ],
    assumptions: (
      [
        ['vol_sold', 'Cement sales volume', 'Mt', 'vol_sold', 'vol', 'a round number on the season.'],
        ['price', 'Realised price per tonne', 'Rp thousand per tonne', 'price', 'price', 'flat on FY 25, rounded.'],
        ['clinker_factor', 'Clinker per tonne of cement', 'tonnes of clinker per tonne', 'clinker_factor', 'clinkerFactor', 'the FY 25 factor, rounded.'],
        ['fuel_per_clinker', 'Kiln fuel per tonne of clinker', 'Rp thousand per tonne of clinker', 'fuel_per_clinker', 'fuelPerClinker', 'a little above FY 25.'],
        ['power_per_t', 'Electricity per tonne', 'Rp thousand per tonne', 'power_per_t', 'powerPerT', 'flat on FY 25.'],
        ['raw_per_clinker', 'Raw materials per tonne of clinker', 'Rp thousand per tonne of clinker', 'raw_per_clinker', 'rawPerClinker', 'flat on FY 25.'],
        ['packaging_per_t', 'Packaging per tonne', 'Rp thousand per tonne', 'packaging_per_t', 'packagingPerT', 'flat on FY 25.'],
        ['other_cor', 'Other cost of revenue, not split', 'Rp bn per quarter', 'cor_other', 'otherCor', 'a round number per quarter.'],
        ['sga', 'Selling, general and administrative expenses', 'Rp bn per quarter', 'sga', 'sga', 'a round number per quarter.'],
        ['other_net', 'Finance and other items, net', 'Rp bn per quarter', 'other_net', 'otherNet', 'a round number per quarter.'],
        ['tax_rate', 'Effective tax rate', '% of profit before tax', '', 'taxRate', 'the FY 25 rate, rounded.'],
        ['nci_share', 'Non-controlling interests', '% of profit', '', 'nciShare', 'a round share.'],
      ] as const
    ).map(([id, label, unit, modelId, key, note]) => {
      const style = unit.startsWith('%') ? ('ratio' as const) : undefined;
      const hist = (p: number) =>
        id === 'tax_rate' ? `${M('tax', p)}/${M('profit_before_tax', p)}` : id === 'nci_share' ? `${M('nci', p)}/${M('net_profit', p)}` : M(modelId, p);
      return {
        id,
        label,
        unit,
        ...(style ? { style } : {}),
        cell: (p: number) =>
          isForecast(p) ? (c.f ? assumption(c.f[key][FORECAST.indexOf(p)], note) : missing(noForecast)) : formula(hist(p)),
      } as RowSpec;
    }),
  };

  const lines: UELine[] = [
    { id: 'revenue', label: 'Revenue', role: 'revenue', rowRef: 'model!revenue', driver: { description: 'Realised price per tonne × tonnes sold', physicalUnit: 'Rp thousand per tonne', inputRowRefs: ['model!price', 'model!vol_sold'] } },
    { id: 'fuel', label: 'Kiln fuel', role: 'cost', rowRef: 'model!cor_fuel', driver: { description: 'Fuel per tonne of clinker × clinker produced', physicalUnit: 'Rp thousand per tonne of clinker', inputRowRefs: ['model!fuel_per_clinker', 'model!clinker'] } },
    { id: 'power', label: 'Electricity', role: 'cost', rowRef: 'model!cor_power', driver: { description: 'Power cost per tonne × tonnes sold', physicalUnit: 'Rp thousand per tonne', inputRowRefs: ['model!power_per_t', 'model!vol_sold'] } },
    { id: 'raw', label: 'Raw materials', role: 'cost', rowRef: 'model!cor_raw', driver: { description: 'Raw material cost per tonne of clinker × clinker produced', physicalUnit: 'Rp thousand per tonne of clinker', inputRowRefs: ['model!raw_per_clinker', 'model!clinker'] } },
    { id: 'packaging', label: 'Packaging', role: 'cost', rowRef: 'model!cor_packaging', driver: { description: 'Packaging per tonne × tonnes sold', physicalUnit: 'Rp thousand per tonne', inputRowRefs: ['model!packaging_per_t', 'model!vol_sold'] } },
    { id: 'other', label: 'Not split in the note', role: 'unsplit', rowRef: 'model!cor_other', contains: ['Depreciation of plant', 'Maintenance', 'Plant labour', 'Inventory movement'] },
    { id: 'gross_profit', label: 'Gross profit', role: 'subtotal', rowRef: 'model!gross_profit' },
    { id: 'sga', label: 'Selling, general and administrative', role: 'cost', rowRef: 'model!sga', driver: { description: 'Head office, selling and distribution costs, mostly fixed per quarter', physicalUnit: 'Rp bn per quarter', inputRowRefs: [] } },
    { id: 'operating_profit', label: 'Operating profit', role: 'subtotal', rowRef: 'model!operating_profit' },
  ];

  return finish(c.common, refs, specs, {
    driverTree: hasVol ? cementTree() : cementTreeWithoutVolume(),
    unitEconomics: {
      unit: 'tonne',
      basisLabel: 'per tonne of cement sold',
      denominatorRowRef: 'model!vol_sold',
      periods: c.f ? UE_PERIODS : ['FY25'],
      lines,
    },
    peerRows: [
      { metric: 'Realised price per tonne', unit: 'Rp thousand per tonne', rowRef: 'model!price' },
      { metric: 'Cost of revenue per tonne', unit: 'Rp thousand per tonne', rowRef: 'model!cor_per_t' },
      { metric: 'Gross margin', unit: '%', rowRef: 'model!gross_margin' },
      { metric: 'Clinker per tonne of cement', unit: 'tonnes of clinker per tonne', rowRef: 'model!clinker_factor' },
    ],
  });
}

function cementTree(): ModelPackage['driverTree'] {
  const nodes = [
    ['vol_sold', 'Tonnes sold', 'model!vol_sold'],
    ['price', 'Realised price per tonne', 'model!price'],
    ['revenue', 'Revenue', 'model!revenue'],
    ['clinker_factor', 'Clinker per tonne of cement', 'model!clinker_factor'],
    ['clinker', 'Clinker produced', 'model!clinker'],
    ['fuel_per_clinker', 'Kiln fuel per tonne of clinker', 'model!fuel_per_clinker'],
    ['cor_total', 'Cost of revenue', 'model!cor_total'],
    ['cor_per_t', 'Cost of revenue per tonne', 'model!cor_per_t'],
    ['gross_profit', 'Gross profit', 'model!gross_profit'],
    ['gross_margin', 'Gross margin', 'model!gross_margin'],
    ['sga', 'Selling, general and administrative', 'model!sga'],
    ['operating_profit', 'Operating profit', 'model!operating_profit'],
    ['net_profit', 'Profit for the period', 'model!net_profit'],
    ['owners_profit', 'Profit to owners', 'model!owners_profit'],
  ].map(([id, label, rowRef]) => ({ id, label, rowRef }));
  const edges = [
    ['vol_sold', 'revenue'], ['price', 'revenue'],
    ['vol_sold', 'clinker'], ['clinker_factor', 'clinker'],
    ['clinker', 'cor_total'], ['fuel_per_clinker', 'cor_total'], ['vol_sold', 'cor_total'],
    ['cor_total', 'cor_per_t'], ['vol_sold', 'cor_per_t'],
    ['revenue', 'gross_profit'], ['cor_total', 'gross_profit'],
    ['gross_profit', 'gross_margin'], ['revenue', 'gross_margin'],
    ['gross_profit', 'operating_profit'], ['sga', 'operating_profit'],
    ['operating_profit', 'net_profit'], ['net_profit', 'owners_profit'],
  ].map(([from, to]) => ({ from, to }));
  return { nodes, edges };
}

/** Without volumes the operating drivers cannot be worked, so the tree starts at revenue. */
function cementTreeWithoutVolume(): ModelPackage['driverTree'] {
  const full = cementTree();
  const keep = new Set(['revenue', 'cor_total', 'gross_profit', 'gross_margin', 'sga', 'operating_profit', 'net_profit', 'owners_profit']);
  return {
    nodes: full.nodes.filter((n) => keep.has(n.id)),
    edges: full.edges.filter((e) => keep.has(e.from) && keep.has(e.to)),
  };
}

/* ── The four synthetic companies ──────────────────────────────────────── */

const PUBLISHED_GATES: ModelPackage['workpaper']['gates'] = [
  { name: 'Intake and tie-out', status: 'passed' },
  { name: 'Driver model', status: 'passed_with_escalation', note: `${MARK}: one escalation left open on purpose, to show the status.` },
  { name: 'Calibration', status: 'passed' },
  { name: 'Partner review', status: 'passed' },
];

const COAL_NOTE = { '3': 'This model supplies the per-tonne economics the rule needs: realised price, cost per tonne and margin through the cycle.' };

const XCOA = coal({
  common: {
    ticker: 'XCOA',
    name: `Example Coal Co (${MARK})`,
    subIndustry: 'SYN-COAL',
    chainStage: 'stage-extraction',
    pair: ['SCOA'],
    status: 'published',
    depth: 'executive',
    conditionIds: [3],
    conditionNotes: COAL_NOTE,
    gates: PUBLISHED_GATES,
    approved: true,
  },
  vol: [2.0, 2.2, 2.4, 2.4, 2.2, 2.4, 2.6, 2.8],
  price: [800, 800, 750, 750, 700, 700, 750, 750],
  production: [null, 2.2, 2.5, 2.4, 2.3, 2.4, 2.6, 2.7],
  ob: [16, 18, 20, 19, 18, 19, 21, 22],
  costPerBcm: [30, 30, 30, 30, 30, 30, 30, 30],
  fuelPerBcm: [10, 10, 10, 10, 10, 10, 10, 10],
  freightRate: [120, 120, 120, 120, 120, 120, 120, 120],
  royaltyRate: 0.1,
  otherCor: [150, 150, 160, 160, 150, 160, 160, 170],
  sga: [100, 100, 110, 110, 100, 105, 110, 120],
  otherNet: [-20, -20, -15, -15, -10, -10, -10, -10],
  taxRate: 0.22,
  nci: [10, 10, 10, 10, 10, 10, 10, 10],
  f: {
    vol: [2.6, 2.8],
    price: [720, 720],
    strip: [8, 8],
    costPerBcm: [31, 31],
    fuelPerBcm: [10, 10],
    freightRate: [120, 120],
    royaltyRate: [0.1, 0.1],
    otherCor: [165, 165],
    sga: [115, 115],
    otherNet: [-10, -10],
    taxRate: [0.22, 0.22],
    nciShare: [0.02, 0.02],
  },
});

const SCOA = coal({
  common: {
    ticker: 'SCOA',
    name: `Sample Coal Co (${MARK})`,
    subIndustry: 'SYN-COAL',
    chainStage: 'stage-extraction',
    pair: ['XCOA'],
    status: 'published',
    depth: 'foundation',
    conditionIds: [3],
    conditionNotes: COAL_NOTE,
    gates: PUBLISHED_GATES,
    approved: true,
  },
  vol: [1.0, 1.1, 1.2, 1.2, 1.1, 1.2, 1.3, 1.4],
  price: [850, 850, 800, 800, 760, 760, 800, 800],
  production: [1.0, 1.1, 1.2, 1.25, 1.1, 1.2, 1.3, 1.4],
  ob: [10, 11, 12, 12, 11, 12, 13, 14],
  costPerBcm: [28, 28, 28, 28, 28, 28, 28, 28],
  fuelPerBcm: [9, 9, 9, 9, 9, 9, 9, 9],
  freightRate: [150, 150, 150, 150, 150, 150, 150, 150],
  royaltyRate: 0.1,
  otherCor: [80, 80, 85, 85, 80, 85, 85, 90],
  sga: [60, 60, 65, 65, 60, 62, 65, 70],
  otherNet: [-5, -5, -5, -5, -5, -5, -5, -5],
  taxRate: 0.22,
  nci: [0, 0, 0, 0, 0, 0, 0, 0],
  f: {
    vol: [1.3, 1.4],
    price: [780, 780],
    strip: [10, 10],
    costPerBcm: [29, 29],
    fuelPerBcm: [9, 9],
    freightRate: [150, 150],
    royaltyRate: [0.1, 0.1],
    otherCor: [90, 90],
    sga: [65, 65],
    otherNet: [-5, -5],
    taxRate: [0.22, 0.22],
    nciShare: [0, 0],
  },
});

const CEMENT_NOTE = { '1': 'This model supplies tonnes sold against clinker produced, so idle kiln capacity shows up in the cost of a tonne.' };

const SCEM = cement({
  common: {
    ticker: 'SCEM',
    name: `Sample Cement Co (${MARK})`,
    subIndustry: 'SYN-CEM',
    chainStage: 'stage-processing',
    pair: ['XCEM'],
    status: 'published',
    depth: 'executive',
    conditionIds: [1],
    conditionNotes: CEMENT_NOTE,
    gates: PUBLISHED_GATES,
    approved: true,
  },
  vol: [1.5, 1.6, 1.8, 2.0, 1.5, 1.6, 1.8, 2.1],
  revenue: [1350, 1440, 1584, 1760, 1290, 1376, 1584, 1890],
  clinker: [1.1, 1.2, 1.35, 1.5, 1.1, 1.2, 1.35, 1.6],
  fuel: [220, 240, 270, 300, 220, 240, 270, 320],
  power: [150, 160, 180, 200, 150, 160, 180, 210],
  raw: [132, 144, 162, 180, 132, 144, 162, 192],
  packaging: [60, 64, 72, 80, 60, 64, 72, 84],
  otherCor: [120, 120, 130, 130, 125, 125, 130, 140],
  sga: [110, 110, 120, 120, 110, 115, 120, 130],
  otherNet: [-30, -30, -25, -25, -25, -25, -25, -25],
  taxRate: 0.22,
  nci: [5, 5, 5, 5, 5, 5, 5, 5],
  f: {
    vol: [1.6, 1.7],
    price: [870, 870],
    clinkerFactor: [0.75, 0.75],
    fuelPerClinker: [205, 205],
    powerPerT: [100, 100],
    rawPerClinker: [120, 120],
    packagingPerT: [40, 40],
    otherCor: [135, 135],
    sga: [120, 120],
    otherNet: [-25, -25],
    taxRate: [0.22, 0.22],
    nciShare: [0.02, 0.02],
  },
});

const XCEM = cement({
  common: {
    ticker: 'XCEM',
    name: `Example Cement Co (${MARK})`,
    subIndustry: 'SYN-CEM',
    chainStage: 'stage-processing',
    pair: ['SCEM', 'YCEM'],
    status: 'preview',
    depth: 'foundation',
    conditionIds: [1, 6],
    conditionNotes: CEMENT_NOTE,
    gates: [
      { name: 'Intake and tie-out', status: 'passed' },
      { name: 'Volumes', status: 'failed', note: `${MARK}: sales volume is not disclosed, so nothing can be worked per tonne.` },
      { name: 'Driver model', status: 'not_run' },
      { name: 'Partner review', status: 'not_run' },
    ],
    approved: false,
  },
  vol: null,
  revenue: [1000, 1050, 1100, 1200, 1000, 1050, 1150, 1300],
  clinker: [0.8, 0.85, 0.9, 1.0, 0.8, 0.85, 0.95, 1.05],
  fuel: [170, 180, 190, 210, 170, 180, 200, 220],
  power: [110, 115, 120, 130, 110, 115, 125, 140],
  raw: [100, 105, 110, 120, 100, 105, 115, 125],
  packaging: [45, 47, 50, 54, 45, 47, 52, 58],
  otherCor: [100, 100, 105, 105, 100, 100, 105, 110],
  sga: [90, 90, 95, 95, 90, 92, 95, 100],
  otherNet: [-20, -20, -20, -20, -20, -20, -20, -20],
  taxRate: 0.22,
  nci: [0, 0, 0, 0, 0, 0, 0, 0],
  f: null,
});

for (const pkg of [XCOA, SCOA, SCEM, XCEM]) {
  const file = path.join(OUT, `${pkg.meta.ticker}.${MARK}.json`);
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`wrote ${path.relative(process.cwd(), file)} (${pkg.meta.contentHash.slice(0, 12)}…)`);
}
