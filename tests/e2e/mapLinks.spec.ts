import { test, expect } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * THE LINK CONTRACT AN ESSAY IS WRITTEN AGAINST.
 *
 * docs/response-2026-09-14-v5/linking-into-the-map.md tells the author what an
 * address into the map does. A document that describes behaviour and is not
 * held to it goes stale silently, and the links written from it break in a way
 * nobody notices until a reader follows one. So the two worked examples in it,
 * and the three refusals it promises, are checked here in a real browser.
 */
test('an address into the map does what the author guide says it does', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockSupabase(page);

  await page.goto('/?lens=green&distance=finance&node=energy');
  await expect(page.getByRole('region', { name: 'Energy' })).toBeVisible();
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-level', 'overview');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-lens', 'finance');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-shift', 'green');
  await expect(page.getByRole('region', { name: 'Energy' }).locator('[data-basis="assessed"]')).toBeVisible();

  await page.goto('/?node=processing-trader');
  const panel = page.getByRole('region', { name: 'Processing → trader / importer' });
  await expect(panel).toBeVisible();
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-level', 'overview');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-lens', 'economy');
  await expect(panel).toHaveAttribute('data-panel', 'anatomy');

  // A detail-only element opens the detail: both transfers inside the
  // distribution-and-retail box, which the overview draws as one.
  await page.goto('/?node=distributor-wholesaler');
  await expect(page.getByRole('region', { name: 'Distributor → wholesaler' })).toBeVisible();
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-level', 'detail');
  await page.goto('/?node=wholesale-retail');
  await expect(page.getByRole('region', { name: 'Wholesale → retail' })).toBeVisible();
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-level', 'detail');
  // A transfer that crosses a group's edge stays at the overview.
  await page.goto('/?node=retail-consumption');
  await expect(page.getByRole('region', { name: 'Retail → consumption' })).toBeVisible();
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-level', 'overview');
  // And Back returns to the reading the address named, with focus on the map.
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Wholesale → retail' })).toBeVisible();
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-level', 'detail');

  // An element the named shift does not mark is not opened, and is dropped.
  await page.goto('/?lens=reindustrialisation&node=recovery');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-shift', 'reindustrialisation');
  await expect(page.getByRole('region', { name: 'Recovery' })).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).search).toBe('?lens=reindustrialisation');

  // A stage no shift marks opens nothing at all.
  await page.goto('/?node=packaging');
  await expect(page.getByRole('region', { name: 'Packaging manufacture' })).toHaveCount(0);
});
