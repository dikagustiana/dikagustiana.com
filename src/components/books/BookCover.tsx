/**
 * A book's cover at 2:3 (site cleanup 2026-10, 03-DESIGN §5), or, without one, a typographic placeholder:
 * the title in the display face on the secondary surface.
 */
import { publicUrl, type Book } from '@/hooks/queries/useBooks';
import { cn } from '@/lib/utils';

interface BookCoverProps {
  book: Pick<Book, 'cover_path' | 'title' | 'slug'>;
  className?: string;
  /** Passed by the card, whose hover changes the border. */
  frameClassName?: string;
}

export function BookCover({ book, className, frameClassName }: BookCoverProps) {
  const src = publicUrl(book.cover_path);
  const title = book.title ?? book.slug;
  return (
    <div className={cn('aspect-[2/3] w-full overflow-hidden rounded-sm border border-border transition-colors', frameClassName, className)}>
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <div aria-hidden="true" className="flex h-full w-full items-center bg-secondary p-3">
          <span className="line-clamp-5 font-display text-sm font-semibold leading-snug text-foreground">{title}</span>
        </div>
      )}
    </div>
  );
}
