/**
 * Chain view, commit 5 (PROMPT-site §3.4, PRD D-C2): the company-level chain,
 * derived from the link register and never written by hand, and the model
 * page's "Along the chain" section. SYNTHETIC fixtures only.
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
import { companyChain } from '@/lib/finance-in-action/companyChain';
import { linksFrom, linksTo } from '@/lib/finance-in-action/links';
import { previewRegistry } from '@/lib/finance-in-action/preview';

const at = (ticker: string) =>
  renderFiaPage(<FiaModelRoute />, { path: '/finance/finance-in-action/:modelSlug', url: `/finance/finance-in-action/${ticker}` });
const reg = previewRegistry();
const pkg = (t: string) => reg.company(t)!.pkg!;
const tickers = (list: { ticker: string }[]) => list.map((c) => c.ticker).sort();

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
});

describe('the company-level chain, derived from the register', () => {
  it('puts upstream the companies at the from end of every link into the sub-industry, and keeps the energy layer apart', () => {
    const chain = companyChain(reg, pkg('SCEM'));
    expect(chain.upstream.map((n) => n.link.id)).toEqual(linksTo(reg, 'SYN-CEM').filter((l) => l.from === 'SYN-COAL').map((l) => l.id));
    expect(tickers(chain.upstream[0].companies)).toEqual(['SCOA', 'XCOA']);
    expect(chain.upstream[0].measured).toBe(true);
    expect(chain.layers.map((n) => [n.link.id, n.code, n.position?.id, n.measured])).toEqual([['syn-power-to-cement', 'SYN-POWER', 'band-energy', false]]);
    expect(chain.layers[0].companies).toEqual([]);
    expect(chain.downstream).toEqual([]);
    expect(tickers(chain.sameSubIndustry)).toEqual(['XCEM']);
    expect(chain.band).toBeNull();
  });

  it('puts downstream the companies at the to end of every link out of the sub-industry', () => {
    const chain = companyChain(reg, pkg('SCOA'));
    expect(chain.downstream.map((n) => n.link.id)).toEqual(linksFrom(reg, 'SYN-COAL').map((l) => l.id));
    expect(tickers(chain.downstream[0].companies)).toEqual(['SCEM', 'XCEM']);
    expect(chain.upstream).toEqual([]);
    expect(chain.layers).toEqual([]);
  });

  it('names the layer, and where it runs, for a company that sits on a band', () => {
    const onBand = JSON.parse(JSON.stringify(pkg('SCOA')));
    onBand.meta.subIndustry = 'SYN-POWER';
    onBand.meta.chainStage = 'band-energy';
    const chain = companyChain(reg, onBand);
    expect(chain.band?.id).toBe('band-energy');
    expect(chain.band?.span).toMatch(/an input into every stage/);
    // Its link out runs to a stage, so it is downstream, not a layer.
    expect(chain.downstream.map((n) => n.code)).toEqual(['SYN-CEM']);
  });
});

describe('"Along the chain" on the model page', () => {
  it('shows upstream companies with status, a link to each modelled one, and the link state in words', async () => {
    at('scem');
    const up = await screen.findByRole('group', { name: COPY.upstream });
    expect(within(up).getByText(/Fed by Synthetic coal mining/)).toBeInTheDocument();
    expect(within(up).getByText('Coal burnt as kiln fuel (SYNTHETIC)')).toBeInTheDocument();
    expect(within(up).getByText(COPY.measured)).toBeInTheDocument();
    expect(within(up).getByRole('link', { name: /SCOA/ })).toHaveAttribute('href', '/finance/finance-in-action/scoa');
    expect(within(up).getByRole('link', { name: /XCOA/ })).toHaveAttribute('href', '/finance/finance-in-action/xcoa');
    const layers = screen.getByRole('group', { name: COPY.layersGroup });
    expect(within(layers).getByText(COPY.expectedNotMeasured)).toBeInTheDocument();
    expect(within(layers).getByText(COPY.noCompanies)).toBeInTheDocument();
    const here = screen.getByRole('group', { name: COPY.thisStage });
    expect(here).toHaveTextContent('XCEM');
    expect(screen.getByRole('group', { name: COPY.downstream })).toHaveTextContent(COPY.noDownstream);
  });

  it('says so when a group is empty', async () => {
    at('scoa');
    const up = await screen.findByRole('group', { name: COPY.upstream });
    expect(up).toHaveTextContent(COPY.noUpstream);
    expect(within(screen.getByRole('group', { name: COPY.downstream })).getByRole('link', { name: /SCEM/ })).toBeInTheDocument();
  });

  it('opens the existing link card for a link, and closes it', async () => {
    at('scem');
    const up = await screen.findByRole('group', { name: COPY.upstream });
    await userEvent.click(within(up).getByRole('button', { name: /Open the link card/ }));
    const card = screen.getByRole('heading', { level: 3, name: /Synthetic coal mining \(SYNTHETIC\) to Synthetic cement \(SYNTHETIC\)/ });
    expect(card).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close the link card' }));
    expect(screen.queryByRole('button', { name: 'Close the link card' })).toBeNull();
  });
});
