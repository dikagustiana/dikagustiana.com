/**
 * A book, opened (PRD D3; 03-DESIGN §5): cover, title, author · year · shelf, one primary action, the full
 * synopsis and, for a free book, the basis on which it is shared. A free book has two: Read opens it in the
 * page's own reader (/books-academia/<slug>/read), and Download asks the `book-file` edge function for a
 * short-lived URL that saves the file under the book's title (the file is in a private bucket; there is no
 * standing link to it). Buy opens the purchase URL in a new tab. The synopsis is the owner's HTML,
 * through the sanitiser essays use. On a phone the dialog fills the screen, cover above the title. Mobile-first
 * classes (base, then sm:), not max-sm:: the theme's raw `pointer-fine` screen turns Tailwind's max-* variants off.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Book } from '@/hooks/queries/useBooks';
import { signedBookUrl } from '@/lib/bookFile';
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
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-w-2xl sm:rounded-lg sm:border">
        {book && <BookBody book={book} shelfName={shelfName} />}
      </DialogContent>
    </Dialog>
  );
}

function BookBody({ book, shelfName }: { book: Book; shelfName: string | null }) {
  const title = book.title ?? book.slug;
  const meta = byline(book, shelfName);
  const free = book.access === 'free' && !!book.filepath;
  const synopsis = sanitizeHtml(book.synopsis_html);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:max-h-[90vh]">
      <div className="flex flex-col gap-5 pr-6 sm:flex-row sm:items-start">
        <BookCover book={book} className="w-32 shrink-0 sm:w-36" />
        <div className="min-w-0 flex-1">
          <DialogTitle className="font-display text-2xl font-bold leading-tight">{title}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">{meta || (book.access === 'free' ? 'Free to download' : 'Available to buy')}</DialogDescription>
          <div className="mt-5">
            {free ? (
              <FreeActions book={book} />
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
          className="prose-editorial font-serif text-[17px] leading-[1.6] text-foreground sm:max-h-[60vh] sm:overflow-y-auto [&_a]:text-accent [&_a]:underline [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:pl-6 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: synopsis }}
        />
      )}
      {book.access === 'free' && book.license_note && <p className="mt-4 text-xs text-muted-foreground">License: {book.license_note}</p>}
    </div>
  );
}

/** Read (the in-page reader) and Download (a signed URL, fetched on the press). */
function FreeActions({ book }: { book: Book }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kind = /\.epub$/i.test(book.filepath ?? '') ? 'EPUB' : 'PDF';
  const download = async () => {
    setBusy(true);
    setError(null);
    const signed = await signedBookUrl(book.slug, 'download');
    setBusy(false);
    if (signed.ok) window.location.assign(signed.url);
    else setError(signed.message);
  };
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to={`/books-academia/${encodeURIComponent(book.slug)}/read`}>
            <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
            Read
          </Link>
        </Button>
        <Button type="button" variant="outline" onClick={download} disabled={busy} aria-busy={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
          Download {kind}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
