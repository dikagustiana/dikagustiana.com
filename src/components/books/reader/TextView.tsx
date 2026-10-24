/**
 * A free book's chapter as text (docs/prd/library-phase-2 §3 Margin questions): its extracted paragraphs, each
 * numbered ¶n in the gutter, so an answer's [¶n] can be checked by eye. Selecting text inside it shows a small
 * Ask button at the selection's end; the paragraphs a question quotes stay highlighted while its margin is
 * open, and a cited paragraph, when asked for, is scrolled to and marked.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react';
import type { BookPara } from '@/hooks/queries/useBookText';
import type { AskSelection } from '@/lib/bookAsk';
import { cn } from '@/lib/utils';

interface Props {
  chapter: number;
  range: { first: number; last: number };
  paragraphs: BookPara[] | undefined;
  loading: boolean;
  onChapter: (n: number) => void;
  /** Paragraphs a question quotes, highlighted while its margin is open. */
  quoted: { from: number; to: number } | null;
  /** A paragraph to bring into view and mark; the nonce makes a second click on the same one count. */
  target: { para: number; nonce: number } | null;
  onAsk: (sel: AskSelection) => void;
}

const SELECTION_CAP = 2000;

/** The paragraph number a DOM node sits in, inside `root`. */
function paraOf(node: Node | null, root: HTMLElement): number | null {
  const el = node instanceof Element ? node : node?.parentElement;
  const p = el?.closest<HTMLElement>('[data-para]');
  return p && root.contains(p) ? Number(p.dataset.para) : null;
}

export function TextView({ chapter, range, paragraphs, loading, onChapter, quoted, target, onAsk }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<{ sel: AskSelection; x: number; y: number } | null>(null);
  const [marked, setMarked] = useState<number | null>(null);

  // A new chapter starts at its top, with no selection pending.
  useEffect(() => {
    setPending(null);
    if (!target) scrollRef.current?.scrollTo?.({ top: 0 });
    // Only when the chapter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter]);

  // A cited paragraph: into view, marked for a moment.
  useEffect(() => {
    if (!target || !paragraphs?.length) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`#para-${target.para}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.focus({ preventScroll: true });
    setMarked(target.para);
    const t = window.setTimeout(() => setMarked(null), 2400);
    return () => window.clearTimeout(t);
  }, [target, paragraphs]);

  const readSelection = useCallback(() => {
    const root = scrollRef.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPending(null);
      return;
    }
    const a = paraOf(sel.anchorNode, root);
    const b = paraOf(sel.focusNode, root);
    const text = sel.toString().replace(/¶\d+/g, '').replace(/\s+/g, ' ').trim().slice(0, SELECTION_CAP);
    if (a === null || b === null || !text) {
      setPending(null);
      return;
    }
    const r = sel.getRangeAt(0);
    const rects = typeof r.getClientRects === 'function' ? r.getClientRects() : null;
    const end = rects?.[rects.length - 1] ?? (typeof r.getBoundingClientRect === 'function' ? r.getBoundingClientRect() : { right: 0, bottom: 0 });
    const box = root.getBoundingClientRect();
    setPending({
      sel: { para_from: Math.min(a, b), para_to: Math.max(a, b), text },
      x: Math.min(end.right - box.left, box.width - 72),
      y: end.bottom - box.top + root.scrollTop + 6,
    });
  }, []);

  return (
    <div
      ref={scrollRef}
      data-text-view
      className="relative h-full overflow-y-auto rounded-sm bg-[#faf7f0] text-neutral-900 shadow-2xl"
      onMouseUp={readSelection}
      onKeyUp={(e) => {
        if (e.shiftKey || e.key.startsWith('Arrow')) readSelection();
      }}
      onTouchEnd={() => window.setTimeout(readSelection, 0)}
    >
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-10">
        <nav aria-label="Chapters" className="mb-6 flex items-center justify-between gap-2 font-sans text-sm text-neutral-500">
          <button
            type="button"
            onClick={() => onChapter(chapter - 1)}
            disabled={chapter <= range.first}
            className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-neutral-200 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </button>
          <span aria-live="polite">{chapter === 0 ? 'Front matter' : `Chapter ${chapter}`}</span>
          <button
            type="button"
            onClick={() => onChapter(chapter + 1)}
            disabled={chapter >= range.last}
            className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-neutral-200 disabled:opacity-30"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
        {loading ? (
          <p className="font-sans text-sm text-neutral-500">Loading the chapter…</p>
        ) : !paragraphs?.length ? (
          <p className="font-sans text-sm text-neutral-500">No text in this chapter.</p>
        ) : (
          <div className="font-serif text-[17px] leading-[1.65]">
            {paragraphs.map((p) => {
              const isQuoted = !!quoted && p.para >= quoted.from && p.para <= quoted.to;
              return (
                <p
                  key={p.para}
                  id={`para-${p.para}`}
                  data-para={p.para}
                  data-page={p.page}
                  data-quoted={isQuoted || undefined}
                  data-marked={marked === p.para || undefined}
                  tabIndex={-1}
                  className={cn(
                    'relative mb-4 scroll-mt-8 rounded-sm pl-11 outline-none transition-colors duration-300 motion-reduce:transition-none',
                    isQuoted && 'bg-amber-100',
                    marked === p.para && 'bg-amber-200 ring-2 ring-amber-500',
                  )}
                >
                  <span aria-hidden="true" className="absolute left-0 top-[0.2em] w-9 select-none text-right font-mono text-[11px] text-neutral-400">
                    ¶{p.para}
                  </span>
                  {p.text}
                </p>
              );
            })}
          </div>
        )}
      </div>
      {pending && (
        <button
          type="button"
          className="absolute z-10 inline-flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-1.5 font-sans text-xs font-medium text-white shadow-lg hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          style={{ left: Math.max(4, pending.x), top: pending.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onAsk(pending.sel);
            setPending(null);
          }}
        >
          <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
          Ask
        </button>
      )}
    </div>
  );
}
