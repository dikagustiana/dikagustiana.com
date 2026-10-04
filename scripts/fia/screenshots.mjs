/**
 * Screenshots of the Finance in Action preview, for review and the pull
 * request. Serves an existing dist/ (build it first with the preview flag and
 * a dead Supabase URL, as playwright.config.ts does) and intercepts every
 * Supabase call, so nothing reaches a real backend.
 *
 *   VITE_FIA_PREVIEW=true VITE_SUPABASE_URL=http://127.0.0.1:54321 \
 *     VITE_SUPABASE_PUBLISHABLE_KEY=test npx vite build
 *   node scripts/fia/screenshots.mjs <outDir> [name=path@width[~selector] ...]
 *
 * With ~selector, only that element is captured (for example ~#fia-unit-economics).
 * A name ending in .jpg is saved as JPEG.
 * Steps may follow the spec, separated by "|": click:<selector>, dblclick:<selector>,
 * press:<key>, type:<text>, wait:<ms>.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const PORT = 4179;
const BASE = `http://127.0.0.1:${PORT}`;
const out = path.resolve(process.argv[2] ?? 'screenshots');
const jobs = process.argv.slice(3).map((spec) => {
  const [head, ...steps] = spec.split('|');
  const eq = head.indexOf('=');
  const name = head.slice(0, eq);
  const rest = head.slice(eq + 1);
  const [urlPath, tail = '1440'] = rest.split('@');
  const [width, selector] = tail.split('~');
  return { name, urlPath, width: Number(width), selector, steps };
});
fs.mkdirSync(out, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const wait = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview server did not start');
};

try {
  await wait();
  const browser = await chromium.launch();
  for (const job of jobs) {
    const page = await browser.newPage({ viewport: { width: job.width, height: 900 } });
    await page.route(/127\.0\.0\.1:54321|supabase\.co/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
    await page.goto(`${BASE}${job.urlPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    for (const step of job.steps) {
      const i = step.indexOf(':');
      const [verb, arg] = [step.slice(0, i), step.slice(i + 1)];
      if (verb === 'click') await page.locator(arg).first().click();
      else if (verb === 'dblclick') await page.locator(arg).first().dblclick();
      else if (verb === 'press') await page.keyboard.press(arg);
      else if (verb === 'type') await page.keyboard.type(arg);
      else if (verb === 'wait') await page.waitForTimeout(Number(arg));
    }
    await page.waitForTimeout(job.steps.length ? 1200 : 0);
    const jpeg = job.name.endsWith('.jpg');
    const file = path.join(out, jpeg ? job.name : `${job.name}.png`);
    const opts = jpeg ? { path: file, type: 'jpeg', quality: 72 } : { path: file };
    if (job.selector) await page.locator(job.selector).first().screenshot(opts);
    else await page.screenshot({ ...opts, fullPage: true });
    console.log(`${file}`);
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}
