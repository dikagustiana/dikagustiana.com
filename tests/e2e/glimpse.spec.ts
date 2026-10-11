import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mockSupabase } from './mockSupabase';

/**
 * The glimpse with a full row: every published essay from the mocked
 * backend, the three starred first in the owner's order and the eighteen
 * others newest first (owner decision D3(a), 2026-10-10), one column each,
 * and never wider than the viewport. The row runs (owner decision,
 * 2026-10-11): right to left at 30 px/s, looping on a frame identical to its
 * start, stopped under the pointer, by its pause button and by keyboard
 * focus, which brings the column it lands on to the page's margin. For a reader who asked for reduced
 * motion it stands still, scrolled by the buttons and by the keyboard on a
 * wide screen and by swipe on a phone. The stills the review needs are
 * written to GLIMPSE_SHOTS (default test-results/glimpse) at 1440 and 390.
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

test('wide, reduced motion: 21 columns in a still row, paged by the buttons and the arrow keys, each column one essay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
  await page.screenshot({ path: `${SHOTS}/home-1440-still.png` });

  const back = page.getByRole('button', { name: 'Earlier in the row' });
  const forward = page.getByRole('button', { name: 'Further along the row' });
  await expect(back).toBeDisabled();
  await forward.click();
  await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(500);
  await expect(back).toBeEnabled();
  await page.screenshot({ path: `${SHOTS}/home-1440-still-scrolled.png` });

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

test('phone, reduced motion: the still row swipes, the Sections list is gone, and nothing is wider than 390', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  const { row, errors } = await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  // the homepage's own Sections list (id="sections") and the old grid; the
  // footer and the phone's menu keep their own "Sections" headings
  await expect(page.locator('main #sections')).toHaveCount(0);
  await expect(page.locator('main').getByRole('heading', { name: 'Selected Analysis' })).toHaveCount(0);
  await expect(page.locator('main').getByText('Nothing written yet')).toHaveCount(0);

  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/home-390-still.png` });

  // a swipe, as the touchscreen does it
  await row.evaluate((el) => el.scrollBy({ left: 600, behavior: 'instant' }));
  await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(500);
  await page.screenshot({ path: `${SHOTS}/home-390-still-scrolled.png` });
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

/** The strip's offset along the row, in px (its transform's x). */
const offset = (page: Page) =>
  page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.glimpse__strip')!).transform).m41);

/** The row's speed, in px/s, from samples a second apart, unwrapped at the loop point. */
async function speed(page: Page, lap: number) {
  const samples: { x: number; t: number }[] = [];
  for (let i = 0; i < 4; i++) {
    samples.push({ x: await offset(page), t: await page.evaluate(() => performance.now()) });
    await page.waitForTimeout(1000);
  }
  const rates = samples.slice(1).map((s, i) => {
    let moved = samples[i].x - s.x;
    if (moved < 0) moved += lap;
    return moved / ((s.t - samples[i].t) / 1000);
  });
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

for (const width of [1440, 390]) {
  test(`${width}: the row runs right to left at 30 px/s, and the end of a lap is drawn exactly as its start`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { row, errors } = await open(page);
    // the heading, not the row: a moving row is never still enough to scroll to
    await page.locator('#glimpse-heading').scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    // no paging buttons: nothing to page through; the pause is there instead
    await expect(page.getByRole('button', { name: 'Further along the row' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pause the row' })).toBeVisible();

    // the list twice; the second is hidden from screen readers and from Tab
    const copy = page.locator('.glimpse__copy[aria-hidden="true"]');
    await expect(copy.locator('li')).toHaveCount(21);
    expect(await copy.locator('a').evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute('tabindex')))])).toEqual(['-1']);
    expect(await row.locator('a[tabindex]').count()).toBe(0);

    // one lap is one copy: the strip is two copies wide, to the pixel
    const lap = await page.evaluate(() => {
      const [a, b] = [...document.querySelectorAll('.glimpse__copy')].map((c) => c.getBoundingClientRect());
      const strip = document.querySelector('.glimpse__strip')!.getBoundingClientRect();
      return { distance: b.left - a.left, half: strip.width / 2 };
    });
    expect(lap.distance).toBe(lap.half);

    expect(Math.abs((await speed(page, lap.distance)) - 30)).toBeLessThan(2);
    await page.screenshot({ path: `${SHOTS}/home-${width}.png` });

    // the loop point: the frame at the end of a lap (-50%) and at its start
    const frame = page.locator('.glimpse__marquee');
    const at = (x: number) =>
      page.evaluate((x) => {
        const strip = document.querySelector<HTMLElement>('.glimpse__strip')!;
        strip.style.animation = 'none';
        strip.style.transform = `translateX(${x}px)`;
      }, x);
    await at(0);
    const start = await frame.screenshot();
    await at(-lap.distance);
    const end = await frame.screenshot();
    expect(end.equals(start)).toBe(true);
    // and the comparison can fail: one gap off is a different picture
    await at(-lap.distance + 32);
    expect((await frame.screenshot()).equals(start)).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('the row stops under the pointer, by its pause button and for keyboard focus, which brings the column to the page margin', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { row, errors } = await open(page);
  // the heading, not the row: a moving row is never still enough to scroll to
  await page.locator('#glimpse-heading').scrollIntoViewIfNeeded();
  const frame = page.locator('.glimpse__marquee');

  // the pointer over it stops it, and leaving starts it again
  const box = (await frame.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(200);
  const held = await offset(page);
  await page.waitForTimeout(1000);
  expect(await offset(page)).toBe(held);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1000);
  expect(await offset(page)).not.toBe(held);

  // the pause button, the way a touchscreen stops it: a tap holds the row
  // with the pointer away from it, and a second tap starts it again
  await page.getByRole('button', { name: 'Pause the row' }).click();
  await page.mouse.move(0, 0);
  const paused = await offset(page);
  await page.waitForTimeout(1000);
  expect(await offset(page)).toBe(paused);
  await page.getByRole('button', { name: 'Resume the row' }).click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1000);
  expect(await offset(page)).not.toBe(paused);

  // Tab into the row: it stops, and each column the focus lands on stands
  // at the page's margin, under the heading, whole
  const margin = await page.locator('#glimpse-heading').evaluate((h) => h.getBoundingClientRect().left);
  await page.locator('#glimpse-heading').evaluate((h: HTMLElement) => {
    h.tabIndex = -1;
    h.focus();
    h.removeAttribute('tabindex');
  });
  // the pause button comes first, then the row's first column
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Pause the row' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(row.getByRole('link').first()).toBeFocused();
  for (const n of [2, 3, 10]) {
    while (!(await row.getByRole('link').nth(n - 1).evaluate((a) => a === document.activeElement))) await page.keyboard.press('Tab');
    const link = row.getByRole('link').nth(n - 1);
    await expect(link).toContainText(`Essay ${n}:`);
    const left = await link.evaluate((a) => a.getBoundingClientRect().left);
    expect(Math.abs(left - margin)).toBeLessThan(1);
    await expect(link).toBeInViewport({ ratio: 1 });
    const stopped = await offset(page);
    await page.waitForTimeout(500);
    expect(await offset(page)).toBe(stopped);
  }
  await page.screenshot({ path: `${SHOTS}/home-1440-focus.png` });
  expect(errors).toEqual([]);
});

test('reduced motion: the row stands still, drawn once, with no strip', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  const { row } = await open(page);
  await expect(page.locator('.glimpse__strip')).toHaveCount(0);
  await expect(page.locator('.glimpse__copy[aria-hidden="true"]')).toHaveCount(0);
  await expect(row).toHaveAttribute('tabindex', '0');
  expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Pause the row' })).toHaveCount(0);
});
