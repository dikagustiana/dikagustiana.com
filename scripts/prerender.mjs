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

// Env: prefer process.env (CI), fall back to .env (local builds).
function env(name) {
  if (process.env[name]) return process.env[name];
  const dotenv = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const m = dotenv.match(new RegExp(`^${name}="([^"]+)"`, 'm'));
  return m?.[1];
}

// The REAL Supabase URL, never the local dev relay: the relay is a dev-only
// TLS workaround and VITE_SUPABASE_URL may point at it during local builds.
const rawUrl = env('VITE_SUPABASE_URL') ?? '';
const SUPABASE_URL = rawUrl.includes('supabase.co')
  ? rawUrl
  : 'https://asypkbkiebjvvpimewfp.supabase.co';
const KEY = env('VITE_SUPABASE_PUBLISHABLE_KEY');
if (!KEY) {
  console.error('prerender: no publishable key found');
  process.exit(1);
}

// Mirror of essayUrl's canonical mapping (route-table-tested in the app).
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
      return `/the-next-big-thing/${row.slug}`;
    case 'critical-thinking':
    case 'critical-thinking-research':
      return `/critical-thinking-research/${row.phase || 'clarify'}/${row.slug}`;
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

let written = 0;
for (const essay of essays) {
  const p = canonicalPath(essay);
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
  console.log(`prerender: ${p}`);
}

// The template must actually have changed per page — guard against a
// template drift that makes every replace silently no-op.
const sample = fs.readFileSync(
  path.join(DIST, canonicalPath(essays[0]).replace(/^\//, ''), 'index.html'),
  'utf8',
);
if (!sample.includes(esc(`${essays[0].title} | Dika Gustiana`))) {
  console.error('prerender: replacements did not land — template drift?');
  process.exit(1);
}
console.log(`prerender: ${written} route(s) written`);
