/**
 * Chain view, commit 3 (PROMPT-site §3.1): the index's stage pills and the
 * stage anchors. Every stage and layer in chain order with its companies on
 * the slate and how many are published; a pill goes to its section and puts
 * the anchor in the address; every section's id comes from one helper.
 * SYNTHETIC fixtures only.
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
import { STAGE_PILLS_LABEL } from '@/components/finance-in-action/viewer/StagePills';
import { CHAIN_POSITIONS, positionAnchor } from '@/lib/finance-in-action/chain';
import { pillCountLine, positionCounts } from '@/lib/finance-in-action/counts';
import { previewRegistry } from '@/lib/finance-in-action/preview';
import { positionPath } from '@/lib/finance-in-action/routes';

const INDEX = '/finance/finance-in-action';
const renderIndex = (url = INDEX) => renderFiaPage(<FiaIndexPage />, { path: INDEX, url });
const reg = previewRegistry();

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
});

describe('the stage anchors', () => {
  it('are stage-<stage id> for a stage and band-<band id> for a layer, from one helper', () => {
    expect(positionAnchor('stage-extraction')).toBe('stage-stage-extraction');
    expect(positionAnchor('band-energy')).toBe('band-band-energy');
    expect(positionPath('stage-processing')).toBe('/finance/finance-in-action#stage-stage-processing');
  });

  it('give every stage and layer a section on the index with that id', async () => {
    renderIndex();
    await screen.findByRole('navigation', { name: STAGE_PILLS_LABEL });
    for (const p of CHAIN_POSITIONS) {
      const section = document.getElementById(positionAnchor(p.id));
      expect(section, p.id).not.toBeNull();
      expect(section!.tagName).toBe('SECTION');
    }
  });
});

describe('the stage pills', () => {
  it('list every stage and layer in chain order, each with its companies and how many are published', async () => {
    renderIndex();
    const nav = await screen.findByRole('navigation', { name: STAGE_PILLS_LABEL });
    const links = within(nav).getAllByRole('link');
    const counts = positionCounts(reg);
    expect(links).toHaveLength(CHAIN_POSITIONS.length);
    links.forEach((a, i) => {
      const p = CHAIN_POSITIONS[i];
      expect(a).toHaveAttribute('href', `#${positionAnchor(p.id)}`);
      expect(a).toHaveTextContent(p.label);
      expect(a).toHaveTextContent(pillCountLine(counts.get(p.id)!));
    });
    // The four real coal companies and the factory's six (B146, A111, A132) are planned; the two synthetic miners are published.
    expect(within(nav).getByRole('link', { name: /Geological extraction/ })).toHaveTextContent(/12 · 2 published/);
  });

  it('go to the section and mark the pill as the current location', async () => {
    renderIndex();
    const nav = await screen.findByRole('navigation', { name: STAGE_PILLS_LABEL });
    const pill = within(nav).getByRole('link', { name: /Primary processing/ });
    expect(pill).not.toHaveAttribute('aria-current');
    await userEvent.click(pill);
    expect(within(nav).getByRole('link', { name: /Primary processing/ })).toHaveAttribute('aria-current', 'location');
    expect(within(nav).getAllByRole('link').filter((a) => a.getAttribute('aria-current'))).toHaveLength(1);
  });

  it('mark the pill the address names on arrival', async () => {
    renderIndex(`${INDEX}#band-band-energy`);
    const nav = await screen.findByRole('navigation', { name: STAGE_PILLS_LABEL });
    expect(within(nav).getByRole('link', { name: /Energy/ })).toHaveAttribute('aria-current', 'location');
  });
});
