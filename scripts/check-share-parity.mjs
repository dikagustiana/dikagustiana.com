/**
 * Share-image parity on a real build. For every page the prerender wrote, the
 * og:image in its raw HTML (what crawlers read) must be the og:image the app
 * leaves in the head after React runs (what anything that executes
 * JavaScript reads). Before src/lib/shareImage.mjs, the hydrated one fell
 * back to /og-image.png on every essay without a hero.
 *
 * Serves dist/ the way Vercel does: a pre-rendered page's index.html first,
 * then a file, then the SPA fallback. Drives Chromium over the production
 * bundle as built; the app reads the live database (read-only, the public
 * key the build baked in). Its database requests are carried by Node's fetch
 * and handed back to the page unchanged, because a sandbox's intercepting
 * proxy can stall a browser's cross-origin requests; the data is the same.
 *
 * Usage: build with the key (npm run build), then node scripts/check-share-parity.mjs
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';

const DIST = path.resolve('dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

function fileFor(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\/+$/, '') || '/';
  const page = path.join(DIST, clean, 'index.html');
  if (fs.existsSync(page)) return page;
  const file = path.join(DIST, clean);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  return path.join(DIST, 'index.html');
}

/** The routes the prerender wrote: every dist/**\/index.html but the SPA shell. */
function writtenRoutes(dir = DIST, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) writtenRoutes(full, out);
    else if (entry.name === 'index.html' && dir !== DIST) out.push(`/${path.relative(DIST, dir)}`);
  }
  return out.sort();
}

const unescape = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const ogImages = html => [...html.matchAll(/<meta property="og:image" content="([^"]*)"/g)].map(m => unescape(m[1]));
const titleOf = html => unescape(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '');

const routes = writtenRoutes();
if (routes.length === 0) {
  console.error('check-share-parity: no pre-rendered pages in dist/ (build with the key first)');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // Vercel's own endpoints (analytics) do not exist off Vercel.
  if ((req.url ?? '').startsWith('/_vercel/')) {
    res.writeHead(404).end();
    return;
  }
  const file = fileFor(req.url ?? '/');
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const context = await browser.newContext();
const HOP_BY_HOP = new Set(['host', 'connection', 'content-length', 'accept-encoding']);
await context.route(/^https:\/\/[a-z0-9]+\.supabase\.co\//, async route => {
  const request = route.request();
  const headers = Object.fromEntries(Object.entries(request.headers()).filter(([k]) => !HOP_BY_HOP.has(k)));
  const res = await fetch(request.url(), {
    method: request.method(),
    headers,
    body: ['GET', 'HEAD'].includes(request.method()) ? undefined : (request.postDataBuffer() ?? undefined),
  });
  const body = Buffer.from(await res.arrayBuffer());
  const out = Object.fromEntries([...res.headers].filter(([k]) => !['content-encoding', 'content-length'].includes(k)));
  await route.fulfill({ status: res.status, headers: out, body });
});

let failures = 0;
for (const route of routes) {
  const html = fs.readFileSync(path.join(DIST, route, 'index.html'), 'utf8');
  const raw = ogImages(html);
  const page = await context.newPage();
  let hydrated = [];
  try {
    await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
    // Hydrated means react-helmet-async has written the essay's head: its
    // tags carry data-rh (the raw HTML's do not), and its title is the page's.
    // Waiting on the title alone would pass before React ran, since the raw
    // HTML already carries that title.
    await page.waitForFunction(
      title => document.title === title && document.querySelector('meta[property="og:image"][data-rh]') !== null,
      titleOf(html),
      { timeout: 30_000 },
    );
    hydrated = await page.$$eval('meta[property="og:image"]', metas =>
      metas.map(m => `${m.getAttribute('content')}${m.hasAttribute('data-rh') ? ' (helmet)' : ' (raw)'}`),
    );
  } catch (error) {
    hydrated = [`(did not hydrate: ${error.message.split('\n')[0]})`];
  }
  await page.close();
  const urls = hydrated.map(h => h.replace(/ \((helmet|raw)\)$/, ''));
  const ok =
    raw.length === 1 &&
    hydrated.some(h => h.endsWith(' (helmet)')) &&
    urls.every(url => url === raw[0]);
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${route}`);
  console.log(`       raw      ${raw.join(' | ')}`);
  console.log(`       hydrated ${hydrated.join(' | ')}`);
}
await browser.close();
server.close();
console.log(`check-share-parity: ${routes.length - failures}/${routes.length} route(s) with raw og:image = hydrated og:image`);
process.exit(failures > 0 ? 1 : 0);
