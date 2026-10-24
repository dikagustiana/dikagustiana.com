/**
 * One shelf on /books-academia (PRD D1; 03-DESIGN §5): a row that opens and closes, the shelf's name at the
 * left and its count at the right, and under it, when open, its books in a grid of two, three, then four.
 * The whole row is the button (Enter and Space, as any button); the chevron turns as it opens, without
 * motion when the reader asks for less.
 */
import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Book, ShelfWithBooks } from '@/hooks/queries/useBooks';
import { BookCard } from './BookCard';

interface ShelfProps {
  shelf: ShelfWithBooks;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenBook: (book: Book) => void;
}

export function Shelf({ shelf, open, onOpenChange, onOpenBook }: ShelfProps) {
  const n = shelf.books.length;
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} asChild>
      <li id={`shelf-${shelf.slug}`} data-shelf={shelf.slug} className="scroll-mt-20">
        <CollapsibleTrigger className="group flex w-full items-center gap-3 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-90 motion-reduce:transition-none"
          />
          <span className="flex-1 font-display text-lg font-semibold text-foreground transition-colors group-hover:text-accent">{shelf.name}</span>
          <span className="shrink-0 text-right font-mono text-xs text-muted-foreground">
            {n} {n === 1 ? 'book' : 'books'}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 pb-8 sm:grid-cols-3 md:grid-cols-4">
            {shelf.books.map((book) => (
              <li key={book.id}>
                <BookCard book={book} onOpen={onOpenBook} />
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}
