/**
 * Style frames and measurements for the gate reports (mega prompt §6.5, §11).
 *
 *   node scripts/world/capture-frames.mjs [--on URL] [--off URL] [--main URL] [--out docs/world/frames]
 *
 * Expects three served builds: the branch with VITE_WORLD_KAWASAN=true (--on,
 * default http://127.0.0.1:4174), the branch with the flag off (--off,
 * 4173) and main (--main, 4175), all built against the dead Supabase URL
 * playwright.config.ts sets. Every Supabase call is intercepted here and
 * answered locally, so nothing reaches production (rule 2): the published
 * index returns ONE package, the Finance in Action SYNTHETIC cement fixture
 * re-labelled "INTP (mock, never ships)" (rule 8), and the essays table two
 * essays labelled the same way. The mock exists only in this script.
 *
 * Writes PNG frames and measurements.json to --out. WebGL runs on
 * SwiftShader; colours and layout are the renderer's, frame times are not
 * representative of a GPU and are reported as such.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]] : [])).filter((x) => x.length));
const ON = args.on ?? 'http://127.0.0.1:4174';
const OFF = args.off ?? 'http://127.0.0.1:4173';
const MAIN = args.main ?? 'http://127.0.0.1:4175';
const OUT = path.resolve(args.out ?? 'docs/world/frames');
fs.mkdirSync(OUT, { recursive: true });

const MOCK_LABEL = 'mock, never ships';
const fixture = JSON.parse(fs.readFileSync(path.resolve('src/data/finance-in-action/fixtures/XCEM.SYNTHETIC.json'), 'utf8'));
// The data layer's own checks still apply: a synthetic package must say SYNTHETIC in its name and may not be its own pair.
const mockPackage = { ...fixture, meta: { ...fixture.meta, ticker: 'INTP', name: `INTP (SYNTHETIC ${MOCK_LABEL})`, status: 'published', pair: ['SMGR', 'SMCB'] } };
const mockEssays = [
  { slug: 'mock-cold-chain', title: `Cold storage is the binding constraint (${MOCK_LABEL})`, section: 'next-big-thing', date: '2026-09-01', phase: null },
  { slug: 'mock-cement', title: `Cement after the capacity cycle (${MOCK_LABEL})`, section: 'next-big-thing', date: '2026-08-01', phase: null },
];

async function intercept(page, { published = true } = {}) {
  await page.route('**/rest/v1/**', (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/rest/v1/')[1]?.split('?')[0] ?? '';
    if (route.request().method() !== 'GET' && route.request().method() !== 'HEAD') return route.fulfill({ status: 405, contentType: 'application/json', body: '{"message":"writes are not expected"}' });
    if (table === 'model_packages') return published ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ package: mockPackage }]) }) : route.fulfill({ status: 503, body: '' });
    if (table === 'essays') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockEssays) });
    if ((route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')) return route.fulfill({ status: 406, contentType: 'application/json', body: '{"code":"PGRST116"}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route('**/auth/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await page.route('**/realtime/v1/**', (route) => route.abort());
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const measurements = { capturedAt: new Date().toISOString(), renderer: null, frames: [], drawCalls: {}, warmup: null, mount: {}, frameTimes: {}, flagOff: {}, consoleErrors: [] };

async function worldPage({ dark = false, width = 1440, height = 900, debug = true, url = '/finance/kawasan', published = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'no-preference', colorScheme: dark ? 'dark' : 'light' });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') measurements.consoleErrors.push(`${url}: ${m.text()}`); });
  page.on('pageerror', (e) => measurements.consoleErrors.push(`${url}: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) measurements.consoleErrors.push(`${url}: ${r.status()} ${new URL(r.url()).pathname}`); });
  if (dark) await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => document.documentElement.classList.add('dark')));
  await intercept(page, { published });
  const t0 = Date.now();
  await page.goto(`${ON}${url}${debug ? (url.includes('?') ? '&' : '?') + 'debug=1' : ''}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.world-frame[data-world="on"]');
  await page.waitForSelector('.world-frame__canvas-host[data-ready="true"]', { timeout: 60_000 });
  const mountMs = Date.now() - t0;
  const firstClock = await page.evaluate(() => document.querySelector('.world-frame__clock')?.textContent ?? null);
  // let the poster fade and the data land
  await page.waitForTimeout(900);
  return { context, page, mountMs, firstClock };
}

const shot = async (page, name, locator) => { const file = path.join(OUT, `${name}.png`); await (locator ? page.locator(locator) : page).screenshot({ path: file }); measurements.frames.push(name); console.log('frame', name); return file; };
const setDistance = (page, t) => page.evaluate((v) => { const input = document.querySelector('input[aria-label^="Distance"]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, String(v)); input.dispatchEvent(new Event('input', { bubbles: true })); }, t);
const settle = async (page, seconds = 2) => {
  await page.evaluate((s) => window.world.step(s), seconds);
  let last = -1;
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(400); const n = await page.evaluate(() => window.world.drawCalls()); if (n === last) return; last = n; }
};
// the site's sticky navigation would overlap a frame-sized shot; it is hidden for those only
const hideNav = (page) => page.evaluate(() => { for (const el of document.querySelectorAll('header, nav')) if (!el.closest('.world-frame')) el.style.visibility = 'hidden'; document.querySelector('.world-frame')?.scrollIntoView(); });

// ---- far / middle / near × light / dark × day / night ----
for (const dark of [false, true]) {
  const { context, page, mountMs, firstClock } = await worldPage({ dark });
  measurements.mount[dark ? 'dark' : 'light'] = mountMs;
  if (!measurements.warmup) measurements.warmup = { seconds: 1, steps: 60, firstClock };
  if (!measurements.renderer) measurements.renderer = await page.evaluate(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); const d = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(d.UNMASKED_RENDERER_WEBGL); });
  for (const night of [false, true]) {
    if (night) { await page.evaluate(() => window.world.skip(12)); await settle(page, 3); }
    const tone = `${dark ? 'dark' : 'light'}-${night ? 'night' : 'day'}`;
    await page.evaluate(() => window.world.select(null));
    await page.evaluate(() => window.world.view('whole')); await setDistance(page, 0); await settle(page);
    const farCalls = await page.evaluate(() => window.world.drawCalls());
    await shot(page, `far-${tone}`, '.world-frame__stage');
    await page.evaluate(() => window.world.select('C111')); await setDistance(page, 0.5); await settle(page);
    const midCalls = await page.evaluate(() => window.world.drawCalls());
    await shot(page, `middle-${tone}`, '.world-frame__stage');
    await setDistance(page, 1); await settle(page);
    const nearCalls = await page.evaluate(() => window.world.drawCalls());
    await shot(page, `near-${tone}`, '.world-frame__stage');
    measurements.drawCalls[tone] = { far: farCalls, middle: midCalls, near: nearCalls };
    await page.evaluate(() => window.world.select(null));
  }
  if (!dark) {
    // frame-time sampling: 180 animation frames at the middle distance, SwiftShader
    await setDistance(page, 0.5); await settle(page);
    measurements.frameTimes.middle = await page.evaluate(() => new Promise((res) => { const ts = []; let last = performance.now(); let n = 0; const tick = (now) => { ts.push(now - last); last = now; if (++n < 180) requestAnimationFrame(tick); else { ts.sort((a, b) => a - b); res({ p50: +ts[Math.floor(ts.length * 0.5)].toFixed(1), p95: +ts[Math.floor(ts.length * 0.95)].toFixed(1), samples: ts.length }); } }; requestAnimationFrame(tick); }));
  }
  await context.close();
}

// ---- exposed company (INTP, mock), card at the near distance ----
{
  const { context, page } = await worldPage();
  await page.evaluate(() => window.world.select('INTP')); await setDistance(page, 1); await settle(page, 2);
  await shot(page, 'exposed-company-mock', '.world-frame__stage');
  // the board on its route
  await page.goto(`${ON}/finance/kawasan/intp`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.world-board h3');
  await page.waitForTimeout(600);
  await shot(page, 'board-mock', '.world-frame__stage');
  await context.close();
}

// ---- the think tank with two rooms, a piece open ----
{
  const { context, page } = await worldPage();
  await page.fill('.world-search input', 'mock');
  await page.click('.world-search li button >> nth=0');
  await page.waitForSelector('[role="dialog"][aria-label="The think tank"]');
  await page.waitForTimeout(500);
  await shot(page, 'think-tank-mock', '.world-frame__stage');
  await context.close();
}

// ---- the reindustrialisation overlay with the reading strip and a condition card ----
{
  const { context, page } = await worldPage();
  await page.click('[role="radio"]:has-text("Reindustrialisation")');
  await page.waitForSelector('.world-frame__strip');
  await page.click('.world-frame__strip li >> nth=0 >> button');
  await settle(page, 2);
  await hideNav(page);
  await shot(page, 'overlay-reindustrialisation', '.world-frame');
  await context.close();
}

// ---- the Skema toggle ----
{
  const { context, page } = await worldPage();
  await page.click('button.world-btn:has-text("Skema")');
  await page.waitForSelector('.world-frame[data-world="skema"]');
  await page.waitForTimeout(400);
  await hideNav(page);
  await shot(page, 'skema-toggle', '.world-frame');
  await context.close();
}

// ---- a 390 px phone ----
{
  const { context, page } = await worldPage({ width: 390, height: 844 });
  await page.evaluate(() => window.world.select('C111')); await settle(page, 2);
  await hideNav(page);
  await shot(page, 'phone-390', '.world-frame');
  await context.close();
}

// ---- outage: every company 'Status unavailable', no figure ----
{
  const { context, page } = await worldPage({ published: false });
  await page.evaluate(() => window.world.select('INTP')); await setDistance(page, 1); await settle(page, 2);
  await shot(page, 'outage-unavailable', '.world-frame__stage');
  await context.close();
}

// ---- flag off: the branch against main, pixel for pixel ----
async function pixelDiff(a, b) {
  const page = await browser.newPage();
  const r = await page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { same: false, reason: `size ${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d');
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
    g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
    let diff = 0, x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    const out = g.createImageData(c.width, c.height);
    for (let i = 0; i < da.length; i += 4) {
      const changed = da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2];
      const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width);
      if (changed) { diff++; x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); out.data[i] = 255; out.data[i + 3] = 255; }
      else { const v = 255 - Math.round((255 - (da[i] + da[i + 1] + da[i + 2]) / 3) * 0.25); out.data[i] = out.data[i + 1] = out.data[i + 2] = v; out.data[i + 3] = 255; }
    }
    g.putImageData(out, 0, 0);
    return { same: diff === 0, differingPixels: diff, pixels: da.length / 4, box: diff ? [x0, y0, x1, y1] : null, diffPng: diff ? c.toDataURL('image/png') : null };
  }, [a, b]);
  await page.close();
  return r;
}
for (const [route, name] of [['/', 'landing'], ['/about', 'about']]) {
  const results = {};
  for (const [base, tag] of [[OFF, 'branch'], [MAIN, 'main']]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await intercept(page, { published: false });
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#industry-chain');
    await page.waitForTimeout(800);
    const file = path.join(OUT, `flag-off-${name}-${tag}.png`);
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
    results[tag] = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
    results[`${tag}WorldMarkup`] = await page.evaluate(() => document.querySelectorAll('[class*="world-"], canvas').length);
    await context.close();
  }
  // noise control: main against a second load of itself, so a differing pixel can be read against the renderer's own jitter
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await intercept(page, { published: false });
    await page.goto(`${MAIN}${route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#industry-chain');
    await page.waitForTimeout(800);
    const again = 'data:image/png;base64,' + (await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' })).toString('base64');
    await context.close();
    const { diffPng: _ignored, ...noise } = await pixelDiff(results.main, again);
    results.noise = noise;
  }
  const { diffPng, ...diff } = await pixelDiff(results.branch, results.main);
  if (diffPng) fs.writeFileSync(path.join(OUT, `flag-off-${name}-diff.png`), Buffer.from(diffPng.split(',')[1], 'base64'));
  measurements.flagOff[name] = { ...diff, mainAgainstItself: results.noise, branchWorldMarkup: results.branchWorldMarkup, mainWorldMarkup: results.mainWorldMarkup };
  console.log('flag-off', name, measurements.flagOff[name]);
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify(measurements, null, 2) + '\n');
console.log(JSON.stringify({ drawCalls: measurements.drawCalls, mount: measurements.mount, frameTimes: measurements.frameTimes, warmup: measurements.warmup, consoleErrors: measurements.consoleErrors.length }, null, 1));
