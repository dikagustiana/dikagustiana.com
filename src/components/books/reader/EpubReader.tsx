/**
 * An EPUB, paginated by epub.js inside the column. The book is fetched whole from its signed URL (an EPUB
 * is a zip) and laid out in epub.js's own frame. Arrow keys and Page Up/Down turn pages, from the page and
 * from inside the frame, as do the buttons.
 */
import { useEffect, useRef, useState } from 'react';
import ePub, { type Book as EpubBook, type Rendition } from 'epubjs';
import { isTypingTarget, turnFor } from '@/lib/bookReader';
import { Pager } from './PdfReader';

interface Props {
  url: string;
  title: string;
  onError: (message: string) => void;
}

export default function EpubReader({ url, title, onError }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [where, setWhere] = useState<string | null>(null);

  useEffect(() => {
    if (!boxRef.current) return;
    let book: EpubBook | null = null;
    try {
      book = ePub(url, { openAs: 'epub' });
      const rendition = book.renderTo(boxRef.current, { width: '100%', height: '100%', flow: 'paginated', spread: 'none' });
      renditionRef.current = rendition;
      rendition.display().catch(() => onError('The EPUB could not be opened.'));
      rendition.on('relocated', (loc: { start?: { displayed?: { page: number; total: number } } }) => {
        const d = loc.start?.displayed;
        setWhere(d ? `Page ${d.page} of ${d.total} in this chapter` : null);
      });
      rendition.on('keydown', (e: KeyboardEvent) => {
        const step = turnFor(e.key);
        if (step) void (step > 0 ? rendition.next() : rendition.prev());
      });
      book.opened.catch(() => onError('The EPUB could not be opened.'));
    } catch {
      onError('The EPUB could not be opened.');
    }
    return () => {
      renditionRef.current = null;
      book?.destroy();
    };
  }, [url, onError]);

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

  const turn = (step: -1 | 1) => void (step > 0 ? renditionRef.current?.next() : renditionRef.current?.prev());

  return (
    <div>
      <div ref={boxRef} role="document" aria-label={title} className="h-[75vh] w-full overflow-hidden rounded border border-border bg-white" />
      <Pager page={0} total={0} onTurn={turn} label={where ?? 'Use the arrows to turn the page'} />
    </div>
  );
}
