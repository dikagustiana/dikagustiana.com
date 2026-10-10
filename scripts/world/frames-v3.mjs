/**
 * The v3 audit frames (sweep PRD R10.2, R10.3): shots of the flag-on world build served locally,
 * driven through the engine's debug API (window.world), every Supabase call
 * answered locally (reads only). Run it under the shared lock so only one
 * SwiftShader browser renders at a time:
 *
 *   node scripts/world/frames-v3.mjs spec.json
 *
 * (In the audit session each run was wrapped in flock on a shared lock file.)
 *
 * spec.json:
 *   {
 *     "base": "http://127.0.0.1:4410",          // default
 *     "outDir": "/abs/dir",                     // PNGs land here
 *     "viewport": { "width": 1440, "height": 900 },
 *     "warm": 30,                               // simulated seconds run after load so the fleet spreads (the day is six minutes: 15 s an hour)
 *     "hour": null,                             // hours to skip forward after that (e.g. 8 → about 20:00); null skips none
 *     "shots": [
 *       { "name": "a.png", "view": "hero" },                 // a named view: hero whole ring estate gateway town thinktank
 *       { "name": "b.png", "look": [x, y, zoom] },           // ground point (m) at zoom (px/m)
 *       { "name": "c.png", "centre": ["B121", 4] },          // an entity at zoom (px/m)
 *       { "name": "d.png", "centre": ["B121", 4], "select": "B121", "settle": 3000, "target": ".world-frame" }
 *     ],
 *     "dump": true                                          // also write entities.json (window.world.all()) once
 *   }
 *
 * Prints one JSON line per shot: { name, zoom, band, drawCalls, selected } and writes readings.json in outDir.
 * The simulation is paused after load so successive shots show the same moment unless "run" (seconds) is given on a shot.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const base = spec.base ?? 'http://127.0.0.1:4410';
const out = path.resolve(spec.outDir);
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: spec.viewport ?? { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
await page.route('**/rest/v1/**', (r) => (r.request().method() === 'GET' || r.request().method() === 'HEAD' ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : r.fulfill({ status: 405, body: '' })));
await page.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
await page.route('**/realtime/v1/**', (r) => r.abort());
await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
await page.goto(`${base}/finance/kawasan?debug=1`, { waitUntil: 'networkidle' });
if ((spec.viewport?.width ?? 1440) < 640) {
  const start = page.getByRole('button', { name: 'Start the world' });
  if (await start.count()) await start.click();
}
await page.waitForSelector('.world-frame__canvas-host[data-ready="true"]', { timeout: 120_000 });
await page.waitForFunction(() => !!window.world, null, { timeout: 60_000 });
// let the opening fleet spread out, then hold the moment
await page.evaluate(([warm, h]) => { window.world.step(warm); if (h) window.world.skip(h); window.world.pause(true); }, [spec.warm ?? 30, spec.hour ?? null]);
await page.waitForTimeout(1500);

if (spec.dump) {
  const all = await page.evaluate(() => window.world.all());
  fs.writeFileSync(path.join(out, 'entities.json'), JSON.stringify(all, null, 1));
}

const readings = [];
for (const s of spec.shots ?? []) {
  await page.evaluate((s) => {
    if (s.select !== undefined) window.world.select(s.select);
    if (s.view) window.world.view(s.view);
    if (s.look) window.world.look(s.look[0], s.look[1], s.look[2]);
    if (s.centre) window.world.centre(s.centre[0], s.centre[1]);
    if (s.run) { window.world.pause(false); window.world.step(s.run); window.world.pause(true); }
  }, s);
  // a named view eases; give it time, then one drawn frame
  await page.waitForTimeout(s.settle ?? (s.view ? 3000 : 1800));
  await page.evaluate(() => window.world.tick(0, true));
  await page.waitForTimeout(300);
  await page.locator(s.target ?? '.world-frame__stage').first().screenshot({ path: path.join(out, s.name) });
  const r = await page.evaluate(() => ({ zoom: Math.round(window.world.zoom() * 1000) / 1000, band: window.world.band(), drawCalls: window.world.drawCalls(), selected: window.world.selected() }));
  const line = { name: s.name, ...r };
  readings.push(line);
  console.log(JSON.stringify(line));
}
if (errors.length) console.log(JSON.stringify({ pageErrors: errors }));
const file = path.join(out, 'readings.json');
const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
fs.writeFileSync(file, JSON.stringify([...prev.filter((p) => !readings.some((r) => r.name === p.name)), ...readings], null, 1));
await browser.close();
