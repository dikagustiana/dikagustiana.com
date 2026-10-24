/**
 * The in-page reader's pure parts (src/pages/BookReader.tsx): which page a key turns to, and which reader a
 * file needs. tests/unit/bookReader.test.tsx.
 */

export type ReaderKind = 'pdf' | 'epub';

/** The reader a signed file needs, from the type the function reports, else from its name. */
export function readerKind(contentType: string, filename: string): ReaderKind {
  if (contentType === 'application/epub+zip' || /\.epub$/i.test(filename)) return 'epub';
  return 'pdf';
}

/** -1 back, +1 forward, 0 for a key that does not turn a page. */
export function turnFor(key: string): -1 | 0 | 1 {
  if (key === 'ArrowRight' || key === 'PageDown') return 1;
  if (key === 'ArrowLeft' || key === 'PageUp') return -1;
  return 0;
}

/** The page after a turn, held to 1…total. */
export const clampPage = (page: number, total: number) => Math.min(Math.max(1, page), Math.max(1, total));

/** A key typed into a field or with a modifier is not a page turn. */
export function isTypingTarget(e: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'target'>): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey) return true;
  const el = e.target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest('input, textarea, select, [contenteditable="true"]');
}

/** "Valuation.pdf" → "Valuation": the title the function names the file after. */
export const titleFromFilename = (name: string, fallback: string) => name.replace(/\.(pdf|epub)$/i, '').trim() || fallback;

/** The scale that fits a whole page inside the stage, as a Kindle shows one page at a time. */
export function fitScale(pageW: number, pageH: number, boxW: number, boxH: number): number {
  if (pageW <= 0 || pageH <= 0 || boxW <= 0 || boxH <= 0) return 1;
  return Math.min(boxW / pageW, boxH / pageH);
}

/** A horizontal swipe of at least 50 px that is more sideways than up or down: left is forward. */
export function swipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * Where the reader left a book, per browser (a PDF page number, or an EPUB location). Storage may be missing
 * or refuse; the book then opens at its start, as on a first visit.
 */
export const positionKey = (slug: string) => `books.reader.position.${slug}`;

export function readPosition(slug: string): string | null {
  try {
    return window.localStorage.getItem(positionKey(slug));
  } catch {
    return null;
  }
}

export function writePosition(slug: string, value: string): void {
  try {
    window.localStorage.setItem(positionKey(slug), value);
  } catch {
    // A convenience; without storage the place lasts the visit.
  }
}

/** A stored PDF page, held to the book; 1 when there is none or it is not a page. */
export function storedPage(raw: string | null, total: number): number {
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? clampPage(n, total) : 1;
}
