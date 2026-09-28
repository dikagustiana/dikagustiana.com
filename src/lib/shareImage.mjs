/**
 * The share image (og:image) an essay's page advertises, in ONE place for
 * both sides of the page. scripts/prerender.mjs writes it into the raw HTML
 * that crawlers read; the essay pages hand it to SEO.tsx, which
 * react-helmet-async writes into the head after React runs. Two formulas
 * would drift, and a hydrated og:image that differs from the raw one is a
 * different card for any consumer that executes JavaScript.
 *
 * Precedence:
 *   1. the essay's hero image (thumbnail_url), the owner's manual override;
 *   2. the card the build draws for it, /og/<slug>.png;
 *   3. /og-image.png, which stays the card only for routes that are not
 *      pre-rendered (index.html's tags, SEO.tsx's default).
 *
 * The card's URL carries ?v=<unix seconds of updated_at>, so a crawler that
 * caches by image URL fetches the new card after an edit.
 *
 * Plain JavaScript so Node imports it unbundled at build time; the types are
 * in shareImage.d.mts.
 */
export const SHARE_IMAGE_ORIGIN = 'https://dikagustiana.com';

/**
 * Seconds since the epoch for a timestamptz as PostgREST returns it
 * ("2026-09-28T12:03:45.922204+00:00"), or as psql prints it ("… 12:03:45+00").
 * Parsed by hand, not by Date.parse: engines disagree on six fractional
 * digits, and the two sides of the page must agree to the second.
 */
export function unixSeconds(timestamp) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}(?::?\d{2})?)?$/i.exec(
    String(timestamp ?? '').trim(),
  );
  if (!m) return null;
  const [, y, mo, d, h, mi, s, zone] = m;
  let offsetMinutes = 0;
  if (zone && zone.toUpperCase() !== 'Z') {
    const digits = zone.slice(1).replace(':', '');
    offsetMinutes = (zone[0] === '-' ? -1 : 1) * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4) || 0));
  }
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)) - offsetMinutes * 60_000;
  return Math.floor(ms / 1000);
}

/**
 * The og:image for one essay, and whether it is the generated card (whose
 * dimensions and type are known: 1200×630 PNG) or the hero (whose are not).
 */
export function essayShareImage({ slug, thumbnail_url, updated_at }) {
  const hero = String(thumbnail_url ?? '').trim();
  if (hero) {
    const url = /^https?:\/\//i.test(hero) ? hero : `${SHARE_IMAGE_ORIGIN}${hero.startsWith('/') ? '' : '/'}${hero}`;
    return { url, generated: false };
  }
  const version = unixSeconds(updated_at);
  return {
    url: `${SHARE_IMAGE_ORIGIN}/og/${encodeURIComponent(slug)}.png${version === null ? '' : `?v=${version}`}`,
    generated: true,
  };
}
