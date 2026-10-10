/**
 * Capital in Motion lives at /finance/capital-allocation.
 *
 * It started life at /finance/finance-in-motion and /finance/capital-in-motion/:slug,
 * while the Capital Allocation card on /finance linked to an empty track index.
 * These render the REAL route table (App.tsx), not a copy of it, so a rename of a
 * path in either direction fails here.
 *
 * Supabase is mocked at the client module: nothing in this file can reach a
 * network, let alone production.
 *
 * Each case is a causal claim about a named company that has not passed
 * verification, so no `caseCompany` value may reach the page or its <head>
 * while SHOW_CASE_COMPANIES is false. The assertions read the values from the
 * data module and compare booleans, so neither a fixture nor a failure message
 * carries a company name.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { matchRoutes } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

import App from '@/App';
import { CONDITIONS, CONDITION_ORDER, SHOW_CASE_COMPANIES } from '@/data/capitalConditions';

const INDEX = '/finance/capital-allocation';
const detail = (id: string) => `${INDEX}/${id}`;

/** Condition ids in the order the index lists them (and prev/next walks them). */
const ORDERED = CONDITION_ORDER.map((n) => CONDITIONS.find((c) => c.number === n)!);

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

/** Wait for the lazy page to resolve to its h1. */
const h1 = (name: string) => screen.findByRole('heading', { level: 1, name });

/** The whole visible page plus everything Helmet put in <head>, lowercased. */
const surface = () => (document.body.textContent + document.head.innerHTML).toLowerCase();
const leaksAnyCaseCompany = () => {
  const text = surface();
  return CONDITIONS.some((c) => text.includes(c.caseCompany.toLowerCase()));
};

beforeEach(() => {
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeQueryResult([]));
});

describe('Capital in Motion at /finance/capital-allocation', () => {
  it('ships 21 conditions with the case gate closed', () => {
    expect(CONDITIONS).toHaveLength(21);
    expect(CONDITION_ORDER).toHaveLength(21);
    expect(new Set(CONDITIONS.map((c) => c.id)).size).toBe(21);
    expect(SHOW_CASE_COMPANIES).toBe(false);
  });

  it('the index shows all 21 condition cards, in layer order', async () => {
    renderAt(INDEX);
    await h1('Capital in Motion');

    const main = screen.getByRole('main');
    const titles = [...main.querySelectorAll('button h3')].map((h) => h.textContent);
    expect(titles).toEqual(ORDERED.map((c) => c.title));
  });

  it('a card opens its condition at the new address', async () => {
    renderAt(INDEX);
    await h1('Capital in Motion');

    const first = ORDERED[0];
    await userEvent.click(within(screen.getByRole('main')).getByRole('heading', { level: 3, name: first.title }));

    expect(await h1(first.title)).toBeInTheDocument();
    expect(window.location.pathname).toBe(detail(first.id));
  });

  it('a detail slug renders its own title, SEO title and links back to the index', async () => {
    const c = ORDERED[3];
    renderAt(detail(c.id));
    expect(await h1(c.title)).toBeInTheDocument();

    await waitFor(() => expect(document.title).toContain(c.title));
    expect(screen.getByRole('link', { name: /back to capital in motion/i })).toHaveAttribute('href', INDEX);
    // The breadcrumb's "Capital in Motion" crumb (the back link is named "Back to …").
    const crumbs = screen.getAllByRole('link', { name: 'Capital in Motion' });
    expect(crumbs.map((a) => a.getAttribute('href'))).toContain(INDEX);
  });

  it('previous and next stay under /finance/capital-allocation', async () => {
    const [, second, third] = ORDERED;
    renderAt(detail(second.id));
    await h1(second.title);

    // Scoped to the article: the site header has its own "Next …" button.
    const article = within(screen.getByRole('article'));
    await userEvent.click(article.getByRole('button', { name: 'Next' }));
    expect(await h1(third.title)).toBeInTheDocument();
    expect(window.location.pathname).toBe(detail(third.id));

    await userEvent.click(within(screen.getByRole('article')).getByRole('button', { name: 'Previous' }));
    expect(await h1(second.title)).toBeInTheDocument();
    expect(window.location.pathname).toBe(detail(second.id));
  });

  it('an unknown slug says so instead of rendering a track page', async () => {
    renderAt(detail('no-such-condition'));
    expect(await screen.findByText('Condition not found.')).toBeInTheDocument();
  });
});

describe('the top of the index (owner instruction, 10 October 2026)', () => {
  it('goes from the h1 and its subtitle straight to the conditions: no premise block', async () => {
    renderAt(INDEX);
    const header = (await h1('Capital in Motion')).parentElement!;
    expect(header.querySelector('p')?.textContent).toBe('Twenty-one conditions I wish I understood earlier.');

    // The block after the header is the list itself, opening on the first
    // condition; nothing is mounted between them until the owner writes it.
    expect(header.nextElementSibling?.querySelector('button h3')?.textContent).toBe(ORDERED[0].title);
    expect(within(screen.getByRole('main')).queryByText(/^premise$/i)).not.toBeInTheDocument();
  });
});

describe('legacy URLs still arrive', () => {
  it('/finance/finance-in-motion redirects to the index', async () => {
    renderAt('/finance/finance-in-motion');
    expect(await h1('Capital in Motion')).toBeInTheDocument();
    expect(window.location.pathname).toBe(INDEX);
  });

  it('/finance/capital-in-motion/:slug redirects and keeps the slug', async () => {
    const c = ORDERED[5];
    renderAt(`/finance/capital-in-motion/${c.id}`);
    expect(await h1(c.title)).toBeInTheDocument();
    // Not the literal ":conditionSlug", and not the bare index.
    expect(window.location.pathname).toBe(detail(c.id));
  });
});

describe('route ranking', () => {
  // Parsed from App.tsx the way navConfig.test does, then ranked by the real
  // router. The dynamic /finance/:track routes must not swallow the static ones.
  const APP = readFileSync(join(__dirname, '../../src/App.tsx'), 'utf8');
  const routes = [...APP.matchAll(/<Route path="([^"]+)"/g)].map((m) => ({ path: m[1] }));
  const winner = (url: string) => {
    const m = matchRoutes(routes, url);
    return m?.[m.length - 1].route.path;
  };

  it('static capital-allocation routes outrank /finance/:track and /finance/:track/:slug', () => {
    expect(winner(INDEX)).toBe(INDEX);
    expect(winner(detail('x'))).toBe(`${INDEX}/:conditionSlug`);
  });

  it('other tracks still resolve to the track routes', () => {
    expect(winner('/finance/analytics')).toBe('/finance/:track');
    expect(winner('/finance/analytics/some-module')).toBe('/finance/:track/:slug');
  });
});

describe('case companies stay out of the page while SHOW_CASE_COMPANIES is false', () => {
  it('the index renders none', async () => {
    renderAt(INDEX);
    await h1('Capital in Motion');
    await waitFor(() => expect(document.title).toContain('Capital in Motion'));
    expect(leaksAnyCaseCompany()).toBe(false);
  });

  it.each(CONDITIONS.map((c) => [c.number, c.id, c.title]))(
    'condition %i renders none, in the body or the SEO tags',
    async (_n, id, title) => {
      renderAt(detail(id as string));
      await h1(title as string);
      await waitFor(() => expect(document.title).toContain(title as string));

      // With no case to name, "The Situation" is not rendered at all: it used
      // to be one line of boilerplate ("This is a operational condition.").
      expect(screen.queryByRole('heading', { level: 2, name: 'The Situation' })).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/observed in the case of/);
      // The tension appears once, not twice.
      const condition = CONDITIONS.find((c) => c.id === id)!;
      expect(screen.getAllByText(condition.tension)).toHaveLength(1);

      expect(leaksAnyCaseCompany()).toBe(false);
    },
  );
});
