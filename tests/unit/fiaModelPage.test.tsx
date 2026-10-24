/**
 * Finance in Action v3.1, Commit 4: the model page with the lens off, without
 * unit economics (brief §5.3).
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
import { CELL_KINDS, PROVENANCES } from '@/lib/finance-in-action/constants';
import { NUMBER_CONVENTION } from '@/lib/finance-in-action/format';
import { getConditionByNumber } from '@/data/capitalConditions';
import { previewRegistry } from '@/lib/finance-in-action/preview';

const at = (ticker: string, query = '') =>
  renderFiaPage(<FiaModelRoute />, { path: '/finance/finance-in-action/:modelSlug', url: `/finance/finance-in-action/${ticker}${query}` });

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult(null));
});

describe('the model page header', () => {
  it('names the company and ticker, its sub-industry, pair, quarters and status', async () => {
    at('xcoa');
    const h1 = await screen.findByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Example Coal Co (SYNTHETIC) XCOA');
    for (const l of screen.getAllByRole('link', { name: 'Synthetic coal mining (SYNTHETIC)' })) {
      expect(l).toHaveAttribute('href', '/finance/finance-in-action#sub-SYN-COAL');
    }
    // The pair is a company tab (sheet-first PRD R1.2), so the bar does not name it again.
    const tabs = screen.getByRole('navigation', { name: 'Companies in this stage' });
    expect(within(tabs).getByRole('link', { name: /^SCOA.*Sample Coal Co \(SYNTHETIC\)$/ })).toHaveAttribute('href', '/finance/finance-in-action/scoa');
    expect(screen.queryByText(COPY.pairedWith)).toBeNull();
    // The quarters, the filings and the currency in one sentence (sheet-first PRD R1.3).
    const facts = document.querySelector('[data-fia-facts]')!;
    expect(facts).toHaveTextContent(/^\d+ filings, Q1 24 to Q4 25; full statements to Q4 25; reported in rupiah\.$/);
    expect(screen.getAllByText('Published').length).toBeGreaterThan(0);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('says "not yet modelled" for a pair company without a package', async () => {
    at('xcem');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText(`YCEM, ${COPY.notYetModelled}`)).toBeInTheDocument();
    // The company bar's pair and the company tabs (sheet-first PRD R1.2) both link to it.
    for (const l of screen.getAllByRole('link', { name: /Sample Cement Co/ })) expect(l).toHaveAttribute('href', '/finance/finance-in-action/scem');
  });

  it('carries the breadcrumb Finance in Action / stage / sub-industry', async () => {
    at('xcoa');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('link', { name: 'Finance in Action' })).toHaveAttribute('href', '/finance/finance-in-action');
    expect(screen.getByRole('link', { name: 'Geological extraction' })).toHaveAttribute('href', '/finance/finance-in-action#stage-stage-extraction');
  });

  it('states the provenance in one sentence when the figures are not from filings', async () => {
    at('xcoa');
    await screen.findByRole('heading', { level: 1 });
    const synthetic = PROVENANCES.find((p) => p.id === 'synthetic')!.note;
    expect(screen.getByText(synthetic)).toBeInTheDocument();
  });

  it('falls through to the existing page for a slug with no package', async () => {
    at('ptba');
    expect((await screen.findAllByText(/not found|doesn.t exist|404/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/SYNTHETIC/)).toBeNull();
  });
});

describe('How the business makes money', () => {
  it('shows every tree node for the latest full quarter, with the year-ago quarter beside it', async () => {
    at('xcoa');
    const section = (await screen.findByRole('heading', { level: 2, name: COPY.howItMakesMoney })).closest('section')!;
    const pkg = previewRegistry().company('XCOA')!.pkg!;
    const items = within(section).getAllByRole('listitem');
    expect(items).toHaveLength(pkg.driverTree.nodes.length);
    expect(items[0]).toHaveTextContent('Tonnes sold');
    expect(items[0]).toHaveTextContent('2.80');
    expect(items[0]).toHaveTextContent('Q4 24: 2.40');
  });

  it('puts "Feeds X" on the node a register link leaves from', async () => {
    at('xcoa');
    const link = await screen.findByRole('link', { name: 'Feeds Synthetic cement (SYNTHETIC)' });
    expect(link.getAttribute('href')).toContain('link=syn-coal-to-cement');
    expect(link.closest('li')).toHaveTextContent('Revenue');
  });
});

describe('the peer band', () => {
  it('draws the band from the two published companies, with this company and its pair', async () => {
    at('xcoa');
    const section = (await screen.findByRole('heading', { level: 2, name: /Where XCOA sits/ })).closest('section')!;
    expect(section).toHaveTextContent('range of the 2 published companies');
    expect(section).toHaveTextContent('the dashed marker SCOA');
    expect(within(section).getAllByText('XCOA').length).toBeGreaterThan(0);
  });

  it('shows the empty state with fewer than two published companies (constraint 11)', async () => {
    at('scem');
    const section = (await screen.findByRole('heading', { level: 2, name: /Where SCEM sits/ })).closest('section')!;
    expect(section).toHaveTextContent(COPY.peerEmpty);
    expect(section.querySelector('[aria-hidden="true"].relative')).toBeNull();
  });
});

describe('Why this link matters', () => {
  it('quotes the condition and its rule from section 05, the model’s line, and the chain map link', async () => {
    at('xcoa');
    const condition = getConditionByNumber(3)!;
    const section = (await screen.findByRole('heading', { level: 2, name: COPY.whyThisLinkMatters })).closest('section')!;
    expect(within(section).getByRole('link', { name: `Capital in Motion 03: ${condition.title}` })).toHaveAttribute('href', `/finance/capital-allocation/${condition.id}`);
    expect(section).toHaveTextContent(condition.rule);
    expect(section).toHaveTextContent('This model supplies the per-tonne economics');
    expect(within(section).getByRole('link', { name: /Show coal on the chain map/ })).toHaveAttribute('href', '/?distance=finance&node=extraction');
  });
});

describe('The model grid and the inspector', () => {
  it('has the three sheets and Checks as tabs, Model active, the cell legend in words and the convention once', async () => {
    at('xcoa');
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Model', 'Reported', 'Assumptions', 'Checks']);
    expect(tabs.filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.textContent)).toEqual(['Model']);
    const legend = screen.getByRole('list', { name: 'Cell legend' });
    for (const k of CELL_KINDS) {
      expect(legend).toHaveTextContent(COPY.legend[k.id]);
      expect(legend).toHaveTextContent(k.means);
    }
    expect(legend).toHaveTextContent('Not disclosed');
    expect(screen.getAllByText((_, el) => el?.tagName === 'P' && !!el.textContent?.includes(NUMBER_CONVENTION))).toHaveLength(1);
  });

  it('shades the financial year and marks forecast headers in words', async () => {
    at('xcoa');
    const grid = await screen.findByRole('grid');
    const fy = within(grid).getByRole('columnheader', { name: /FY 25/ });
    expect(fy.className).toContain('bg-muted');
    expect(within(grid).getByRole('columnheader', { name: /Q1 26E forecast/ })).toBeInTheDocument();
  });

  it('opens the inspector on a formula cell, in words and with values', async () => {
    const user = userEvent.setup();
    at('xcoa');
    await user.click(await screen.findByRole('button', { name: /^Revenue, FY 25: 7,270, Formula/ }));
    const inspector = screen.getByRole('complementary', { name: 'Inspector' });
    expect(inspector).toHaveTextContent('Revenue, FY 25');
    expect(inspector).toHaveTextContent('the sum of Revenue, Q1 25 to Q4 25');
    expect(inspector).toHaveTextContent('= the sum of 1,540, 1,680, 1,950, 2,100');
    // The sources are found through the graph, back to the reported quarters.
    expect(inspector).toHaveTextContent(
      'Example Coal Co (SYNTHETIC), SYNTHETIC interim financial statements Q4 25, Q4 25, note 24, page 12, XBRL concept syn:Revenue',
    );
  });

  it('shows the tie-out of a sourced cell, agreeing and differing', async () => {
    const user = userEvent.setup();
    at('xcoa');
    await user.click(await screen.findByRole('tab', { name: 'Reported' }));
    await user.click(screen.getByRole('button', { name: /^Revenue, FY 25: 7,270, Sourced/ }));
    const inspector = screen.getByRole('complementary', { name: 'Inspector' });
    expect(inspector).toHaveTextContent('Agrees.');
    await user.click(screen.getByRole('button', { name: /^Cost of revenue, FY 25: .*Sourced/ }));
    expect(inspector).toHaveTextContent('Differs.');
    expect(inspector).toHaveTextContent('Difference 2.');
  });

  it('explains a missing cell instead of inventing one', async () => {
    const user = userEvent.setup();
    at('xcoa');
    await user.click(await screen.findByRole('button', { name: /^Strip ratio, Q1 24: —, Missing/ }));
    expect(screen.getByRole('complementary', { name: 'Inspector' })).toHaveTextContent('Production was not disclosed');
  });

  it('moves with the arrow keys from one tab stop', async () => {
    const user = userEvent.setup();
    at('xcoa');
    const first = await screen.findByRole('button', { name: /^Coal sales volume, Q1 24/ });
    expect(first).toHaveAttribute('tabindex', '0');
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /^Coal sales volume, Q2 24/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /^Realised price per tonne, Q2 24/ })).toHaveFocus();
  });

  it('records the workpaper, keeping a pass with an escalation apart', async () => {
    at('xcoa');
    const section = (await screen.findByRole('heading', { level: 2, name: COPY.workpaper })).closest('section')!;
    expect(section).toHaveTextContent('XCOA-2025Q4-r1-SYNTHETIC');
    expect(section).toHaveTextContent('Passed with an open escalation');
    expect(section).toHaveTextContent('Owner (SYNTHETIC), 2026-01-15');
  });
});
