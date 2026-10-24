/**
 * "Companies exhibiting this condition" on the Capital in Motion pages
 * (docs/prd/finance-restructure §1 C, §3, Acceptance): fed by the published
 * packages' conditionIds. The published read is replaced by the four coal
 * packages fia.model_packages returned on 2026-10-24; nothing reaches a network.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import packages from '../e2e/fixtures/fia-published-coal.packages.json';
import { renderFiaPage } from './helpers/renderFiaPage';
import { makeQueryResult } from './helpers/renderWithProviders';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => makeQueryResult([]),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
  },
}));
vi.mock('@/lib/finance-in-action/published', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/finance-in-action/published')>();
  return { ...real, fetchPublishedPackages: async () => (packages as { package: unknown }[]).map((r) => r.package) };
});

import CapitalConditionDetail from '@/pages/CapitalConditionDetail';
import { COMPANIES_EXHIBITING, ConditionCompanies } from '@/components/finance-in-action/viewer/ConditionCompanies';
import { COPY } from '@/lib/finance-in-action/copy';
import { CONDITIONS } from '@/data/capitalConditions';

/**
 * The page mounts the block only in a build with the viewer (__FIA_LIVE__ or
 * __FIA_PREVIEW__); vitest builds with both false, so the block is rendered
 * here as the page renders it, under the condition's own address.
 */
const at = (slug: string) =>
  renderFiaPage(<ConditionCompanies number={CONDITIONS.find((c) => c.id === slug)!.number} />, {
    path: '/finance/finance-in-action/capital-in-motion/:conditionSlug',
    url: `/finance/finance-in-action/capital-in-motion/${slug}`,
  });

const block = async () => {
  const h = await screen.findByRole('heading', { level: 2, name: COMPANIES_EXHIBITING });
  return h.closest('section') as HTMLElement;
};

describe('the condition page in a build without the viewer', () => {
  it('draws no company block (the viewer is compiled out of such a build)', async () => {
    renderFiaPage(<CapitalConditionDetail />, {
      path: '/finance/finance-in-action/capital-in-motion/:conditionSlug',
      url: '/finance/finance-in-action/capital-in-motion/commodity-windfall',
    });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('heading', { name: COMPANIES_EXHIBITING })).toBeNull();
  });
});

describe('Companies exhibiting this condition', () => {
  it('03 Commodity Windfall lists the four coal companies, each card to its model at the Conditions line', async () => {
    at('commodity-windfall');
    const section = await block();
    const cards = await within(section).findAllByRole('link');
    expect(cards.map((a) => a.querySelector('span')?.textContent)).toEqual(['ADRO', 'INDY', 'ITMG', 'PTBA']);
    expect(cards[0]).toHaveAttribute('href', '/finance/finance-in-action/adro#fia-conditions');
    expect(cards[0]).toHaveTextContent('Alamtri Resources Indonesia');
    expect(cards[0]).toHaveTextContent('Coal production');
    expect(cards[0]).toHaveTextContent(/As of Q2 26/);
  });

  it('09 Strategic Downstreaming lists ADRO alone', async () => {
    at('strategic-downstreaming');
    const nine = await block();
    expect((await within(nine).findAllByRole('link')).map((a) => a.querySelector('span')?.textContent)).toEqual(['ADRO']);
  });

  it('a condition no published company is tagged with says so', async () => {
    at('structural-sequencing');
    const section = await block();
    expect(await within(section).findByText(COPY.noCompanyTagged)).toBeInTheDocument();
    expect(within(section).queryByRole('link')).toBeNull();
  });
});
