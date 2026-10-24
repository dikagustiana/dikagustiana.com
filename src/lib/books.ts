/**
 * Small pieces of the Books page shared by its components (site cleanup 2026-10, PRD §D).
 */
import type { Book } from '@/hooks/queries/useBooks';

export const accessLabel = (access: Book['access']) => (access === 'free' ? 'Free' : 'Buy');

/** "Author · 2023", with anything else to add after them; blanks left out. */
export const byline = (book: Pick<Book, 'author' | 'year'>, extra?: string | null) =>
  [book.author, book.year, extra].filter((x) => x !== null && x !== undefined && x !== '').join(' · ');

/**
 * Which shelves the reader left open (PRD D1, X4), per browser. Storage may be missing or refuse (a private
 * window, blocked site data): the page then opens the first shelf, as on a first visit.
 */
export const OPEN_SHELVES_KEY = 'books.shelves.open';

export function readOpenShelves(): string[] | null {
  try {
    const raw = window.localStorage.getItem(OPEN_SHELVES_KEY);
    if (raw === null) return null;
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) && v.every((s) => typeof s === 'string') ? v : null;
  } catch {
    return null;
  }
}

export function writeOpenShelves(slugs: string[]): void {
  try {
    window.localStorage.setItem(OPEN_SHELVES_KEY, JSON.stringify(slugs));
  } catch {
    // The state is a convenience; without storage it lasts the visit.
  }
}
