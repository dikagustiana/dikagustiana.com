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
 *
 * Each written route also gets its own share card, drawn here into
 * dist/og/<slug>.png (scripts/lib/shareCard.mjs). Its og:image is the hero
 * image when the essay has one, else that card; the formula lives in
 * src/lib/shareImage.mjs, which the essay pages import too, so the og:image
 * after hydration is the one in the raw HTML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fetchPublishedEssays } from './lib/publishedEssays.mjs';
import { essayShareImage } from '../src/lib/shareImage.mjs';
import { FEED_SIZE, buildFeed, buildSitemap } from './lib/siteFeeds.mjs';

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

// canonicalPath moved to scripts/lib/canonicalPath.mjs so the parity test
// (tests/unit/canonicalPathParity.test.ts) can import it without executing
// this script's build flow. The mapping's rationale lives with the function.
import { canonicalPath } from './lib/canonicalPath.mjs';

const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// The select lives in scripts/lib/publishedEssays.mjs, shared with the
// share-card review script. It also carries each card's label: the section's
// name, the finance track's title and the category's name, from the database.
let essays;
try {
  essays = await fetchPublishedEssays({ supabaseUrl: SUPABASE_URL, key: KEY });
} catch (error) {
  console.error(`prerender: ${error.message}`);
  process.exit(1);
}
if (!Array.isArray(essays) || essays.length === 0) {
  console.error('prerender: zero published essays returned — refusing to write nothing silently');
  process.exit(1);
}

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

// Loaded only now, past the skip above: a keyless CI build never loads the
// renderer's native binary.
const { renderShareCard, shareCardLabel } = await import('./lib/shareCard.mjs');
const OG_DIR = path.join(DIST, 'og');
fs.mkdirSync(OG_DIR, { recursive: true });
const CARD_MAX_BYTES = 300 * 1024;

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
const landed = []; // per written page: the tags that must be in it, and its card
const listed = []; // per written page: what the sitemap and the feed say about it
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
  // Collapse whitespace before truncating. A deck typed with a trailing
  // newline ends up INSIDE the content attribute of four meta tags and the
  // canonical description, which is visible in the production HTML today:
  // `content="Carbon Liability, Capital Sequencing, and The Conditions For
  // Payoff\n"`. Trimming here rather than in the database, because a stray
  // newline in an editor is a normal thing for a person to do and the build
  // should not carry it into a share card.
  const deck = (essay.presentation?.deck || essay.snippet || '').replace(/\s+/g, ' ').trim();
  const description = deck.length > 160 ? `${deck.slice(0, 157)}...` : deck;
  // Hero image first (the owner's override), else this essay's own card.
  // /og-image.png is never the image of a pre-rendered route.
  const share = essayShareImage(essay);
  const image = share.url;
  const fullTitle = `${essay.title} | Dika Gustiana`;

  // The card is drawn for every written route, hero or not, so replacing a
  // hero later never leaves an essay without one. A title the font cannot
  // draw stops the build, naming the essay, the same as a path collision.
  let card;
  try {
    card = await renderShareCard({ title: essay.title, label: shareCardLabel(essay) });
  } catch (error) {
    console.error(`prerender: the share card for ${essay.slug} cannot be drawn: ${error.message}`);
    process.exit(1);
  }
  if (card.length > CARD_MAX_BYTES) {
    console.error(`prerender: the share card for ${essay.slug} is ${card.length} bytes, over ${CARD_MAX_BYTES}`);
    process.exit(1);
  }
  const cardFile = path.join(OG_DIR, `${essay.slug}.png`);
  fs.writeFileSync(cardFile, card);

  // Dimensions and type only for the generated card: a hero image's are not
  // known here, and a wrong og:image:width is worse than none.
  const imageTags = [
    ...(share.generated
      ? [
          '<meta property="og:image:width" content="1200" />',
          '<meta property="og:image:height" content="630" />',
          '<meta property="og:image:type" content="image/png" />',
        ]
      : []),
    `<meta property="og:image:alt" content="${esc(essay.title)}" />`,
    '<meta property="og:site_name" content="Dika Gustiana" />',
  ];

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
  // The image's own tags, anchored on the og:image tag just written, the way
  // canonical is anchored on twitter:card below.
  html = html.replace(`<meta property="og:image" content="${esc(image)}" />`, anchor => [anchor, ...imageTags].join('\n    '));
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
  landed.push({
    file: path.join(outDir, 'index.html'),
    card: cardFile,
    needles: [
      `<title>${esc(fullTitle)}</title>`,
      `<meta property="og:image" content="${esc(image)}" />`,
      `<meta name="twitter:image" content="${esc(image)}" />`,
      ...imageTags,
      `<link rel="canonical" href="${esc(url)}" />`,
    ],
  });
  listed.push({ url, title: essay.title, deck, published: essay.date || essay.created_at, updated: essay.updated_at });
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
// template drift that makes every replace silently no-op. Every written page
// is read back for every tag it should carry, and every card for its size.
const missing = [];
for (const page of landed) {
  const html = fs.readFileSync(page.file, 'utf8');
  for (const needle of page.needles) {
    if (!html.includes(needle)) missing.push(`${path.relative(DIST, page.file)} lacks ${needle}`);
  }
  const png = fs.readFileSync(page.card);
  if (png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) {
    missing.push(`${path.relative(DIST, page.card)} is not 1200×630`);
  }
}
if (missing.length > 0) {
  for (const m of missing) console.error(`prerender: ${m}`);
  console.error('prerender: replacements did not land — template drift?');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// sitemap.xml and rss.xml (scripts/lib/siteFeeds.mjs): from this same fetch
// and this same canonicalPath(), so they list exactly the pages written above
// and there is never a second route table.
// ---------------------------------------------------------------------------

// index.html's meta description, HTML-unescaped; siteFeeds escapes it for XML.
const siteDescription = (/<meta name="description" content="([^"]*)" \/>/.exec(template)?.[1] ?? '')
  .replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), buildSitemap(listed, { origin: SITE_ORIGIN }));
fs.writeFileSync(path.join(DIST, 'rss.xml'), buildFeed(listed, { origin: SITE_ORIGIN, description: siteDescription }));

// Read both back: one <url> per written page plus the home page, and one
// <item> per written page up to the feed's size.
const urlCount = (fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8').match(/<url>/g) ?? []).length;
const itemCount = (fs.readFileSync(path.join(DIST, 'rss.xml'), 'utf8').match(/<item>/g) ?? []).length;
if (urlCount !== written + 1 || itemCount !== Math.min(FEED_SIZE, written)) {
  console.error(`prerender: sitemap has ${urlCount} url(s) and the feed ${itemCount} item(s) for ${written} written page(s)`);
  process.exit(1);
}

console.log(`prerender: ${written} route(s) written, ${skipped.length} skipped`);
console.log(`prerender: ${landed.length} share card(s) in dist/og/`);
console.log(`prerender: sitemap.xml ${urlCount} url(s), rss.xml ${itemCount} item(s)`);
