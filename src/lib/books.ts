/**
 * Small pieces of the Books page shared by its components (site cleanup 2026-10, PRD §D).
 */
import type { Book } from '@/hooks/queries/useBooks';

export const accessLabel = (access: Book['access']) => (access === 'free' ? 'Free' : 'Buy');

/** "Author · 2023", with anything else to add after them; blanks left out. */
export const byline = (book: Pick<Book, 'author' | 'year'>, extra?: string | null) =>
  [book.author, book.year, extra].filter((x) => x !== null && x !== undefined && x !== '').join(' · ');
