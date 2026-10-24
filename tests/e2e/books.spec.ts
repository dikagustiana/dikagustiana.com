import { test, expect, type Page } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * /books-academia on the production bundle (site cleanup 2026-10, PRD §D), with every Supabase call answered
 * in the test: the empty state, shelves that open and close with the first open, a card opening the dialog
 * the URL names, Download and Buy, a deep link, the old /books/… addresses, and the page at 390 px.
 */

const SHELVES = [
  { id: 's1', slug: 'corporate-finance', name: 'Corporate Finance', sort_order: 0 },
  { id: 's2', slug: 'accounting', name: 'Accounting', sort_order: 1 },
];
const base = {
  author: null,
  year: null,
  purchase_url: null,
  license_note: null,
  filepath: null,
  filename: null,
  mime_type: null,
  size_bytes: null,
  cover_path: null,
  synopsis_json: null,
  synopsis_html: null,
  synopsis_excerpt: null,
  published: true,
  deleted_at: null,
};
const BOOKS = [
  {
    ...base,
    id: 'b1',
    slug: 'open-corporate-finance',
    title: 'Open Corporate Finance',
    author: 'A. Author',
    year: 2023,
    shelf_id: 's1',
    access: 'free',
    license_note: 'CC BY 4.0',
    filepath: 'files/open-corporate-finance/1-ocf.pdf',
    synopsis_html: '<p>A free textbook on <em>corporate finance</em>.</p>',
    synopsis_excerpt: 'A free textbook on corporate finance.',
    sort_order: 0,
  },
  { ...base, id: 'b2', slug: 'valuation', title: 'Valuation', author: 'B. Writer', year: 2020, shelf_id: 's1', access: 'paid', purchase_url: 'https://example.com/valuation', sort_order: 1 },
  { ...base, id: 'b3', slug: 'advanced-accounting', title: 'Advanced Accounting', shelf_id: 's2', access: 'paid', purchase_url: 'https://example.com/aa', sort_order: 0 },
];

async function open(page: Page, url = '/books-academia', tables: Record<string, unknown[]> = { book_shelves: SHELVES, books_uploads: BOOKS }) {
  await mockSupabase(page, { tables });
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(url);
  // By role it is hidden while a linked book's dialog is open, so by tag.
  await expect(page.locator('main h1')).toHaveText('Books');
}

// The header has its own Accounting menu button: the shelves are the main column's.
const shelf = (page: Page, name: string) => page.locator('main').getByRole('button', { name: new RegExp(`^${name}`) });

test.describe('the Books page at 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('with no published book, it says so quietly; no dead end, no shelves', async ({ page }) => {
    await open(page, '/books-academia', {});
    await expect(page.getByText('No books on the shelves yet.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Add a book/ })).toHaveCount(0);
  });

  test('shelves open and close; the first is open; a card opens the dialog the URL names; Download and Buy', async ({ page }) => {
    await open(page);
    await expect(shelf(page, 'Corporate Finance')).toHaveAttribute('aria-expanded', 'true');
    await expect(shelf(page, 'Accounting')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', { name: /Advanced Accounting/ })).toHaveCount(0);
    await shelf(page, 'Accounting').click();
    await expect(page.getByRole('button', { name: /Advanced Accounting/ })).toBeVisible();
    // Enter on the header closes it again.
    await shelf(page, 'Accounting').focus();
    await page.keyboard.press('Enter');
    await expect(shelf(page, 'Accounting')).toHaveAttribute('aria-expanded', 'false');

    await page.getByRole('button', { name: /Open Corporate Finance/ }).click();
    await expect(page).toHaveURL(/[?&]book=open-corporate-finance$/);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Open Corporate Finance' })).toBeVisible();
    await expect(dialog.getByText('A. Author · 2023 · Corporate Finance')).toBeVisible();
    await expect(dialog.getByText('License: CC BY 4.0')).toBeVisible();
    const download = dialog.getByRole('link', { name: /Download PDF/ });
    await expect(download).toHaveAttribute('download', '');
    expect(await download.getAttribute('href')).toContain('files/open-corporate-finance/1-ocf.pdf');
    await expect(page).toHaveTitle(/Open Corporate Finance/);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page).not.toHaveURL(/book=/);

    await page.getByRole('button', { name: /Valuation/ }).click();
    const buy = page.getByRole('dialog').getByRole('link', { name: 'Buy Valuation (opens in a new tab)' });
    await expect(buy).toHaveAttribute('href', 'https://example.com/valuation');
    await expect(buy).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('dialog').getByRole('link', { name: /Download/ })).toHaveCount(0);
  });

  test('the shelves stay as the reader left them on the next visit', async ({ page }) => {
    await open(page);
    await shelf(page, 'Corporate Finance').click();
    await shelf(page, 'Accounting').click();
    await page.reload();
    await expect(shelf(page, 'Accounting')).toHaveAttribute('aria-expanded', 'true');
    await expect(shelf(page, 'Corporate Finance')).toHaveAttribute('aria-expanded', 'false');
  });

  test('a link to a book opens its dialog, and the column is centred under its breadcrumb', async ({ page }) => {
    await open(page, '/books-academia?book=advanced-accounting');
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Advanced Accounting' })).toBeVisible();
    await page.keyboard.press('Escape');
    const h1 = (await page.getByRole('heading', { name: 'Books', level: 1 }).boundingBox())!;
    const crumb = (await page.locator('div.border-b.py-3 nav').boundingBox())!;
    expect(Math.abs(h1.x - crumb.x)).toBeLessThanOrEqual(1);
    const list = (await page.locator('ul.divide-y').first().boundingBox())!;
    expect(Math.abs(list.x + list.width / 2 - 720)).toBeLessThanOrEqual(2);
  });

  test('the old addresses land on their shelf and book', async ({ page }) => {
    await open(page, '/books/accounting');
    await expect(page).toHaveURL(/\/books-academia\?shelf=accounting$/);
    await expect(shelf(page, 'Accounting')).toHaveAttribute('aria-expanded', 'true');
    // An id the database does not answer for lands on its shelf.
    await page.goto('/books/accounting/0000/read');
    await expect(page).toHaveURL(/\/books-academia\?shelf=accounting$/);
  });
});

test.describe('the Books page at 390', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('two books a row, a full-screen dialog, and no sideways scroll', async ({ page }) => {
    await open(page);
    const cards = page.locator('[data-book]');
    await expect(cards).toHaveCount(2);
    const [a, b] = [(await cards.nth(0).boundingBox())!, (await cards.nth(1).boundingBox())!];
    expect(Math.abs(a.y - b.y)).toBeLessThan(1);
    expect(b.x).toBeGreaterThan(a.x + a.width);
    await cards.nth(0).click();
    // Once its opening zoom has run, the dialog fills the screen.
    const dialog = page.getByRole('dialog');
    await expect.poll(async () => Math.round((await dialog.boundingBox())?.width ?? 0)).toBe(390);
    await expect.poll(async () => Math.round((await dialog.boundingBox())?.height ?? 0)).toBe(844);
    // The cover stands above the title.
    const [cover, title] = [(await dialog.locator('.aspect-\\[2\\/3\\]').boundingBox())!, (await dialog.getByRole('heading').boundingBox())!];
    expect(cover.y + cover.height).toBeLessThanOrEqual(title.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
