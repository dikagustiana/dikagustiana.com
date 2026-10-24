/**
 * One book on a shelf (PRD D2; 03-DESIGN §5): cover, title (two lines at most), author · year, a two-line
 * synopsis preview and the access badge. The whole card is one button that opens the book's dialog.
 */
import type { Book } from '@/hooks/queries/useBooks';
import { accessLabel, byline } from '@/lib/books';
import { cn } from '@/lib/utils';
import { BookCover } from './BookCover';

export function AccessBadge({ access, className }: { access: Book['access']; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-sm border border-border px-1.5 py-0.5 font-mono text-[11px] uppercase leading-none',
        access === 'free' ? 'text-foreground' : 'text-muted-foreground',
        className,
      )}
    >
      {accessLabel(access)}
    </span>
  );
}

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
}

export function BookCard({ book, onOpen }: BookCardProps) {
  const meta = byline(book);
  return (
    <button
      type="button"
      onClick={() => onOpen(book)}
      data-book={book.slug}
      className="group flex w-full flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <BookCover book={book} frameClassName="group-hover:border-foreground/40" />
      <span className="mt-3 line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-accent">{book.title ?? book.slug}</span>
      {meta && <span className="mt-1 text-xs text-muted-foreground">{meta}</span>}
      {book.synopsis_excerpt && <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{book.synopsis_excerpt}</span>}
      <AccessBadge access={book.access} className="mt-2 self-start" />
    </button>
  );
}
