/**
 * One og:image per essay, on both sides of the page.
 *
 * scripts/prerender.mjs writes an essay's og:image into the raw HTML that
 * crawlers read; react-helmet-async rewrites the head after React runs, and
 * SEO.tsx defaulted `image` to /og-image.png. So on a pre-rendered route the
 * hydrated og:image silently reverted to the generic card for anything that
 * executes JavaScript. Both sides now take the image from
 * src/lib/shareImage.mjs; these tests hold the formula and the hydrated side
 * to it. (The raw side is read back by the prerender's own self-check, and
 * the two are compared on the real build in the gate ledger.)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';

vi.mock('@/integrations/supabase/client', () => {
  const list = Promise.resolve({ data: [], error: null });
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'is', 'filter', 'not']) builder[m] = () => builder;
  builder.maybeSingle = () => Promise.resolve({ data: null, error: null });
  (builder as { then: unknown }).then = list.then.bind(list);
  return { supabase: { from: () => builder } };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, user: null }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

import { essayShareImage, unixSeconds, SHARE_IMAGE_ORIGIN } from '@/lib/shareImage.mjs';
import { ArticleShell } from '@/components/editorial/ArticleShell';
import { LongformArticleShell } from '@/components/editorial/LongformArticleShell';

describe('the share-image formula', () => {
  it('reads a timestamptz to the second, in every shape the database hands out', () => {
    // 2026-09-28T12:03:45Z = 1790597025.
    expect(unixSeconds('2026-09-28T12:03:45.922204+00:00')).toBe(1790597025); // PostgREST
    expect(unixSeconds('2026-09-28 12:03:45.922204+00')).toBe(1790597025); // psql
    expect(unixSeconds('2026-09-28T12:03:45Z')).toBe(1790597025);
    expect(unixSeconds('2026-09-28T19:03:45+07:00')).toBe(1790597025); // Jakarta
    expect(unixSeconds('not a date')).toBeNull();
    expect(unixSeconds(null)).toBeNull();
  });

  it("uses the hero image first, the owner's override, made absolute", () => {
    expect(essayShareImage({ slug: 's', thumbnail_url: 'https://cdn.example.com/h.jpg', updated_at: null })).toEqual({
      url: 'https://cdn.example.com/h.jpg',
      generated: false,
    });
    expect(essayShareImage({ slug: 's', thumbnail_url: '/uploads/h.jpg' }).url).toBe(`${SHARE_IMAGE_ORIGIN}/uploads/h.jpg`);
  });

  it("else the essay's own card, versioned by its updated_at", () => {
    expect(
      essayShareImage({ slug: 'driver-tree-construction', thumbnail_url: null, updated_at: '2026-08-03T12:28:28.912383+00:00' }),
    ).toEqual({ url: 'https://dikagustiana.com/og/driver-tree-construction.png?v=1785760108', generated: true });
    expect(essayShareImage({ slug: 'x', thumbnail_url: '  ' }).url).toBe('https://dikagustiana.com/og/x.png');
  });

  it('is the formula the prerender itself imports, not a second copy of it', () => {
    const prerender = readFileSync('scripts/prerender.mjs', 'utf-8');
    expect(prerender).toMatch(/import \{[^}]*\bessayShareImage\b[^}]*\} from '\.\.\/src\/lib\/shareImage\.mjs';/);
    expect(prerender).toMatch(/const share = essayShareImage\(essay\);/);
  });
});

const essay = {
  slug: 'a-real-essay',
  title: 'A Real Essay',
  updated_at: '2026-09-20T10:51:09.238702+00:00',
};

function renderInHead(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const hydratedOgImages = () =>
  [...document.head.querySelectorAll('meta[property="og:image"]')].map(m => m.getAttribute('content'));

const shellProps = (heroImage: string | null) => ({
  seoTitle: essay.title,
  slug: essay.slug,
  backLink: { label: 'Back', path: '/' },
  title: essay.title,
  updatedAt: essay.updated_at,
  heroImage,
  content: '<p>Body.</p>',
});

describe('the hydrated og:image is the one the prerender wrote', () => {
  for (const [name, Shell] of [
    ['ArticleShell', ArticleShell],
    ['LongformArticleShell', LongformArticleShell],
  ] as const) {
    it(`${name}: the essay's card when it has no hero`, async () => {
      const expected = essayShareImage({ ...essay, thumbnail_url: null }).url;
      expect(expected).toBe('https://dikagustiana.com/og/a-real-essay.png?v=1789901469');
      renderInHead(<Shell {...shellProps(null)} />);
      await waitFor(() => expect(hydratedOgImages()).toEqual([expected]));
    });

    it(`${name}: the hero when it has one`, async () => {
      renderInHead(<Shell {...shellProps('https://cdn.example.com/hero.jpg')} />);
      await waitFor(() => expect(hydratedOgImages()).toEqual(['https://cdn.example.com/hero.jpg']));
    });
  }
});
