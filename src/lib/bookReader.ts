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
