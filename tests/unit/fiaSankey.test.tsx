/**
 * Chain view, commit 6 (PROMPT-site §3.5): "Where a unit of [product] goes".
 * The flows are the waterfall's per-unit values for the same period; a loss
 * is its own marked flow, never a negative width; the unsplit flow is
 * hatched and lists what it contains; every flow carries its label and value
 * as text; nothing is drawn without volumes. SYNTHETIC fixtures only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
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
import { formatNumber } from '@/lib/finance-in-action/format';
import { Workbook } from '@/lib/finance-in-action/model/workbook';
import { layoutSankey, sankeyModel } from '@/lib/finance-in-action/sankey';
import { PER_UNIT_DECIMALS, unitEconomicsAt, type UEView } from '@/lib/finance-in-action/unitEconomics';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import { SANKEY } from '@/lib/finance-in-action/layout';

const at = (ticker: string) =>
  renderFiaPage(<FiaModelRoute />, { path: '/finance/finance-in-action/:modelSlug', url: `/finance/finance-in-action/${ticker}` });
const reg = previewRegistry();
const pkg = (t: string) => reg.company(t)!.pkg!;
const ueOf = (t: string, period: string) => {
  const wb = new Workbook(pkg(t));
  return unitEconomicsAt(wb, wb.values(), period);
};

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
});

describe('the cost flow, worked', () => {
  it.each([
    ['SCEM', '25Q4'],
    ['SCEM', 'FY25'],
    ['SCOA', '25Q2'],
  ])('%s %s: every flow is the waterfall’s per-unit value, in line order, and they add up to revenue', (ticker, period) => {
    const ue = ueOf(ticker, period);
    const m = sankeyModel(reg, pkg(ticker), ue);
    const bar = (id: string) => ue.bars.find((b) => b.line.id === id)!;
    expect(m.available).toBe(true);
    expect(m.revenue).toBe(ue.bars.find((b) => b.line.role === 'revenue')!.perUnit);
    for (const f of m.flows) expect(f.value, f.line.id).toBe(bar(f.line.id).perUnit);
    const expected = ue.bars.filter((b) => b.line.role === 'cost' || b.line.role === 'unsplit').map((b) => b.line.id);
    expect(m.flows.map((f) => f.line.id)).toEqual([...expected, 'operating_profit']);
    expect(m.flows.reduce((s, f) => s + f.value, 0)).toBeCloseTo(m.revenue, 6);
  });

  it('joins each register line to its upstream sub-industry, with its published companies', () => {
    const m = sankeyModel(reg, pkg('SCEM'), ueOf('SCEM', '25Q4'));
    const fuel = m.flows.find((f) => f.line.id === 'fuel')!;
    expect(fuel.upstream.map((u) => [u.code, u.published.map((c) => c.ticker).sort()])).toEqual([['SYN-COAL', ['SCOA', 'XCOA']]]);
    const power = m.flows.find((f) => f.line.id === 'power')!;
    expect(power.upstream.map((u) => [u.code, u.published])).toEqual([['SYN-POWER', []]]);
    expect(m.flows.filter((f) => f.line.id !== 'fuel' && f.line.id !== 'power').every((f) => f.upstream.length === 0)).toBe(true);
  });

  it('draws a loss as its own flow under revenue, never as a negative width', () => {
    const ue = ueOf('SCEM', '25Q4');
    const revenue = ue.bars[0].perUnit!;
    const loss: UEView = {
      ...ue,
      bars: ue.bars.map((b) => (b.line.id === 'operating_profit' ? { ...b, perUnit: -revenue * SANKEY.ribbonOpacity } : b)),
    };
    const m = sankeyModel(reg, pkg('SCEM'), loss);
    expect(m.loss).toBeCloseTo(revenue * SANKEY.ribbonOpacity);
    expect(m.flows.some((f) => f.kind === 'profit')).toBe(false);
    const L = layoutSankey(m);
    expect(L.loss).not.toBeNull();
    for (const f of L.flows) expect(f.h).toBeGreaterThanOrEqual(0);
  });

  it('is not available without a volume', () => {
    const ue = ueOf('XCEM', 'FY25');
    expect(ue.available).toBe(false);
    expect(sankeyModel(reg, pkg('XCEM'), ue).available).toBe(false);
  });
});

describe('the cost flow on the page', () => {
  it('says "Not available: volumes not disclosed" and draws nothing without volumes', async () => {
    at('xcem');
    const section = (await screen.findByRole('heading', { name: 'Where a unit of cement goes' })).closest('section')!;
    expect(section).toHaveTextContent(COPY.ueNotAvailable);
    expect(section.querySelector('svg[data-sankey]')).toBeNull();
    expect(section.querySelector('table')).toBeNull();
  });

  it('hatches the unsplit flow, writes every flow’s label and value as text, and gives the same figures in a table', async () => {
    at('scem');
    const section = (await screen.findByRole('heading', { name: 'Where a unit of cement goes' })).closest('section')!;
    const svg = section.querySelector('svg[data-sankey]')!;
    const unsplit = svg.querySelector('[data-kind="unsplit"] path')!;
    expect(unsplit.getAttribute('fill')).toMatch(/^url\(#.*hatch\)$/);
    // The page opens on the waterfall's default period, the latest reported one.
    const m = sankeyModel(reg, pkg('SCEM'), ueOf('SCEM', 'FY25'));
    const table = section.querySelector('table[data-sankey-table]')!;
    for (const f of m.flows) {
      const g = svg.querySelector(`[data-sankey-flow="${f.line.id}"]`)!;
      const text = g.querySelector('text')!.textContent!;
      expect(text).toContain(f.line.label);
      expect(text).toContain(formatNumber(f.value, PER_UNIT_DECIMALS));
      const row = within(table as HTMLElement).getByRole('rowheader', { name: new RegExp(`^${f.line.label}`) }).closest('tr')!;
      expect(row).toHaveTextContent(formatNumber(f.value, PER_UNIT_DECIMALS));
    }
  });

  it('lets the keyboard reach the revenue node, every flow and every upstream node, and lists what the unsplit flow contains on focus', async () => {
    at('scem');
    const section = (await screen.findByRole('heading', { name: 'Where a unit of cement goes' })).closest('section')!;
    const svg = section.querySelector('svg[data-sankey]')!;
    const focusable = Array.from(svg.querySelectorAll('[tabindex="0"]'));
    const m = sankeyModel(reg, pkg('SCEM'), ueOf('SCEM', '25Q4'));
    expect(focusable).toHaveLength(1 + m.flows.length + m.upstream.length);
    const other = svg.querySelector('[data-kind="unsplit"] [tabindex="0"]') as HTMLElement;
    fireEvent.focus(other);
    expect(section.querySelector('[data-sankey-detail]')).toHaveTextContent(/Contains: Depreciation of plant/);
  });

  it('opens the link card from an upstream node with several published companies', async () => {
    at('scem');
    const section = (await screen.findByRole('heading', { name: 'Where a unit of cement goes' })).closest('section')!;
    const node = within(section).getByRole('link', { name: /Synthetic coal mining.*open the link card/ });
    await userEvent.click(node);
    expect(screen.getByRole('button', { name: 'Close the link card' })).toBeInTheDocument();
  });
});
