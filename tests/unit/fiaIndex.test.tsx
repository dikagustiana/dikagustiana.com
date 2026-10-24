/**
 * Finance in Action v3.1, Commit 3: the index with the lens off (brief §5.1),
 * and the route left exactly as it was with the preview flag unset
 * (constraint 3).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));

import App from '@/App';
import FiaIndexPage from '@/pages/finance-in-action/FiaIndexPage';
import { CHAIN_STAGES, SPANNING_LAYERS, positionAnchor } from '@/lib/finance-in-action/chain';
import { COPY } from '@/lib/finance-in-action/copy';
import { STATUSES } from '@/lib/finance-in-action/constants';
import { STAGES } from '@/data/industryChain';

const INDEX = '/finance/finance-in-action';
const renderIndex = (query = '') => renderFiaPage(<FiaIndexPage />, { path: INDEX, url: `${INDEX}${query}` });

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
});

describe('with the preview flag unset', () => {
  it('renders the existing Finance in Action index, unchanged, with nothing synthetic', async () => {
    window.history.pushState({}, '', INDEX);
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Finance in Action' })).toBeInTheDocument();
    expect(screen.getByText('Institutional-grade financial models for CFO and board-level capital decisions.')).toBeInTheDocument();
    expect(await screen.findByText('No models configured yet.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/SYNTHETIC|XCOA|Example Coal/);
    expect(screen.queryByText(COPY.title)).not.toBeInTheDocument();
  });
});

describe('the preview index, lens off', () => {
  it('carries the draft H1 and subhead, and the SYNTHETIC label', async () => {
    renderIndex();
    expect(await screen.findByRole('heading', { level: 1, name: COPY.title })).toBeInTheDocument();
    expect(screen.getByText(COPY.subhead)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('SYNTHETIC');
  });

  it('draws one card per chain-map stage, in the map’s order, then the two spanning layers', async () => {
    renderIndex();
    const region = await screen.findByRole('region', { name: /Chain stages/ });
    const cards = within(region).getAllByRole('listitem');
    expect(cards.map((li) => within(li).getByRole('link').firstChild?.textContent)).toEqual(CHAIN_STAGES.map((s) => s.label));
    expect(CHAIN_STAGES).toHaveLength(STAGES.length);
    for (const layer of SPANNING_LAYERS) {
      // The stage pills (chain view §3.1) name the layers too; the strip's band is the link outside them.
      const band = screen.getAllByRole('link', { name: new RegExp(layer.label) }).filter((a) => !a.closest('nav'));
      expect(band).toHaveLength(1);
      expect(band[0]).toHaveAttribute('href', `#${positionAnchor(layer.id)}`);
    }
    expect(SPANNING_LAYERS.map((l) => l.label)).toEqual(['Energy', 'Logistics and warehousing']);
  });

  it('counts sub-industries and companies on each stage card', async () => {
    renderIndex();
    const region = await screen.findByRole('region', { name: /Chain stages/ });
    const extraction = within(region).getByRole('link', { name: /Geological extraction/ });
    expect(extraction).toHaveTextContent('2 sub-industries, 6 companies'); // A121: PTBA, ITMG, INDY, ADRO planned; the two SYNTHETIC coal fixtures
    expect(extraction).toHaveTextContent('2 published');
    expect(within(region).getByRole('link', { name: /Recovery/ })).toHaveTextContent(COPY.noModels);
  });

  it('shows the Connections switch off, the chain map link and the status legend with glyph and word', async () => {
    renderIndex();
    const toggle = await screen.findByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(COPY.connectionsOff)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.openChainMap })).toHaveAttribute('href', '/?distance=finance');
    const legend = screen.getByRole('group', { name: COPY.statusLegend });
    for (const s of STATUSES) expect(within(legend).getByText(s.label)).toBeInTheDocument();
    expect(legend.querySelectorAll('svg')).toHaveLength(STATUSES.length);
  });

  it('gives every stage a section, and an empty stage says so', async () => {
    renderIndex();
    for (const s of CHAIN_STAGES) expect(await screen.findByRole('heading', { level: 2, name: s.label })).toBeInTheDocument();
    const recovery = document.getElementById('stage-stage-recovery')!;
    expect(recovery).toHaveTextContent(COPY.noModels);
  });

  it('lists each sub-industry’s companies with ticker, name, status, quarter, depth and conditions', async () => {
    renderIndex();
    const syn = await screen.findByRole('heading', { level: 3, name: /Synthetic coal mining/ });
    const block = syn.closest('div[id]') as HTMLElement;
    expect(block.id).toBe('sub-SYN-COAL');
    const xcoa = within(block).getByText('XCOA').closest('li')!;
    expect(within(xcoa).getByRole('link', { name: /Example Coal Co/ })).toHaveAttribute('href', '/finance/finance-in-action/xcoa');
    expect(xcoa).toHaveTextContent('Published');
    expect(xcoa).toHaveTextContent('As of Q4 25');
    expect(xcoa).toHaveTextContent('Executive');
    expect(xcoa).toHaveTextContent('SYNTHETIC');
    expect(within(xcoa).getByRole('link', { name: /Capital in Motion 03/ })).toHaveAttribute('href', '/finance/finance-in-action/capital-in-motion/commodity-windfall');

    const ptba = screen.getByText('PTBA').closest('li')!;
    expect(ptba).toHaveTextContent('Bukit Asam');
    expect(ptba).toHaveTextContent('Not started');
    expect(within(ptba).queryByRole('link', { name: /Bukit Asam/ })).toBeNull();
    expect(ptba).not.toHaveTextContent('SYNTHETIC');
  });

  it('filters by ticker or name', async () => {
    const user = userEvent.setup();
    renderIndex();
    await user.type(await screen.findByLabelText(COPY.findCompany), 'sample coal');
    expect(screen.getByText('SCOA')).toBeInTheDocument();
    expect(screen.queryByText('XCOA')).toBeNull();
    expect(screen.queryByText('PTBA')).toBeNull();
    expect(screen.getAllByText(COPY.noMatches).length).toBeGreaterThan(0);
  });

  it('filters by Capital in Motion condition, from the address', async () => {
    renderIndex('?condition=6');
    await screen.findByRole('heading', { level: 1, name: COPY.title });
    expect(screen.getByText('XCEM')).toBeInTheDocument();
    expect(screen.getByText('SMGR')).toBeInTheDocument();
    for (const t of ['XCOA', 'SCOA', 'SCEM', 'PTBA', 'ITMG', 'INTP']) expect(screen.queryByText(t)).toBeNull();
  });
});
