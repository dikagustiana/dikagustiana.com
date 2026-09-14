import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { makeQueryResult } from './helpers/renderWithProviders';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));

import { ARGUMENT, READING_PATH, READING_PATH_SLUGS, LINK_LABEL } from '@/data/readingPath';
import { ReadingPath } from '@/components/argument/ReadingPath';

function renderPath(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

const flagship = {
  slug: 'indonesias-reindustrialization-bet',
  title: "Indonesia's Reindustrialization Bet",
  snippet: null,
  section: 'next-big-thing',
  phase: 'economy',
  read_time: '10 min read',
  date: '2026-08-02',
  finance_section: null,
  fsli_slug: null,
  topic: null,
  finance_modules: null,
};

beforeEach(() => fromMock.mockReset());

/**
 * The path is the site's fixed entrance to a bounded argument. These pin the
 * properties that, when they broke, turned it back into a list: a link to
 * something unpublished, a gap that hid itself, or an order that a newer
 * essay could reshuffle.
 */
describe('the argument frame', () => {
  it('states the case, the comparison, the objection and the limits', () => {
    expect(ARGUMENT.caseStudy.length).toBeGreaterThan(40);
    expect(ARGUMENT.comparativeTest.length).toBeGreaterThan(40);
    expect(ARGUMENT.strongestObjection.length).toBeGreaterThan(40);
    expect(ARGUMENT.wouldChangeIt.length).toBeGreaterThan(40);
    expect(ARGUMENT.limits.length).toBeGreaterThan(40);
  });

  it('carries an as-of date, because a standing claim with no date is undated', () => {
    expect(ARGUMENT.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does not restate the thesis in its unbounded form', () => {
    // "Infrastructure is always first" is the error the narrowed claim exists
    // to avoid; it must not creep back into the frame.
    const all = Object.values(ARGUMENT).join(' ').toLowerCase();
    expect(all).not.toMatch(/infrastructure (always|must) (come|be) first/);
  });
});

describe('the path', () => {
  it('names no slug twice', () => {
    expect(new Set(READING_PATH_SLUGS).size).toBe(READING_PATH_SLUGS.length);
  });

  it('keeps READING_PATH_SLUGS in step with the path', () => {
    expect(READING_PATH_SLUGS).toEqual(READING_PATH.filter((s) => s.slug).map((s) => s.slug));
  });

  it('makes every step say why it follows the one before', () => {
    for (const step of READING_PATH) {
      expect(step.why.length, step.title).toBeGreaterThan(40);
    }
  });

  it('makes a written step say what it establishes', () => {
    for (const step of READING_PATH.filter((s) => s.slug)) {
      expect(step.establishes.length, step.title).toBeGreaterThan(40);
    }
  });

  it('makes an unwritten step say what is missing, rather than disappearing', () => {
    const gaps = READING_PATH.filter((s) => !s.slug);
    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) {
      expect(gap.missing, gap.title).toBeTruthy();
      expect(gap.missing!.length).toBeGreaterThan(40);
    }
  });

  it('represents all four conceptual links across the path', () => {
    const covered = new Set(READING_PATH.flatMap((s) => s.links));
    for (const link of Object.keys(LINK_LABEL)) {
      expect(covered.has(link as never), link).toBe(true);
    }
  });

  it('does not invent one step per link for symmetry', () => {
    // At least one step carries more than one link, which is the honest shape
    // when a single essay does several jobs.
    expect(READING_PATH.some((s) => s.links.length > 1)).toBe(true);
  });
});

describe('<ReadingPath />', () => {
  it('links a step only when its essay comes back published', async () => {
    fromMock.mockReturnValue(makeQueryResult([flagship]));
    renderPath(<ReadingPath />);

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: /Indonesia’s Reindustrialization Bet/i }),
      ).toHaveAttribute('href', '/the-next-big-thing/economy/indonesias-reindustrialization-bet'),
    );
  });

  it('renders a step whose essay is not published as unwritten, never as a link', async () => {
    // Only the flagship comes back; the two method essays do not.
    fromMock.mockReturnValue(makeQueryResult([flagship]));
    renderPath(<ReadingPath />);

    await waitFor(() => expect(screen.getAllByText('Not written').length).toBeGreaterThan(0));
    expect(screen.queryByRole('link', { name: /Driver Tree Construction/i })).toBeNull();
    expect(screen.getByText(/Driver Tree Construction/)).toBeInTheDocument();
  });

  it('keeps the gaps visible when nothing resolves at all', async () => {
    fromMock.mockReturnValue(makeQueryResult([]));
    renderPath(<ReadingPath />);

    await waitFor(() =>
      expect(screen.getAllByText('Not written')).toHaveLength(READING_PATH.length),
    );
    // Every step is still on the page. A path that shortens itself when the
    // database is empty lies about how finished the argument is.
    for (const step of READING_PATH) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });

  it('filters on the column RLS enforces, not on `status`', async () => {
    const builder = makeQueryResult([flagship]) as Record<string, unknown> & {
      eq: (c: string, v: unknown) => unknown;
    };
    const eqCalls: [string, unknown][] = [];
    builder.eq = (column: string, value: unknown) => {
      eqCalls.push([column, value]);
      return builder;
    };
    fromMock.mockReturnValue(builder);

    renderPath(<ReadingPath />);
    await waitFor(() => expect(eqCalls.length).toBeGreaterThan(0));
    expect(eqCalls).toContainEqual(['published', true]);
    expect(eqCalls.map(([c]) => c)).not.toContain('status');
  });
});
