import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mockSupabase } from './mockSupabase';

/**
 * The glimpse with a full row: every published essay from the mocked
 * backend, the three starred first in the owner's order and the eighteen
 * others newest first (owner decision D3(a), 2026-10-10), one column each,
 * and never wider than the viewport. The row runs (owner decision,
 * 2026-10-11): right to left at 30 px/s, looping with the last column
 * directly before the first. A reader can take hold of it (owner request,
 * 2026-10-22): a mouse drag, a sideways trackpad scroll, Shift and the wheel,
 * a swipe on a touchscreen and the arrows at every width move it, it stays
 * where it is let go, and it runs again from there three seconds after the
 * reader is done. The row is a Tab stop and the arrow keys move it a column
 * at a time; on a column they take focus to the next one. It stops under
 * the pointer, while a column has keyboard focus (which brings that column to the page's margin) and by its pause
 * button, which nothing else undoes. A drag does not open an essay; a click
 * and a tap do. A vertical swipe or wheel over it scrolls the page. For a
 * reader who asked for reduced motion it stands still and moves only by
 * hand. The stills the review needs are written to GLIMPSE_SHOTS (default
 * test-results/glimpse).
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

/** Where the row stands: the list's offset along the frame, in px (Embla's transform). */
const offset = (page: Page) =>
  page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.glimpse__row')!).transform).m41);

/** One lap of the row: every column with its gap, in px. */
const lap = (page: Page) =>
  page.locator('.glimpse__item').evaluateAll((items) => items.reduce((sum, li) => sum + li.getBoundingClientRect().width, 0));

/** How far the row moved leftwards from `a` to `b`, across a loop point if it passed one. */
function moved(a: number, b: number, lapWidth: number) {
  let d = a - b;
  if (d > lapWidth / 2) d -= lapWidth;
  if (d < -lapWidth / 2) d += lapWidth;
  return d;
}

/** The columns in view, left to right: their essay number and left edge. */
const inView = (page: Page) =>
  page.evaluate(() => {
    const frame = document.querySelector('.glimpse__frame')!.getBoundingClientRect();
    return [...document.querySelectorAll('.glimpse__item')]
      .map((li) => ({ n: Number(/Essay (\d+):/.exec(li.textContent ?? '')?.[1]), box: li.getBoundingClientRect() }))
      .filter(({ box }) => box.right > frame.left && box.left < frame.right)
      .sort((a, b) => a.box.left - b.box.left)
      .map(({ n, box }) => ({ n, left: box.left, width: box.width }));
  });

/** The page's margin: where the heading, and a column brought into view, stand. */
const margin = (page: Page) => page.locator('#glimpse-heading').evaluate((h) => h.getBoundingClientRect().left);

/** The row's speed, in px/s, from samples a second apart. */
async function speed(page: Page, lapWidth: number) {
  const samples: { x: number; t: number }[] = [];
  for (let i = 0; i < 4; i++) {
    samples.push({ x: await offset(page), t: await page.evaluate(() => performance.now()) });
    await page.waitForTimeout(1000);
  }
  const rates = samples.slice(1).map((s, i) => moved(samples[i].x, s.x, lapWidth) / ((s.t - samples[i].t) / 1000));
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

/** The row stands still for `ms`. */
async function holds(page: Page, ms: number) {
  const before = await offset(page);
  await page.waitForTimeout(ms);
  return Math.abs((await offset(page)) - before) < 0.5;
}

/** A mouse drag across the row, by `dx`, slow enough to leave little glide. */
async function drag(page: Page, from: { x: number; y: number }, dx: number) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (dx * i) / steps, from.y);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(250);
  await page.mouse.up();
}

/** In view, the row's columns follow each other one column apart, with nothing missing between them. */
function seamless(columns: { n: number; left: number; width: number }[], total: number) {
  for (let i = 1; i < columns.length; i++) {
    expect(Math.abs(columns[i].left - columns[i - 1].left - columns[i - 1].width)).toBeLessThan(1);
    expect(columns[i].n).toBe((columns[i - 1].n % total) + 1);
  }
}

test('every published essay, the three starred first in the owner\'s order and the rest newest first', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { row, errors } = await open(page);
  await expect(row.getByRole('heading', { level: 3 })).toHaveText(TITLES);
  await expect(row).not.toContainText('Essay 99:');

  const first = row.getByRole('listitem').first();
  await expect(first).toContainText('Finance');
  await expect(first).toContainText('Deck 1.');
  await expect(first).not.toContainText('Test Author');
  await expect(first).not.toContainText('6 min');
  // a finance essay with no module placement takes the universal route (essayUrl)
  await expect(first.getByRole('link')).toHaveAttribute('href', '/essays/glimpse-essay-1');
  // the green-transition essay links through its phase
  await expect(row.getByRole('link', { name: /Essay 3:/ })).toHaveAttribute('href', '/green-transition/now/glimpse-essay-3');
  expect(errors).toEqual([]);
});

for (const width of [1440, 1280, 390]) {
  test(`${width}: the row runs right to left at 30 px/s, and its last column comes directly before its first`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { row, errors } = await open(page);
    // the heading, not the row: a moving row is never still enough to scroll to
    await page.locator('#glimpse-heading').scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('.glimpse__frame--running')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Pause the row' })).toBeVisible();
    // the arrows at every width, beside the pause button and its size
    const arrows = page.getByRole('button', { name: /Earlier in the row|Further along the row/ });
    await expect(arrows).toHaveCount(2);
    const pause = (await page.getByRole('button', { name: 'Pause the row' }).boundingBox())!;
    for (const arrow of await arrows.all()) {
      await expect(arrow).toBeVisible();
      const box = (await arrow.boundingBox())!;
      expect([box.width, box.height, box.y]).toEqual([pause.width, pause.height, pause.y]);
    }

    // the list once, every link a stop for Tab
    expect(await page.locator('.glimpse__row').count()).toBe(1);
    await expect(row.getByRole('listitem')).toHaveCount(21);
    expect(await row.locator('a[tabindex]').count()).toBe(0);

    const lapWidth = await lap(page);
    expect(Math.abs((await speed(page, lapWidth)) - 30)).toBeLessThan(2);
    await page.screenshot({ path: `${SHOTS}/home-${width}.png` });

    // where the loop joins: the last column, then the first, one gap apart
    if (width >= 768) {
      await page.getByRole('button', { name: 'Earlier in the row' }).click();
      await page.mouse.move(0, 0);
    } else {
      const box = (await page.locator('.glimpse__frame').boundingBox())!;
      await drag(page, { x: 40, y: box.y + 100 }, 300);
      await page.mouse.move(0, 0);
    }
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Pause the row' }).click();
    const columns = await inView(page);
    expect(columns.map((c) => c.n)).toContain(21);
    expect(columns.map((c) => c.n)).toContain(1);
    seamless(columns, 21);
    // and the columns cover the frame from edge to edge
    expect(columns[0].left).toBeLessThanOrEqual(0);
    expect(columns.at(-1)!.left + columns.at(-1)!.width).toBeGreaterThanOrEqual(width);
    await page.locator('.glimpse__frame').screenshot({ path: `${SHOTS}/home-${width}-seam.png` });
    expect(errors).toEqual([]);
  });
}

test('1440: a mouse drag moves the row with the pointer, leaves it there, opens nothing, and the row runs again from there 3 s later', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { row, errors } = await open(page);
  await page.locator('#glimpse-heading').scrollIntoViewIfNeeded();
  const lapWidth = await lap(page);
  const box = (await page.locator('.glimpse__frame').boundingBox())!;
  const start = { x: box.x + 700, y: box.y + 100 };
  // the drag starts on a column's link
  expect(await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.glimpse__item a'), [start.x, start.y])).toBe(true);

  await page.mouse.move(start.x, start.y);
  await page.waitForTimeout(100);
  const before = await offset(page);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(start.x - i * 15, start.y);
    await page.waitForTimeout(16);
  }
  // it follows the pointer while the button is down
  expect(Math.abs(moved(before, await offset(page), lapWidth) - 300)).toBeLessThan(15);
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(500);
  // let go: no essay opened, the row where the pointer left it
  expect(new URL(page.url()).pathname).toBe('/');
  const released = await offset(page);
  expect(Math.abs(moved(before, released, lapWidth) - 300)).toBeLessThan(25);

  // the pointer leaves; the row stays for three seconds, then runs from there
  await page.mouse.move(0, 0);
  expect(await holds(page, 2500)).toBe(true);
  await page.waitForTimeout(1500);
  const resumed = moved(released, await offset(page), lapWidth);
  expect(resumed).toBeGreaterThan(5);
  expect(resumed).toBeLessThan(60);

  // a click is still a click: the pointer comes over the row, which stops
  // it, and clicks the column at the page's margin
  await page.mouse.move(start.x, start.y);
  await page.waitForTimeout(100);
  const left = await margin(page);
  const column = (await inView(page)).reduce((a, b) => (Math.abs(b.left - left) < Math.abs(a.left - left) ? b : a));
  await row.getByRole('link', { name: new RegExp(`Essay ${column.n}:`) }).click();
  await expect(page).toHaveURL(new RegExp(`/glimpse-essay-${column.n}$`));
  expect(errors).toEqual([]);
});

test('1440: a sideways trackpad scroll and Shift with the wheel move the row; the wheel alone scrolls the page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { errors } = await open(page);
  await page.locator('#glimpse-heading').scrollIntoViewIfNeeded();
  const lapWidth = await lap(page);
  const box = (await page.locator('.glimpse__frame').boundingBox())!;
  await page.mouse.move(box.x + 700, box.y + 100);
  await page.waitForTimeout(100);

  // a trackpad's sideways swipe
  let before = await offset(page);
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(30, 0);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(600);
  expect(moved(before, await offset(page), lapWidth)).toBeGreaterThan(200);

  // Shift and the wheel, which the browser here leaves vertical
  before = await offset(page);
  const scrolled = await page.evaluate(() => window.scrollY);
  await page.keyboard.down('Shift');
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 30);
    await page.waitForTimeout(16);
  }
  await page.keyboard.up('Shift');
  await page.waitForTimeout(600);
  expect(moved(before, await offset(page), lapWidth)).toBeGreaterThan(200);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);

  // the wheel alone scrolls the page and leaves the row where it is
  before = await offset(page);
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 40);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled);
  expect(Math.abs(moved(before, await offset(page), lapWidth))).toBeLessThan(1);
  expect(errors).toEqual([]);
});

test('1440: the row stops under the pointer and for keyboard focus, which brings the column to the page margin', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { row, errors } = await open(page);
  await page.locator('#glimpse-heading').scrollIntoViewIfNeeded();
  const frame = page.locator('.glimpse__frame');

  // the pointer over it stops it; it runs again three seconds after it leaves
  const box = (await frame.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(100);
  expect(await holds(page, 1000)).toBe(true);
  await page.mouse.move(0, 0);
  expect(await holds(page, 2500)).toBe(true);
  await page.waitForTimeout(1000);
  expect(await holds(page, 500)).toBe(false);

  // Tab into the row: it stops, and each column the focus lands on stands
  // at the page's margin, under the heading, whole
  const left = await margin(page);
  await page.locator('#glimpse-heading').evaluate((h: HTMLElement) => {
    h.tabIndex = -1;
    h.focus();
    h.removeAttribute('tabindex');
  });
  // the arrows and the pause button come first, then the row, then its first column
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Earlier in the row' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Pause the row' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(row).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(row.getByRole('link').first()).toBeFocused();
  for (const n of [2, 3, 10]) {
    while (!(await row.getByRole('link').nth(n - 1).evaluate((a) => a === document.activeElement))) await page.keyboard.press('Tab');
    const link = row.getByRole('link').nth(n - 1);
    await expect(link).toContainText(`Essay ${n}:`);
    await expect.poll(() => link.evaluate((a) => a.getBoundingClientRect().left)).toBeCloseTo(left, 0);
    await expect(link).toBeInViewport({ ratio: 1 });
    expect(await holds(page, 500)).toBe(true);
  }
  await page.screenshot({ path: `${SHOTS}/home-1440-focus.png` });

  // focus leaves the row: three seconds later it runs again
  await page.locator('#glimpse-heading').evaluate((h: HTMLElement) => {
    h.tabIndex = -1;
    h.focus();
  });
  expect(await holds(page, 2500)).toBe(true);
  await page.waitForTimeout(1000);
  expect(await holds(page, 500)).toBe(false);
  expect(errors).toEqual([]);
});

for (const reduced of [false, true]) {
  test(`1440${reduced ? ', reduced motion' : ''}: the arrow keys move the row a column at a time, and on a column take focus to the next one`, async ({ page }) => {
    if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    const { row, errors } = await open(page);
    await page.locator('#glimpse-heading').scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const left = await margin(page);
    const atMargin = async () => (await inView(page)).find((c) => Math.abs(c.left - left) < 1)?.n;
    // eased in, or at once for reduced motion; arrived well within 1.5 s
    const settle = () => page.waitForTimeout(reduced ? 100 : 1500);

    // the row itself: Tab to it, and it stops; each arrow key moves it a column
    await page.getByRole('button', { name: reduced ? 'Further along the row' : 'Pause the row' }).focus();
    await page.keyboard.press('Tab');
    await expect(row).toBeFocused();
    expect(await page.locator('.glimpse__frame').evaluate((f) => getComputedStyle(f).boxShadow)).toContain('inset');
    await page.keyboard.press('ArrowRight');
    await settle();
    const first = await atMargin();
    expect(first).toBeDefined();
    await page.keyboard.press('ArrowRight');
    await settle();
    expect(await atMargin()).toBe((first! % 21) + 1);
    await page.keyboard.press('ArrowLeft');
    await settle();
    expect(await atMargin()).toBe(first);
    expect(await holds(page, 1000)).toBe(true);
    await page.screenshot({ path: `${SHOTS}/home-1440${reduced ? '-still' : ''}-row-focus.png` });

    // a column: the arrow keys take focus along, and the row brings each to the margin
    await page.keyboard.press('Tab');
    const focused = () => page.evaluate(() => Number(/Essay (\d+):/.exec(document.activeElement?.textContent ?? '')?.[1]));
    const start = await focused();
    for (const [key, expected] of [['ArrowRight', start + 1], ['ArrowRight', start + 2], ['ArrowLeft', start + 1]] as const) {
      await page.keyboard.press(key);
      await settle();
      expect(await focused()).toBe(expected);
      expect(await atMargin()).toBe(expected);
      await expect(page.locator(':focus')).toBeInViewport({ ratio: 1 });
    }
    // and the page did not scroll sideways on the way
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
    expect(errors).toEqual([]);
  });
}

test('1440: the pause button holds the row through a drag, a hover and a sideways scroll, until it is pressed again', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { errors } = await open(page);
  await page.locator('#glimpse-heading').scrollIntoViewIfNeeded();
  const lapWidth = await lap(page);
  await page.getByRole('button', { name: 'Pause the row' }).click();
  await page.mouse.move(0, 0);
  await expect(page.locator('.glimpse__frame')).toHaveAttribute('data-paused', '');
  expect(await holds(page, 1000)).toBe(true);

  const box = (await page.locator('.glimpse__frame').boundingBox())!;
  const before = await offset(page);
  await drag(page, { x: box.x + 700, y: box.y + 100 }, -200);
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(30, 0);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(500);
  expect(moved(before, await offset(page), lapWidth)).toBeGreaterThan(150);
  await page.mouse.move(0, 0);
  // still held, long after the reader let go
  await page.waitForTimeout(500);
  expect(await holds(page, 4000)).toBe(true);

  await page.getByRole('button', { name: 'Resume the row' }).click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  expect(await holds(page, 700)).toBe(false);
  expect(errors).toEqual([]);
});

test('1440: an arrow moves the row by one column to the page margin, and the row runs again 3 s later', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { errors } = await open(page);
  await page.locator('#glimpse-heading').scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const left = await margin(page);
  const lapWidth = await lap(page);

  // Embla eases a column in; it has arrived well within 1.5 s
  await page.getByRole('button', { name: 'Further along the row' }).click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1500);
  const after = await inView(page);
  const atMargin = after.find((c) => Math.abs(c.left - left) < 1);
  expect(atMargin).toBeDefined();
  const settled = await offset(page);
  await page.getByRole('button', { name: 'Further along the row' }).click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1500);
  expect(Math.abs(moved(settled, await offset(page), lapWidth) - after[0].width)).toBeLessThan(1);
  expect((await inView(page)).find((c) => Math.abs(c.left - left) < 1)?.n).toBe((atMargin!.n % 21) + 1);

  await page.getByRole('button', { name: 'Earlier in the row' }).click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1500);
  expect((await inView(page)).find((c) => Math.abs(c.left - left) < 1)?.n).toBe(atMargin!.n);

  // still for three seconds after the last press, then running
  expect(await holds(page, 1000)).toBe(true);
  await page.waitForTimeout(800);
  expect(await holds(page, 500)).toBe(false);
  expect(errors).toEqual([]);
});

test.describe('390, a touchscreen', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  /** One finger along a straight line, the way a touchscreen sends it. */
  async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
    const cdp = await page.context().newCDPSession(page);
    const steps = 15;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
    for (let i = 1; i <= steps; i++) {
      const point = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(200);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  }

  test('a sideways swipe moves the row with the finger, opens nothing, and the row runs again 3 s later; a vertical swipe scrolls the page; the arrows move it by tap', async ({ page }) => {
    const { row, errors } = await open(page);
    await page.locator('#glimpse-heading').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const lapWidth = await lap(page);
    const box = (await page.locator('.glimpse__frame').boundingBox())!;
    const y = box.y + 120;

    const before = await offset(page);
    await swipe(page, { x: 320, y }, { x: 140, y });
    await page.waitForTimeout(300);
    expect(new URL(page.url()).pathname).toBe('/');
    const released = await offset(page);
    expect(Math.abs(moved(before, released, lapWidth) - 180)).toBeLessThan(25);
    expect(await holds(page, 2000)).toBe(true);
    await page.waitForTimeout(1500);
    const resumed = moved(released, await offset(page), lapWidth);
    expect(resumed).toBeGreaterThan(5);
    expect(resumed).toBeLessThan(60);
    await page.screenshot({ path: `${SHOTS}/home-390-swiped.png` });

    // a vertical swipe that starts on a column scrolls the page, not the row
    const scrolled = await page.evaluate(() => window.scrollY);
    const across = await offset(page);
    await swipe(page, { x: 200, y }, { x: 200, y: y - 160 });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled + 100);
    expect(Math.abs(moved(across, await offset(page), lapWidth))).toBeLessThan(5);

    // the pause button, then the arrows by tap: a column at a time, to the margin
    await page.locator('#glimpse-heading').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Pause the row' }).tap();
    const left = await margin(page);
    await page.getByRole('button', { name: 'Further along the row' }).tap();
    await page.waitForTimeout(1500);
    const tapped = (await inView(page)).find((c) => Math.abs(c.left - left) < 1)?.n;
    expect(tapped).toBeDefined();
    await page.getByRole('button', { name: 'Further along the row' }).tap();
    await page.waitForTimeout(1500);
    expect((await inView(page)).find((c) => Math.abs(c.left - left) < 1)?.n).toBe((tapped! % 21) + 1);
    await page.getByRole('button', { name: 'Earlier in the row' }).tap();
    await page.waitForTimeout(1500);
    expect((await inView(page)).find((c) => Math.abs(c.left - left) < 1)?.n).toBe(tapped);
    await page.screenshot({ path: `${SHOTS}/home-390-arrows.png` });

    // then a tap on the column at the margin opens its essay
    const link = row.getByRole('link', { name: new RegExp(`Essay ${tapped}:`) });
    const target = (await link.boundingBox())!;
    await page.touchscreen.tap(target.x + 40, target.y + 60);
    await expect(page).toHaveURL(new RegExp(`/glimpse-essay-${tapped}$`));
    expect(errors).toEqual([]);
  });
});

for (const width of [1440, 390]) {
  test(`${width}, reduced motion: the row stands still, drawn once, and moves only by hand`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    const { row, errors } = await open(page);
    await row.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('.glimpse__frame--running')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Pause the row|Resume the row/ })).toHaveCount(0);
    expect(await page.locator('.glimpse__row').count()).toBe(1);

    // still, its first column at the page's margin
    expect(await holds(page, 2000)).toBe(true);
    const left = await margin(page);
    expect(Math.abs((await inView(page))[0].left - left)).toBeLessThan(1);
    await page.screenshot({ path: `${SHOTS}/home-${width}-still.png` });

    // by hand: a drag moves it, and it stays where it is let go
    const box = (await page.locator('.glimpse__frame').boundingBox())!;
    await drag(page, { x: Math.min(box.x + 300, width - 40), y: box.y + 100 }, -250);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(800);
    const dragged = await offset(page);
    expect(dragged).toBeLessThan(-200);
    expect(await holds(page, 3500)).toBe(true);

    // the arrows jump a column at a time, and give up at the start
    const back = page.getByRole('button', { name: 'Earlier in the row' });
    const forward = page.getByRole('button', { name: 'Further along the row' });
    await forward.click();
    const jumped = await page.evaluate(() => new Promise<number>((r) => requestAnimationFrame(() => r(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.glimpse__row')!).transform).m41))));
    expect(jumped).toBeLessThan(dragged);
    while (await back.isEnabled()) await back.click();
    await expect.poll(() => offset(page)).toBeCloseTo(0, 0);
    await expect(back).toBeDisabled();
    // and to the end: the last column ends at the page's right margin
    while (await forward.isEnabled()) await forward.click();
    await expect(forward).toBeDisabled();
    const last = row.getByRole('listitem').last();
    await expect(last).toBeInViewport();
    const lastLink = await last.getByRole('link').evaluate((a) => a.getBoundingClientRect().right);
    expect(Math.abs(lastLink - (width - left))).toBeLessThan(1);
    await page.screenshot({ path: `${SHOTS}/home-${width}-still-end.png` });
    expect(errors).toEqual([]);
  });
}
