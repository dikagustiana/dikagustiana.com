import { test, expect, type Page } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * The industry chain in a real browser, where jsdom cannot follow: no
 * horizontal scroll at phone width with everything open, exactly one copy of
 * the map in the document at each width, type on the wide plate that is
 * actually readable, joints that are big enough to tap, and a shift overlay
 * that is drawn — one at a time — over the same plate.
 */

const PHONE = { width: 360, height: 740 };
const LAPTOP = { width: 1280, height: 800 };

async function open(page: Page, path: string) {
  await mockSupabase(page);
  await page.goto(path);
  await expect(page.getByRole('heading', { name: /Nothing here is complicated/ })).toBeVisible();
}

const scrollWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);
const word = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

for (const path of ['/', '/about']) {
  test(`${path} at 360px never scrolls sideways — with the full chain, both toggles, a shift and a reading open`, async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, path);

    if (path === '/') {
      await expect(page.locator('.cp-column[data-variant="compact"]')).toHaveCount(1);
      expect(await scrollWidth(page)).toBeLessThanOrEqual(PHONE.width);
      await page.getByRole('button', { name: 'See the full chain' }).click();
    }
    await expect(page.locator('.cp-column[data-variant="full"]')).toHaveCount(1);
    await expect(page.locator('svg.cp-svg')).toHaveCount(0);

    await page.getByRole('button', { name: 'Return flows' }).click();
    await page.getByRole('button', { name: 'Money and information' }).click();
    await word(page, 'finance').click();
    await word(page, 'green transition').click();
    await expect(page.locator('[data-shift-caption="green"]')).toBeVisible();
    await page.getByRole('button', { name: 'Trader / importer → manufacturing' }).click();
    await expect(page.getByRole('region', { name: 'Trader / importer → manufacturing' })).toBeVisible();
    await page.getByRole('button', { name: 'How to read the map' }).click();

    expect(await scrollWidth(page)).toBeLessThanOrEqual(PHONE.width);

    // Every door is at least a finger wide.
    for (const name of ['Production → aggregation', 'Consumption → recovery']) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.height, name).toBeGreaterThanOrEqual(24);
    }
  });
}

test('/about at 1280px draws one wide plate whose names are readable, with every joint reachable and one panel', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/about');

  await expect(page.locator('svg.cp-svg--wide')).toHaveCount(1);
  await expect(page.locator('.cp-column')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Manufacturing → distribution' })).toHaveCount(1);

  // Type: 18 viewBox units on a plate that is W wide, drawn at its rendered width.
  const scale = await page.locator('svg.cp-svg--wide').evaluate((svg) => {
    const el = svg as SVGSVGElement;
    return el.getBoundingClientRect().width / el.viewBox.baseVal.width;
  });
  expect(18 * scale).toBeGreaterThanOrEqual(12);
  expect(14 * scale).toBeGreaterThanOrEqual(9.5);

  // A joint's hit area is at least 24px across on screen, and its chip is on at rest.
  const hit = await page.locator('.cp-hit[data-id="j-processing-trader"] circle').boundingBox();
  expect(hit!.width).toBeGreaterThanOrEqual(24);
  await expect(page.locator('.cp-joint-chip[data-for="j-processing-trader"] text')).toHaveText('Basic industry');

  await page.getByRole('button', { name: 'Processing → trader / importer' }).click();
  const panel = page.getByRole('region', { name: 'Processing → trader / importer' });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/^Conversion margin/)).toBeVisible();
  await expect(panel.getByRole('heading', { level: 3 })).toBeFocused();

  await page.getByRole('button', { name: 'Contract capacity', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Contract capacity' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Processing → trader / importer' })).toHaveCount(0);
});

test('/about at 1280px: the distance re-reads every chip, and a shift draws one overlay at a time over the same plate', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/about');

  await word(page, 'finance').click();
  await expect(page.locator('.cp-joint-chip[data-for="j-processing-trader"] text')).toHaveText('Fixed cost · yield');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-lens', 'finance');

  await word(page, 'reindustrialisation').click();
  await expect(page.locator('.cp-shift--reindustrialisation')).toBeVisible();
  await expect(page.locator('.cp-shift--green')).toBeHidden();
  await expect(page.locator('[data-shift-caption="reindustrialisation"]')).toContainText('does the domestic processing margin justify the capex');
  await expect(page.locator('.cp-shift--reindustrialisation .cp-lit')).toHaveCount(8);

  await word(page, 'green transition').click();
  await expect(page.locator('.cp-shift--reindustrialisation')).toBeHidden();
  await expect(page.locator('.cp-shift--green')).toBeVisible();
  await expect(page.locator('[data-shift-caption="green"]')).toContainText('cost-of-capital question');

  await word(page, 'economy').click();
  await expect(page.locator('[data-shift-caption="green"]')).toContainText('fiscal and external-balance story');
});

test('/ at 1280px opens short, expands in place, and keeps the hero above it', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/');

  await expect(page.getByRole('heading', { name: /insanely, damn good at numbers/ })).toBeVisible();
  await expect(page.locator('svg.cp-svg--compact')).toHaveCount(1);
  await expect(page.locator('svg.cp-svg--wide')).toHaveCount(0);

  const hero = await page.getByRole('heading', { name: /insanely, damn good at numbers/ }).boundingBox();
  const chain = await page.getByRole('heading', { name: /Nothing here is complicated/ }).boundingBox();
  expect(hero!.y).toBeLessThan(chain!.y);

  const button = page.getByRole('button', { name: 'See the full chain' });
  await button.click();
  await expect(page.locator('svg.cp-svg--wide')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Back to the short version' })).toHaveAttribute('aria-expanded', 'true');
});
