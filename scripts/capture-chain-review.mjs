/**
 * Captures the review artefact for the industry chain map: screenshots of the
 * map in every state the V5.1 brief names, at every viewport it names, with a
 * manifest that says what each image is of.
 *
 *   npm run preview -- --host 127.0.0.1 --port 4173 --strictPort   (a build of the branch)
 *   node scripts/capture-chain-review.mjs [outDir] [baseURL]
 *
 * Every Supabase call is intercepted, exactly as the e2e suite does it, and
 * answered from a LABELLED LOCAL FIXTURE: the three essays the reading path
 * names, seeded as published so the card can show a verified published
 * destination at its canonical address. It is not production content, and the
 * manifest says so on every row. Nothing here contacts a real backend.
 *
 * The manifest records the commit the working tree was at, the viewport, the
 * browser and its version, the route and the state opened on it, and the
 * fixture — so a reviewer can tell exactly what a picture is a picture of.
 */
import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [, , outDir = 'docs/response-2026-09-14-v5.1/screenshots', baseURL = 'http://127.0.0.1:4173'] = process.argv;
fs.mkdirSync(outDir, { recursive: true });

const commit = execSync('git rev-parse HEAD').toString().trim();
// Whether the tree the pictures are OF was clean — the directory being written
// into is excluded, since it is dirty by the act of running this.
const pending = execSync(`git status --porcelain -- . ':(exclude)${outDir}'`).toString().trim();
const dirty = pending.length > 0;

/** The fixture: the three published essays the reading path names, with the placement their canonical addresses are built from. */
const FIXTURE_ESSAYS = [
  { id: 'e1', slug: 'driver-tree-construction', title: 'Driver Tree Construction', section: 'finance', phase: 'financial-analytics', finance_section: 'analytics', fsli_slug: null, topic: null, published: true, status: 'published', is_selected: true, author: 'Dika Gustiana Irawan', read_time: '20 min read', date: '2026-08-01', created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z', snippet: 'How to map a business model into drivers that reconcile to the accounts.', thumbnail_url: null, category_id: 'c1', finance_modules: { slug: 'fa-07', track_slug: 'analytics' } },
  { id: 'e2', slug: 'macro-scenario-construction-for-cfos', title: 'Macro Scenario Construction for CFOs', section: 'finance', phase: 'financial-planning', finance_section: 'planning', fsli_slug: null, topic: null, published: true, status: 'published', is_selected: true, author: 'Dika Gustiana Irawan', read_time: '21 min read', date: '2026-08-02', created_at: '2026-08-02T00:00:00Z', updated_at: '2026-08-02T00:00:00Z', snippet: 'Three percentage bands are not three economic states.', thumbnail_url: null, category_id: 'c1', finance_modules: { slug: 'pf-03', track_slug: 'planning' } },
  { id: 'e4', slug: 'indonesias-reindustrialization-bet', title: "Indonesia's Reindustrialization Bet", section: 'next-big-thing', phase: 'economy', finance_section: null, fsli_slug: null, topic: null, published: true, status: 'published', is_selected: true, author: 'Dika Gustiana Irawan', read_time: '10 min read', date: '2026-08-02', created_at: '2026-08-02T00:00:00Z', updated_at: '2026-08-02T00:00:00Z', snippet: 'Carbon Liability, Capital Sequencing, and The Conditions For Payoff', thumbnail_url: null, category_id: 'c1', finance_modules: null },
];
const FIXTURE_NOTE = 'Labelled local fixture (scripts/capture-chain-review.mjs FIXTURE_ESSAYS): the three essays the reading path names, seeded as published. Not production content; the live index was not read.';

function rowsFor(url) {
  const u = new URL(url);
  if (!u.pathname.startsWith('/rest/v1/essays')) return [];
  let rows = FIXTURE_ESSAYS;
  for (const [key, raw] of u.searchParams) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    if (op === 'eq') rows = rows.filter((r) => String(r[key]) === value);
    else if (op === 'in') {
      const set = value.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, ''));
      rows = rows.filter((r) => set.includes(String(r[key])));
    }
  }
  return rows;
}

async function seed(page) {
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**/rest/v1/**', (route) => {
    const rows = rowsFor(route.request().url());
    const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(single ? rows[0] ?? null : rows) });
  });
  await page.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/storage/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/functions/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/realtime/v1/**', (r) => r.abort());
}

/**
 * The states. Each opens a route and, where a click is needed, performs it;
 * what it shows is said in words so the manifest can carry it.
 */
const STATES = [
  { key: 'home-overview', route: '/', shows: 'Default Home: the overview, Economy, no overlay, nothing open.' },
  { key: 'home-detail', route: '/', shows: 'Home with the detail shown: every function under its own box; wider than a laptop window, it scrolls sideways inside the map.', act: async (p) => p.getByRole('button', { name: 'Show the detail' }).first().click() },
  { key: 'home-finance', route: '/?distance=finance', shows: 'The overview read as finance: every joint chip re-worded, the lane named Finance.' },
  { key: 'home-reindustrialisation', route: '/?lens=reindustrialisation', shows: 'The reindustrialisation overlay at the overview: eight marks, the export cut moving right, the domestic-input callout.' },
  { key: 'home-green', route: '/?lens=green', shows: 'The green transition overlay at the overview: eight marks, the price arriving at consumption → recovery, the mechanism named on the energy and asset-finance bands.' },
  { key: 'card-energy-essay', route: '/?lens=green&distance=finance&node=energy', shows: 'A card with an essay: Energy under the green transition at the finance distance — the assessed reading, its case named, the essay as the evidence behind it, verified published in the fixture.' },
  { key: 'card-energy-rest', route: '/?node=energy', shows: 'The same element with no overlay on: the essay is still there, as related writing with its context kept, not as evidence.' },
  { key: 'card-empty', route: '/?node=credit', shows: 'A genuinely empty card: working capital and trade credit, which no essay reads yet.' },
  { key: 'detail-from-address', route: '/?node=wholesale-retail', shows: 'A detail target revealed from an overview address: the transfer inside the distribution-and-retail box opens the detail with its reading.' },
];
const VIEWPORTS = [
  { width: 390, height: 844, states: STATES.map((s) => s.key) },
  { width: 360, height: 740, states: ['home-overview', 'home-green', 'card-energy-essay'] },
  { width: 768, height: 1024, states: ['home-overview', 'home-detail', 'home-green', 'card-energy-essay'] },
  { width: 1280, height: 800, states: STATES.map((s) => s.key) },
  { width: 1440, height: 900, states: ['home-overview', 'home-detail', 'home-green', 'home-reindustrialisation', 'card-energy-essay'] },
  { width: 1920, height: 1080, states: ['home-overview', 'home-detail', 'home-green', 'card-energy-essay'] },
];

const browser = await chromium.launch();
const manifest = {
  takenAt: new Date().toISOString(),
  commit,
  workingTreeClean: !dirty,
  uncommittedAtCapture: dirty ? pending.split('\n') : [],
  browser: `Chromium ${browser.version()} (Playwright)`,
  fixture: FIXTURE_NOTE,
  note: 'Each image is the map component\'s band of the page (.chain-plate: its title, controls, figure and the lines under it) at the page\'s full width, not the whole page, except on a phone with a reading open, where the reading is a modal sheet over the page and the visible page is captured. The sticky site header is hidden during capture so it does not overprint a component taller than the window; its layout space is kept. Device scale factor 1; sizes in CSS pixels.',
  images: [],
};

for (const vp of VIEWPORTS) {
  for (const key of vp.states) {
    const state = STATES.find((s) => s.key === key);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await seed(page);
    await page.goto(`${baseURL}${state.route}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // The site header is sticky, and a component taller than the window is
    // captured by stitching; left visible it overprints the map mid-image.
    // Hidden, not removed: its space and its height (which the reading's
    // placement measures) stay exactly as a reader has them.
    await page.addStyleTag({ content: 'header { visibility: hidden !important; }' });
    if (state.act) await state.act(page);
    // The pointer stays where a click left it, and the map answers hover:
    // parked over a lane name it leaves a popover open in the picture. Move
    // it off the figure so each image shows the state, not the cursor.
    await page.mouse.move(2, 2);
    await page.waitForTimeout(600);
    const plate = page.locator('.chain-plate');
    const file = `${vp.width}-${key}.png`;
    // On a phone a reading is a modal sheet over the page, so the page is captured rather than the component under it.
    const sheet = await page.locator('[data-chain-sheet]').count();
    if (sheet) {
      await page.screenshot({ path: path.join(outDir, file) });
    } else {
      // The component's band of the page, full width — NOT the element's own
      // box: on a phone the map bleeds past its container to the screen edges
      // (-mx-4), and an element screenshot would cut that bleed off, losing
      // the left edge of every group name. Clipped to the page's own width so
      // the picture is what a reader has.
      const box = await plate.boundingBox();
      await page.screenshot({
        path: path.join(outDir, file),
        fullPage: true,
        clip: { x: 0, y: Math.max(0, box.y), width: Math.min(vp.width, await page.evaluate(() => document.documentElement.clientWidth)), height: box.height },
      });
    }
    const measured = await page.evaluate(() => {
      const svg = document.querySelector('svg.cp-svg');
      const scroller = document.querySelector('[data-chain-scroll]');
      return {
        level: document.querySelector('.chain-plate')?.getAttribute('data-level') ?? null,
        pageScrollWidth: document.documentElement.scrollWidth,
        pageClientWidth: document.documentElement.clientWidth,
        plateScale: svg ? svg.getBoundingClientRect().width / svg.viewBox.baseVal.width : null,
        mapScrollsSideways: scroller ? scroller.scrollWidth > scroller.clientWidth + 1 : false,
      };
    });
    manifest.images.push({ file, viewport: `${vp.width}×${vp.height}`, route: state.route, shows: state.shows, fixture: 'FIXTURE_ESSAYS (see fixture)', ...measured });
    console.log(`${file}  level=${measured.level} scale=${measured.plateScale?.toFixed(3) ?? '-'} page=${measured.pageScrollWidth}/${measured.pageClientWidth} mapScrolls=${measured.mapScrollsSideways}`);
    await context.close();
  }
}

await browser.close();
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${manifest.images.length} images and manifest.json to ${outDir} (commit ${commit}${dirty ? ', working tree dirty' : ''})`);
