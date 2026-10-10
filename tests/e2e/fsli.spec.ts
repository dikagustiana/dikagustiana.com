import { test, expect, type Page, type Route } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * The FSLI line-item page, end to end, on the production bundle.
 *
 * The linked essay is the page body (owner decision D1(a), October 2026
 * sweep): no fixed outline, no "Not written yet", no "Related Essays" block
 * under it, and "On this page" lists the essay's own headings. A page with
 * no essay of its own names the line item whose essay covers it (D2(a)).
 *
 * As in journeys.spec.ts, the shared mock answers single-object selects with
 * 406, so this file registers its own REST handler after it and filters on
 * the query the way PostgREST does. Figures are dummies, not any issuer's.
 */

const page = (slug: string, title: string, category: string, sort_order: number, over: Record<string, unknown> = {}) => ({
  id: `p-${slug}`,
  slug,
  title,
  subtitle: null,
  notes_ref: '9',
  dec_2024: '1,000',
  dec_2023: '900',
  category,
  sort_order,
  is_component: null,
  covered_by_slug: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
});

const FSLI_PAGES = [
  page('cash-and-cash-equivalents', 'Cash and cash equivalents', 'current_assets', 1),
  page('restricted-cash', 'Restricted cash', 'current_assets', 2),
  page('other-current-assets', 'Other current assets', 'current_assets', 11),
  page('restricted-cash-non-current', 'Restricted cash - non-current portion', 'non_current_assets', 13, {
    covered_by_slug: 'restricted-cash',
  }),
];

const heading = (level: number, text: string) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

const essay = (slug: string, fsli_slug: string, title: string, snippet: string, content: unknown[]) => ({
  id: `e-${slug}`,
  slug,
  title,
  snippet,
  section: 'accounting',
  phase: null,
  author: 'Test Author',
  read_time: '6 min read',
  date: '2026-08-01',
  thumbnail_url: null,
  published: true,
  status: 'published',
  sort_order: 1,
  category_id: null,
  module_id: null,
  finance_section: null,
  finance_order: null,
  fsli_slug,
  topic: null,
  presentation: null,
  content: JSON.stringify({ type: 'doc', content }),
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
});

const ESSAYS = [
  essay('test-cash-essay', 'cash-and-cash-equivalents', 'Test Essay on Cash', 'A test lede for the cash line item.', [
    heading(2, 'Test heading one'),
    para('Test paragraph under the first heading.'),
    heading(3, 'Test subheading'),
    para('Test paragraph under the subheading.'),
    heading(2, 'Test heading two'),
    para('Test paragraph under the second heading.'),
  ]),
  essay('test-restricted-essay', 'restricted-cash', 'Test Essay on Restricted Cash', 'A test lede for restricted cash.', [
    heading(2, 'Test restricted heading'),
    para('Test paragraph on restricted cash.'),
  ]),
];

const TABLES: Record<string, Record<string, unknown>[]> = { fsli_pages: FSLI_PAGES, essays: ESSAYS };

/** What PostgREST would return for this URL, given the seed above. */
function rowsFor(url: string): Record<string, unknown>[] {
  const u = new URL(url);
  const table = u.pathname.split('/rest/v1/')[1]?.split('?')[0] ?? '';
  let rows = TABLES[table] ?? [];
  for (const [key, raw] of u.searchParams) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    if (op === 'eq') rows = rows.filter((r) => String(r[key]) === value);
  }
  return rows;
}

async function seed(p: Page) {
  await p.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await p.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await mockSupabase(p);
  await p.route('**/rest/v1/**', (route: Route) => {
    const rows = rowsFor(route.request().url());
    const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(single ? rows[0] ?? null : rows),
    });
  });
}

test.beforeEach(async ({ page: p }) => {
  // xl: and up, where the "On this page" rail is shown.
  await p.setViewportSize({ width: 1440, height: 900 });
  await seed(p);
});

test('a line item with a published essay shows the essay as its body', async ({ page: p }) => {
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('/accounting/fsli/cash-and-cash-equivalents');

  const main = p.locator('main');
  await expect(main.getByRole('heading', { level: 1, name: 'Cash and cash equivalents' })).toBeVisible();
  // The essay's title is the first h2, its snippet the lede, then the body.
  await expect(main.locator('h2').first()).toHaveText('Test Essay on Cash');
  await expect(main.getByText('A test lede for the cash line item.')).toBeVisible();
  await expect(main.getByText('Test paragraph under the second heading.')).toBeVisible();

  await expect(p.getByText('Not written yet')).toHaveCount(0);
  await expect(p.getByRole('heading', { name: 'Related Essays' })).toHaveCount(0);
  await expect(p.getByText('Covered in')).toHaveCount(0);

  // "On this page" lists the essay's headings, and each one is on the page.
  const toc = p.getByRole('navigation', { name: 'On this page' });
  await expect(toc.getByRole('button')).toHaveText(['Test heading one', 'Test subheading', 'Test heading two']);
  await expect(p.locator('#test-heading-two')).toHaveText('Test heading two');
  await expect(p.getByPlaceholder('Find in page...')).toBeVisible();

  // The search box narrows the list.
  await p.getByPlaceholder('Find in page...').fill('two');
  await expect(toc.getByRole('button')).toHaveText(['Test heading two']);

  expect(errors).toEqual([]);
});

test('a line item without an essay names the line item whose essay covers it', async ({ page: p }) => {
  await p.goto('/accounting/fsli/restricted-cash-non-current');

  const main = p.locator('main');
  await expect(main.getByRole('heading', { level: 1, name: 'Restricted cash - non-current portion' })).toBeVisible();
  const cover = main.locator('[data-fsli-covered-by]');
  await expect(cover).toHaveText('Covered in Test Essay on Restricted Cash');
  const link = cover.getByRole('link', { name: 'Test Essay on Restricted Cash' });
  await expect(link).toHaveAttribute('href', '/accounting/fsli/restricted-cash');

  await expect(p.getByText('Not written yet')).toHaveCount(0);
  await expect(main.locator('h2')).toHaveCount(0);
  await expect(p.getByRole('navigation', { name: 'On this page' })).toHaveCount(0);

  await link.click();
  await expect(p).toHaveURL(/\/accounting\/fsli\/restricted-cash$/);
  await expect(main.locator('h2').first()).toHaveText('Test Essay on Restricted Cash');
});

test('a line item with neither an essay nor a cover ends at its figures', async ({ page: p }) => {
  await p.goto('/accounting/fsli/other-current-assets');

  const main = p.locator('main');
  await expect(main.getByRole('heading', { level: 1, name: 'Other current assets' })).toBeVisible();
  await expect(main.getByText('Figures as reported in the source financial statements.')).toBeVisible();
  await expect(p.getByText('Not written yet')).toHaveCount(0);
  await expect(p.getByText('Covered in')).toHaveCount(0);
  await expect(main.locator('h2')).toHaveCount(0);

  // Related line items are this page's category only.
  const related = p.getByText('Related line items').locator('..');
  await expect(related.getByRole('link')).toHaveText(['Cash and cash equivalents', 'Restricted cash']);
});
