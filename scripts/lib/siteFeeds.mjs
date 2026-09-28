/**
 * sitemap.xml and rss.xml, built from the pages scripts/prerender.mjs writes:
 * the same fetch and the same canonicalPath(), so there is never a second
 * route table. Pure functions (a list in, a string out) so the escaping, the
 * dates and the order are tested offline (tests/unit/siteFeeds.test.ts).
 *
 * Section index pages are not listed (v1): the prerender cannot derive them,
 * and the home page links them.
 */
import { unixSeconds } from '../../src/lib/shareImage.mjs';

export const FEED_SIZE = 20;

export const xml = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** The UTC calendar date of a timestamptz, "YYYY-MM-DD", or null. */
export function dayOf(timestamp) {
  const seconds = unixSeconds(timestamp);
  return seconds === null ? null : new Date(seconds * 1000).toISOString().slice(0, 10);
}

/** Seconds for an essay's publication: `date` is a bare day (00:00 UTC), `created_at` a timestamptz. */
export function publishedAt(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? '')) ? Date.parse(`${value}T00:00:00Z`) / 1000 : unixSeconds(value);
}

/**
 * @param {{ url: string, updated?: string | null }[]} pages
 * @param {{ origin: string }} site
 */
export function buildSitemap(pages, { origin }) {
  const home = `${origin}/`;
  const newest = pages.map(p => dayOf(p.updated)).filter(Boolean).sort().at(-1);
  const url = (loc, lastmod) => `  <url><loc>${xml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url(home, newest),
    ...[...pages].sort((a, b) => a.url.localeCompare(b.url)).map(p => url(p.url, dayOf(p.updated))),
    '</urlset>',
    '',
  ].join('\n');
}

/** The pages the feed carries: the FEED_SIZE most recently published, newest first. */
export function feedItems(pages) {
  return pages
    .map(p => ({ ...p, at: publishedAt(p.published) }))
    .filter(p => Number.isFinite(p.at))
    .sort((a, b) => b.at - a.at || a.url.localeCompare(b.url))
    .slice(0, FEED_SIZE);
}

/**
 * RSS 2.0. No lastBuildDate: the same essays always produce the same bytes.
 * @param {{ url: string, title: string, deck?: string, published?: string | null }[]} pages
 * @param {{ origin: string, description: string }} site
 */
export function buildFeed(pages, { origin, description }) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>Dika Gustiana</title>',
    `    <link>${xml(`${origin}/`)}</link>`,
    `    <description>${xml(description)}</description>`,
    '    <language>en-GB</language>',
    `    <atom:link href="${xml(`${origin}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    ...feedItems(pages).flatMap(p => [
      '    <item>',
      `      <title>${xml(p.title)}</title>`,
      `      <link>${xml(p.url)}</link>`,
      `      <guid isPermaLink="true">${xml(p.url)}</guid>`,
      // RFC 822, in the RFC 1123 form feeds use: "Fri, 25 Sep 2026 00:00:00 GMT".
      `      <pubDate>${new Date(p.at * 1000).toUTCString()}</pubDate>`,
      `      <description>${xml(p.deck)}</description>`,
      '    </item>',
    ]),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
