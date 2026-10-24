import { test, expect, type Page } from '@playwright/test';
import { mockSupabase } from './mockSupabase';
import { BOOKS, SHELVES, fullLibrary } from './libraryFixtures';

/**
 * /books-academia on the production bundle (library phase 2, docs/prd/library-phase-2; before it, site cleanup
 * 2026-10, PRD §D), with every Supabase call answered in the test: the empty state; spines on shelves, walked
 * by keyboard; a spine opening its cover page, with Read and Download or Buy; the full shelf of two hundred
 * books drawn plank by plank; reduced motion; the old addresses; and the pages at 390 px.
 */

async function open(page: Page, url = '/books-academia', tables: Record<string, unknown[]> = { book_shelves: SHELVES, books_uploads: BOOKS }, h1 = 'Books') {
  await mockSupabase(page, { tables });
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(url);
  await expect(page.locator('main h1')).toHaveText(h1);
}

const spines = (page: Page) => page.locator('[data-spine]');

test.describe('the Books page at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('with no published book, it says so quietly; no dead end, no shelves', async ({ page }) => {
    await open(page, '/books-academia', {});
    await expect(page.getByText('No books on the shelves yet.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Add a book/ })).toHaveCount(0);
  });

  test('spines stand on their shelves; the arrow keys walk a shelf; a spine opens its book; Download and Buy', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { name: 'Corporate Finance', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Accounting', level: 2 })).toBeVisible();
    await expect(spines(page)).toHaveCount(3);
    await expect(page.locator('[data-credit]')).toContainText('adapted from Gloss by Hassan El Mghari, with permission');

    // Tab reaches the first shelf's first spine; → walks on, ← back; Enter opens.
    const first = page.getByRole('button', { name: 'Open Corporate Finance, A. Author, 2023' });
    await first.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('button', { name: 'Valuation, B. Writer, 2020, to buy' })).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(first).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/books-academia\/open-corporate-finance$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Open Corporate Finance' })).toBeVisible();
    await expect(page.getByText('A. Author · 2023 · Corporate Finance')).toBeVisible();
    await expect(page.getByText('License: CC BY 4.0')).toBeVisible();
    await expect(page.getByRole('button', { name: /Download PDF/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Read' })).toHaveAttribute('href', '/books-academia/open-corporate-finance/read');
    await expect(page).toHaveTitle(/Open Corporate Finance/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/books-academia\/open-corporate-finance$/);
    await page.goBack();

    await page.getByRole('button', { name: /^Valuation/ }).click();
    const buy = page.getByRole('link', { name: 'Buy Valuation (opens in a new tab)' });
    await expect(buy).toHaveAttribute('href', 'https://example.com/valuation');
    await expect(buy).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('button', { name: /Download/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Read' })).toHaveCount(0);
  });

  test("the dialog's old address lands on the cover page", async ({ page }) => {
    await open(page, '/books-academia?book=advanced-accounting', undefined, 'Advanced Accounting');
    await expect(page).toHaveURL(/\/books-academia\/advanced-accounting$/);
  });

  test('two hundred books: only the planks on screen are drawn, and the walk along a shelf scrolls to the next plank', async ({ page }) => {
    const { shelves, books } = fullLibrary();
    await open(page, '/books-academia', { book_shelves: shelves, books_uploads: books });
    await expect(page.getByRole('heading', { name: 'Economics', level: 2 })).toBeVisible();
    const drawn = await spines(page).count();
    expect(drawn).toBeGreaterThan(0);
    expect(drawn).toBeLessThan(200);
    // The case is as tall as all its planks, so the page scrolls the whole library.
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(2000);

    // End on the first shelf goes to its last book, on its last plank.
    const shelf = page.getByRole('list', { name: 'Economics' }).first();
    await shelf.getByRole('button').first().focus();
    await page.keyboard.press('End');
    const last = books.filter((b) => b.shelf_id === 'fs0').at(-1)!;
    await expect(page.locator(`[data-spine="${last.slug}"]`)).toBeFocused();

    // The last shelf is reachable by scrolling, drawn when it is.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.getByRole('heading', { name: 'Law and the State', level: 2 })).toBeVisible();
  });

  test('a spine lifts and tilts when reached for; with reduced motion it stays put and focus is an outline', async ({ page }) => {
    await open(page);
    const button = page.getByRole('button', { name: /^Open Corporate Finance/ });
    const cloth = button.locator('> span');
    await button.hover();
    await expect.poll(() => cloth.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.mouse.move(0, 0);
    await button.hover();
    await expect.poll(() => cloth.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    await button.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await expect(button).toBeFocused();
    expect(await button.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
    expect(await cloth.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });

  test('sorted by year or author, the same books re-filed', async ({ page }) => {
    await open(page, '/books-academia?sort=year');
    await expect(page.getByRole('radio', { name: 'Year' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['2020s', 'Undated']);
    await page.getByRole('radio', { name: 'Author' }).click();
    await expect(page).toHaveURL(/sort=author/);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['A', 'W', 'Unknown author']);
  });

  test('the old addresses land on their shelf and book', async ({ page }) => {
    await open(page, '/books/accounting');
    await expect(page).toHaveURL(/\/books-academia\?shelf=accounting$/);
    await expect(page.getByRole('heading', { name: 'Accounting', level: 2 })).toBeInViewport();
    // An id the database does not answer for lands on its shelf.
    await page.goto('/books/accounting/0000/read');
    await expect(page).toHaveURL(/\/books-academia\?shelf=accounting$/);
  });
});

test.describe('the Books page at 390', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('spines on one plank, the cover above the title, and no sideways scroll', async ({ page }) => {
    await open(page);
    await expect(spines(page)).toHaveCount(3);
    const [a, b] = [(await spines(page).nth(0).boundingBox())!, (await spines(page).nth(1).boundingBox())!];
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await spines(page).nth(0).click();
    const title = page.getByRole('heading', { level: 1, name: 'Open Corporate Finance' });
    await expect(title).toBeVisible();
    const cover = (await page.locator('[data-cover]').boundingBox())!;
    expect(cover.y + cover.height).toBeLessThanOrEqual((await title.boundingBox())!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
