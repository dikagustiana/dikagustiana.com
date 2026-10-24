/**
 * The bookcase on /books-academia (docs/prd/library-phase-2 §3, Shelf; the idea from Gloss's
 * components/library/Shelf.tsx, by permission, docs/licenses/gloss.md): each run of books (a shelf, a decade
 * or an author's initial, by the page's sort) under its name and count, its spines standing left to right on
 * planks, a new plank when one is full.
 *
 * Rows are virtualised against the window (@tanstack/react-virtual): a header row per run and one row per
 * plank, laid out from the case's measured width, so two hundred books draw only the planks on screen. The row
 * holding the focused spine is always kept, so focus is never dropped by a scroll.
 *
 * Keyboard: each run is one tab stop (roving tabindex); ←/→ walk along the run across its planks, Home/End go
 * to its ends, Enter or Space opens the book. A spine off screen is scrolled to before it takes focus.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { defaultRangeExtractor, useWindowVirtualizer, type Range } from '@tanstack/react-virtual';
import type { ShelfBook } from '@/hooks/queries/useBooks';
import { SPINE_GAP, packPlanks, type Group } from '@/lib/spines';
import { Spine } from './Spine';

type Row = { kind: 'head'; gi: number } | { kind: 'plank'; gi: number; start: number; books: ShelfBook[] };

const HEAD_H = 56;
/** Room above the tallest spine for its lift, the plank itself, and the gap under it. */
const LIFT = 14;
const PLANK_H = 12;
const PLANK_GAP = 28;
/** The width a case is laid out at before it is measured (and in jsdom, where nothing has a size). */
const FALLBACK_WIDTH = 720;

const rowHeight = (r: Row) => (r.kind === 'head' ? HEAD_H : LIFT + Math.max(...r.books.map((b) => b.spine.h)) + PLANK_H + PLANK_GAP);

interface ShelfProps {
  groups: Group<ShelfBook>[];
  onOpen: (book: ShelfBook) => void;
  /** A run to bring into view once laid out (a link naming a shelf). */
  scrollTo?: string | null;
}

export function Shelf({ groups, onOpen, scrollTo }: ShelfProps) {
  const caseRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [top, setTop] = useState(0);

  useLayoutEffect(() => {
    const el = caseRef.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.clientWidth);
      setTop(el.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = useMemo(() => {
    const inner = width || FALLBACK_WIDTH;
    const out: Row[] = [];
    groups.forEach((g, gi) => {
      out.push({ kind: 'head', gi });
      let start = 0;
      for (const plank of packPlanks(g.books.map((b) => b.spine.w), inner)) {
        out.push({ kind: 'plank', gi, start, books: plank.map((i) => g.books[i]) });
        start += plank.length;
      }
    });
    return out;
  }, [groups, width]);

  const rowOf = useCallback(
    (gi: number, i: number) => rows.findIndex((r) => r.kind === 'plank' && r.gi === gi && i >= r.start && i < r.start + r.books.length),
    [rows],
  );

  // Which spine in each run holds the run's tab stop, and the row of the focused one (kept rendered).
  const [active, setActive] = useState<Record<string, number>>({});
  const focusedRow = useRef(-1);
  const pending = useRef<{ gi: number; i: number } | null>(null);

  const rangeExtractor = useCallback((range: Range) => {
    const base = defaultRangeExtractor(range);
    const keep = focusedRow.current;
    return keep >= 0 && keep < range.count && !base.includes(keep) ? [...base, keep].sort((a, b) => a - b) : base;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: (i) => rowHeight(rows[i]),
    overscan: 3,
    scrollMargin: top,
    rangeExtractor,
    // jsdom has no layout: start with a window's worth of rows rather than none.
    initialRect: { width: FALLBACK_WIDTH, height: typeof window === 'undefined' ? 800 : window.innerHeight || 800 },
  });

  const spineEl = (gi: number, i: number) => caseRef.current?.querySelector<HTMLButtonElement>(`[data-gi="${gi}"][data-i="${i}"] > button`) ?? null;

  const focusSpine = useCallback(
    (gi: number, i: number) => {
      const el = spineEl(gi, i);
      if (el) {
        el.focus();
        return;
      }
      pending.current = { gi, i };
      const row = rowOf(gi, i);
      if (row >= 0) {
        focusedRow.current = row;
        virtualizer.scrollToIndex(row, { align: 'auto' });
      }
    },
    [rowOf, virtualizer],
  );

  // A spine asked for before its plank was drawn takes focus once it is.
  useEffect(() => {
    const p = pending.current;
    if (!p) return;
    const el = spineEl(p.gi, p.i);
    if (el) {
      pending.current = null;
      el.focus();
    }
  });

  // A link naming a run brings it into view, once, when the case is laid out.
  const scrolled = useRef<string | null>(null);
  useEffect(() => {
    if (!scrollTo || scrolled.current === scrollTo || !width) return;
    const gi = groups.findIndex((g) => g.key === scrollTo);
    if (gi < 0) return;
    scrolled.current = scrollTo;
    virtualizer.scrollToIndex(rows.findIndex((r) => r.kind === 'head' && r.gi === gi), { align: 'start' });
  }, [scrollTo, groups, rows, width, virtualizer]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-gi]');
    if (!cell) return;
    const gi = Number(cell.dataset.gi);
    const i = Number(cell.dataset.i);
    const n = groups[gi]?.books.length ?? 0;
    let next = i;
    if (e.key === 'ArrowRight') next = Math.min(n - 1, i + 1);
    else if (e.key === 'ArrowLeft') next = Math.max(0, i - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    if (next === i) return;
    setActive((a) => ({ ...a, [groups[gi].key]: next }));
    focusSpine(gi, next);
  };

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={caseRef} data-bookcase className="relative w-full" style={{ height: virtualizer.getTotalSize() }} onKeyDown={onKeyDown}>
      {items.map((item) => {
        const row = rows[item.index];
        const g = groups[row.gi];
        const style = { transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`, height: item.size };
        if (row.kind === 'head') {
          const n = g.books.length;
          return (
            <div key={`h-${g.key}`} data-index={item.index} className="absolute inset-x-0 top-0 flex items-end gap-3 pb-3" style={style}>
              <h2 id={`shelf-${g.key}`} data-shelf={g.key} className="flex-1 font-display text-lg font-semibold text-foreground">
                {g.label}
              </h2>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {n} {n === 1 ? 'book' : 'books'}
              </span>
            </div>
          );
        }
        const tab = active[g.key] ?? 0;
        return (
          <div key={`p-${g.key}-${row.start}`} data-index={item.index} className="absolute inset-x-0 top-0 flex flex-col justify-end" style={style}>
            <div role="list" aria-labelledby={`shelf-${g.key}`} className="flex items-end" style={{ gap: SPINE_GAP, paddingTop: LIFT }}>
              {row.books.map((b, k) => {
                const i = row.start + k;
                return (
                  <span key={b.id} role="listitem" data-gi={row.gi} data-i={i} className="flex">
                    <Spine
                      book={b}
                      tabIndex={i === tab ? 0 : -1}
                      onOpen={onOpen}
                      onFocus={() => {
                        focusedRow.current = item.index;
                        if (i !== tab) setActive((a) => ({ ...a, [g.key]: i }));
                      }}
                    />
                  </span>
                );
              })}
            </div>
            {/* The plank, and the shade the books cast on the wall above it. */}
            <div aria-hidden="true" className="rounded-[2px] border-t border-[hsl(var(--foreground)/0.22)] bg-[hsl(var(--foreground)/0.1)] shadow-[0_12px_16px_-12px_rgb(0_0_0/0.45)]" style={{ height: PLANK_H, marginBottom: PLANK_GAP }} />
          </div>
        );
      })}
    </div>
  );
}
