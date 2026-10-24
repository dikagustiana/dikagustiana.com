/**
 * The library's "after" screenshots (docs/prd/library-phase-2 §2 step 5), from a running dev server:
 *
 *   node scripts/books/screenshots.mjs <base url> <out dir>
 *
 * Expects a site whose shelves hold "a-short-book-of-ledgers" (free, ai_ready, its text extracted from
 * tests/fixtures/books/text.pdf) and "valuation" (paid), and a book-ask function answering. The reader's file
 * comes from the `book-file` function; set BOOK_PDF_URL to answer that call here with a URL to the sample
 * PDF instead (a test stack without R2 credentials). Writes:
 *
 *   shelf-full.png            /books-academia, the full shelf
 *   shelf-reduced-motion.png  the same with reduced motion, a spine focused from the keyboard (outline, no tilt)
 *   cover-free.png            a free book's cover page: Read and Download
 *   cover-paid.png            a paid book's cover page: Buy
 *   reader-margin.png         the reader's text view, the margin open, an answer citing [¶n]
 *   reader-cited.png          after a [¶n] is clicked: the paragraph scrolled to and marked
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [base = 'http://127.0.0.1:8080', out = 'docs/prd/library-phase-2/screenshots/after'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const shot = (page, name, opts = {}) => page.screenshot({ path: path.join(out, name), ...opts });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
if (process.env.BOOK_PDF_URL) {
  await page.route('**/functions/v1/book-file', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, url: process.env.BOOK_PDF_URL, contentType: 'application/pdf', filename: 'A Short Book of Ledgers.pdf' }),
    }),
  );
}

// The full shelf, one spine reached for.
await page.goto(`${base}/books-academia`);
await page.getByRole('heading', { level: 2 }).first().waitFor();
await page.waitForTimeout(600);
await page.locator('[data-spine]').first().hover();
await page.waitForTimeout(400);
await shot(page, 'shelf-full.png');

// Reduced motion: focus from the keyboard shows the outline, the spine stays put.
const reduced = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
const rp = await reduced.newPage();
await rp.goto(`${base}/books-academia`);
await rp.getByRole('heading', { level: 2 }).first().waitFor();
await rp.locator('[data-spine]').first().focus();
await rp.keyboard.press('ArrowRight');
await rp.keyboard.press('ArrowRight');
await rp.locator('[data-spine]').nth(2).hover();
await rp.waitForTimeout(400);
await shot(rp, 'shelf-reduced-motion.png');
await reduced.close();

// Cover pages.
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${base}/books-academia/a-short-book-of-ledgers`);
await page.getByRole('link', { name: 'Read' }).waitFor();
await shot(page, 'cover-free.png');
await page.goto(`${base}/books-academia/valuation`);
await page.getByRole('link', { name: /^Buy / }).waitFor();
await shot(page, 'cover-paid.png');

// The reader: text view, a passage selected, a question asked, the answer with its [¶n].
await page.goto(`${base}/books-academia/a-short-book-of-ledgers/read`);
await page.getByRole('img', { name: /page 1 of/ }).waitFor();
await page.getByRole('button', { name: 'Text' }).click();
await page.locator('#para-11').click({ clickCount: 3 });
await page.getByRole('button', { name: 'Ask', exact: true }).click();
const margin = page.getByRole('complementary', { name: 'Question in the margin' });
await margin.getByLabel('Your question about the passage').fill('Why is closing the year done this way?');
await margin.getByRole('button', { name: 'Ask', exact: true }).click();
await margin.locator('[data-cite]').first().waitFor();
await page.waitForTimeout(500);
await shot(page, 'reader-margin.png');
await margin.locator('[data-cite]').last().click();
await page.waitForTimeout(700);
await shot(page, 'reader-cited.png');

await browser.close();
console.log(`wrote ${fs.readdirSync(out).join(', ')} to ${out}`);
