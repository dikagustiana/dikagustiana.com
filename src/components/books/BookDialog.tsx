/**
 * A book, opened (PRD D3; 03-DESIGN §5): cover, title, author · year · shelf, one primary action, the full
 * synopsis and, for a free book, the basis on which it is shared. Download saves the file from the `books`
 * bucket under the book's title; Buy opens the purchase URL in a new tab. The synopsis is the owner's HTML,
 * through the sanitiser essays use. On a phone the dialog fills the screen, cover above the title.
 */
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { downloadUrl, type Book } from '@/hooks/queries/useBooks';
import { byline } from '@/lib/books';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { BookCover } from './BookCover';

interface BookDialogProps {
  book: Book | null;
  shelfName: string | null;
  onClose: () => void;
}

export function BookDialog({ book, shelfName, onClose }: BookDialogProps) {
  return (
    <Dialog open={!!book} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[100dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0 max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:border-0">
        {book && <BookBody book={book} shelfName={shelfName} />}
      </DialogContent>
    </Dialog>
  );
}

function BookBody({ book, shelfName }: { book: Book; shelfName: string | null }) {
  const title = book.title ?? book.slug;
  const meta = byline(book, shelfName);
  const file = book.access === 'free' ? downloadUrl(book) : null;
  const synopsis = sanitizeHtml(book.synopsis_html);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:max-h-[90vh]">
      <div className="flex flex-col gap-5 pr-6 sm:flex-row sm:items-start">
        <BookCover book={book} className="w-32 shrink-0 sm:w-36" />
        <div className="min-w-0 flex-1">
          <DialogTitle className="font-display text-2xl font-bold leading-tight">{title}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">{meta || (book.access === 'free' ? 'Free to download' : 'Available to buy')}</DialogDescription>
          <div className="mt-5">
            {book.access === 'free' && file ? (
              <Button asChild>
                <a href={file} download>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Download {/\.epub$/i.test(book.filepath ?? '') ? 'EPUB' : 'PDF'}
                </a>
              </Button>
            ) : book.access === 'paid' && book.purchase_url ? (
              <Button asChild>
                <a href={book.purchase_url} target="_blank" rel="noopener noreferrer" aria-label={`Buy ${title} (opens in a new tab)`}>
                  Buy ↗
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {(synopsis || (book.access === 'free' && book.license_note)) && <hr className="my-6 border-border" />}
      {synopsis && (
        <div
          data-synopsis
          className="prose-editorial max-h-[60vh] overflow-y-auto font-serif text-[17px] leading-[1.6] text-foreground max-sm:max-h-none [&_a]:text-accent [&_a]:underline [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:pl-6 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: synopsis }}
        />
      )}
      {book.access === 'free' && book.license_note && <p className="mt-4 text-xs text-muted-foreground">License: {book.license_note}</p>}
    </div>
  );
}
