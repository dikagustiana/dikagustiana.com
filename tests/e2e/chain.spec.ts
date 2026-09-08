import { test, expect, type Page } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * The industry chain in a real browser, where jsdom cannot follow: no
 * horizontal scroll at phone width with everything open, exactly one copy of
 * the map in the document at each width, type on the wide plate that is
 * actually readable, joints that are big enough to tap, a shift overlay that
 * is drawn — one at a time — over the same plate, a label pinned beside the
 * element under the pointer that covers none of the plate's boxes, and a
 * reading that opens beside its mark and inside the figure.
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
    // No legend, no reference, no hint under the column.
    await expect(page.getByRole('button', { name: 'How to read the map' })).toHaveCount(0);

    // Every door is at least a finger wide.
    for (const name of ['Production → aggregation', 'Consumption → recovery']) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.height, name).toBeGreaterThanOrEqual(24);
    }

    await page.getByRole('button', { name: 'Return flows' }).click();
    await page.getByRole('button', { name: 'Money and information' }).click();
    await word(page, 'finance').click();
    await word(page, 'green transition').click();
    await expect(page.locator('[data-lit-note="band-logistics"]')).toBeVisible();
    expect(await scrollWidth(page)).toBeLessThanOrEqual(PHONE.width);

    // A reading opens as a bottom sheet, in one voice.
    await page.getByRole('button', { name: 'Trader / importer → manufacturing' }).click();
    const sheet = page.locator('[data-chain-sheet]');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('region', { name: 'Trader / importer → manufacturing' })).toBeVisible();
    await expect(sheet.locator('[data-voice="finance"]')).toHaveCount(1);
    expect(await scrollWidth(page)).toBeLessThanOrEqual(PHONE.width);
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
  });
}

test('/about at 1280px draws one wide plate whose names are readable, with every joint reachable and one reading beside it', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/about');

  await expect(page.locator('svg.cp-svg--wide')).toHaveCount(1);
  await expect(page.locator('.cp-column')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Manufacturing → distribution' })).toHaveCount(1);
  // Nothing under the plate: the figure is the last child of the component.
  expect(await page.locator('.chain-plate > figure + *').count()).toBe(0);

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
  await expect(page.locator('.cp-joint-chip[data-for="j-processing-trader"] text')).toHaveText('Producer prices');

  await page.getByRole('button', { name: 'Processing → trader / importer' }).click();
  const panel = page.getByRole('region', { name: 'Processing → trader / importer' });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/^Conversion margin/)).toBeVisible();
  await expect(panel.getByRole('heading', { level: 3 })).toBeFocused();
  // The reading sits inside the figure, beside its joint.
  const inside = await page.evaluate(() => {
    const f = document.querySelector('figure')!.getBoundingClientRect();
    const p = document.querySelector('[data-chain-popover]')!.getBoundingClientRect();
    return p.top >= f.top - 1 && p.left >= f.left - 1 && p.right <= f.right + 1 && p.bottom <= f.bottom + 1;
  });
  expect(inside).toBe(true);

  // A reading covers part of the plate while it is open; the doors under it come back when it closes.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Processing → trader / importer' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Logistics and warehousing', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Logistics and warehousing' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Processing → trader / importer' })).toHaveCount(0);
});

test('/about at 1280px: the distance re-reads every chip, a shift draws one overlay at a time, and finance isolates an open joint', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/about');

  await word(page, 'finance').click();
  await expect(page.locator('.cp-joint-chip[data-for="j-processing-trader"] text')).toHaveText('Refines the input');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-lens', 'finance');

  await word(page, 'reindustrialisation').click();
  await expect(page.locator('.cp-shift--reindustrialisation')).toBeVisible();
  await expect(page.locator('.cp-shift--green')).toBeHidden();
  await expect(page.locator('.cp-shift--reindustrialisation .cp-lit')).toHaveCount(8);

  await word(page, 'green transition').click();
  await expect(page.locator('.cp-shift--reindustrialisation')).toBeHidden();
  await expect(page.locator('.cp-shift--green')).toBeVisible();
  await expect(page.locator('.cp-shift--green .cp-lit')).toHaveCount(8);

  // Isolation: at finance an open joint keeps its two hands and its layers; the rest steps back.
  await page.getByRole('button', { name: 'Wholesale → retail' }).click();
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-isolate', 'j-wholesale-retail');
  await expect(page.locator('.cp-base [data-id="node-wholesaler"][data-dim]')).toHaveCount(0);
  await expect(page.locator('.cp-base [data-id="stage-processing"][data-dim]')).toHaveCount(1);
  const dimmed = await page.locator('.cp-base [data-id="stage-processing"]').evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(dimmed).toBeLessThan(0.3);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-dim]')).toHaveCount(0);
});

test('/about at 1280px: the marks are an index onto the overlay, the label pins beside the pointer without covering a box, and the reading opens beside its mark', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/about');

  await expect(page.locator('.cp-mark:visible')).toHaveCount(0);

  await word(page, 'green transition').click();
  await expect(page.locator('.cp-marks--green .cp-mark')).toHaveCount(8);
  await expect(page.locator('.cp-marks--reindustrialisation .cp-mark:visible')).toHaveCount(0);
  await expect(page.locator('.cp-mark:visible')).toHaveCount(8);

  const order = await page.locator('.cp-marks--green .cp-mark').evaluateAll((marks) => marks.map((m) => Number(m.textContent)));
  expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

  // Status by form: the stuck disc is filled, the unpriced disc dashed.
  const stuckFill = await page.locator('.cp-mark[data-mark="band-logistics"] circle').evaluate((c) => getComputedStyle(c).fill);
  const movingFill = await page.locator('.cp-mark[data-mark="band-energy"] circle').evaluate((c) => getComputedStyle(c).fill);
  expect(stuckFill).not.toBe(movingFill);
  const dash = await page.locator('.cp-mark[data-mark="stage-recovery"] circle').evaluate((c) => getComputedStyle(c).strokeDasharray);
  expect(dash).not.toBe('none');

  // Pointing pins one line beside the mark; it covers no box on the plate and raises no tooltip role.
  const mark = page.getByRole('button', { name: /^5\. Green transition · Logistics and warehousing · Stuck$/ });
  await mark.hover();
  const label = page.locator('[data-chain-hover]');
  await expect(label).toBeVisible();
  await expect(label).toContainText('Logistics and warehousing');
  await expect(label).toContainText('Stuck');
  const overlaps = await page.evaluate(() => {
    const l = document.querySelector('[data-chain-hover]')!.getBoundingClientRect();
    const boxes = Array.from(document.querySelectorAll('.cp-stage rect, .cp-node > rect')).map((b) => b.getBoundingClientRect());
    return boxes.filter((b) => l.left < b.right && l.right > b.left && l.top < b.bottom && l.bottom > b.top).length;
  });
  expect(overlaps, 'the hover label sits on no box').toBe(0);
  await expect(page.locator('[role="tooltip"]')).toHaveCount(0);

  // The mark opens the reading, beside itself and inside the figure.
  await mark.click();
  const region = page.getByRole('region', { name: 'Logistics and warehousing' });
  await expect(region).toBeVisible();
  await expect(region).toContainText('Reading · Green transition · Economy');
  await expect(region.getByText('Stuck')).toBeVisible();
  const near = await page.evaluate(() => {
    const m = document.querySelector('.cp-mark[data-mark="band-logistics"]')!.getBoundingClientRect();
    const p = document.querySelector('[data-chain-popover]')!.getBoundingClientRect();
    const f = document.querySelector('figure')!.getBoundingClientRect();
    const dx = Math.max(0, m.left - p.right, p.left - m.right);
    const dy = Math.max(0, m.top - p.bottom, p.top - m.bottom);
    return { gap: Math.hypot(dx, dy), inside: p.top >= f.top - 1 && p.bottom <= f.bottom + 1 && p.left >= f.left - 1 && p.right <= f.right + 1 };
  });
  expect(near.inside).toBe(true);
  expect(near.gap).toBeLessThan(40);
});

test('/about?lens=green&distance=finance&node=energy opens the overlay and the reading on the first paint', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/about?lens=green&distance=finance&node=energy');

  await expect(page.locator('.chain-plate')).toHaveAttribute('data-shift', 'green');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-lens', 'finance');
  const region = page.getByRole('region', { name: 'Energy' });
  await expect(region).toBeVisible();
  // One voice throughout the reading — the folded anatomy beneath it speaks in the same one.
  const voices = (r: typeof region) => r.locator('[data-voice]').evaluateAll((els) => Array.from(new Set(els.map((el) => el.getAttribute('data-voice')))));
  expect(await voices(region)).toEqual(['finance']);
  await expect(page.locator('.cp-shift--green')).toBeVisible();

  await word(page, 'economy').click();
  expect(new URL(page.url()).search).toBe('?lens=green&node=energy');
  expect(await voices(region)).toEqual(['economy']);
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
