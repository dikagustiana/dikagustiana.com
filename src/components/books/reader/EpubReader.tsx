/**
 * An EPUB, paginated by epub.js to fill the stage, on a white page set on the reader's dark ground. The book is
 * fetched whole from its signed URL (an EPUB is a zip) and laid out in epub.js's own frame. Pages turn as in
 * the PDF reader: arrow keys and Page Up/Down (from the page and from inside the frame), a press on either
 * half, a swipe. The place reached is kept per browser as an EPUB location, and the book reopens there.
 */
import { useEffect, useRef } from 'react';
import ePub, { type Book as EpubBook, type Rendition } from 'epubjs';
import { isTypingTarget, readPosition, turnFor, writePosition } from '@/lib/bookReader';
import { TurnZones } from './TurnZones';
import { useSwipe } from './useSwipe';

interface Props {
  url: string;
  title: string;
  slug: string;
  onError: (message: string) => void;
  onStatus: (label: string) => void;
}

type Located = { start?: { cfi?: string; displayed?: { page: number; total: number } } };

export default function EpubReader({ url, title, slug, onError, onStatus }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);

  useEffect(() => {
    if (!boxRef.current) return;
    let book: EpubBook | null = null;
    const failed = () => onError('The EPUB could not be opened.');
    try {
      book = ePub(url, { openAs: 'epub' });
      const rendition = book.renderTo(boxRef.current, { width: '100%', height: '100%', flow: 'paginated', spread: 'none' });
      renditionRef.current = rendition;
      rendition.display(readPosition(slug) ?? undefined).catch(() => rendition.display().catch(failed));
      rendition.on('relocated', (loc: Located) => {
        const d = loc.start?.displayed;
        onStatus(d ? `Page ${d.page} of ${d.total} in this chapter` : '');
        if (loc.start?.cfi) writePosition(slug, loc.start.cfi);
      });
      rendition.on('keydown', (e: KeyboardEvent) => {
        const step = turnFor(e.key);
        if (step) void (step > 0 ? rendition.next() : rendition.prev());
      });
      book.opened.catch(failed);
    } catch {
      failed();
    }
    return () => {
      renditionRef.current = null;
      book?.destroy();
    };
  }, [url, slug, onError, onStatus]);

  const turn = (step: -1 | 1) => void (step > 0 ? renditionRef.current?.next() : renditionRef.current?.prev());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const step = turnFor(e.key);
      if (!step || isTypingTarget(e) || !renditionRef.current) return;
      e.preventDefault();
      void (step > 0 ? renditionRef.current.next() : renditionRef.current.prev());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const swipe = useSwipe(turn);

  return (
    <div className="relative flex h-full w-full touch-pan-y items-center justify-center" {...swipe}>
      <div ref={boxRef} role="document" aria-label={title} className="h-full w-full max-w-3xl bg-white px-4 py-6 shadow-2xl sm:px-10" />
      <TurnZones onTurn={turn} />
    </div>
  );
}
