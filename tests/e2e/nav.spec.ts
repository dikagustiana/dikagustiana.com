import { test, expect, type Page } from '@playwright/test';
import { mockSupabase } from './mockSupabase';

/**
 * The header's dropdowns crossed by a real pointer (src/components/header/
 * NavDropdown.tsx). A 4px margin between the label and the panel used to lie
 * outside every hit area: a pointer crossing it on the way to an item left the
 * dropdown, and the menu closed under it. Each test hovers the label, then
 * moves the pointer in a straight line to the LAST item of the menu, two
 * pixels a step so the old seam could not be stepped over, and clicks it.
 *
 * The second test rests the pointer in the seam itself for twice the close
 * delay. The delay alone would hide the seam from a quick pointer and close
 * the menu under a slow one; only a hit area with no gap keeps it open.
 *
 * The last two need real layout as well: a panel still closing must not take
 * the pointer from the one opening beside it, and no panel may run past the
 * right edge of the page (Learning's did, lined up from its label's left).
 *
 * Accounting, Finance, The Next Big Thing and Learning name no essaySection
 * in navConfig, so they are dropdowns whatever the essay counts say (the two
 * that can collapse to a plain link are Green Transition and Development
 * Finance); the mock's empty tables are enough.
 */
const DROPDOWNS = [
  { label: 'Accounting', trigger: 'link', last: 'Statutory Reporting', url: '/accounting/statutory-reporting' },
  { label: 'Finance', trigger: 'link', last: 'Toolkits', url: '/finance/toolkits' },
  { label: 'The Next Big Thing', trigger: 'link', last: 'Growth', url: '/the-next-big-thing?theme=growth' },
  // No landing page: the label is itself the menu button.
  { label: 'Learning', trigger: 'button', last: 'IELTS', url: '/english-ielts' },
] as const;

/** NAV_DROPDOWN_CLOSE_DELAY_MS in NavDropdown.tsx. */
const CLOSE_DELAY_MS = 150;

async function open(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await mockSupabase(page);
  await page.goto('/', { waitUntil: 'load' });
  return page.getByRole('navigation', { name: 'Main navigation' });
}

function centre(box: { x: number; y: number; width: number; height: number } | null) {
  if (!box) throw new Error('no bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

for (const d of DROPDOWNS) {
  test(`${d.label}: a straight line from the label to "${d.last}" keeps the menu open, and the item navigates`, async ({
    page,
  }) => {
    const nav = await open(page);
    const trigger = nav.getByRole(d.trigger, { name: d.label, exact: true });
    await trigger.hover();
    const menu = nav.getByRole('menu');
    await expect(menu).toBeVisible();

    const item = menu.getByRole('menuitem', { name: d.last, exact: true });
    const from = centre(await trigger.boundingBox());
    const to = centre(await item.boundingBox());
    const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 2);
    await page.mouse.move(to.x, to.y, { steps });

    await expect(item).toBeVisible();
    await item.click();
    await expect(page).toHaveURL(d.url);
  });
}

test('a pointer resting in the seam between label and panel keeps each menu open', async ({ page }) => {
  const nav = await open(page);
  for (const d of DROPDOWNS) {
    await nav.getByRole(d.trigger, { name: d.label, exact: true }).hover();
    const menu = nav.getByRole('menu');
    await expect(menu).toBeVisible();

    // The trigger row is the chevron's parent; the panel is drawn 4px below it.
    const row = await nav.getByRole('button', { name: `${d.label} submenu` }).locator('..').boundingBox();
    const panel = await menu.boundingBox();
    if (!row || !panel) throw new Error(`no layout for ${d.label}`);
    const rowBottom = row.y + row.height;
    expect(panel.y - rowBottom, `${d.label}: the panel sits below the label`).toBeGreaterThan(1);

    await page.mouse.move(row.x + 12, rowBottom + (panel.y - rowBottom) / 2, { steps: 4 });
    await page.waitForTimeout(CLOSE_DELAY_MS * 2);
    await expect(menu, `${d.label}: the seam is inside the hover area`).toBeVisible();

    // Leave for the page below; the menu goes once the delay has passed.
    await page.mouse.move(row.x + 12, 700, { steps: 4 });
    await expect(menu).toBeHidden();
  }
});

test('moving from one menu to the next closes the first at once, so its panel cannot take the pointer', async ({
  page,
}) => {
  const nav = await open(page);
  const accounting = nav.getByRole('link', { name: 'Accounting', exact: true });
  const finance = nav.getByRole('link', { name: 'Finance', exact: true });
  const menu = nav.getByRole('menu');

  // Where each panel is drawn, one at a time.
  const panelOf = async (trigger: typeof accounting) => {
    await trigger.hover();
    const box = await menu.boundingBox();
    await page.mouse.move(10, 700, { steps: 4 });
    await expect(menu).toBeHidden();
    if (!box) throw new Error('no panel');
    return box;
  };
  const accountingPanel = await panelOf(accounting);
  const financePanel = await panelOf(finance);

  // A point inside Accounting's panel that Finance's panel, later in the
  // document, would cover if it were still up.
  const target = { x: accountingPanel.x + accountingPanel.width - 12, y: accountingPanel.y + 20 };
  expect(target.x).toBeGreaterThan(financePanel.x);

  await finance.hover();
  await expect(menu).toBeVisible();
  await accounting.hover();
  await page.mouse.move(target.x, target.y, { steps: 5 });
  await page.waitForTimeout(CLOSE_DELAY_MS * 2);

  await expect(menu).toHaveCount(1);
  await expect(menu.getByRole('menuitem').first()).toHaveText('FSLI Detail');
});

test('each panel opens inside the viewport, at the narrowest desktop width too', async ({ page }) => {
  const nav = await open(page);
  // 1280px is Tailwind's xl, where the desktop row first shows (MainNav.tsx).
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const d of DROPDOWNS) {
      await nav.getByRole(d.trigger, { name: d.label, exact: true }).hover();
      const menu = nav.getByRole('menu');
      await expect(menu).toBeVisible();

      const panel = await menu.boundingBox();
      if (!panel) throw new Error(`no layout for ${d.label}`);
      const doc = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(panel.x + panel.width, `${d.label} at ${width}px: the panel's right edge`).toBeLessThanOrEqual(
        doc.clientWidth,
      );
      expect(doc.scrollWidth, `${d.label} at ${width}px: no sideways scroll`).toBe(doc.clientWidth);

      await page.mouse.move(10, 700, { steps: 4 });
      await expect(menu).toBeHidden();
    }
  }
});
