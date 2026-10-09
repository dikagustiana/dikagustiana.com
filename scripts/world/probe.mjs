/**
 * The world's liveliness probe (docs/world/v2/PLAN.md §1, §7): the numbers the
 * v2 acceptance criteria are written against, measured on a flag-on build
 * served locally, in Chromium through the engine's debug API.
 *
 *   node scripts/world/probe.mjs http://127.0.0.1:4402 [--out dir] [--route /finance/kawasan] [--phone]
 *
 * It reports, at the home view (the hero), the map (Whole), the estate, and a
 * company at the street and inside bands:
 *   pxPerMetre     the camera's zoom: how many screen pixels one metre is
 *   band           the band of detail that zoom is in (district, street, inside)
 *   buildingPx     the on-screen width of a 40 m block at that zoom
 *   vehiclesMoving road and rail vehicles that are rendered, on screen and moving, of those rendered and on screen
 *   walkersMoving  the same for walkers; coinsMoving for the money layer's coins
 *   truckPxPerSec  the median on-screen speed of the rendered, moving trucks
 *   vehiclePx      the shortest and the median on-screen length of those trucks (drawn length × px/m, the
 *                  measure the PRD's 5 px of v1 was taken by); the town's parcel vans, a car's size, are left out
 *                  and counted apart (vans)
 *   withRoute      goods vehicles that report an origin lot, a destination lot and a load, of all goods vehicles
 *   weighing       goods vehicles seen standing on a weighbridge, and unloading at a bay, during the measure
 *   drawCalls      the renderer's draw calls for the frame
 *   hoverCursor    the cursor over the company; hoverLabel, the label; hoverPickMs, the engine's time to find
 *                  what is under the pointer; hoverMs, the pointer's round trip to the label (on SwiftShader it
 *                  waits on slow frames)
 *   clickResolves  what a click at the company's anchor selects (company, building, nothing)
 * --phone runs at 390 × 844 with the world started by hand. Nothing here
 * reads a figure; the probe only looks at geometry and motion. The served
 * build must point at a dead Supabase URL (the outage state) so the run
 * contacts no backend.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://127.0.0.1:4402';
const flags = process.argv.slice(3);
const args = Object.fromEntries(flags.map((a, i, all) => (a.startsWith('--') && all[i + 1] && !all[i + 1].startsWith('--') ? [a.slice(2), all[i + 1]] : [])).filter((x) => x.length));
const phone = flags.includes('--phone');
const out = path.resolve(args.out ?? 'docs/world/frames/probe');
const route = args.route ?? '/finance/kawasan';
const TICKER = args.ticker ?? 'INTP', CODE = args.code ?? 'B121';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
await page.goto(`${base}${route}?debug`, { waitUntil: 'networkidle' });
if (phone) await page.getByRole('button', { name: 'Start the world' }).click();
await page.waitForFunction(() => !!window.world, null, { timeout: 60000 });
await page.waitForTimeout(2500);

const canvas = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top, left: r.left }; });

/** Movers by kind, from their ids (traffic until phase B; vehicles, ships and walkers after). */
const KINDS = { vehicles: '^(TRUCK|REEFER|LOOP|RAW|VAN|FORKLIFT|TRAIN|DUMP|HOPPER|TANKER|BOX|BUS|CAR|RAIL|V)-', walkers: '^WALKER-', coins: '^COIN-' };

async function measure(name) {
  const m = await page.evaluate(async ({ ticker, code, kinds }) => {
    const w = window.world;
    const zoom = w.zoom?.() ?? null;
    // only rendered movers count: the LOD and the layers hide whole groups, and a hidden mover's anchor still projects
    const kindOf = (id) => Object.keys(kinds).find((k) => new RegExp(kinds[k]).test(id)) ?? null;
    const movers = w.all().map((e) => e.id).filter((id) => kindOf(id) && w.visible(id));
    const at = (id) => w.screenOf(id);
    const before = Object.fromEntries(movers.map((id) => [id, at(id)]));
    // the goods vehicles' facts, sampled through the second: who stood on a weighbridge, who unloaded
    const weighing = new Set(), unloading = new Set(), facts = new Map();
    const sample = () => { for (const e of w.all()) if (e.facts) { facts.set(e.id, e.facts); if (e.facts.state === 'weighing') weighing.add(e.id); if (e.facts.state === 'unloading') unloading.add(e.id); } };
    for (let k = 0; k < 5; k++) { sample(); await new Promise((r) => setTimeout(r, 200)); }
    const after = Object.fromEntries(movers.map((id) => [id, at(id)]));
    const cw = document.querySelector('canvas').clientWidth, ch = document.querySelector('canvas').clientHeight;
    const count = { vehicles: [0, 0], walkers: [0, 0], coins: [0, 0] }, truckSpeeds = [], lengths = [];
    let vans = 0;
    for (const id of movers) {
      const a = before[id], b = after[id]; if (!a || !b) continue;
      const on = a[0] >= 0 && a[0] <= cw && a[1] >= 0 && a[1] <= ch; if (!on) continue;
      const k = kindOf(id); count[k][1]++;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > 0.5) { count[k][0]++; if (k === 'vehicles') { truckSpeeds.push(d); const f = facts.get(id); if (f?.kind === 'van') vans++; else if (f?.len) lengths.push(f.len * zoom); } }
    }
    truckSpeeds.sort((x, y) => x - y);
    const truck = truckSpeeds.length ? truckSpeeds[Math.floor(truckSpeeds.length / 2)] : 0;
    const of = ([n, v]) => `${n} of ${v}`;
    lengths.sort((x, y) => x - y);
    const goods = [...facts.values()], withRoute = goods.filter((f) => f.from && f.to && f.load).length;
    const vehiclePx = lengths.length ? `${Math.round(lengths[0] * 10) / 10} / ${Math.round(lengths[Math.floor(lengths.length / 2)] * 10) / 10}` : null;
    return { zoom, band: w.band?.() ?? null, vehiclesMoving: of(count.vehicles), walkersMoving: of(count.walkers), coinsMoving: of(count.coins), truckPxPerSec: Math.round(truck * 10) / 10, vehiclePx, withRoute: goods.length ? `${withRoute} of ${goods.length}` : null, weighing: `${weighing.size} weighing, ${unloading.size} unloading`, vans, drawCalls: w.drawCalls(), distance: Math.round(w.distance() * 100) / 100, company: at(ticker), building: at(code) };
  }, { ticker: TICKER, code: CODE, kinds: KINDS });
  const pxPerMetre = m.zoom;
  const r = { view: name, pxPerMetre: pxPerMetre ? Math.round(pxPerMetre * 100) / 100 : null, band: m.band, buildingPx: pxPerMetre ? Math.round(40 * Math.SQRT2 * pxPerMetre) : null, vehiclesMoving: m.vehiclesMoving, walkersMoving: m.walkersMoving, coinsMoving: m.coinsMoving, truckPxPerSec: m.truckPxPerSec, vehiclePx: m.vehiclePx, vans: m.vans, withRoute: m.withRoute, weighing: m.weighing, drawCalls: m.drawCalls, distance: m.distance };
  // hover and click at the company's anchor, if it is on the canvas
  const [x, y] = m.company ?? [-1, -1];
  if (m.company && x >= 0 && x <= canvas.w && y >= 0 && y <= canvas.h) {
    // the engine's own time to find what is under the pointer; the pointer's round trip below also waits on frames,
    // which SwiftShader draws slowly
    r.hoverPickMs = await page.evaluate(([px, py]) => { const t = performance.now(); window.world.hoverAt(px, py); const ms = performance.now() - t; window.world.hoverAt(-9, -9); return Math.round(ms * 10) / 10; }, [x, y]);
    await page.mouse.move(canvas.left + x + 3, canvas.top + y + 3);
    const t0 = Date.now();
    await page.mouse.move(canvas.left + x, canvas.top + y);
    try { await page.waitForFunction((t) => window.world.hovered()?.id === t, TICKER, { timeout: 2000, polling: 10 }); r.hoverMs = Date.now() - t0; } catch { r.hoverMs = null; }
    r.hoverLabel = await page.evaluate(() => window.world.hovered()?.label ?? null);
    r.hoverCursor = await page.evaluate(() => document.querySelector('canvas').style.cursor);
    await page.mouse.click(canvas.left + x, canvas.top + y); await page.waitForTimeout(600);
    r.clickSelects = await page.evaluate(() => window.world.selected());
    r.clickResolves = r.clickSelects === TICKER ? 'company' : r.clickSelects === CODE ? 'building' : r.clickSelects ? `other:${r.clickSelects}` : 'nothing';
    await page.keyboard.press('Escape');
    await page.mouse.move(canvas.left + 2, canvas.top + 2);
  } else r.clickResolves = 'company off the canvas';
  await page.screenshot({ path: path.join(out, `probe-${phone ? "phone-" : ""}${name}.png`) });
  return r;
}

const settle = (ms = 2500) => page.waitForTimeout(ms);
const results = [];
results.push(await measure('home'));
await page.evaluate(() => window.world.view('whole')); await settle();
results.push(await measure('whole'));
await page.evaluate(() => window.world.view('estate')); await settle();
results.push(await measure('estate'));
// the street and inside bands, centred on the company (PRD v2 §3.3: street from 4 px/m, inside from 10)
await page.evaluate((t) => window.world.centre(t, 6), TICKER); await settle(1200);
results.push(await measure('street'));
await page.evaluate((t) => window.world.centre(t, 12), TICKER); await settle(1200);
results.push(await measure('inside'));

const report = { ranAt: new Date().toISOString(), base, route, phone, canvas: { w: canvas.w, h: canvas.h }, results, pageErrors: errors };
fs.writeFileSync(path.join(out, phone ? 'probe-phone.json' : 'probe.json'), JSON.stringify(report, null, 2));
console.table(results.map(({ view, pxPerMetre, band, buildingPx, vehiclesMoving, truckPxPerSec, vehiclePx, withRoute, weighing, drawCalls, hoverPickMs, clickResolves }) => ({ view, pxPerMetre, band, buildingPx, vehiclesMoving, truckPxPerSec, vehiclePx, withRoute, weighing, drawCalls, hoverPickMs, clickResolves })));
if (errors.length) console.log('page errors:', errors);
await browser.close();
