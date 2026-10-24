import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { mockSupabase } from './mockSupabase';
import { ledgerParagraphs } from '../fixtures/books/ledgersText';
import { textChapterKey, textFiles, textIndexKey } from '../../supabase/functions/_shared/bookText';

/**
 * Library phase 2 in the browser (docs/prd/library-phase-2 §4 Tests), every Supabase call answered in the
 * test: a cover page opening the reader on the sample PDF (tests/fixtures/books/text.pdf, drawn by pdf.js);
 * and a margin question on it, whose [¶12] scrolls the text to paragraph 12. The book-ask function is answered
 * here as it answers: signed URLs to the book's text in R2 (served from the sample book's paragraphs, laid out
 * as extract-paragraphs.ts writes them), the quota, and the answer's stream (meta, delta, done).
 */

const BOOK_ID = 'bbbbbbbb-0000-0000-0000-000000000001';
const SHELVES = [{ id: 's1', slug: 'accounting', name: 'Accounting', sort_order: 0 }];
const LEDGERS = {
  id: BOOK_ID,
  slug: 'a-short-book-of-ledgers',
  title: 'A Short Book of Ledgers',
  author: 'Library Fixture',
  year: 2026,
  shelf_id: 's1',
  access: 'free',
  purchase_url: null,
  license_note: 'Written for these tests (CC0)',
  filepath: 'files/ledgers/1-ledgers.pdf',
  file_store: 'r2',
  filename: 'ledgers.pdf',
  mime_type: 'application/pdf',
  size_bytes: 10_498,
  cover_path: null,
  synopsis_json: null,
  synopsis_html: '<p>Three short chapters on the ledger, the journal and the trial balance.</p>',
  synopsis_excerpt: 'Three short chapters.',
  sort_order: 0,
  published: true,
  deleted_at: null,
  page_count: 4,
  spine_color: null,
  ai_ready: true,
};
const PDF = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/books/text.pdf'));
const PDF_URL = 'https://r2.test/dg-books-public/files/ledgers/1-ledgers.pdf?X-Amz-Signature=test';
const TEXT = textFiles(BOOK_ID, 4, ledgerParagraphs(BOOK_ID));
const R2_FILES: Record<string, unknown> = {
  [textIndexKey(BOOK_ID)]: TEXT.index,
  ...Object.fromEntries(TEXT.chapters.map((c) => [textChapterKey(BOOK_ID, c.chapter), c])),
};

type Ask = (body: Record<string, unknown>) => { status: number; contentType: string; body: string };
const sse = (e: string, d: unknown) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`;

async function open(page: Page, url: string, ask?: Ask) {
  await mockSupabase(page, { tables: { book_shelves: SHELVES, books_uploads: [LEDGERS] } });
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**/functions/v1/book-file', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, url: PDF_URL, contentType: 'application/pdf', filename: 'A Short Book of Ledgers.pdf' }) }),
  );
  await page.route('https://r2.test/**', (r) => {
    const key = new URL(r.request().url()).pathname.replace(/^\/dg-books-public\//, '');
    if (key in R2_FILES) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(R2_FILES[key]), headers: { 'Access-Control-Allow-Origin': '*' } });
    return r.fulfill({ status: 200, contentType: 'application/pdf', body: PDF, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.route('**/functions/v1/book-ask', (r) => {
    const body = r.request().postDataJSON() as Record<string, unknown>;
    if (body.action === 'text') {
      const key = body.part === 'index' ? textIndexKey(BOOK_ID) : textChapterKey(BOOK_ID, Number(body.part));
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, url: `https://r2.test/dg-books-public/${key}?X-Amz-Signature=test` }) });
    }
    if (body.action === 'quota') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"remaining":5}' });
    return r.fulfill(ask ? ask(body) : { status: 503, contentType: 'application/json', body: '{"ok":false}' });
  });
  await page.goto(url);
}

test.use({ viewport: { width: 1440, height: 900 } });

test('the cover opens the reader, which draws the book with pdf.js', async ({ page }) => {
  await open(page, '/books-academia/a-short-book-of-ledgers');
  await expect(page.getByRole('heading', { level: 1, name: 'A Short Book of Ledgers' })).toBeVisible();
  await page.getByRole('link', { name: 'Read' }).click();
  await expect(page).toHaveURL(/\/books-academia\/a-short-book-of-ledgers\/read$/);
  await expect(page.getByRole('img', { name: /A Short Book of Ledgers, page 1 of 4/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/books-academia\/a-short-book-of-ledgers$/);
});

test('a margin question: select, ask, and [¶12] scrolls the reader to paragraph 12', async ({ page }) => {
  let asked: Record<string, unknown> | null = null;
  await open(page, '/books-academia/a-short-book-of-ledgers/read', (body) => {
    asked = body;
    return {
      status: 200,
      contentType: 'text/event-stream',
      body:
        sse('meta', { remaining: 4, context: [1, 15] }) +
        sse('delta', { text: 'Equal totals catch a slip of the pen, not a wrong account [¶6]; ' }) +
        sse('delta', { text: 'the balance sheet is only as good as the ledger [¶12].' }) +
        sse('done', { cited: [6, 12], outside: [], remaining: 4 }),
    };
  });
  await expect(page.getByRole('img', { name: /page 1 of 4/ })).toBeVisible();

  await page.getByRole('button', { name: 'Text' }).click();
  const p4 = page.locator('#para-4');
  await expect(p4).toContainText('The second rule is that every figure is written twice.');
  const p12 = page.locator('#para-12');
  await expect(p12).not.toBeInViewport();

  // A triple click selects the paragraph, as a reader's drag would; Ask appears at its end.
  await p4.click({ clickCount: 3 });
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  const margin = page.getByRole('complementary', { name: 'Question in the margin' });
  await expect(margin.getByRole('heading')).toHaveText('Ask about ¶4');
  await expect(margin.getByText('5 of 5 questions left today')).toBeVisible();
  await expect(p4).toHaveAttribute('data-quoted', 'true');
  await margin.getByLabel('Your question about the passage').fill('Does an equal total prove the books right?');
  await margin.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(margin.locator('[data-answer]')).toContainText('the balance sheet is only as good as the ledger [¶12].');
  await expect(margin.getByText('4 of 5 questions left today')).toBeVisible();
  expect(asked).toMatchObject({ book_id: BOOK_ID, chapter: 1, selection: { para_from: 4, para_to: 4 }, question: 'Does an equal total prove the books right?' });

  await margin.getByRole('button', { name: 'Paragraph 12: go to it' }).click();
  await expect(p12).toBeInViewport();
  await expect(p12).toHaveAttribute('data-marked', 'true');
  await expect(p12).toContainText('The balances that survive the closing are the assets');
});

test('a paid book has Buy and no reader, so nothing to ask', async ({ page }) => {
  await mockSupabase(page, {
    tables: { book_shelves: SHELVES, books_uploads: [{ ...LEDGERS, slug: 'valuation', title: 'Valuation', access: 'paid', purchase_url: 'https://example.com/v', filepath: null, ai_ready: false }] },
  });
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await page.goto('/books-academia/valuation');
  await expect(page.getByRole('link', { name: 'Buy Valuation (opens in a new tab)' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Read' })).toHaveCount(0);
});
