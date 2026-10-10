import { test, expect } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * Proves the data -> render happy path: when the (mocked) backend returns
 * rows, the UI actually binds and displays them. This exercises the real
 * react-query hooks + render code, just with deterministic mock data instead
 * of a live database.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
});

test('homepage renders featured essays returned by the backend', async ({ page }) => {
  // The homepage's essay strip is every published essay, the starred ones
  // (essays.is_selected) first — see useSelectedEssays. This test predated
  // it and asserted the old recency-based "Recent Analysis" heading; the
  // seeded row carries the fields the real queries filter on.
  const seededTitle = 'Seeded Featured Essay For E2E';
  await mockSupabase(page, {
    tables: {
      essays: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          slug: 'seeded-featured-essay',
          title: seededTitle,
          snippet: 'A deterministic snippet rendered from mock data.',
          section: 'next-big-thing',
          phase: null,
          author: 'Test Author',
          read_time: '5 min',
          created_at: new Date().toISOString(),
          date: '2026-08-01',
          is_selected: true,
          published: true,
          status: 'published',
          finance_section: null,
          fsli_slug: null,
          topic: null,
          finance_modules: null,
        },
      ],
    },
  });

  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/', { waitUntil: 'load' });

  // The glimpse only renders when essays are returned.
  await expect(page.getByRole('heading', { name: 'Glimpse' })).toBeVisible();
  await expect(page.getByText(seededTitle)).toBeVisible();
  await expect(page.getByText('A deterministic snippet rendered from mock data.')).toBeVisible();

  // The card links to the section-aware essay URL built by getEssayLink().
  const link = page.locator('a[href="/the-next-big-thing/seeded-featured-essay"]');
  await expect(link).toBeVisible();

  expect(pageErrors).toEqual([]);
});
