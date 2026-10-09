/**
 * Lighthouse for the landing page with the world flag off and on, mobile and
 * desktop (mega prompt §6.5, §11). Writes four HTML reports and
 * lighthouse.json (scores and the core metrics) to --out.
 *
 *   node scripts/world/lighthouse.mjs [--off URL] [--on URL] [--out docs/world/frames] [--runs N]
 *
 * --runs N runs every configuration N times, in rounds (each configuration
 * once per round, so drift on the machine falls on all of them alike), and
 * records the median of each metric; the HTML report is the last round's.
 *
 * Runs lighthouse@13.5.0 through npx against the Playwright Chromium; nothing
 * is added to package.json. The served builds point at the dead Supabase
 * URL, so the measured page shows the outage state and contacts no backend.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]] : [])).filter((x) => x.length));
const OFF = args.off ?? 'http://127.0.0.1:4173';
const ON = args.on ?? 'http://127.0.0.1:4174';
const OUT = path.resolve(args.out ?? 'docs/world/frames');
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
fs.mkdirSync(OUT, { recursive: true });

const ONLY = args.only ? args.only.split(',') : null; // e.g. --only on-mobile, for a quick re-run; the summary then keeps the other runs from lighthouse.json
const prior = fs.existsSync(path.join(OUT, 'lighthouse.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'lighthouse.json'), 'utf8')).runs : {};
const RUNS = Math.max(1, Number(args.runs ?? 1));
const summary = { ranAt: new Date().toISOString(), lighthouse: '13.5.0', rounds: RUNS, runs: ONLY ? { ...prior } : {} };
const samples = {};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (let round = 0; round < RUNS; round++) for (const [flag, base] of [['off', OFF], ['on', ON]]) {
  for (const form of ['mobile', 'desktop']) {
    if (ONLY && !ONLY.includes(`${flag}-${form}`)) continue;
    const name = `lighthouse-${flag}-${form}`;
    const outPath = path.join(OUT, name);
    const argv = ['-y', 'lighthouse@13.5.0', `${base}/`, '--quiet', '--output=json', '--output=html', `--output-path=${outPath}`, '--chrome-flags=--headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader', '--only-categories=performance,accessibility,best-practices'];
    if (form === 'desktop') argv.push('--preset=desktop');
    console.log('lighthouse', flag, form, RUNS > 1 ? `round ${round + 1} of ${RUNS}` : '');
    execFileSync('npx', argv, { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, CHROME_PATH: CHROME } });
    const json = JSON.parse(fs.readFileSync(`${outPath}.report.json`, 'utf8'));
    const a = json.audits;
    (samples[`${flag}-${form}`] ??= []).push({
      performance: Math.round(json.categories.performance.score * 100),
      accessibility: Math.round(json.categories.accessibility.score * 100),
      bestPractices: Math.round(json.categories['best-practices'].score * 100),
      lcpMs: Math.round(a['largest-contentful-paint'].numericValue),
      cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
      tbtMs: Math.round(a['total-blocking-time'].numericValue),
      fcpMs: Math.round(a['first-contentful-paint'].numericValue),
      transferKb: Math.round(a['total-byte-weight'].numericValue / 1024),
      // Lighthouse 13 reports the element in the LCP breakdown insight; earlier versions in largest-contentful-paint-element
      lcpElement: (a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node ?? a['lcp-breakdown-insight']?.details?.items?.find((x) => x.type === 'node'))?.snippet?.slice(0, 120) ?? null,
    });
    fs.unlinkSync(`${outPath}.report.json`); // the HTML report carries the full audit; JSON is 1 MB+
  }
}
for (const [key, list] of Object.entries(samples)) {
  const m = Object.fromEntries(Object.keys(list[0]).map((k) => [k, typeof list[0][k] === 'number' ? median(list.map((r) => r[k])) : list.at(-1)[k]]));
  summary.runs[key] = list.length > 1 ? { ...m, lcpMsRuns: list.map((r) => r.lcpMs) } : m;
}
fs.writeFileSync(path.join(OUT, 'lighthouse.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary.runs, null, 1));
