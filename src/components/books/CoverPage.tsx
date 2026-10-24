/**
 * A book's cover page, in front of the reader (docs/prd/library-phase-2 §3, Cover page): on the left the
 * cover, on the right title, author, year, shelf, the synopsis, the licence line, then the one action the
 * book has: Read and Download for a free book (the page's own reader, and a short-lived signed URL from the
 * `book-file` edge function), Buy for a paid one (its purchase URL, in a new tab). Below, "Cited by": the
 * published essays whose references name the book.
 *
 * The cover is generated, title and author set on the shelf's colour, unless the owner has uploaded one
 * (cover_path): an upload is the owner's statement that its licence allows it. The synopsis is the owner's
 * HTML, through the sanitiser essays use.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicUrl, type CitingEssay, type Shelf, type ShelfBook } from '@/hooks/queries/useBooks';
import { signedBookUrl } from '@/lib/bookFile';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { cn } from '@/lib/utils';

export function GeneratedCover({ book, className }: { book: ShelfBook; className?: string }) {
  const src = publicUrl(book.cover_path);
  const { color, ink } = book.spine;
  return (
    <div
      data-cover
      className={cn('relative aspect-[2/3] w-full overflow-hidden rounded-[3px] shadow-[0_18px_30px_-18px_rgb(0_0_0/0.55)]', className)}
      style={{ background: color, color: ink }}
    >
      {src ? (
        <img src={src} alt="" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <div aria-hidden="true" className="flex h-full flex-col p-6">
          {/* The hinge: a darker band where the cover meets the spine. */}
          <span className="absolute inset-y-0 left-0 w-3 bg-[linear-gradient(90deg,rgb(0_0_0/0.28),rgb(0_0_0/0.05))]" />
          <span className="mt-auto block border-t border-current pt-3 font-display text-2xl font-bold leading-tight [text-wrap:balance]">{book.title ?? book.slug}</span>
          {book.author && <span className="mt-3 block font-sans text-sm uppercase tracking-wide opacity-85">{book.author}</span>}
          {book.year && <span className="mt-1 block font-mono text-xs opacity-70">{book.year}</span>}
        </div>
      )}
    </div>
  );
}

interface CoverPageProps {
  book: ShelfBook;
  shelf: Shelf | null;
  citedBy: CitingEssay[];
}

export function CoverPage({ book, shelf, citedBy }: CoverPageProps) {
  const title = book.title ?? book.slug;
  const synopsis = sanitizeHtml(book.synopsis_html);
  const free = book.access === 'free' && !!book.filepath;
  return (
    <article className="grid gap-10 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] md:items-start">
      <GeneratedCover book={book} className="mx-auto max-w-[240px] md:max-w-none" />
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
        <p className="mt-3 text-muted-foreground">
          {[book.author, book.year].filter((x) => x !== null && x !== '').join(' · ')}
          {shelf && (
            <>
              {book.author || book.year ? ' · ' : ''}
              <Link to={`/books-academia?shelf=${encodeURIComponent(shelf.slug)}`} className="text-accent hover:underline">
                {shelf.name}
              </Link>
            </>
          )}
        </p>
        <div className="mt-6">
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
        {synopsis && (
          <div
            data-synopsis
            className="prose-editorial mt-8 font-serif text-[17px] leading-[1.65] text-foreground [&_a]:text-accent [&_a]:underline [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:pl-6 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: synopsis }}
          />
        )}
        {book.access === 'free' && book.license_note && <p className="mt-6 text-xs text-muted-foreground">License: {book.license_note}</p>}

        {citedBy.length > 0 && (
          <section aria-labelledby="cited-by" className="mt-10 border-t border-border pt-6">
            <h2 id="cited-by" className="font-display text-lg font-semibold">
              Cited by
            </h2>
            <ul className="mt-3 space-y-2">
              {citedBy.map((e) => (
                <li key={`${e.title}-${e.href}`} className="text-sm">
                  {e.href ? (
                    <Link to={e.href} className="text-accent hover:underline">
                      {e.title}
                    </Link>
                  ) : (
                    e.title
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}

/** Read (the in-page reader) and Download (a signed URL, fetched on the press). */
function FreeActions({ book }: { book: ShelfBook }) {
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
