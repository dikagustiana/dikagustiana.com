/**
 * The v2 gate frames (docs/world/v2/MEGA-PROMPT-kawasan-v2.md §3–§7): one PNG
 * per claim in a gate note, shot on a flag-on build served locally, in
 * Chromium on SwiftShader through the engine's debug API.
 *
 *   node scripts/world/frames-v2.mjs http://127.0.0.1:4410 --gate a [--out docs/world/frames/v2]
 *
 * The served build must point at a dead Supabase URL; every Supabase call is
 * answered here (the published index is empty, so every company reads "No
 * model yet"), so the run contacts no backend and writes nothing.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://127.0.0.1:4410';
const flags = process.argv.slice(3);
const args = Object.fromEntries(flags.map((a, i, all) => (a.startsWith('--') && all[i + 1] && !all[i + 1].startsWith('--') ? [a.slice(2), all[i + 1]] : [])).filter((x) => x.length));
const gate = (args.gate ?? 'a').toLowerCase();
const out = path.resolve(args.out ?? 'docs/world/frames/v2');
const only = args.only ? args.only.split(',') : null;
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const log = [];

/** A page on the world, every backend call answered locally (reads only; a write is refused). */
async function world({ phone = false } = {}) {
  const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.route('**/rest/v1/**', (r) => (r.request().method() === 'GET' || r.request().method() === 'HEAD' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 405, body: '' })));
  await page.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await page.route('**/realtime/v1/**', (r) => r.abort());
  await page.goto(`${base}/finance/kawasan?debug`, { waitUntil: 'networkidle' });
  if (phone) await page.getByRole('button', { name: 'Start the world' }).click();
  await page.waitForFunction(() => !!window.world, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  return { page, errors };
}
const settle = (page, ms = 2500) => page.waitForTimeout(ms);
async function shot(page, name, note, target = '.world-frame__stage') {
  await page.locator(target).first().screenshot({ path: path.join(out, name) });
  const reading = await page.evaluate(() => ({ zoom: Math.round(window.world.zoom() * 100) / 100, band: window.world.band(), drawCalls: window.world.drawCalls(), selected: window.world.selected() }));
  log.push({ frame: name, note, ...reading });
  console.log(name, JSON.stringify(reading));
}

const GATES = {
  a: [
    ['gate-a-hero.png', 'the hero, the home view: the estate at 1.25 px/m, every company a building', async (page) => { await page.evaluate(() => window.world.view('hero')); await settle(page); }],
    ['gate-a-district.png', 'the map (Whole) at the district band: every region, block and lot', async (page) => { await page.evaluate(() => window.world.view('whole')); await settle(page); }],
    ['gate-a-street.png', 'the street band over INTP: the lots with their kerb signs and tickers, the block’s signboard, mark and name', async (page) => { await page.evaluate(() => window.world.centre('INTP', 6)); await settle(page, 1500); }],
    ['gate-a-company-card.png', 'a click on INTP’s building at the hero: the company card v2 with what it does, its suppliers and customers', async (page) => {
      await page.evaluate(() => window.world.view('hero')); await settle(page);
      const box = await page.locator('.world-frame__canvas-host canvas').boundingBox();
      const [x, y] = await page.evaluate(() => window.world.screenOf('INTP'));
      await page.mouse.move(box.x + x, box.y + y); await settle(page, 1200);
      await page.mouse.click(box.x + x, box.y + y); await settle(page, 1500);
    }],
  ],
  b: [
    ['gate-b-home-flows.png', 'the hero with the flows: goods vehicles on their routes from supplier lots to customer lots, drawn at 1.25 × their size', async (page) => { await page.evaluate(() => window.world.view('hero')); await settle(page, 4000); }],
    ['gate-b-gate-stop.png', 'a laden truck standing on the east gate’s weighbridge, the queue behind it, at the street band', async (page) => {
      await page.evaluate(() => window.world.pause(true));
      const id = await page.evaluate(() => { for (let k = 0; k < 240; k++) { const v = window.world.all().find((e) => e.facts?.state === 'weighing' && Math.abs(e.facts.x - 300) < 12 && Math.abs(e.facts.y) < 12); if (v) return v.id; window.world.step(0.25); } return null; });
      await page.evaluate((v) => (v ? window.world.centre(v, 7) : window.world.centre('gate-east', 7)), id); await settle(page, 2500);
    }],
    ['gate-b-port.png', 'the port: the bulk ship loading at its quay (its hold filling), the container ship, the crane, the raw-export trucks', async (page) => {
      await page.evaluate(() => { window.world.pause(true); for (let k = 0; k < 160; k++) { if (window.world.all().find((e) => e.id === 'SHIP-BULK')?.status === 'loading') break; window.world.step(0.5); } window.world.step(20); window.world.centre('SHIP-BULK', 2.2); });
      await settle(page, 2500);
    }],
    ['gate-b-vehicle-card.png', 'a click on a truck at the inside band: its card with the load, the supplier and the customer, the link’s state and the illustrative line', async (page) => {
      await page.evaluate(() => window.world.pause(true));
      const id = await page.evaluate(() => window.world.all().find((e) => e.kind === 'vehicle' && e.facts.state === 'out' && e.facts.kind === 'hopper' && !String(e.facts.road).startsWith('driveway'))?.id ?? window.world.all().find((e) => e.kind === 'vehicle').id);
      await page.evaluate((v) => window.world.centre(v, 10), id); await settle(page, 2500);
      const box = await page.locator('.world-frame__canvas-host canvas').boundingBox();
      const [x, y] = await page.evaluate((v) => window.world.screenOf(v), id);
      await page.mouse.move(box.x + x, box.y + y); await settle(page, 1200);
      await page.mouse.click(box.x + x, box.y + y); await settle(page, 1500);
    }],
  ],
  'a-phone': [
    ['gate-a-phone.png', 'a phone at 390 px after "Start the world": the hero at 1 px/m', async (page) => { await settle(page, 1000); }],
  ],
};

for (const key of Object.keys(GATES).filter((k) => k === gate || k.startsWith(`${gate}-`))) {
  const { page, errors } = await world({ phone: key.endsWith('-phone') });
  for (const [name, note, act] of GATES[key]) {
    if (only && !only.includes(name)) continue;
    await act(page);
    await shot(page, name, note, key.endsWith('-phone') ? '.world-frame__stage' : '.world-frame__stage');
  }
  if (errors.length) { console.log('page errors:', errors); log.push({ pageErrors: errors }); }
  await page.close();
}
fs.writeFileSync(path.join(out, `frames-gate-${gate}.json`), JSON.stringify({ ranAt: new Date().toISOString(), base, gate, frames: log }, null, 2) + '\n');
await browser.close();
