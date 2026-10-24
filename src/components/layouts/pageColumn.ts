/**
 * How wide the page's column is (site cleanup 2026-10, B1–B2). `reading` is one centred column of
 * max-w-3xl, `wide` a centred max-w-6xl block, `full` the site container as it always was. The breadcrumb
 * sits in the same column as the page, so "Home › Books" stands directly over the h1; a page that opts in
 * puts its content in PAGE_COLUMN[width] too, so the two share one left edge by construction. The default,
 * `full`, leaves every page that does not opt in exactly as it was.
 */
export type PageWidth = 'reading' | 'wide' | 'full';
export const PAGE_COLUMN: Record<PageWidth, string> = {
  reading: 'container max-w-3xl',
  wide: 'container max-w-6xl',
  full: 'container',
};
