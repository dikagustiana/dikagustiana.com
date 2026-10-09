import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mockSupabase } from './mockSupabase';

/**
 * The glimpse with a full row: 24 starred essays from the mocked backend,
 * one column each, scrolled by the buttons and by the keyboard on a wide
 * screen and by swipe on a phone, and never wider than the viewport. The
 * stills the review needs are written to GLIMPSE_SHOTS (default
 * test-results/glimpse) at 1440 and 390.
 */
const SHOTS = process.env.GLIMPSE_SHOTS ?? 'test-results/glimpse';
const SECTIONS = ['finance', 'accounting', 'green-transition', 'next-big-thing', 'development-finance'];

const essays = Array.from({ length: 24 }, (_, i) => ({
  id: `00000000-0000-0000-0000-0000000000${String(i + 1).padStart(2, '0')}`,
  slug: `glimpse-essay-${i + 1}`,
  title: `Essay ${i + 1}: a title long enough to wrap onto a second line`,
  snippet: `Deck ${i + 1}. A few sentences of the kind the deck line carries, enough to show the clamp at five lines and no more than that.`,
  section: SECTIONS[i % SECTIONS.length],
  phase: SECTIONS[i % SECTIONS.length] === 'green-transition' ? 'where-we-are-now' : null,
  author: 'Test Author',
  read_time: '6 min read',
  created_at: new Date(Date.UTC(2026, 8, 24 - i)).toISOString(),
  date: `2026-0${1 + (i % 9)}-15`,
  is_selected: true,
  selected_rank: i + 1,
  published: true,
  status: 'published',
  finance_section: null,
  fsli_slug: null,
  topic: null,
  finance_modules: null,
}));

async function open(page: Page) {
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await mockSupabase(page, { tables: { essays } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/', { waitUntil: 'load' });
  const row = page.getByRole('list', { name: 'Glimpse' });
  await expect(row.getByRole('listitem')).toHaveCount(24);
  return { row, errors };
}

test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));

test('wide: 24 columns in the row, paged by the buttons and the arrow keys, each column one essay', async ({ page }) => {
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
