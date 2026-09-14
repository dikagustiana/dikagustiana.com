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
  const hit = await page.locator('.cp-hit[data-id="j-processing-trader"] circle.cp-hit-area').boundingBox();
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

/**
 * TARGET SIZE AT THE BREAKPOINT, measured rather than declared.
 *
 * The plate is drawn at width:100%, so a unit of its geometry is not a screen
 * pixel: at 1280px the figure is about 1216px wide and one unit is ~0.708px.
 * Measured there on 14 September 2026, three doors were below a comfortable
 * target — a chip 12.7px tall, a layer switch 8.5px, a numbered mark 15.6px —
 * while the drawing looked composed. Each is now enlarged by a transparent
 * hit shape around the drawn one, which costs the plate height and not scale.
 *
 * The band is the deliberate exception and is asserted as such: it is a strip
 * a thousand pixels wide, and the only way to make it taller is to take the
 * gap out from under the band beneath it — overlapping an adjacent action to
 * fix a target that is already easy to hit.
 */
test('/about at 1280px: every door on the plate is big enough to aim at, and no two of them overlap', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/about?lens=green');

  const measured = await page.evaluate(() => {
    const kinds: Array<[string, string]> = [
      ['joint', '.cp-hit.cp-joint > circle.cp-hit-area'],
      ['chip', '.cp-joint-chip > rect.cp-hit-area'],
      ['switch', '.cp-switch > rect.cp-hit-area'],
      ['mark', '.cp-marks--green .cp-mark > circle.cp-hit-area'],
      ['band', '.cp-band-hit rect.cp-band-rect'],
    ];
    const all: Array<{ kind: string; id: string | null; r: DOMRect; round: boolean }> = [];
    const smallest: Record<string, number> = {};
    for (const [kind, sel] of kinds) {
      for (const el of Array.from(document.querySelectorAll(sel))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        const owner = el.closest('[data-id],[data-for],[data-switch],[data-mark]');
        const id =
          owner?.getAttribute('data-id') ??
          owner?.getAttribute('data-for') ??
          owner?.getAttribute('data-switch') ??
          owner?.getAttribute('data-mark') ??
          null;
        all.push({ kind, id, r, round: el.tagName === 'circle' });
        const d = Math.min(r.width, r.height);
        if (smallest[kind] === undefined || d < smallest[kind]) smallest[kind] = d;
      }
    }
    // Two targets overlap when the shapes do, not when their boxes clip: two
    // circles set diagonally have boxes that cross and edges that do not.
    const overlapping: string[] = [];
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        if (a.id === b.id) continue;
        if (a.round && b.round) {
          const ax = a.r.x + a.r.width / 2;
          const ay = a.r.y + a.r.height / 2;
          const bx = b.r.x + b.r.width / 2;
          const by = b.r.y + b.r.height / 2;
          if (Math.hypot(ax - bx, ay - by) < (a.r.width + b.r.width) / 2 - 1) overlapping.push(`${a.kind}:${a.id} × ${b.kind}:${b.id}`);
          continue;
        }
        const ow = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const oh = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (ow > 1 && oh > 1) overlapping.push(`${a.kind}:${a.id} × ${b.kind}:${b.id} (${ow.toFixed(0)}×${oh.toFixed(0)}px)`);
      }
    return { smallest, count: all.length, overlapping, figW: document.querySelector('svg.cp-svg--wide')!.getBoundingClientRect().width };
  });

  expect(measured.count).toBeGreaterThan(30);
  for (const kind of ['joint', 'chip', 'switch', 'mark']) {
    expect(measured.smallest[kind], `${kind} at ${Math.round(measured.figW)}px of figure`).toBeGreaterThanOrEqual(24);
  }
  // The band: a strip the width of the plate, and its height is the row gap.
  expect(measured.smallest.band).toBeGreaterThanOrEqual(18);
  expect(measured.overlapping, measured.overlapping.join('; ')).toEqual([]);
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
  const stuckFill = await page.locator('.cp-mark[data-mark="band-logistics"] circle:not(.cp-hit-area)').evaluate((c) => getComputedStyle(c).fill);
  const movingFill = await page.locator('.cp-mark[data-mark="band-energy"] circle:not(.cp-hit-area)').evaluate((c) => getComputedStyle(c).fill);
  expect(stuckFill).not.toBe(movingFill);
  const dash = await page.locator('.cp-mark[data-mark="stage-recovery"] circle:not(.cp-hit-area)').evaluate((c) => getComputedStyle(c).strokeDasharray);
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
  // `exact` matters now: getByText is a case-insensitive substring match, and
  // the panel also explains what the status READS ON ("an element can be stuck
  // and moving at once"), which the loose matcher picked up as a second hit.
  await expect(region.getByText('Stuck', { exact: true })).toBeVisible();
  // A mark is a promise of a diagnosis, and this one is a scenario. The panel
  // has to say so before it says anything else.
  await expect(region.locator('[data-basis="scenario"]')).toBeVisible();
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
  // Two exits once it is open: one beside the controls, one under the map.
  // A figure taller than the screen has two ends.
  const exits = page.getByRole('button', { name: 'Back to the short version' });
  await expect(exits).toHaveCount(2);
  await expect(exits.first()).toHaveAttribute('aria-expanded', 'true');
  await expect(exits.last()).toHaveAttribute('aria-expanded', 'true');
});

/**
 * The short plate's first encounter. Orientation is not explanation: naming
 * the Energy band told a stranger the noun and left them to invent the
 * question, choose among two distances, two scenarios and sixteen marks, and
 * discover for themselves which of them had been written against evidence.
 */
test('/ at 1280px: the short plate asks one bounded question and its action lands on the assessed reading', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/');

  const opening = page.locator('[data-chain-opening]');
  await expect(opening).toBeVisible();
  // The relation, and the boundary of the case: the shared word "distribution"
  // must not hand the reading a claim about the electricity network.
  await expect(opening).toContainText('Energy is a band beneath the chain');
  await expect(opening).toContainText('The electricity network is a different network');

  // Neither inert control is offered while the plate has nothing to change.
  await expect(page.getByRole('button', { name: 'economy', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'No shift' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Explore the power decision' }).click();
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-lens', 'finance');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-shift', 'green');
  const reading = page.getByRole('region', { name: 'Energy' });
  await expect(reading).toBeVisible();
  await expect(reading.locator('[data-basis="assessed"]')).toBeVisible();
  // What the lever CANNOT do here is part of the mechanism, not a footnote.
  await expect(reading.locator('[data-mechanism="contract"]')).toBeVisible();
  // And the reader is in the ordinary map, free to leave the pilot.
  await expect(page.getByRole('button', { name: 'No shift' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to the short version' })).toHaveCount(2);
});

/**
 * U05, in a real browser and across a real page load: version 2 wrote the
 * address from the landing page and read it back only on /about, so the link a
 * reader copied opened Economy, No shift, short — every parameter intact and
 * the reading gone.
 */
test('an address explored on / restores the same reading in a fresh page load', async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await open(page, '/');
  await page.getByRole('button', { name: 'Explore the power decision' }).click();
  await expect(page.getByRole('region', { name: 'Energy' })).toBeVisible();

  const shared = page.url();
  // The writer's own parameter order; the reader only ever copies it whole.
  expect(new URL(shared).search).toBe('?lens=green&distance=finance&node=energy');

  // A fresh load of exactly that address — not a client-side navigation.
  await page.goto('about:blank');
  await page.goto(shared);
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-lens', 'finance');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-shift', 'green');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-view', 'full');
  await expect(page.getByRole('region', { name: 'Energy' })).toBeVisible();
  // And it is brought into view rather than left four thousand pixels down.
  // Polled, because that scroll is smooth for a reader who has not asked
  // otherwise — which is the point of routing it through scrollBehavior().
  await expect
    .poll(() =>
      page.evaluate(() => {
        const f = document.querySelector('figure')!.getBoundingClientRect();
        return f.top < window.innerHeight && f.bottom > 0;
      }),
    )
    .toBe(true);

  // A plain visit is untouched: no parameters, and the short plate.
  await page.goto('/');
  await expect(page.locator('.chain-plate')).toHaveAttribute('data-view', 'compact');
  expect(new URL(page.url()).search).toBe('');
});

/**
 * U08. The figure is not the reader's viewport: the wide plate is taller than
 * the space under the site's sticky header, so a popover clamped to the FIGURE
 * could be correct by the figure's geometry and still hide the reading's own
 * title and Close behind that header.
 */
test('a long reading keeps its title and Close clear of the sticky header at every scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 1348, height: 936 });
  await open(page, '/about?lens=green&distance=finance&node=energy');
  const popover = page.locator('[data-chain-popover]');
  await expect(popover).toBeVisible();

  for (const target of [0, -8, -100, -300, -600]) {
    await page.evaluate((t) => {
      const fig = document.querySelector('figure')!;
      // `instant`, explicitly: the page sets scroll-behavior: smooth for
      // readers who have not asked otherwise, and a measurement taken mid-glide
      // measures the glide.
      window.scrollTo({ top: window.scrollY + fig.getBoundingClientRect().top - t, behavior: 'instant' });
    }, target);
    // The popover re-places itself once per frame; give it that frame.
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
    const clear = await page.evaluate(() => {
      const pop = document.querySelector('[data-chain-popover]')!;
      const head = pop.querySelector('h3')!.getBoundingClientRect();
      const close = Array.from(pop.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Close')!.getBoundingClientRect();
      const header = document.querySelector('header')!.getBoundingClientRect();
      const fig = document.querySelector('figure')!.getBoundingClientRect();
      const p = pop.getBoundingClientRect();
      return {
        headClear: head.top >= header.bottom && head.bottom <= window.innerHeight,
        closeClear: close.top >= header.bottom && close.bottom <= window.innerHeight,
        // Still inside the figure: the brief's rule that the eye stays near
        // the element is not traded away for the fix.
        inside: p.top >= fig.top - 1 && p.bottom <= fig.bottom + 1,
        // The readable band: what is both inside the figure and inside the
        // window below the sticky header. 220px is the component's own floor.
        hasRoom:
          Math.min(fig.height - 8, window.innerHeight - fig.top - 8) - Math.max(8, header.bottom - fig.top + 8) >= 220,
        scrolls: pop.scrollHeight > pop.clientHeight,
      };
    });
    // The popover lives inside the figure and scrolls with the plate, so once
    // the figure itself has left the readable band there is nothing left to
    // keep on screen — and a reading that detached and floated over the page
    // would break the rule it exists to serve. Where there IS room, its title
    // and its Close are in it.
    expect(clear.inside, `inside the figure at ${target}`).toBe(true);
    if (!clear.hasRoom) continue;
    expect(clear.headClear, `heading at figure offset ${target}`).toBe(true);
    expect(clear.closeClear, `Close at figure offset ${target}`).toBe(true);
  }

  // The long reading owns its own scrolling, and its head stays put while it
  // scrolls: the title and Close are pinned inside the popover.
  await popover.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  const stillThere = await page.evaluate(() => {
    const pop = document.querySelector('[data-chain-popover]')!;
    const p = pop.getBoundingClientRect();
    const close = Array.from(pop.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Close')!.getBoundingClientRect();
    return close.top >= p.top - 1 && close.bottom <= p.bottom + 1;
  });
  expect(stillThere).toBe(true);

  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
});

/**
 * U04. The narrow reading is a modal sheet and the distance control lived
 * outside it, so comparing the two readings of one element meant dismissing
 * the reading, finding the control, and finding the element again — the
 * interface interrupting the one operation the map exists to demonstrate.
 */
test('the narrow sheet switches distance without losing the target', async ({ page }) => {
  await page.setViewportSize(PHONE);
  // Not `open()`: the address opens the reading on the first paint, and a modal
  // sheet takes the page behind it out of the accessibility tree — so the
  // headline that helper waits for is legitimately not there.
  await mockSupabase(page);
  await page.goto('/about?lens=green&node=energy');

  const sheet = page.locator('[data-chain-sheet]');
  await expect(sheet).toBeVisible();
  const region = sheet.getByRole('region', { name: 'Energy' });
  await expect(region).toBeVisible();
  // ONE voice at a time, wherever it speaks in the reading — the folded
  // anatomy beneath it included. Not one element: one value.
  const voices = () => region.locator('[data-voice]').evaluateAll((els) => Array.from(new Set(els.map((e) => e.getAttribute('data-voice')))));
  expect(await voices()).toEqual(['economy']);

  const inSheet = sheet.locator('[data-chain-sheet-distance]');
  await expect(inSheet).toBeVisible();
  const economyText = await region.textContent();

  await inSheet.getByRole('button', { name: 'Finance', exact: true }).click();
  await expect(region).toBeVisible();
  await expect.poll(voices).toEqual(['finance']);
  expect(await region.textContent()).not.toBe(economyText);

  await inSheet.getByRole('button', { name: 'Economy', exact: true }).click();
  await expect.poll(voices).toEqual(['economy']);
  expect(await region.textContent()).toBe(economyText);

  // The control does not scroll away with the evidence: the sheet's own
  // scrolling happens in a box beneath it, so the distance and the sheet's
  // Close both stay put through a long reading.
  await sheet.locator('.overflow-y-auto').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(inSheet).toBeInViewport();
  await expect(sheet.getByRole('button', { name: 'Close' })).toBeInViewport();

  // Dismissal still works, and returns to the row that opened the reading.
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  expect(await scrollWidth(page)).toBeLessThanOrEqual(PHONE.width);
});
