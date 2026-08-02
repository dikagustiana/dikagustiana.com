/**
 * The canonical production origin, used for og:url / og:image / canonical
 * links and by the prerender step. Crawlers reject relative og:image URLs,
 * and window.location.origin would bake preview-deployment hostnames into
 * share cards — so the origin is a constant, not an environment lookup.
 */
export const SITE_ORIGIN = 'https://dikagustiana.com';

/** Absolute URL for a site path (idempotent for already-absolute URLs). */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_ORIGIN}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}
