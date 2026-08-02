/**
 * Pre-render the PUBLISHED essay routes as static HTML.
 *
 * Why this exists: share-card crawlers (WhatsApp's included) do not execute
 * JavaScript. SEO.tsx injects meta through react-helmet-async AFTER React
 * runs, so a crawler only ever saw the generic tags in index.html — every
 * essay shared as the same site-wide card. This script runs after
 * `vite build` and writes dist/<canonical-path>/index.html per published
 * essay, with that essay's own title/description/og/twitter/article tags in
 * the RAW HTML. Static files win over the SPA fallback, and the SPA still
 * hydrates normally on top — nothing else about the site changes. No
 * framework migration: the set is 2 essays today, maybe 20 in a year.
 *
 * Fails LOUDLY if the essay list cannot be fetched: a silent skip would be
 * a silent return to generic cards, the same failure class as a backup
 * that "succeeds" with nothing in it.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const DIST = path.join(ROOT, 'dist');
const SITE_ORIGIN = 'https://dikagustiana.com';

// Env: prefer process.env (CI / Vercel), fall back to .env (local builds).
function env(name) {
  if (process.env[name]) return process.env[name];
  const dotenvPath = path.join(ROOT, '.env');
  if (!fs.existsSync(dotenvPath)) return undefined;
  const m = fs.readFileSync(dotenvPath, 'utf8').match(new RegExp(`^${name}="([^"]+)"`, 'm'));
  return m?.[1];
}

// The REAL Supabase URL, never the local dev relay: the relay is a dev-only
// TLS workaround and VITE_SUPABASE_URL may point at it during local builds.
const rawUrl = env('VITE_SUPABASE_URL') ?? '';
const SUPABASE_URL = rawUrl.includes('supabase.co')
  ? rawUrl
  : 'https://asypkbkiebjvvpimewfp.supabase.co';
const KEY = env('VITE_SUPABASE_PUBLISHABLE_KEY');

// No credentials at all is a legitimate build environment — CI builds this
// repo purely to prove it compiles and has no Supabase secrets. Skipping
// there is correct; skipping on a DEPLOY would silently ship generic share
// cards, which is the failure this script exists to prevent. Vercel sets
// VERCEL=1 on every build and must have the key (the app itself cannot
// reach Supabase without it), so a missing key there is a hard error.
if (!KEY) {
  if (process.env.VERCEL) {
    console.error(
      'prerender: VITE_SUPABASE_PUBLISHABLE_KEY missing on a Vercel build — ' +
        'per-essay share cards would silently fall back to the generic one.',
    );
    process.exit(1);
  }
  console.warn(
    'prerender: SKIPPED — no VITE_SUPABASE_PUBLISHABLE_KEY in this environment. ' +
      'The SPA build is complete; per-essay share cards are NOT pre-rendered. ' +
      'Expected on CI (no secrets); a deploy would fail instead of skipping.',
  );
  process.exit(0);
}

/**
 * Mirror of essayUrl's canonical mapping (route-table-tested in the app),
 * plus a distinction essayUrl does not need to make: whether the canonical
 * URL belongs to THIS ESSAY ALONE.
 *
 * Accounting essays canonicalise to PAGE-level surfaces —
 * /accounting/fsli/:slug, /accounting/consolidation/:topic,
 * /accounting/statutory-reporting — which inline several essays. Writing one
 * essay's og:title there would make an arbitrary essay speak for the whole
 * page (last writer wins), and writing it at /essays/:slug instead would
 * advertise a doorway that redirects. Both are wrong, so those rows are
 * SKIPPED and named in the log rather than silently mishandled. Giving those
 * pages their own page-level cards is separate work on a separate object.
 */
function canonicalPath(row) {
  const mod = row.finance_modules ?? null;
  const track = mod?.track_slug ?? row.finance_section ?? null;
  switch (row.section) {
    case 'finance':
      return track ? `/finance/${track}/${row.slug}` : `/essays/${row.slug}`;
    case 'green-transition': {
      const short = { 'where-we-are-now': 'now', 'challenges-ahead': 'gaps', 'pathways-forward': 'future' };
      return row.phase ? `/green-transition/${short[row.phase] ?? row.phase}/${row.slug}` : `/essays/${row.slug}`;
    }
    case 'development-finance':
      return row.phase ? `/development-finance/${row.phase}/${row.slug}` : `/essays/${row.slug}`;
    case 'next-big-thing':
      // Theme (the category, cached as phase) is the third segment; a
      // theme-less essay keeps the two-segment resolver shape, which renders
      // it directly. Mirrors essayUrl's next-big-thing branch.
      return row.phase ? `/the-next-big-thing/${row.phase}/${row.slug}` : `/the-next-big-thing/${row.slug}`;
    case 'critical-thinking':
    case 'critical-thinking-research':
      return `/critical-thinking-research/${row.phase || 'clarify'}/${row.slug}`;
    case 'accounting':
      // Page-level canonical: not this essay's URL to claim. See above.
      if (row.fsli_slug || row.topic || row.phase === 'statutory-reporting') return null;
      return `/essays/${row.slug}`;
    default:
      return `/essays/${row.slug}`;
  }
}

const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const select =
  'slug,title,snippet,section,phase,finance_section,fsli_slug,topic,thumbnail_url,date,created_at,updated_at,presentation,finance_modules!essays_module_id_fkey(slug,track_slug)';
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/essays?published=eq.true&select=${encodeURIComponent(select)}`,
  { headers: { apikey: KEY, authorization: `Bearer ${KEY}` } },
);
if (!res.ok) {
  console.error(`prerender: essay fetch failed — HTTP ${res.status}`);
  process.exit(1);
}
const essays = await res.json();
if (!Array.isArray(essays) || essays.length === 0) {
  console.error('prerender: zero published essays returned — refusing to write nothing silently');
  process.exit(1);
}

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

// Two essays resolving to ONE path would make the last writer speak for both.
// Detect it here rather than discovering it as a wrong card in a chat client.
const byPath = new Map();
for (const essay of essays) {
  const p = canonicalPath(essay);
  if (!p) continue;
  byPath.set(p, [...(byPath.get(p) ?? []), essay.slug]);
}
const collisions = [...byPath.entries()].filter(([, slugs]) => slugs.length > 1);

let written = 0;
let sampleCheck = null;
const skipped = [];
for (const essay of essays) {
  const p = canonicalPath(essay);
  if (!p) {
    skipped.push(`${essay.slug} (page-level canonical: accounting)`);
    continue;
  }
  if (byPath.get(p).length > 1) {
    skipped.push(`${essay.slug} (path shared with ${byPath.get(p).filter(s => s !== essay.slug).join(', ')})`);
    continue;
  }
  const url = `${SITE_ORIGIN}${p}`;
  const deck = essay.presentation?.deck || essay.snippet || '';
  const description = deck.length > 160 ? `${deck.slice(0, 157)}...` : deck;
  const image = essay.thumbnail_url
    ? (essay.thumbnail_url.startsWith('http') ? essay.thumbnail_url : `${SITE_ORIGIN}${essay.thumbnail_url}`)
    : `${SITE_ORIGIN}/og-image.png`;
  const fullTitle = `${essay.title} | Dika Gustiana`;

  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(fullTitle)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${esc(description)}" />`,
  );
  html = html.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(fullTitle)}" />`);
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${esc(description)}" />`,
  );
  html = html.replace(/<meta property="og:type" content="[^"]*" \/>/, '<meta property="og:type" content="article" />');
  html = html.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${esc(url)}" />`);
  html = html.replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${esc(image)}" />`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${esc(image)}" />`);
  html = html.replace(
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:card" content="summary_large_image" />\n    <link rel="canonical" href="${esc(url)}" />` +
      (essay.date || essay.created_at
        ? `\n    <meta property="article:published_time" content="${esc(essay.date || essay.created_at)}" />`
        : '') +
      (essay.updated_at ? `\n    <meta property="article:modified_time" content="${esc(essay.updated_at)}" />` : ''),
  );

  const outDir = path.join(DIST, p.replace(/^\//, ''));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  written += 1;
  sampleCheck ??= { file: path.join(outDir, 'index.html'), needle: esc(fullTitle) };
  console.log(`prerender: ${p}`);
}

// Never let a skip pass unread: a silently generic card is the failure this
// script exists to prevent, so anything not written is named.
for (const s of skipped) console.warn(`prerender: SKIPPED ${s}`);
if (collisions.length > 0) {
  console.error(`prerender: ${collisions.length} canonical path collision(s) — see the SKIPPED lines above`);
  process.exit(1);
}
if (written === 0) {
  console.error('prerender: nothing written despite published essays — refusing to report success');
  process.exit(1);
}

// The template must actually have changed per page — guard against a
// template drift that makes every replace silently no-op.
if (!fs.readFileSync(sampleCheck.file, 'utf8').includes(sampleCheck.needle)) {
  console.error('prerender: replacements did not land — template drift?');
  process.exit(1);
}
console.log(`prerender: ${written} route(s) written, ${skipped.length} skipped`);
