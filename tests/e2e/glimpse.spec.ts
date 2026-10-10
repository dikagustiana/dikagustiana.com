import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mockSupabase } from './mockSupabase';

/**
 * The glimpse with a full row: every published essay from the mocked
 * backend, the three starred first in the owner's order and the eighteen
 * others newest first (owner decision D3(a), 2026-10-10), one column each,
 * scrolled by the buttons and by the keyboard on a wide screen and by swipe
 * on a phone, and never wider than the viewport. The stills the review needs
 * are written to GLIMPSE_SHOTS (default test-results/glimpse) at 1440 and 390.
 *
 * The shared mock answers every select with the whole table, drafts and
 * all; this file answers the essays table the way PostgREST does (filters,
 * order, limit), so the order on the page is the query's and not the seed's.
 */
const SHOTS = process.env.GLIMPSE_SHOTS ?? 'test-results/glimpse';
const SECTIONS = ['finance', 'accounting', 'green-transition', 'next-big-thing', 'development-finance'];

/**
 * "Essay N" is the Nth column the page should show. The starred three are
 * the OLDEST essays and their ranks run against their age, so neither the
 * seed's order nor recency can pass for the owner's order.
 */
const STARRED = [
  { n: 1, rank: 1, created: '2026-06-01' },
  { n: 2, rank: 2, created: '2026-06-03' },
  { n: 3, rank: 3, created: '2026-06-02' },
];
const essay = (n: number, over: Record<string, unknown>) => ({
  id: `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`,
  slug: `glimpse-essay-${n}`,
  title: `Essay ${n}: a title long enough to wrap onto a second line`,
  snippet: `Deck ${n}. A few sentences of the kind the deck line carries, enough to show the clamp at five lines and no more than that.`,
  section: SECTIONS[(n - 1) % SECTIONS.length],
  phase: SECTIONS[(n - 1) % SECTIONS.length] === 'green-transition' ? 'where-we-are-now' : null,
  author: 'Test Author',
  read_time: '6 min read',
  date: `2026-0${1 + ((n - 1) % 9)}-15`,
  is_selected: false,
  selected_rank: null,
  published: true,
  status: 'published',
  finance_section: null,
  fsli_slug: null,
  topic: null,
  finance_modules: null,
  ...over,
});
const essays: Record<string, unknown>[] = [
  ...Array.from({ length: 18 }, (_, i) => essay(i + 4, { created_at: new Date(Date.UTC(2026, 8, 24 - i)).toISOString() })),
  ...STARRED.map(({ n, rank, created }) => essay(n, { is_selected: true, selected_rank: rank, created_at: `${created}T00:00:00Z` })),
  // a starred draft: placed first by rank, and still nowhere on the page
  essay(99, { is_selected: true, selected_rank: 0, published: false, status: 'draft', created_at: '2026-09-30T00:00:00Z' }),
].reverse();

const TITLES = Array.from({ length: 21 }, (_, i) => `Essay ${i + 1}: a title long enough to wrap onto a second line`);

/** What PostgREST would return for this essays query: its filters, its order, its limit. */
function answer(url: string) {
  const u = new URL(url);
  let rows = [...essays];
  for (const [key, raw] of u.searchParams) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    if (op === 'eq') rows = rows.filter((r) => String(r[key]) === value);
    else if (op === 'in') {
      const set = value.replace(/^\(|\)$/g, '').split(',').map((v) => v.replace(/^"|"$/g, ''));
      rows = rows.filter((r) => set.includes(String(r[key])));
    }
  }
  const terms = (u.searchParams.get('order') ?? '').split(',').filter(Boolean).map((term) => {
    const [column, ...mods] = term.split('.');
    const desc = mods.includes('desc');
    return { column, desc, nullsFirst: mods.includes('nullsfirst') || (desc && !mods.includes('nullslast')) };
  });
  rows.sort((a, b) => {
    for (const { column, desc, nullsFirst } of terms) {
      const x = a[column] as string | number | null;
      const y = b[column] as string | number | null;
      if (x === y) continue;
      if (x === null) return nullsFirst ? -1 : 1;
      if (y === null) return nullsFirst ? 1 : -1;
      return (x < y ? -1 : 1) * (desc ? -1 : 1);
    }
    return 0;
  });
  const limit = u.searchParams.get('limit');
  return limit ? rows.slice(0, Number(limit)) : rows;
}

async function open(page: Page) {
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await mockSupabase(page);
  await page.route('**/rest/v1/essays**', (route) => {
    // a single-object read keeps the shared mock's answer
    if ((route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')) return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(answer(route.request().url())) });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/', { waitUntil: 'load' });
  const row = page.getByRole('list', { name: 'Glimpse' });
  await expect(row.getByRole('listitem')).toHaveCount(21);
  return { row, errors };
}

test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));

test('every published essay, the three starred first in the owner\'s order and the rest newest first', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { row, errors } = await open(page);
  await expect(row.getByRole('heading', { level: 3 })).toHaveText(TITLES);
  await expect(row).not.toContainText('Essay 99:');
  expect(errors).toEqual([]);
});

test('wide: 21 columns in the row, paged by the buttons and the arrow keys, each column one essay', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { row, errors } = await open(page);

  const first = row.getByRole('listitem').first();
  await expect(first).toContainText('Finance');
  await expect(first).toContainText('Essay 1:');
  await expect(first).toContainText('Deck 1.');
  await expect(first).not.toContainText('Test Author');
  await expect(first).not.toContainText('6 min');
  // a finance essay with no module placement takes the universal route (essayUrl)
  await expect(first.getByRole('link')).toHaveAttribute('href', '/essays/glimpse-essay-1');
  // the green-transition essay links through its phase
  await expect(row.getByRole('link', { name: /Essay 3:/ })).toHaveAttribute('href', '/green-transition/now/glimpse-essay-3');

  // never wider than the viewport: the page itself does not scroll sideways
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);

  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/home-1440.png` });

  const back = page.getByRole('button', { name: 'Earlier in the row' });
  const forward = page.getByRole('button', { name: 'Further along the row' });
  await expect(back).toBeDisabled();
  await forward.click();
  await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(500);
  await expect(back).toBeEnabled();
  await page.screenshot({ path: `${SHOTS}/home-1440-scrolled.png` });

  // the keyboard: the row takes focus and the arrow keys move it
  await row.focus();
  const before = await row.evaluate((el) => el.scrollLeft);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
  // to the end, and the forward button gives up
  await row.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }));
  await expect(forward).toBeDisabled();
  await expect(row.getByRole('listitem').last()).toBeInViewport();

  expect(errors).toEqual([]);
});

test('phone: the row swipes, the Sections list is gone, and nothing is wider than 390', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { row, errors } = await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  // the homepage's own Sections list (id="sections") and the old grid; the
  // footer and the phone's menu keep their own "Sections" headings
  await expect(page.locator('main #sections')).toHaveCount(0);
  await expect(page.locator('main').getByRole('heading', { name: 'Selected Analysis' })).toHaveCount(0);
  await expect(page.locator('main').getByText('Nothing written yet')).toHaveCount(0);

  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/home-390.png` });

  // a swipe, as the touchscreen does it
  await row.evaluate((el) => el.scrollBy({ left: 600, behavior: 'instant' }));
  await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(500);
  await page.screenshot({ path: `${SHOTS}/home-390-scrolled.png` });
  expect(errors).toEqual([]);
});

test('reduced motion: the buttons jump instead of gliding', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  const { row } = await open(page);
  await page.getByRole('button', { name: 'Further along the row' }).click();
  // an instant scroll has arrived by the next frame
  const after = await row.evaluate((el) => new Promise<number>((r) => requestAnimationFrame(() => r(el.scrollLeft))));
  expect(after).toBeGreaterThan(500);
});
