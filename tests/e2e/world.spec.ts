import { test, expect, type Page } from '@playwright/test';
import { mockSupabase } from './mockSupabase';
import { readFileSync } from 'node:fs';

/**
 * The world in a real browser (mega prompt §11, smoke): with ?debug=1, zero
 * console errors after 600 simulated seconds; every place button; [ and ]
 * cycle through every building without error; expose and close a company;
 * open and close the board; toggle every layer; each overlay; the energy
 * drill-down and back; the keyboard path; the phone layout at 390 px with
 * the world started by hand; frame times sampled and reported; the canvas
 * description and the card's and board's focus. The published index is one
 * mock package (the SYNTHETIC cement fixture re-labelled, never shipped).
 */
declare global { interface Window { world: { step(s: number): void; pause(on: boolean): void; all(): { id: string; kind: string; status: string; facts?: Record<string, string | number> }[]; select(id: string | null): void; selected(): string | null; view(name: string): void; drawCalls(): number; distance(): number; zoom(): number; band(): string; chain(): string[]; exposed(): unknown; expose(t: string): void; screenOf(id: string): [number, number] | null; centre(id: string, zoom: number): void; hovered(): { id: string; kind: string; label: string } | null } } }

const fixture = JSON.parse(readFileSync('src/data/finance-in-action/fixtures/XCEM.SYNTHETIC.json', 'utf8'));
const MOCK = { ...fixture, meta: { ...fixture.meta, ticker: 'INTP', name: 'INTP (SYNTHETIC mock, never ships)', status: 'published', pair: ['SMGR', 'SMCB'] } };

async function open(page: Page, path = '/finance/kawasan?debug=1') {
  await mockSupabase(page, { tables: { model_packages: [{ package: MOCK }] } });
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/_vercel\/insights|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(path, { waitUntil: 'networkidle' });
  return errors;
}
const ready = (page: Page) => page.waitForSelector('.world-frame__canvas-host[data-ready="true"]', { timeout: 90_000 });
const settle = async (page: Page, s = 1) => { await page.evaluate((x) => window.world.step(x), s); await page.waitForTimeout(500); };

test('starts without a console error, runs 600 simulated seconds clean, and keeps its draw calls under the budgets', async ({ page }) => {
  const errors = await open(page);
  await ready(page);
  const canvas = page.locator('.world-frame__canvas-host canvas');
  await expect(canvas).toHaveAttribute('role', 'img');
  expect((await canvas.getAttribute('aria-label'))!.length).toBeGreaterThan(100);
  await settle(page, 600);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.world.view('whole')); await settle(page);
  expect(await page.evaluate(() => window.world.drawCalls())).toBeLessThanOrEqual(1200);
  await page.evaluate(() => window.world.view('estate')); await page.waitForTimeout(2500); await settle(page);
  expect(await page.evaluate(() => window.world.drawCalls())).toBeLessThanOrEqual(1600);
  await page.evaluate(() => window.world.select('B121')); await page.locator('input[aria-label^="Distance"]').fill('1'); await page.waitForTimeout(2500); await settle(page);
  expect(await page.evaluate(() => window.world.drawCalls())).toBeLessThanOrEqual(1900);
  // frame times, sampled and reported, not asserted: this machine has no GPU
  const ft = await page.evaluate(() => new Promise<{ p50: number; p95: number }>((res) => { const ts: number[] = []; let last = performance.now(), n = 0; const tick = (now: number) => { ts.push(now - last); last = now; if (++n < 120) requestAnimationFrame(tick); else { ts.sort((a, b) => a - b); res({ p50: ts[60], p95: ts[113] }); } }; requestAnimationFrame(tick); }));
  test.info().annotations.push({ type: 'frame-time-ms', description: `p50 ${ft.p50.toFixed(1)} · p95 ${ft.p95.toFixed(1)} (SwiftShader)` });
});

test('every place button, every layer, each overlay with its strip, the energy drill-down and back, and the cycle through every building', async ({ page }) => {
  const errors = await open(page);
  await ready(page);
  for (const name of ['Ring', 'Estate', 'Gateway', 'Town', 'Hill', 'Whole']) { await page.getByRole('button', { name: new RegExp(`^${name}`) }).click(); await page.waitForTimeout(300); }
  for (const name of ['Logistics', 'Cold chain', 'Credit', 'Energy', 'Contract governance', 'Regulation']) { const b = page.getByRole('button', { name, exact: true }); await b.click(); await settle(page, 2); await b.click(); }
  await page.getByRole('radio', { name: 'Reindustrialisation' }).click();
  await expect(page.locator('.world-frame__strip li')).toHaveCount(8);
  expect(await page.evaluate(() => window.world.all().filter((e) => e.kind === 'mark').length)).toBe(8);
  await page.getByRole('radio', { name: 'Green transition' }).click();
  await expect(page.locator('.world-frame__strip li')).toHaveCount(8);
  // the energy mark's drill-down lists the band's lines and the two PLN conditions; Escape closes the card
  await page.locator('.world-frame__strip li button', { hasText: 'Energy' }).click();
  const card = page.getByRole('region', { name: 'Condition' });
  await expect(card.locator('[data-drilldown="energy"] a')).toHaveCount(2);
  await card.getByRole('button', { name: 'Close the card' }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole('radio', { name: 'No shift' }).click();
  expect(await page.evaluate(() => window.world.all().filter((e) => e.kind === 'mark').length)).toBe(0);
  // [ and ] through every company, Shift with them through every building (PRD v2 §3.4)
  const canvas = page.locator('.world-frame__canvas-host canvas');
  await canvas.focus();
  const companies = await page.evaluate(() => window.world.all().filter((e) => e.kind === 'company' && /^[A-Z]{4}$/.test(e.id)).length);
  expect(companies).toBeGreaterThan(150);
  const seen = new Set<string>();
  for (let i = 0; i < companies; i++) { await page.keyboard.press(']'); seen.add((await page.evaluate(() => window.world.selected())) ?? ''); }
  expect(seen.size).toBe(companies);
  const n = await page.evaluate(() => window.world.all().filter((e) => e.kind === 'building').length);
  expect(n).toBe(125);
  const blocks = new Set<string>();
  for (let i = 0; i < n; i++) { await page.keyboard.press('Shift+BracketRight'); blocks.add((await page.evaluate(() => window.world.selected())) ?? ''); }
  expect(blocks.size).toBe(n);
  await page.keyboard.press('['); await page.keyboard.press('Escape');
  await page.keyboard.press('2'); await page.keyboard.press('+'); await page.keyboard.press('-'); await page.keyboard.press('0'); await page.keyboard.press('h');
  await settle(page, 2);
  expect(errors).toEqual([]);
});

test('exposes a company (card, section, whiteboard, station markers), opens and closes the board with focus returning to the stage, and lights its chain', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = await open(page);
  await ready(page);
  await page.evaluate(() => window.world.select('INTP'));
  const card = page.getByRole('region', { name: 'Selection details' });
  await expect(card.getByRole('heading', { level: 3 })).toBeFocused();
  await expect(card).toContainText('Published');
  expect(await page.evaluate(() => window.world.chain()[0])).toBe('B121');
  await card.getByRole('button', { name: 'Look inside' }).click();
  await page.waitForTimeout(2500); await settle(page, 2);
  expect(await page.evaluate(() => window.world.exposed())).toMatchObject({ ticker: 'INTP', placed: { fuel: 'line', raw: 'receiving' } });
  expect(await page.evaluate(() => window.world.all().some((e) => e.id === 'wb:INTP' && e.status === 'Published'))).toBe(true);
  await card.getByRole('link', { name: 'Open board' }).click();
  const board = page.getByRole('dialog', { name: 'Board: INTP' });
  await expect(board.getByRole('heading', { level: 3 }).first()).toBeFocused();
  await expect(board).toContainText('SYNTHETIC mock, never ships');
  await expect(board.getByRole('button', { name: /Download/ })).toBeVisible();
  await expect(page).toHaveURL(/\/finance\/kawasan\/intp/);
  await expect(board.getByRole('list', { name: 'Drivers in the drawing' }).getByRole('button')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expect(board).toHaveCount(0);
  await expect(page.locator('.world-frame__canvas-host canvas')).toBeFocused();
  expect(errors).toEqual([]);
});

test('a click on a company’s building selects the company at the district, street and inside bands; hovering shows the pointer and its label (PRD v2 A2, A3)', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = await open(page);
  await ready(page);
  const canvas = page.locator('.world-frame__canvas-host canvas');
  const box = (await canvas.boundingBox())!;
  for (const zoom of [0, 6, 12]) {
    if (zoom) await page.evaluate((z) => window.world.centre('INTP', z), zoom); else await page.evaluate(() => window.world.view('hero'));
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => window.world.band())).toBe(zoom === 0 ? 'district' : zoom === 6 ? 'street' : 'inside');
    const [x, y] = (await page.evaluate(() => window.world.screenOf('INTP')))!;
    await page.mouse.move(box.x + x, box.y + y);
    await expect.poll(() => page.evaluate(() => window.world.hovered()?.label ?? null), { timeout: 5000 }).toBe('INTP · Indocement Tunggal Prakarsa Tbk');
    expect(await canvas.evaluate((c) => (c as HTMLCanvasElement).style.cursor)).toBe('pointer');
    await expect(page.locator('[data-world-readout]')).toHaveText('INTP · Indocement Tunggal Prakarsa Tbk');
    await page.mouse.click(box.x + x, box.y + y);
    await expect.poll(() => page.evaluate(() => window.world.selected())).toBe('INTP');
    await page.keyboard.press('Escape');
  }
  expect(await page.evaluate(() => window.world.zoom())).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});

test('a click on a vehicle opens its card: its load, its ends, its link’s state and the illustrative line (PRD v2 B1, §3.11)', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = await open(page);
  await ready(page);
  // every goods vehicle knows where it comes from, where it goes and what it carries
  const vehicles = await page.evaluate(() => window.world.all().filter((e) => e.kind === 'vehicle'));
  expect(vehicles.length).toBeGreaterThan(200);
  for (const v of vehicles) expect(v.facts!.from && v.facts!.to && v.facts!.load, v.id).toBeTruthy();
  // held still, a vehicle on a road is pointed at and clicked where it stands
  await page.evaluate(() => window.world.pause(true));
  const id = await page.evaluate(() => window.world.all().find((e) => e.kind === 'vehicle' && e.facts!.state === 'out' && !String(e.facts!.road).startsWith('driveway'))!.id);
  await page.evaluate((v) => window.world.centre(v, 12), id);
  await page.waitForTimeout(2500);
  const canvas = page.locator('.world-frame__canvas-host canvas');
  const box = (await canvas.boundingBox())!;
  const [x, y] = (await page.evaluate((v) => window.world.screenOf(v), id))!;
  await page.mouse.move(box.x + x, box.y + y);
  await expect.poll(() => page.evaluate(() => window.world.hovered()?.kind ?? null), { timeout: 5000 }).toBe('vehicle');
  await page.mouse.click(box.x + x, box.y + y);
  await expect.poll(() => page.evaluate(() => window.world.selected())).toMatch(/^V-\d{4}$/);
  const card = page.locator('.world-card');
  await expect(card).toContainText('Illustrative traffic; see the model for figures');
  for (const row of ['Load', 'From', 'To', 'Link']) await expect(card.locator('dt', { hasText: new RegExp(`^${row}$`) })).toHaveCount(1);
  await expect(card.getByRole('button', { name: 'Open the supplier' })).toBeVisible();
  await card.getByRole('button', { name: 'Open the supplier' }).click();
  await expect.poll(() => page.evaluate(() => window.world.all().find((e) => e.id === window.world.selected())?.kind)).toBe('company');
  await page.evaluate(() => window.world.pause(false));
  expect(errors).toEqual([]);
});

test('a laden vehicle crossing a gate stops on the weighbridge, then goes on; one at its customer’s bay unloads (PRD v2 B3)', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = await open(page);
  await ready(page);
  await page.evaluate(() => window.world.pause(true));
  // run the world by hand until a vehicle stands on a weighbridge
  const find = (state: string) => page.evaluate((s) => { for (let k = 0; k < 120; k++) { const v = window.world.all().find((e) => e.facts?.state === s); if (v) return v; window.world.step(0.5); } return null; }, state);
  const weighing = (await find('weighing'))!;
  expect(weighing).not.toBeNull();
  expect(weighing.facts!.speed).toBe(0);
  expect(weighing.facts!.leg).toBe('out');
  await page.evaluate(() => window.world.step(2));
  const after = await page.evaluate((id) => window.world.all().find((e) => e.id === id)?.facts ?? null, weighing.id);
  expect(after?.state).not.toBe('weighing');
  const unloading = (await find('unloading'))!;
  expect(unloading).not.toBeNull();
  expect(unloading.facts!.leg).toBe('out');
  await page.evaluate(() => window.world.pause(false));
  expect(errors).toEqual([]);
});

test('a company without a model opens a board that says so and carries no figure', async ({ page }) => {
  const errors = await open(page, '/finance/kawasan/smgr?debug=1');
  await ready(page);
  const empty = page.getByRole('dialog', { name: 'Board: SMGR' });
  await expect(empty).toContainText('No model yet');
  expect((await empty.innerText()).replace(/\b[A-Z]{4}\b|\b[A-Z]\d{3}\b/g, '')).not.toMatch(/\d/);
  expect(errors).toEqual([]);
});

test('at 390 px the world starts by hand, nothing scrolls sideways, and the card is a bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await open(page);
  await expect(page.locator('.world-frame__canvas-host[data-ready="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start the world' }).click();
  await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.evaluate(() => window.world.select('C111'));
  const card = page.getByRole('region', { name: 'Selection details' });
  const box = (await card.boundingBox())!, stage = (await page.locator('.world-frame__stage').boundingBox())!;
  expect(box.width).toBeGreaterThan(300);
  expect(Math.abs(box.y + box.height - (stage.y + stage.height))).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});

test('Skema swaps the world for the schematic in place, and back', async ({ page }) => {
  const errors = await open(page);
  await ready(page);
  await page.getByRole('button', { name: 'Skema', exact: true }).click();
  await expect(page.locator('.world-frame[data-world="skema"]')).toHaveCount(1);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'The industry chain', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Skema', exact: true }).click();
  await ready(page);
  expect(errors).toEqual([]);
});

test.describe('reduced motion', () => {
  test('shows the schematic and one line, and never mounts the engine', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await open(page);
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    await expect(page.locator('.world-frame')).toHaveCount(1);
    await expect(page.locator('.world-frame')).toHaveAttribute('data-world', 'reduced');
    await expect(page.getByText('not shown while your system asks for reduced motion')).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
