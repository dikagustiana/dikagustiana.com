/**
 * Finance in Action v3.1, Commit 7: the Connections lens on the index, the
 * link card and the per-unit split along the chain (brief §5.2), and
 * constraint 10: a link is drawn as measured only when both weights are
 * sourced, and no weight is ever derived from a placeholder.
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

import FiaIndexPage from '@/pages/finance-in-action/FiaIndexPage';
import { FiaIndex } from '@/pages/finance-in-action/FiaIndex';
import { isMeasured, type IndustryLink } from '@/lib/finance-in-action/contract/links';
import type { Registry } from '@/lib/finance-in-action/registry';
import { COPY } from '@/lib/finance-in-action/copy';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import { placeLinks } from '@/lib/finance-in-action/links';
import { CHAIN_STAGES } from '@/lib/finance-in-action/chain';
import { sideEconomics, splitAlongChain, whatIf, workedCostShare } from '@/lib/finance-in-action/linkMath';

const INDEX = '/finance/finance-in-action';
const renderIndex = (query = '') => renderFiaPage(<FiaIndexPage />, { path: INDEX, url: `${INDEX}${query}` });
const reg = previewRegistry();
const seed = reg.links.find((l) => l.id === 'coal-to-cement')!;
const syn = reg.links.find((l) => l.id === 'syn-coal-to-cement')!;
/** The real link with both weights taken away: what an unmeasured link looks like (constraint 10). */
const unmeasured: IndustryLink = { ...seed, costShare: null, demandShare: null };
const unmeasuredReg: Registry = { ...reg, links: reg.links.map((l) => (l.id === seed.id ? unmeasured : l)) };
const renderUnmeasured = (query = '') =>
  renderFiaPage(<FiaIndex useRegistry={() => ({ reg: unmeasuredReg, published: 'ok', failure: null, fixtures: true })} />, {
    path: INDEX,
    url: `${INDEX}${query}`,
  });
const pkg = (t: string) => reg.company(t)!.pkg!;

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
});

describe('the link arithmetic', () => {
  const up = sideEconomics(pkg('SCOA'), 'FY25');
  const down = sideEconomics(pkg('SCEM'), 'FY25');

  it('places both links between extraction and processing, in their own lanes', () => {
    const drawn = placeLinks(reg, CHAIN_STAGES.map((s) => s.id));
    const ix = (id: string) => CHAIN_STAGES.findIndex((s) => s.id === id);
    expect(drawn.map((d) => [d.link.id, d.from, d.to, d.lane])).toEqual([
      ['coal-to-cement', ix('stage-extraction'), ix('stage-processing'), 0],
      ['syn-coal-to-cement', ix('stage-extraction'), ix('stage-processing'), 1],
    ]);
  });

  it('reads each side per unit, in rupiah, from its published rows', () => {
    expect(up.revenue).toBeCloseTo(781600);
    expect(up.costOfRevenue).toBeCloseTo(666200);
    expect(up.operatingProfit).toBeCloseTo(64000);
    expect(down.revenue! / 1e3).toBeCloseTo(877.14, 2);
  });

  it('works the cost share beside the disclosed one, never instead of it', () => {
    const worked = workedCostShare(syn, up, down)!;
    expect(worked).toBeCloseTo((781600 * 0.1) / down.costOfRevenue!);
    expect(syn.costShare!.value).toBe(0.12);
    expect(workedCostShare(seed, up, down)).toBeNull();
    expect(workedCostShare(unmeasured, up, down)).toBeNull();
  });

  it('splits one unit of the downstream product so the parts add up to its price', () => {
    const split = Object.fromEntries(splitAlongChain(syn, up, down, { upstream: 'coal', downstream: 'cement', unit: 'tonne' }).map((l) => [l.id, l.value]));
    expect(split.input).toBeCloseTo(78160);
    expect(split.upstreamMargin).toBeCloseTo(6400);
    expect(split.input! + split.otherCosts! + split.ownMargin!).toBeCloseTo(split.price!);
    const empty = splitAlongChain(seed, null, null, { upstream: 'coal', downstream: 'cement', unit: 'tonne' });
    expect(empty.every((l) => l.value === null)).toBe(true);
  });

  it('works the what-if only from measured weights and published models, and says what is missing otherwise', () => {
    const r = whatIf(syn, up, down, 0.1);
    expect(r.ok && r.grossMarginChange).toBeCloseTo(-(0.12 * 0.1 * down.costOfRevenue!) / down.revenue!);
    const missing = whatIf(unmeasured, null, null, 0.1);
    expect(missing).toEqual({
      ok: false,
      missing: ['the cost share is not measured', 'the demand share is not measured', 'no upstream company is published', 'no downstream company is published with volumes'],
    });
    expect(whatIf(seed, null, null, 0.1)).toEqual({
      ok: false,
      missing: ['no upstream company is published', 'no downstream company is published with volumes'],
    });
    expect(whatIf({ ...syn, demandShare: null }, up, down, 0.1).ok).toBe(false);
  });
});

describe('the index with the lens on', () => {
  it('draws nothing of the links with the lens off', async () => {
    renderIndex();
    await screen.findByRole('heading', { level: 1, name: COPY.title });
    expect(screen.queryByRole('button', { name: /expected, not measured/ })).toBeNull();
    expect(screen.queryByText(/^Feeds /)).toBeNull();
  });

  it('draws the unmeasured link dashed and labelled, and the measured one as two weighted solid lines (constraint 10)', async () => {
    renderUnmeasured('?connections=on');
    const region = await screen.findByRole('region', { name: /Chain stages/ });
    expect(within(region).getByRole('button', { name: 'Coal production to Construction materials: expected, not measured' })).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: /Synthetic coal mining \(SYNTHETIC\) to Synthetic cement \(SYNTHETIC\): cost share 12.0%, demand share 25.0%/ })).toBeInTheDocument();
    const dashed = region.querySelectorAll('svg path[stroke-dasharray]');
    expect(dashed).toHaveLength(1);
    const solid = Array.from(region.querySelectorAll('svg g path')) as SVGPathElement[];
    expect(solid).toHaveLength(2);
    const [cost, demand] = solid.map((p) => Number(p.getAttribute('stroke-width')));
    expect(cost).toBeGreaterThan(demand);
    const legend = screen.getByRole('list', { name: 'Link legend' });
    expect(within(legend).getAllByRole('listitem')).toHaveLength(3);
  });

  it('opens the unmeasured link’s card with every gap named and nothing invented', async () => {
    const user = userEvent.setup();
    renderUnmeasured('?connections=on');
    await user.click(await screen.findByRole('button', { name: 'Coal production to Construction materials: expected, not measured' }));
    const card = screen.getByRole('region', { name: /Coal production to Construction materials: Coal burnt as kiln fuel/ });
    expect(within(card).getAllByText('not yet measured')).toHaveLength(4);
    expect(card).toHaveTextContent(unmeasured.caveat!);
    expect(within(card).getAllByText(COPY.notAvailable)).toHaveLength(5);
    expect(card).toHaveTextContent('One tonne of cement, split along the chain');
    expect(within(card).getByRole('status')).toHaveTextContent('Not worked: the cost share is not measured');
    expect(card).toHaveTextContent(COPY.viewerOnly);
  });

  it('draws the real coal to cement link as measured, solid and weighted, because both weights carry a value and a source (constraint 10)', async () => {
    for (const w of [seed.costShare, seed.demandShare]) {
      expect(w?.value).toEqual(expect.any(Number));
      expect(w?.source.trim()).not.toBe('');
    }
    expect(isMeasured(seed)).toBe(true);
    expect(isMeasured(unmeasured)).toBe(false);
    expect(isMeasured({ ...seed, demandShare: { ...seed.demandShare!, source: ' ' } })).toBe(false);
    renderIndex('?connections=on');
    const region = await screen.findByRole('region', { name: /Chain stages/ });
    expect(within(region).getByRole('button', { name: 'Coal production to Construction materials: cost share 35.4%, demand share 3.6%' })).toBeInTheDocument();
    expect(within(region).queryByRole('button', { name: /expected, not measured/ })).toBeNull();
    expect(region.querySelectorAll('svg path[stroke-dasharray]')).toHaveLength(0);
    const solid = Array.from(region.querySelectorAll('svg g path')) as SVGPathElement[];
    expect(solid).toHaveLength(4);
    const [cost, demand] = solid.slice(0, 2).map((p) => Number(p.getAttribute('stroke-width')));
    expect(cost).toBeGreaterThan(demand);
  });

  it('opens the real link’s card with its sourced weights, and "not yet available" wherever a package is missing, nothing invented', async () => {
    renderIndex('?connections=on&link=coal-to-cement');
    const card = await screen.findByRole('region', { name: /Coal production to Construction materials: Coal burnt as kiln fuel/ });
    expect(card).toHaveTextContent('Disclosed: 35.4% of cement cost of revenue, FY25. Source: PT Semen Indonesia');
    expect(card).toHaveTextContent('3.6% of coal sales volume, FY25. Source: Direktorat Jenderal Mineral dan Batubara');
    expect(card).toHaveTextContent(seed.caveat!);
    expect(card).toHaveTextContent('Worked here: not yet available');
    expect(within(card).getAllByText('not yet measured')).toHaveLength(2);
    const split = within(card).getByRole('table');
    expect(within(split).getAllByText(COPY.notAvailable)).toHaveLength(5);
    expect(split.textContent).not.toMatch(/\d/);
    expect(within(card).getByRole('status')).toHaveTextContent(
      'Not worked: no upstream company is published; no downstream company is published with volumes',
    );
    expect(within(card).getByRole('status')).not.toHaveTextContent(/not measured/);
  });

  it('opens the measured link’s card with the worked cost share, the split and the what-if', async () => {
    const user = userEvent.setup();
    renderIndex('?connections=on&link=syn-coal-to-cement');
    const card = await screen.findByRole('region', { name: /Synthetic coal mining \(SYNTHETIC\) to Synthetic cement/ });
    expect(card).toHaveTextContent('Disclosed: 12.0% of cement cost of revenue, FY25');
    expect(card).toHaveTextContent('Worked here: 17.2% (SCOA revenue per tonne × intensity ÷ SCEM cost of revenue per tonne, FY 25)');
    expect(card).toHaveTextContent('Difference from the disclosed figure: +5.2 pp');
    expect(card).toHaveTextContent('60.0%, range 40.0% to 80.0%, over 8 quarters');
    const split = within(card).getByRole('table');
    expect(split).toHaveTextContent('Cement price per tonne877.1');
    expect(split).toHaveTextContent('Coal burnt or used: coal price per tonne × intensity78.2');
    expect(split).toHaveTextContent('Cement producer\'s margin per tonne355.0');
    await user.type(within(card).getByLabelText('Change in the coal price, %'), '10');
    expect(within(card).getByRole('status')).toHaveTextContent('Cement gross margin, SCEM: (0.6 pp)');
  });

  it('puts "Feeds X" and "Fed by Y" on the sub-industries, opening the card', async () => {
    const user = userEvent.setup();
    renderIndex('?connections=on');
    const coal = (await screen.findByRole('heading', { level: 3, name: /Synthetic coal mining/ })).closest('div[id]') as HTMLElement;
    const cement = screen.getByRole('heading', { level: 3, name: /Synthetic cement/ }).closest('div[id]') as HTMLElement;
    expect(within(cement).getByRole('button', { name: 'Fed by Synthetic coal mining (SYNTHETIC)' })).toBeInTheDocument();
    await user.click(within(coal).getByRole('button', { name: 'Feeds Synthetic cement (SYNTHETIC)' }));
    expect(screen.getByRole('region', { name: /Synthetic coal mining \(SYNTHETIC\) to Synthetic cement/ })).toBeInTheDocument();
  });
});
