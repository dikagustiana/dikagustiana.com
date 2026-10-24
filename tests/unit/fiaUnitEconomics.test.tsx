/**
 * Finance in Action v3.1, Commit 5: unit economics (brief §5.4), worked from
 * rows over the denominator row (constraint 7), cost of revenue as its note's
 * lines with the remainder hatched (constraint 8), and nothing without a
 * volume (constraint 9).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeQueryResult } from './helpers/renderWithProviders';
import { renderFiaPage } from './helpers/renderFiaPage';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => fromMock(...a),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
  },
}));

import FiaModelRoute from '@/pages/finance-in-action/FiaModelRoute';
import { COPY } from '@/lib/finance-in-action/copy';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import {
  barValue,
  extent,
  noVolumeAnywhere,
  perUnitInPackage,
  unitEconomicsAt,
  unitScale,
} from '@/lib/finance-in-action/unitEconomics';

const pkgOf = (t: string): ModelPackage => JSON.parse(JSON.stringify(previewRegistry().company(t)!.pkg));
const ueOf = (pkg: ModelPackage, period: string) => {
  const wb = new Workbook(pkg);
  return unitEconomicsAt(wb, wb.values(), period);
};
const at = (ticker: string) =>
  renderFiaPage(<FiaModelRoute />, { path: '/finance/finance-in-action/:modelSlug', url: `/finance/finance-in-action/${ticker}` });
const ueSection = async () => (await screen.findByRole('heading', { level: 2, name: /Unit economics, per tonne sold/ })).closest('section')!;

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult(null));
});

describe('the per-unit scale', () => {
  it('turns Rp bn over Mt into Rp thousand per tonne', () => {
    expect(unitScale('Rp bn', 'Mt')).toEqual({ multiplier: 1, label: 'Rp thousand', known: true });
    expect(unitScale('Rp bn', 'kt')).toEqual({ multiplier: 1, label: 'Rp million', known: true });
    expect(unitScale('Rp mn', 't')).toEqual({ multiplier: 1, label: 'Rp million', known: true });
    expect(unitScale('USD m', 'Mt')).toMatchObject({ multiplier: 1, known: false, label: 'USD m per Mt' });
  });

  it('keeps US dollars in dollars per unit and reads thousand tonnes and MWh', () => {
    expect(unitScale('US$ thousand', 'Mt')).toEqual({ multiplier: 1e-3, label: 'US$', known: true });
    expect(unitScale('US$ thousand', 'MWh')).toEqual({ multiplier: 1e3, label: 'US$', known: true });
    expect(unitScale('USD million', 'Mt')).toEqual({ multiplier: 1, label: 'US$', known: true });
    expect(unitScale('Rp million', 'thousand tonnes')).toEqual({ multiplier: 1, label: 'Rp thousand', known: true });
    expect(unitScale('Rp bn', 'GWh')).toEqual({ multiplier: 1, label: 'Rp million', known: true });
  });
});

describe('unit economics worked from the rows', () => {
  it('divides each line’s row by the volume row, in the package’s line order', () => {
    const ue = ueOf(pkgOf('XCOA'), 'FY25');
    expect(ue.available).toBe(true);
    expect(ue.bars.map((b) => b.line.id)).toEqual(['revenue', 'contractor', 'fuel', 'freight', 'royalty', 'other', 'gross_profit', 'sga', 'operating_profit']);
    const per = Object.fromEntries(ue.bars.map((b) => [b.line.id, b.perUnit]));
    expect(per.revenue).toBeCloseTo(727);
    expect(per.contractor).toBeCloseTo(240);
    expect(per.gross_profit).toBeCloseTo(150.3);
    expect(per.operating_profit).toBeCloseTo(106.8);
  });

  it('works subtotals from their own rows, before rounding, and steps the waterfall down from revenue', () => {
    const ue = ueOf(pkgOf('XCOA'), 'FY25');
    const gp = ue.bars.find((b) => b.line.id === 'gross_profit')!;
    const above = ue.bars.slice(0, 6);
    expect(gp.perUnit! - (above[0].perUnit! - above.slice(1).reduce((s, b) => s + b.perUnit!, 0))).toBeCloseTo(0, 9);
    expect(ue.bars[1]).toMatchObject({ from: ue.bars[0].to });
    expect(gp.from).toBe(0);
    expect(extent(ue.bars).lo).toBe(0);
    expect(barValue(ue.bars[1])).toBe('(240.0)');
  });

  it('stores nothing per unit: change a row and the figure follows', () => {
    const pkg = pkgOf('XCOA');
    const fy = pkg.periods.findIndex((p) => p.id === 'FY25');
    const reported = pkg.sheets.find((s) => s.id === 'reported')!.rows.find((r) => r.id === 'cor_contractor')!;
    // Lift each 2025 quarter by 10; the model's FY sums them through the engine.
    for (const q of [4, 5, 6, 7]) reported.cells[q].value = (reported.cells[q].value as number) + 10;
    const ue = ueOf(pkg, 'FY25');
    expect(ue.bars.find((b) => b.line.id === 'contractor')!.perUnit).toBeCloseTo(244);
    expect(fy).toBeGreaterThan(0);
  });

  it('reads the pair on the same basis from its own rows', () => {
    expect(perUnitInPackage(pkgOf('SCOA'), 'contractor', 'FY25')).toBeCloseTo(280);
    expect(perUnitInPackage(pkgOf('SCOA'), 'nope', 'FY25')).toBeNull();
  });
});

describe('no volume, no unit economics (constraint 9)', () => {
  it('reports a missing volume in every period', () => {
    const pkg = pkgOf('XCEM');
    const wb = new Workbook(pkg);
    expect(noVolumeAnywhere(wb, wb.values())).toBe(true);
    const ue = ueOf(pkg, 'FY25');
    expect(ue).toMatchObject({ available: false, reason: 'volume-missing', bars: [] });
  });

  it('reports a denominator row that does not exist', () => {
    const pkg = pkgOf('XCOA');
    pkg.unitEconomics.denominatorRowRef = 'model!nope';
    expect(ueOf(pkg, 'FY25')).toMatchObject({ available: false, reason: 'no-denominator-row' });
  });

  it('draws nothing on the page but the one line', async () => {
    at('xcem');
    const section = await ueSection();
    expect(within(section).getByRole('status')).toHaveTextContent(COPY.ueNotAvailable);
    expect(within(section).queryByRole('region')).toBeNull();
    expect(within(section).queryByRole('table')).toBeNull();
    expect(within(section).queryByRole('button')).toBeNull();
  });
});

describe('the unit economics section', () => {
  it('heads with the period and the basis, defaults to the latest reported period, and states its copy once', async () => {
    at('xcoa');
    const section = await ueSection();
    expect(section).toHaveTextContent('FY 25, Rp thousand per tonne of coal sold');
    expect(within(section).getByLabelText('Period')).toHaveValue('FY25');
    expect(section).toHaveTextContent(COPY.ueIntro('tonnes'));
    expect(section).toHaveTextContent(COPY.ueRounding);
  });

  it('puts every bar’s value on the bar, the remainder hatched, and its driver or contents under it', async () => {
    at('xcoa');
    const section = await ueSection();
    const chart = within(section).getByRole('region', { name: /Unit economics chart/ });
    expect(within(chart).getByRole('button', { name: 'Revenue: 727.0 Rp thousand per tonne' })).toHaveTextContent('727.0');
    expect(within(chart).getByRole('button', { name: /^Mining contractor services: \(240.0\)/ })).toHaveTextContent('(240.0)');
    const remainder = within(chart).getByRole('button', { name: /^Not split in the note/ });
    expect(remainder.querySelector('.fia-hatch')).not.toBeNull();
    expect(chart).toHaveTextContent('Contains: Depreciation of mine assets');
    expect(within(chart).getByRole('button', { name: 'Cost per bcm × overburden removed' })).toBeInTheDocument();
  });

  it('opens a driver’s input rows with their values and units', async () => {
    const user = userEvent.setup();
    at('xcoa');
    const section = await ueSection();
    await user.click(within(section).getByRole('button', { name: 'Cost per bcm × overburden removed' }));
    const inputs = within(section).getByRole('region', { name: /Driver inputs: Mining contractor services/ });
    expect(inputs).toHaveTextContent('Contractor cost per bcm30.0Rp thousand per bcm');
    expect(inputs).toHaveTextContent('Overburden removed80.0Mbcm');
  });

  it('tables each line with its total, per unit, driver, source and the pair; the last row is the denominator', async () => {
    at('xcoa');
    const section = await ueSection();
    const table = within(section).getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'SCOA per tonne' })).toBeInTheDocument();
    const contractor = within(table).getByRole('rowheader', { name: 'Mining contractor services' }).closest('tr')!;
    // Item 4 (docs/prd/2026-10-fia-fixes): costs in brackets in both money columns, the pair before the source, the source abbreviated with its full names in the title.
    expect(contractor).toHaveTextContent('(2,400)(240.0)Cost per bcm × overburden removed(280.0)Q1 25 n.25 · Q2 25 n.25 · Q3 25 n.25 · Q4 25 n.25');
    expect(contractor.lastElementChild).toHaveAttribute('title', 'SYNTHETIC interim financial statements, Q1 25 to Q4 25, note 25');
    const rows = within(table).getAllByRole('row');
    expect(rows[rows.length - 1]).toHaveTextContent('Divided by coal sales volume10.0 Mt');
    expect(rows[rows.length - 1].lastElementChild).toHaveAttribute('title', 'SYNTHETIC quarterly operating update, Q1 25 to Q4 25');
  });

  it('says where the lines come from when they are not from filings', async () => {
    at('xcoa');
    const section = await ueSection();
    expect(within(section).getAllByRole('note')[0]).toHaveTextContent('These lines are not from filings');
  });

  it('opens the inspector on a bar, with the line per unit and its driver', async () => {
    const user = userEvent.setup();
    at('xcoa');
    const section = await ueSection();
    await user.click(within(section).getByRole('button', { name: /^Royalty: \(72.7\)/ }));
    const inspector = screen.getByRole('complementary', { name: 'Inspector' });
    expect(inspector).toHaveTextContent('Royalty, FY 25');
    expect(inspector).toHaveTextContent('(72.7) Rp thousand per tonne: Royalty divided by coal sales volume.');
    expect(inspector).toHaveTextContent('Driver: Royalty rate × revenue');
  });

  it('marks a pair that is not modelled', async () => {
    at('scem');
    const section = await ueSection();
    expect(within(section).getAllByText(COPY.notYetModelled).length).toBeGreaterThan(0);
  });
});
