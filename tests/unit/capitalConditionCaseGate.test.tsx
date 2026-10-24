/**
 * The other half of the SHOW_CASE_COMPANIES gate.
 *
 * capitalInMotionRoutes.test.tsx proves the shipped state (flag false: no case
 * company anywhere). This opens the flag through a module mock to prove the
 * clause comes back exactly as the original copy had it, so flipping the
 * constant after verification is the whole change. Even open, the company
 * belongs in the body only: the SEO tags carry the title and tension.
 *
 * Values come from the data module at run time, so no company name is written
 * in this file.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { makeQueryResult } from './helpers/renderWithProviders';

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
vi.mock('@/data/capitalConditions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/capitalConditions')>()),
  SHOW_CASE_COMPANIES: true,
}));

import App from '@/App';
import { CONDITIONS, getLayerLabel } from '@/data/capitalConditions';

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
});

describe('SHOW_CASE_COMPANIES = true', () => {
  it('restores the "observed in the case of" clause in The Situation', async () => {
    const c = CONDITIONS[0];
    window.history.pushState({}, '', `/finance/finance-in-action/capital-in-motion/${c.id}`);
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: c.title });

    const situation = screen.getByRole('heading', { level: 2, name: 'The Situation' }).nextElementSibling;
    const layer = getLayerLabel(c.layer).toLowerCase();
    const article = /^[aeiou]/.test(layer) ? 'an' : 'a';
    expect(situation?.textContent?.replace(/\s+/g, ' ')).toBe(
      `This is ${article} ${layer} condition observed in the case of ${c.caseCompany}.`,
    );
  });

  it('still keeps the company out of the SEO tags', async () => {
    const c = CONDITIONS[0];
    window.history.pushState({}, '', `/finance/finance-in-action/capital-in-motion/${c.id}`);
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: c.title });
    await waitFor(() => expect(document.title).toContain(c.title));

    const head = document.head.innerHTML.toLowerCase();
    expect(CONDITIONS.some((x) => head.includes(x.caseCompany.toLowerCase()))).toBe(false);
  });
});
