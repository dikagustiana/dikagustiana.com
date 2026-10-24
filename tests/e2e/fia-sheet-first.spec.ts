import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import ExcelJS from 'exceljs';
import { mockSupabase } from './mockSupabase';

/**
 * The sheet-first model page (docs/company-models/sheet-first PRD §6), in the preview build
 * (playwright.fia.config.ts, VITE_FIA_PREVIEW=true) over the SYNTHETIC fixtures:
 *
 * - K1: at 1440×900 the stage pills, the company tabs, the company bar, the key figures, the model's
 *   toolbar, the formula bar and at least 15 rows of the grid are on screen without a scroll.
 * - K2: for ten cells a sheet, on every sheet, the name box's address and the grid's own letter and row
 *   number are the cell's address in the downloaded .xlsx, which holds the same formula or value there.
 * - K6: rows are 28px under a mouse and at least 44px under a finger; every control outside the grid is
 *   at least 44px either way.
 * - K7: the grid is one tab stop; arrows, Home and End select; F2 and Enter edit an assumption; the sheet
 *   tabs move with the arrows; Escape leaves full screen.
 * - K8: axe finds no WCAG 2 A or AA violation (contrast included), on the model, the Checks sheet and with
 *   Connections on. The site is light only (docs/DECISIONS.md, 2026-10-09), so there is no dark theme.
 * - K9: at 360, 768, 1024 and 1440 the page never scrolls sideways; only the grid does, inside its card.
 */

const PAGE = '/finance/finance-in-action/xcoa';

/** A figure as the page writes it: `1.234,5`, `(665)`, `15,5%` (a fraction). */
function houseNumber(text: string): number {
  const t = text.trim();
  const n = Number(t.replace(/[()%\s]/g, '').replace(/\./g, '').replace(',', '.'));
  const signed = t.startsWith('(') ? -n : n;
  return t.endsWith('%') || t.endsWith('%)') ? signed / 100 : signed;
}
const nameBox = (page: Page) => page.getByRole('textbox', { name: 'Cell address' });
const grid = (page: Page) => page.getByRole('grid');

async function open(page: Page, path = PAGE) {
  await mockSupabase(page);
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(path);
  await expect(grid(page)).toBeVisible();
}

test.describe('K1: the model on the first screen', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('shows the head, the key figures, the toolbar, the formula bar and fifteen rows of the grid', async ({ page }) => {
    await open(page);
    const inView = async (selector: string) => {
      const box = await page.locator(selector).first().boundingBox();
      expect(box, selector).not.toBeNull();
      expect(box!.y, selector).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height, selector).toBeLessThanOrEqual(900);
    };
    await inView('nav[aria-label="Go to a stage of the chain"]');
    await inView('nav[aria-label="Companies in this stage"]');
    await inView('main h1');
    await inView('section[aria-label="Key figures"]');
    await inView('#fia-model h2');
    await inView('[role="group"][aria-label="Formula bar"]');
    const rows = await page.evaluate(() => {
      const viewport = document.querySelector('[data-fia-grid]')!.getBoundingClientRect();
      const bottom = Math.min(viewport.bottom, window.innerHeight);
      return Array.from(document.querySelectorAll('[role="grid"] tbody tr')).filter((tr) => {
        const r = tr.getBoundingClientRect();
        return r.top >= viewport.top && r.bottom <= bottom + 0.5;
      }).length;
    });
    expect(rows).toBeGreaterThanOrEqual(15);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('opens on the latest reported quarter and the forecast (D-S7)', async ({ page }) => {
    await open(page);
    const visible = async (name: RegExp) => {
      const header = page.getByRole('columnheader', { name });
      const box = (await header.boundingBox())!;
      const view = (await page.locator('[data-fia-grid]').boundingBox())!;
      return box.x >= view.x && box.x + box.width <= view.x + view.width + 0.5;
    };
    expect(await visible(/^Q4 25$/)).toBe(true);
    expect(await visible(/^Q2 26E forecast$/)).toBe(true);
    expect(await visible(/^Q1 24$/)).toBe(false);
  });
});

test.describe('K2: the grid’s addresses are the workbook’s', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('ten cells a sheet, on every sheet, read back from the downloaded .xlsx', async ({ page }) => {
    await open(page);
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download .xlsx' }).click()]);
    const file = await download.path();
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(fs.readFileSync(file!));
    let checked = 0;
    for (const sheet of ['Model', 'Reported', 'Assumptions', 'Checks']) {
      await page.getByRole('tab', { name: sheet }).click();
      const ws = book.getWorksheet(sheet)!;
      expect(ws, sheet).toBeTruthy();
      const cells = grid(page).locator('tbody td[role="gridcell"] button');
      const count = await cells.count();
      const picks = Array.from({ length: Math.min(10, count) }, (_, i) => Math.floor(((i + 0.5) * count) / Math.min(10, count)));
      for (const i of picks) {
        const cell = cells.nth(i);
        await cell.scrollIntoViewIfNeeded();
        // The Cell column of Checks goes to the checked cell; the column beside it is selected instead.
        const label = (await cell.getAttribute('aria-label'))!;
        const target = sheet === 'Checks' && label.includes('go to the cell') ? cells.nth(i + 1) : cell;
        await target.click();
        const address = await nameBox(page).inputValue();
        const m = /^([A-Z]+)!([A-Z]+)(\d+)$/.exec(address);
        expect(m, `${sheet} cell ${i}: ${address}`).not.toBeNull();
        expect(m![1]).toBe(sheet.toUpperCase());
        const [, , col, row] = m!;
        // The grid's own letter and number, lit for the selection.
        await expect(grid(page).locator('thead tr:first-child th.bg-secondary [data-fia-letter]')).toHaveText(col);
        await expect(grid(page).locator('tbody td.bg-secondary')).toHaveText(row);
        const x = ws.getCell(`${col}${row}`);
        const bar = (await page.locator('[data-formula-bar]').innerText()).trim();
        if (x.formula) expect(bar, `${sheet}!${col}${row}`).toBe(`=${x.formula}`);
        else if (typeof x.value === 'number') expect(Math.abs(houseNumber(bar.split(', from ')[0]) - x.value), `${sheet}!${col}${row}: ${bar}`).toBeLessThanOrEqual(Math.max(Math.abs(x.value) * 0.005, 0.006));
        else expect(bar, `${sheet}!${col}${row}`).toBe(x.value === null ? 'Not disclosed' : String(x.value));
        // Column A of the row is the row's label, in both.
        const rowHeader = (await target.locator('xpath=ancestor::tr/th').innerText()).trim();
        expect(String(ws.getCell(`A${row}`).value).startsWith(rowHeader.replace(/…$/, ''))).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(32);
  });
});

test.describe('K6: row heights and target sizes', () => {
  const controlsOutsideTheGrid = (page: Page) =>
    page.evaluate(() => {
      const scopes = [
        'nav[aria-label="Go to a stage of the chain"]',
        'nav[aria-label="Companies in this stage"]',
        'main header',
        '#fia-model',
        'nav[aria-labelledby]',
      ];
      const out: { name: string; w: number; h: number }[] = [];
      for (const scope of scopes) {
        for (const el of document.querySelectorAll<HTMLElement>(`${scope} :is(a[href], button, input, select, [role="tab"], [role="switch"])`)) {
          if (el.closest('[role="grid"]')) continue;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (r.width <= 1 || r.height <= 1 || cs.visibility === 'hidden' || cs.display === 'none') continue;
          out.push({ name: (el.getAttribute('aria-label') ?? el.textContent ?? el.tagName).trim().slice(0, 40), w: r.width, h: r.height });
        }
      }
      return out;
    });

  test.describe('under a mouse', () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test('rows are 28px, controls at least 44px', async ({ page }) => {
      await open(page);
      expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true);
      const heights = await grid(page).locator('tbody tr').evaluateAll((trs) => trs.map((tr) => tr.getBoundingClientRect().height));
      for (const h of heights) expect(h).toBeCloseTo(28, 0);
      const controls = await controlsOutsideTheGrid(page);
      expect(controls.length).toBeGreaterThan(20);
      for (const c of controls) {
        expect(c.h, c.name).toBeGreaterThanOrEqual(43.5);
        expect(c.w, c.name).toBeGreaterThanOrEqual(43.5);
      }
    });
  });

  test.describe('under a finger', () => {
    test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true });
    test('rows are at least 44px, controls at least 44px', async ({ page }) => {
      await open(page);
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
      const heights = await grid(page).locator('tbody td[role="gridcell"] button').evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect().height));
      for (const h of heights) expect(h).toBeGreaterThanOrEqual(43.5);
      for (const c of await controlsOutsideTheGrid(page)) {
        expect(c.h, c.name).toBeGreaterThanOrEqual(43.5);
        expect(c.w, c.name).toBeGreaterThanOrEqual(43.5);
      }
    });
  });
});

test.describe('K7: the keyboard', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('one tab stop for the grid, arrows, Home and End, F2 and Enter on an assumption, tabs by arrow, Escape out of full screen', async ({ page }) => {
    await open(page);
    await nameBox(page).focus();
    // From the name box, the next stops are the formula bar's (none, nothing is selected), then the grid.
    await page.keyboard.press('Tab');
    const focused = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '');
    expect(await focused()).toMatch(/^Coal sales volume, Q1 24/);
    expect(await grid(page).locator('button[tabindex="0"]').count()).toBe(1);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    expect(await nameBox(page).inputValue()).toBe('MODEL!D3');
    await page.keyboard.press('End');
    expect(await nameBox(page).inputValue()).toBe('MODEL!M3');
    await page.keyboard.press('Home');
    expect(await nameBox(page).inputValue()).toBe('MODEL!C3');
    // Out of the grid in one Tab: the first sheet tab.
    await page.keyboard.press('Tab');
    expect(await focused()).toBe('Model');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Assumptions' })).toHaveAttribute('aria-selected', 'true');
    // An assumption: F2 edits, Escape gives up, Enter edits too.
    await page.getByRole('button', { name: /^Realised price per tonne, Q2 26E: 720, Assumption/ }).focus();
    await page.keyboard.press('F2');
    await expect(page.getByRole('textbox', { name: /Realised price per tonne, new value/ })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /^Realised price per tonne, Q2 26E: 720/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.type('650');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /^Realised price per tonne, Q2 26E: 650, Assumption/ })).toBeFocused();
    // Full screen, then Escape back to the button.
    await page.getByRole('button', { name: 'Full screen' }).click();
    await expect(page.getByRole('dialog', { name: 'The model' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Full screen' })).toBeFocused();
  });

  test('the name box goes to a typed cell and brings it into view', async ({ page }) => {
    await open(page);
    await nameBox(page).fill('model!c27');
    await page.keyboard.press('Enter');
    const cell = page.getByRole('button', { name: /^Profit attributable to owners, Q1 24/ });
    await expect(cell).toBeFocused();
    await expect(cell).toBeInViewport();
    await nameBox(page).fill('B9');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toContainText("B9 holds a row's unit, not a value.");
    await expect(nameBox(page)).toBeFocused();
  });
});

test.describe('K8: axe', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  const axe = (page: Page) => new AxeBuilder({ page }).include('#main-content').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();

  test('finds no violation on the model, on Checks, or with Connections on and a cell selected', async ({ page }) => {
    await open(page);
    expect((await axe(page)).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    await page.getByRole('tab', { name: 'Checks' }).click();
    await page.getByRole('button', { name: /^Cost of revenue, FY 25, Difference/ }).click();
    expect((await axe(page)).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    await open(page, `${PAGE}?connections=on`);
    await page.getByRole('button', { name: /^Revenue, FY 25: 7\.270, Formula/ }).click();
    expect((await axe(page)).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
});

test.describe('K9: no sideways scroll of the page', () => {
  for (const width of [360, 768, 1024, 1440]) {
    test.describe(`${width}px`, () => {
      test.use({ viewport: { width, height: 900 } });
      test('only the grid scrolls sideways, inside its card', async ({ page }) => {
        await open(page);
        const sizes = () => page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
        let s = await sizes();
        expect(s.scroll).toBeLessThanOrEqual(s.client);
        const viewport = page.locator('[data-fia-grid]');
        expect(await viewport.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
        // With a cell selected (the inspector opens along the bottom below 1280px) and with Connections on.
        await page.getByRole('button', { name: /^Revenue, Q4 25: 2\.100, Formula/ }).click();
        s = await sizes();
        expect(s.scroll).toBeLessThanOrEqual(s.client);
        await open(page, `${PAGE}?connections=on`);
        s = await sizes();
        expect(s.scroll).toBeLessThanOrEqual(s.client);
      });
    });
  }
});
