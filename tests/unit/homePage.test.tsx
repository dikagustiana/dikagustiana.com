/**
 * The homepage after About (owner decisions D3(a), D4(a), 2026-10-10): the
 * map first, then the glimpse, then the argument in full and the revision of
 * judgment, as the same sections with the same ids they had on About, so a
 * link to #the-argument or #changed-my-mind still lands. The map is stubbed
 * here (its own suites cover it); everything under it is the real thing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));
// PageLayout pulls in Header/Footer/auth; stub it to a passthrough, and SEO to null.
vi.mock('@/components/layouts/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/SEO', () => ({ SEO: () => null }));
vi.mock('@/components/industry-chain', () => ({
  IndustryChainPreview: () => (
    <section id="industry-chain">
      <h1>The industry chain</h1>
    </section>
  ),
}));

import Index from '@/pages/Index';
import { ARGUMENT, READING_PATH } from '@/data/readingPath';
import { CHANGED_MIND } from '@/data/changedMind';
import { essayRow, essaysTable } from './helpers/essaysTable';

const mount = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Index />
      </QueryClientProvider>
    </MemoryRouter>,
  );

const follows = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

beforeEach(() => fromMock.mockReset());

describe('the homepage', () => {
  it('carries the argument and the revision of judgment under the glimpse, with the map still first', async () => {
    fromMock.mockImplementation(essaysTable([essayRow(1, { is_selected: true, selected_rank: 1 }), essayRow(2)]).from);
    const { container } = mount();
    const glimpse = await screen.findByRole('list', { name: 'Glimpse' });
    await waitFor(() => expect(within(glimpse).getAllByRole('listitem')).toHaveLength(2));

    const map = container.querySelector('#industry-chain')!;
    const argument = container.querySelector('section#the-argument')!;
    const changed = container.querySelector('section#changed-my-mind')!;
    expect(argument).not.toBeNull();
    expect(changed).not.toBeNull();
    expect(follows(map, glimpse)).toBe(true);
    expect(follows(glimpse, argument)).toBe(true);
    expect(follows(argument, changed)).toBe(true);
    expect(container.querySelector('main :is(h1, h2, h3)')!.textContent).toBe('The industry chain');
    // one of each: the page does not carry a second copy of either
    expect(container.querySelectorAll('#the-argument, #changed-my-mind')).toHaveLength(2);
  });

  it('carries the argument in full, not the compact form: the scope, the comparison, the objection and the limits', async () => {
    fromMock.mockImplementation(essaysTable([]).from);
    mount();
    const argument = document.getElementById('the-argument')!;
    expect(within(argument).getByRole('heading', { level: 2, name: ARGUMENT.question })).toBeInTheDocument();
    for (const term of [
      'The case it is made on',
      'What is being compared',
      'The strongest objection',
      'What would change my mind',
      'What the evidence does not cover',
    ]) {
      expect(within(argument).getByText(term)).toBeInTheDocument();
    }
    // every step, written or not
    await waitFor(() => expect(within(argument).getAllByText('Not written')).toHaveLength(READING_PATH.length));
    const changed = document.getElementById('changed-my-mind')!;
    expect(within(changed).getByRole('heading', { level: 2, name: CHANGED_MIND.heading })).toBeInTheDocument();
  });

  it('keeps the argument when nothing is published: the glimpse is absent, not empty', async () => {
    fromMock.mockImplementation(essaysTable([essayRow(1, { published: false, is_selected: true, selected_rank: 1 })]).from);
    mount();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Glimpse' })).toBeNull());
    expect(document.getElementById('the-argument')).not.toBeNull();
    expect(document.getElementById('changed-my-mind')).not.toBeNull();
  });
});
