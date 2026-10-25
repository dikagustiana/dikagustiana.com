import { expect, test, type Page } from '@playwright/test';
import { mockSupabase } from './mockSupabase';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * docs/prd/2026-10-fia-fixes §4, "Tests to add": the ADRO model page over the
 * four published coal packages (ADRO, PTBA, ITMG, INDY as fia.model_packages
 * returned them on 2026-10-24), served to the preview build through the
 * mocked Data API like every other call (playwright.fia.config.ts).
 *
 * The JISDOR rate below is a TEST number, not Bank Indonesia's: it stands in
 * for fia.fx_rates, so the test does not depend on the seed in production.
 */

const PAGE = '/finance/finance-in-action/adro';
const packages: unknown[] = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/fia-published-coal.packages.json'), 'utf8'));
const TEST_RATE = 16_000;
const FX_RATES = [
  { period_id: 'FY25', from_ccy: 'USD', to_ccy: 'IDR', rate: TEST_RATE, basis: 'average', source: 'TEST rate', source_url: 'https://example.test/jisdor' },
];

async function open(page: Page) {
  await mockSupabase(page, { tables: { model_packages: packages, fx_rates: FX_RATES } });
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(PAGE);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alamtri Resources Indonesia');
}

test('the "On this page" row sticks under the header once scrolled, and marks the section in view', async ({ page }) => {
  await open(page);
  const nav = page.locator('[data-fia-section-nav]');
  await page.locator('#fia-unit-economics').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 400);
  await expect(nav).toBeInViewport();
  const header = await page.locator('body header').first().boundingBox();
  await expect.poll(async () => Math.round((await nav.boundingBox())!.y)).toBe(Math.round(header!.height));
  await expect(nav.locator('a[aria-current="location"]')).toHaveCount(1);
  // Reached from the keyboard: every anchor is a link.
  await expect(nav.getByRole('link')).not.toHaveCount(0);
});

test('a reader sees no workpaper record, and no anchor to one', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('heading', { level: 2, name: 'How the business makes money' })).toBeVisible();
  expect(await page.content()).not.toContain('Workpaper record');
  await expect(page.locator('a[href="#fia-workpaper"]')).toHaveCount(0);
});

test('the peer columns hold numbers for PTBA, converted to US dollars, with the rate in the caption', async ({ page }) => {
  await open(page);
  const table = page.locator('#fia-unit-economics').locator('xpath=ancestor::section').getByRole('table');
  await expect(table.getByRole('columnheader', { name: 'PTBA per tonne' })).toBeVisible();
  const royalty = table.getByRole('row', { name: /^Royalties to Government/ });
  // PTBA FY 25: royalty Rp 4,322,659 million over 45.43 Mt, at the test rate.
  const expected = `(${((4_322_659 / 45.43) / TEST_RATE).toFixed(1)})`;
  await expect(royalty).toContainText(expected);
  await expect(page.locator('[data-fia-fx-caption]').first()).toContainText('PTBA converted at BI JISDOR FY 25 average 16,000 IDR/USD.');
  // The grouped bar draws all four companies, ADRO darkest and first.
  await expect(page.locator('[data-fia-grouped-bar]')).toContainText('ADRO, INDY, ITMG, PTBA');
});
