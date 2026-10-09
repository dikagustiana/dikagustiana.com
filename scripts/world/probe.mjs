/**
 * The world's liveliness probe (docs/world/v2/PLAN.md §1): the numbers the
 * v2 acceptance criteria are written against, measured on a flag-on build
 * served locally, in Chromium through the engine's debug API.
 *
 *   node scripts/world/probe.mjs http://127.0.0.1:4402 [--out dir] [--route /finance/kawasan]
 *
 * It reports, at the home view and at the middle (estate) view:
 *   pxPerMetre     the camera's zoom: how many screen pixels one metre is
 *   buildingPx     the on-screen width of a 40 m block at that zoom
 *   vehiclesMoving road and rail vehicles (trucks, reefers, loop and raw trucks, vans,
 *                  forklifts, the train) that are rendered, on screen and moving, of those rendered and on screen
 *   walkersMoving  the same for walkers; coinsMoving for the money layer's coins
 *   truckPxPerSec  the median on-screen speed of the rendered, moving trucks (TRUCK-* only)
 *   drawCalls      the renderer's draw calls for the frame
 *   click          what a click at a company's anchor selects (company, building, nothing)
 *   hover          whether the cursor turns to a pointer over a company
 * Nothing here reads a figure; the probe only looks at geometry and motion.
 * The served build must point at a dead Supabase URL (the outage state) so
 * the run contacts no backend.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://127.0.0.1:4402';
const args = Object.fromEntries(process.argv.slice(3).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]] : [])).filter((x) => x.length));
const out = path.resolve(args.out ?? 'docs/world/frames/probe');
const route = args.route ?? '/finance/kawasan';
const TICKER = args.ticker ?? 'INTP', CODE = args.code ?? 'B121';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
await page.goto(`${base}${route}?debug`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.world, null, { timeout: 60000 });
await page.waitForTimeout(2500);

const canvas = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top, left: r.left }; });

async function measure(name) {
  const m = await page.evaluate(async ({ ticker, code }) => {
    const w = window.world;
    const zoom = w.zoom?.() ?? null;
    // only rendered movers count: the LOD and the layers hide whole groups, and a hidden mover's anchor still projects
    const kindOf = (id) => (/^WALKER-/.test(id) ? 'walkers' : /^COIN-/.test(id) ? 'coins' : /^(TRUCK|REEFER|LOOP|RAW|VAN|FORKLIFT|TRAIN)-/.test(id) ? 'vehicles' : null);
    const movers = w.all().map((e) => e.id).filter((id) => kindOf(id) && w.visible(id));
    const at = (id) => w.screenOf(id);
    const before = Object.fromEntries(movers.map((id) => [id, at(id)]));
    await new Promise((r) => setTimeout(r, 1000));
    const after = Object.fromEntries(movers.map((id) => [id, at(id)]));
    const cw = document.querySelector('canvas').clientWidth, ch = document.querySelector('canvas').clientHeight;
    const count = { vehicles: [0, 0], walkers: [0, 0], coins: [0, 0] }, truckSpeeds = [];
    for (const id of movers) {
      const a = before[id], b = after[id]; if (!a || !b) continue;
      const on = a[0] >= 0 && a[0] <= cw && a[1] >= 0 && a[1] <= ch; if (!on) continue;
      const k = kindOf(id); count[k][1]++;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > 0.5) { count[k][0]++; if (/^TRUCK-/.test(id)) truckSpeeds.push(d); }
    }
    truckSpeeds.sort((x, y) => x - y);
    const truck = truckSpeeds.length ? truckSpeeds[Math.floor(truckSpeeds.length / 2)] : 0;
    const of = ([m, v]) => `${m} of ${v}`;
    return { zoom, vehiclesMoving: of(count.vehicles), walkersMoving: of(count.walkers), coinsMoving: of(count.coins), truckPxPerSec: Math.round(truck * 10) / 10, drawCalls: w.drawCalls(), distance: Math.round(w.distance() * 100) / 100, company: at(ticker), building: at(code) };
  }, { ticker: TICKER, code: CODE });
  const pxPerMetre = m.zoom;
  const r = { view: name, pxPerMetre: pxPerMetre ? Math.round(pxPerMetre * 100) / 100 : null, buildingPx: pxPerMetre ? Math.round(40 * Math.SQRT2 * pxPerMetre) : null, vehiclesMoving: m.vehiclesMoving, walkersMoving: m.walkersMoving, coinsMoving: m.coinsMoving, truckPxPerSec: m.truckPxPerSec, drawCalls: m.drawCalls, distance: m.distance };
  // hover and click at the company's anchor
  if (m.company) {
    const [x, y] = m.company;
    await page.mouse.move(canvas.left + x, canvas.top + y); await page.waitForTimeout(300);
    r.hoverCursor = await page.evaluate(() => document.querySelector('canvas').style.cursor);
    await page.mouse.click(canvas.left + x, canvas.top + y); await page.waitForTimeout(600);
    r.clickSelects = await page.evaluate(() => window.world.selected());
    r.clickResolves = r.clickSelects === TICKER ? 'company' : r.clickSelects === CODE ? 'building' : r.clickSelects ? `other:${r.clickSelects}` : 'nothing';
    await page.keyboard.press('Escape');
  } else r.clickResolves = 'company has no screen anchor';
  await page.screenshot({ path: path.join(out, `probe-${name}.png`) });
  return r;
}

const results = [];
results.push(await measure('home'));
await page.evaluate(() => window.world.view('estate')); await page.waitForTimeout(2500);
results.push(await measure('estate'));
await page.evaluate((code) => window.world.select(code), CODE); await page.locator('input[aria-label^="Distance"]').fill('1'); await page.waitForTimeout(3000);
results.push(await measure('near'));

const report = { ranAt: new Date().toISOString(), base, route, canvas: { w: canvas.w, h: canvas.h }, results, pageErrors: errors };
fs.writeFileSync(path.join(out, 'probe.json'), JSON.stringify(report, null, 2));
console.table(results.map(({ view, pxPerMetre, buildingPx, vehiclesMoving, walkersMoving, truckPxPerSec, drawCalls, hoverCursor, clickResolves }) => ({ view, pxPerMetre, buildingPx, vehiclesMoving, walkersMoving, truckPxPerSec, drawCalls, hoverCursor, clickResolves })));
if (errors.length) console.log('page errors:', errors);
await browser.close();
