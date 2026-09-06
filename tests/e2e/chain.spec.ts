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
  await expect(page.getByRole('heading', { name: /Every joint in this chain is a margin/ })).toBeVisible();
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

  await page.getByRole('button', { name: 'Logistics and warehousing', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Logistics and warehousing' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Processing → trader / importer' })).toHaveCount(0);
});

test('/about at 1280px: the distance re-reads every chip, and a shift draws one overlay at a time over the same plate', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/about');

  await word(page, 'finance').click();
  await expect(page.locator('.cp-joint-chip[data-for="j-processing-trader"] text')).toHaveText('Refines the input');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-lens', 'finance');

  await word(page, 'reindustrialisation').click();
  await expect(page.locator('.cp-shift--reindustrialisation')).toBeVisible();
  await expect(page.locator('.cp-shift--green')).toBeHidden();
  await expect(page.locator('[data-shift-caption="reindustrialisation"]')).toContainText('Does the domestic processing margin justify capex');
  await expect(page.locator('.cp-shift--reindustrialisation .cp-lit')).toHaveCount(8);

  await word(page, 'green transition').click();
  await expect(page.locator('.cp-shift--reindustrialisation')).toBeHidden();
  await expect(page.locator('.cp-shift--green')).toBeVisible();
  await expect(page.locator('[data-shift-caption="green"]')).toContainText('Test project cash flows together with financing terms');

  await word(page, 'economy').click();
  await expect(page.locator('[data-shift-caption="green"]')).toContainText('Follow a transition scenario through energy, credit and recovery');
});

test('/about at 1280px: the marks are an index onto the overlay, and nothing floats over the plate', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/about');

  // At rest there is no index, and nothing to tab into.
  await expect(page.locator('.cp-mark:visible')).toHaveCount(0);

  await word(page, 'green transition').click();
  await expect(page.locator('.cp-marks--green .cp-mark')).toHaveCount(7);
  await expect(page.locator('.cp-marks--reindustrialisation .cp-mark:visible')).toHaveCount(0);
  await expect(page.locator('.cp-mark:visible')).toHaveCount(7);

  // Reading order, left to right and then top to bottom, layers last.
  const order = await page.locator('.cp-marks--green .cp-mark').evaluateAll((marks) =>
    marks.map((m) => ({ n: Number(m.textContent), x: (m.querySelector('circle') as SVGCircleElement).cx.baseVal.value })),
  );
  expect(order.map((m) => m.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);

  // Pointing reads under the plate. Nothing is raised over the drawing, so the
  // element beside the one being pointed at stays readable.
  const mark = page.getByRole('button', { name: /^5\. Green transition · Logistics and warehousing$/ });
  await mark.hover();
  await expect(page.locator('[data-chain-readout]')).toContainText('Logistics and warehousing · Service fee');
  // Measured together, in the page's own coordinates, so a scroll between the
  // two reads cannot make a line that sits under the plate look as if it were on it.
  const gap = await page.evaluate(() => {
    const plate = document.querySelector('svg.cp-svg--wide')!.getBoundingClientRect();
    const line = document.querySelector('[data-chain-readout]')!.getBoundingClientRect();
    return line.top - plate.bottom;
  });
  expect(gap, 'the readout sits under the plate, never on it').toBeGreaterThanOrEqual(0);
  await expect(page.locator('[role="tooltip"]')).toHaveCount(0);

  // The mark opens the same panel the ring does.
  await mark.click();
  await expect(page.getByRole('region', { name: 'Logistics and warehousing' })).toBeVisible();
});

test('/about?lens=green&distance=finance&node=energy opens the overlay and the panel on the first paint', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/about?lens=green&distance=finance&node=energy');

  await expect(page.locator('.chain-plate')).toHaveAttribute('data-shift', 'green');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-lens', 'finance');
  await expect(page.getByRole('region', { name: 'Energy' })).toBeVisible();
  await expect(page.locator('.cp-shift--green')).toBeVisible();

  // Moving a control keeps the address in step, so what is shared is what is seen.
  await word(page, 'economy').click();
  expect(new URL(page.url()).search).toBe('?lens=green&node=energy');
});

test('/ at 1280px opens short, expands in place, and keeps the hero above it', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/');

  await expect(page.getByRole('heading', { name: /insanely, damn good at numbers/ })).toBeVisible();
  await expect(page.locator('svg.cp-svg--compact')).toHaveCount(1);
  await expect(page.locator('svg.cp-svg--wide')).toHaveCount(0);

  const hero = await page.getByRole('heading', { name: /insanely, damn good at numbers/ }).boundingBox();
  const chain = await page.getByRole('heading', { name: /Every joint in this chain is a margin/ }).boundingBox();
  expect(hero!.y).toBeLessThan(chain!.y);

  const button = page.getByRole('button', { name: 'See the full chain' });
  await button.click();
  await expect(page.locator('svg.cp-svg--wide')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Back to the short version' })).toHaveAttribute('aria-expanded', 'true');
});
