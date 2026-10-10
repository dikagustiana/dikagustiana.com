import { test, expect, type Locator, type Page } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * The PSAK 338 working paper viewer on /accounting/consolidated-reporting (PRD site sweep 2026-10, R4.8),
 * against the production bundle and the workbook JSON vite preview serves from public/. Every cell named
 * here is the committed workbook's own: Consol SoFP 24!D9 is =D114+D53; AF26 on the same sheet is
 * ='Elimination 2024'!G82; CF 23 Restated!O4 is one of D8's #REF! cells.
 *
 * The click-to-inspect time (R4.7: under 50 ms) is measured in the page with performance.now(): a
 * MutationObserver on the formula bar is set up, the time taken, and the cell's click() dispatched (a
 * synthetic click, which React handles as it does a real one); the observer's first callback with the bar's
 * text changed gives the time to the DOM, and a requestAnimationFrame from there the time to the next frame.
 * Of eight clicks, each to a cell other than the selected one and each from a quiet frame, every time to the
 * DOM must be under 50 ms, and the median time to the next frame, which also waits on the browser's frame
 * clock and so on the machine's load, too. The first click on the sheet is not measured. The times are
 * logged.
 */

const PAGE = '/accounting/consolidated-reporting';
const SOFP = 'Consol SoFP 24';
const ELIM = 'Elimination 2024';

async function stubNetwork(page: Page) {
  await mockSupabase(page);
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
}

test.beforeEach(async ({ page }) => {
  await stubNetwork(page);
});

/**
 * Opens the page, scrolls the working paper into view and waits for its grid, then sets the viewer at the top
 * of the window, where all of it fits at 1440 × 900: the same place on every run, whatever scrolled it there.
 * The jump is instant: the site scrolls the page smoothly, and a click while it glides stops it wherever it
 * has got to.
 */
async function openViewer(page: Page, query = '') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(PAGE + query);
  const viewer = page.locator('[data-workbook-viewer]');
  await viewer.scrollIntoViewIfNeeded();
  const grid = viewer.locator('[role="grid"]');
  await expect(grid).toBeVisible({ timeout: 15_000 });
  await viewer.evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
  return { grid, errors };
}

const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });
const nameBox = (page: Page) => page.getByRole('textbox', { name: 'Name box' });
const formulaBar = (page: Page) => page.locator('[data-formula-bar]');
const cellIn = (grid: Locator, a: string) => grid.locator(`[role="gridcell"][data-a="${a}"]`);

/**
 * In the page: whether cell `a` is on screen in the grid, not scrolled away nor under a header or a frozen
 * pane. The grid must be in the window.
 */
function shownIn(grid: HTMLElement, a: string): boolean {
  const cell = grid.querySelector(`[role="gridcell"][data-a="${a}"]`);
  if (!cell) return false;
  const r = cell.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return !!hit && (hit === cell || cell.contains(hit));
}

/**
 * In the page: scrolls the grid to [left, top], or by [dx, dy] with `by`, then waits until the cells it then
 * shows are rendered: a cell lies under the grid's centre. A fixed number of frames is not enough on a
 * loaded machine, where React renders the new window later.
 */
async function scrollGrid(grid: HTMLElement, [x, y, by]: number[]): Promise<void> {
  if (by) grid.scrollBy(x, y);
  else grid.scrollTo(x, y);
  const g = grid.getBoundingClientRect();
  const until = performance.now() + 3000;
  do await new Promise((r) => requestAnimationFrame(r));
  while (!document.elementFromPoint(g.left + g.width / 2, g.top + g.height / 2)?.closest('[data-a]') && performance.now() < until);
}

/** In the page: how far cell `a`, if rendered, is from the grid's centre. */
function offCentre(grid: HTMLElement, a: string): number[] | null {
  const cell = grid.querySelector(`[role="gridcell"][data-a="${a}"]`);
  if (!cell) return null;
  const [r, g] = [cell.getBoundingClientRect(), grid.getBoundingClientRect()];
  return [r.left + r.width / 2 - (g.left + g.width / 2), r.top + r.height / 2 - (g.top + g.height / 2)];
}

/** A cell in the frozen rows and one below them, in the same column, share their left edge. */
async function expectColumnAligned(grid: Locator, frozen: string, below: string) {
  const [a, b] = [await cellIn(grid, frozen).boundingBox(), await cellIn(grid, below).boundingBox()];
  expect(a && b && Math.abs(a.x - b.x), `${frozen} and ${below} share their left edge`).toBeLessThan(0.5);
}

/**
 * The grid renders only the cells in view; this scrolls it, a half view at a time, until cell `a` is
 * rendered, then brings it to the grid's centre, out from under the headers and frozen panes. The page
 * itself is not scrolled.
 */
async function reveal(grid: Locator, a: string): Promise<Locator> {
  const size = await grid.evaluate((el) => ({ w: el.scrollWidth, h: el.scrollHeight, cw: el.clientWidth, ch: el.clientHeight }));
  for (let left = 0; left <= size.w; left += size.cw / 2) {
    for (let top = 0; top <= size.h; top += size.ch / 2) {
      await grid.evaluate(scrollGrid, [left, top]);
      const off = await grid.evaluate(offCentre, a);
      if (!off) continue;
      await grid.evaluate(scrollGrid, [off[0], off[1], 1]);
      await expect.poll(() => grid.evaluate(shownIn, a), { message: `${a} is on screen in the grid` }).toBe(true);
      return cellIn(grid, a);
    }
  }
  throw new Error(`${a} is not on the sheet`);
}

test.describe('the working paper viewer at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test(`${SOFP}!D9 shows =D114+D53 and outlines its two precedents`, async ({ page }) => {
    const { grid, errors } = await openViewer(page);
    await tab(page, SOFP).click();
    await expect(tab(page, SOFP)).toHaveAttribute('aria-selected', 'true');

    await cellIn(grid, 'D9').click();
    await expect(nameBox(page)).toHaveValue('D9');
    await expect(formulaBar(page)).toHaveText('=D114+D53');
    await expect(cellIn(grid, 'D9')).toHaveAttribute('aria-selected', 'true');
    await expectColumnAligned(grid, 'D5', 'D20');
    // The inspector lists the two, in the formula's order.
    const inspector = page.getByRole('complementary', { name: 'Inspector' });
    await expect(inspector.locator('[data-inspector-formula]')).toHaveText('=D114+D53');
    await expect(inspector.locator('[data-chip]')).toHaveCount(2);
    expect(await inspector.locator('[data-chip]').evaluateAll((els) => els.map((e) => e.getAttribute('data-chip')))).toEqual(['D114', 'D53']);

    for (const a of ['D53', 'D114']) {
      const cell = await reveal(grid, a);
      const outline = grid.locator(`[data-precedent="${a}"]`);
      await expect(outline).toHaveCount(1);
      await expect(outline).toBeVisible();
      expect(await outline.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('dashed');
      // It lies over the precedent itself.
      const [over, under] = [await outline.boundingBox(), await cell.boundingBox()];
      expect(over && under && Math.abs(over.x - under.x) < 1 && Math.abs(over.y - under.y) < 1).toBe(true);
    }
    // Nothing else on the sheet is outlined: every outline from top to bottom, the precedents' column in view.
    const seen = new Set<string>();
    const { h, ch } = await grid.evaluate((el) => ({ h: el.scrollHeight, ch: el.clientHeight }));
    for (let top = 0; top <= h; top += ch / 2) {
      await grid.evaluate(scrollGrid, [0, top]);
      for (const p of await grid.locator('[data-precedent]').evaluateAll((els) => els.map((e) => e.getAttribute('data-precedent')!))) seen.add(p);
    }
    expect([...seen].sort()).toEqual(['D114', 'D53']);
    expect(errors).toEqual([]);
  });

  test(`a reference to '${ELIM}' jumps there and Back returns`, async ({ page }) => {
    const { grid, errors } = await openViewer(page);
    await tab(page, SOFP).click();
    const af26 = await reveal(grid, 'AF26');
    await af26.click();
    await expect(nameBox(page)).toHaveValue('AF26');
    await expect(formulaBar(page)).toHaveText(`='${ELIM}'!G82`);

    await page.getByRole('button', { name: `Go to '${ELIM}'!G82` }).click();
    await expect(tab(page, ELIM)).toHaveAttribute('aria-selected', 'true');
    await expect(tab(page, SOFP)).toHaveAttribute('aria-selected', 'false');
    await expect(nameBox(page)).toHaveValue('G82');
    await expect(formulaBar(page)).toHaveText("=-'Detail Elimination BS'!L12");
    await expect(page).toHaveURL(/[?&]sheet=Elimination\+2024&cell=G82$/);
    await expect(cellIn(grid, 'G82')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => grid.evaluate(shownIn, 'G82'), { message: 'G82 is on screen in the grid' }).toBe(true);
    await expect(grid.locator('[data-selected="G82"]')).toBeVisible();

    await page.getByRole('button', { name: `Back to '${SOFP}'!AF26` }).click();
    await expect(tab(page, SOFP)).toHaveAttribute('aria-selected', 'true');
    await expect(nameBox(page)).toHaveValue('AF26');
    await expect(formulaBar(page)).toHaveText(`='${ELIM}'!G82`);
    await expect.poll(() => grid.evaluate(shownIn, 'AF26'), { message: 'AF26 is on screen in the grid' }).toBe(true);
    // Nothing further back.
    await expect(page.getByRole('button', { name: /^Back to / })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('a click on an empty cell a label runs on into selects that cell, as in Excel', async ({ page }) => {
    const { grid, errors } = await openViewer(page, `?sheet=${encodeURIComponent(SOFP)}&cell=D9`);
    await expect(cellIn(grid, 'B15')).toHaveText('Cash and cash equivalents');
    const c15 = (await cellIn(grid, 'C15').boundingBox())!;
    const label = (await cellIn(grid, 'B15').locator('span').boundingBox())!;
    // The label runs on over the left of C15, which is empty.
    expect(label.x + label.width).toBeGreaterThan(c15.x + 20);
    await expect(cellIn(grid, 'C15')).toHaveText('');
    await page.mouse.click(c15.x + 20, c15.y + c15.height / 2);
    await expect(nameBox(page)).toHaveValue('C15');
    await expect(cellIn(grid, 'C15')).toHaveAttribute('aria-selected', 'true');
    // A click on the label within its own cell selects the label's cell.
    const b15 = (await cellIn(grid, 'B15').boundingBox())!;
    await page.mouse.click(b15.x + 10, b15.y + b15.height / 2);
    await expect(nameBox(page)).toHaveValue('B15');
    expect(errors).toEqual([]);
  });

  test('a click on a cell reaches the formula bar in under 50 ms', async ({ page }) => {
    const { grid } = await openViewer(page);
    await tab(page, SOFP).click();
    // The first click on the sheet, not measured.
    await cellIn(grid, 'D9').click();
    await expect(formulaBar(page)).toHaveText('=D114+D53');

    const cells = ['E9', 'D15', 'D17', 'D9', 'D18', 'E9', 'D23', 'D9'];
    const times = await grid.evaluate(async (el, list) => {
      const bar = document.querySelector('[data-formula-bar]')!;
      const out: { a: string; dom: number; frame: number }[] = [];
      for (const a of list) {
        const cell = el.querySelector<HTMLElement>(`[role="gridcell"][data-a="${a}"]`);
        if (!cell) throw new Error(`${a} is not rendered`);
        const before = bar.textContent;
        // From a quiet frame.
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
        const t = await new Promise<{ dom: number; frame: number }>((resolve, reject) => {
          let t0 = 0;
          const mo = new MutationObserver(() => {
            if (bar.textContent === before) return;
            const dom = performance.now() - t0;
            mo.disconnect();
            requestAnimationFrame(() => resolve({ dom, frame: performance.now() - t0 }));
          });
          mo.observe(bar, { childList: true, characterData: true, subtree: true });
          setTimeout(() => reject(new Error(`the formula bar did not change after a click on ${a}`)), 2000);
          t0 = performance.now();
          cell.click();
        });
        out.push({ a, ...t });
      }
      return out;
    }, cells);

    console.log(`click-to-inspect, ms (to the DOM / to the next frame): ${times.map((t) => `${t.a} ${t.dom.toFixed(1)}/${t.frame.toFixed(1)}`).join(', ')}`);
    expect(times).toHaveLength(cells.length);
    for (const t of times) expect(t.dom, `${t.a}, click to the formula bar`).toBeLessThan(50);
    const frames = times.map((t) => t.frame).sort((x, y) => x - y);
    expect(frames[Math.floor(frames.length / 2)], 'the median click to the next frame').toBeLessThan(50);
    await expect(nameBox(page)).toHaveValue('D9');
  });

  test('a link with ?sheet=&cell= opens that cell', async ({ page }) => {
    const { grid, errors } = await openViewer(page, `?sheet=${encodeURIComponent(ELIM)}&cell=G82`);
    await expect(tab(page, ELIM)).toHaveAttribute('aria-selected', 'true');
    await expect(nameBox(page)).toHaveValue('G82');
    await expect(formulaBar(page)).toHaveText("=-'Detail Elimination BS'!L12");
    await expect(cellIn(grid, 'G82')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('complementary', { name: 'Inspector' }).locator('[data-inspector-address]')).toHaveText(`'${ELIM}'!G82`);
    expect(errors).toEqual([]);
  });

  test('a link opens the page at the viewer, the cell it names on screen', async ({ page }) => {
    await page.goto(`${PAGE}?sheet=${encodeURIComponent(SOFP)}&cell=D9`);
    const grid = page.locator('[data-workbook-viewer] [role="grid"]');
    await expect(cellIn(grid, 'D9')).toBeInViewport({ timeout: 15_000 });
    await expect(formulaBar(page)).toBeInViewport();
  });

  test('an error cell shows its error, in colour and in words', async ({ page }) => {
    const { grid } = await openViewer(page, `?sheet=${encodeURIComponent('CF 23 Restated')}&cell=O4`);
    const o4 = cellIn(grid, 'O4');
    await expect(o4).toHaveAttribute('aria-selected', 'true');
    await expect(o4).toHaveAttribute('data-kind', 'error');
    await expect(o4).toHaveText('#REF!');
    await expect(o4).toHaveAttribute('aria-label', /, error$/);
    const fill = await o4.evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(fill).not.toBe('rgba(0, 0, 0, 0)');
    expect(fill).not.toBe(await cellIn(grid, 'O5').evaluate((e) => getComputedStyle(e).backgroundColor));
    await expect(formulaBar(page)).toHaveText('=O97');
    const inspector = page.getByRole('complementary', { name: 'Inspector' });
    await expect(inspector).toContainText("Excel could not work this cell out; the error is the workbook's own");
  });

  test('the arrows move the selection', async ({ page }) => {
    const { grid } = await openViewer(page);
    await tab(page, SOFP).click();
    await cellIn(grid, 'D9').click();
    await expect(grid).toBeFocused();
    const steps: [string, string][] = [
      ['ArrowDown', 'D10'],
      ['ArrowRight', 'E10'],
      ['ArrowUp', 'E9'],
      ['ArrowLeft', 'D9'],
      ['ArrowDown', 'D10'],
      ['ArrowDown', 'D11'],
      ['ArrowDown', 'D12'],
    ];
    for (const [key, to] of steps) {
      await page.keyboard.press(key);
      await expect(nameBox(page)).toHaveValue(to);
      await expect(cellIn(grid, to)).toHaveAttribute('aria-selected', 'true');
      await expect(grid).toHaveAttribute('aria-activedescendant', new RegExp(`-${to}$`));
    }
    await expect(page).toHaveURL(/cell=D12$/);
    // Ctrl+Home: the first cell past the frozen panes (the sheet freezes 11 rows and 3 columns).
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await expect(nameBox(page)).toHaveValue('E13');
    await page.keyboard.press('Control+Home');
    await expect(nameBox(page)).toHaveValue('D12');
  });
});

test.describe('the working paper viewer with the browser throttling history updates', () => {
  // Playwright starts Chromium with IPC flooding protection off. A visitor's Chromium has it on, and drops
  // history updates past about 200 in 10 s; Safari throws past 100.
  test('a held arrow key moves the selection 260 rows, and the URL follows', async ({ browserType, baseURL }) => {
    const browser = await browserType.launch({ ignoreDefaultArgs: ['--disable-ipc-flooding-protection'] });
    try {
      const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await stubNetwork(page);
      const sheet = '-BS-RP Disclosure 2023';
      const { grid, errors } = await openViewer(page, `?sheet=${encodeURIComponent(sheet)}&cell=E1`);
      await expect(nameBox(page)).toHaveValue('E1');
      await grid.focus();
      for (let i = 0; i < 260; i++) await page.keyboard.press('ArrowDown');
      await expect(nameBox(page)).toHaveValue('E261');
      await expect(cellIn(grid, 'E261')).toHaveAttribute('aria-selected', 'true');
      await expect(page).toHaveURL(/[?&]cell=E261$/);
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  });
});

test.describe('the working paper viewer at 390', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('a link opens the page at the viewer, the cell it names on screen below the frozen rows', async ({ page }) => {
    await page.goto(`${PAGE}?sheet=${encodeURIComponent(SOFP)}&cell=AF26`);
    const grid = page.locator('[data-workbook-viewer] [role="grid"]');
    await expect(cellIn(grid, 'AF26')).toBeInViewport({ ratio: 1, timeout: 15_000 });
    await expect(formulaBar(page)).toBeInViewport();
    await expect(formulaBar(page)).toHaveText(`='${ELIM}'!G82`);
  });

  test('the inspector is a bottom sheet and the tabs scroll', async ({ page }) => {
    const { grid, errors } = await openViewer(page, `?sheet=${encodeURIComponent(SOFP)}&cell=D9`);
    const inspector = page.getByRole('complementary', { name: 'Inspector' });
    // Closed until asked for, on a phone.
    await expect(inspector).toBeHidden();
    await page.getByRole('button', { name: 'Open the inspector' }).click();
    await expect(inspector).toBeVisible();
    expect(await inspector.evaluate((e) => getComputedStyle(e).position)).toBe('fixed');
    const box = (await inspector.boundingBox())!;
    expect(box.x).toBeCloseTo(0, 0);
    expect(box.width).toBeCloseTo(390, 0);
    expect(Math.round(box.y + box.height)).toBe(844);
    expect(box.height).toBeLessThanOrEqual(844 * 0.55 + 1);
    await expect(inspector.locator('[data-inspector-formula]')).toHaveText('=D114+D53');
    await inspector.getByRole('button', { name: 'Close the inspector' }).click();
    await expectColumnAligned(grid, 'D5', 'D20');
    await expect(inspector).toBeHidden();

    // The tabs: wider than the strip, scrolled to show the open one, and scrollable.
    const strip = page.getByRole('tablist', { name: 'Sheets' });
    const s = await strip.evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth, left: e.scrollLeft, overflow: getComputedStyle(e).overflowX }));
    expect(s.sw).toBeGreaterThan(s.cw);
    expect(s.overflow).toBe('auto');
    expect(s.left).toBeGreaterThan(0);
    await expect(tab(page, SOFP)).toBeInViewport({ ratio: 1 });
    await strip.evaluate((e) => e.scrollTo(e.scrollWidth, 0));
    await expect(tab(page, 'WP Investment')).toBeInViewport({ ratio: 0.95 });
    await tab(page, 'WP Investment').click();
    await expect(tab(page, 'WP Investment')).toHaveAttribute('aria-selected', 'true');
    await expect(grid).toHaveAttribute('aria-label', /^WP Investment sheet\./);

    // The page itself does not scroll sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(errors).toEqual([]);
  });
});
