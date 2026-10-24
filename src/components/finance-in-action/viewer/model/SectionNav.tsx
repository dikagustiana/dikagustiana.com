/**
 * "On this page" (sheet-first PRD R3; docs/prd/2026-10-fia-fixes item 2): the
 * sections under the model, in their order, as anchors. It sticks under the
 * site header once scrolled to, the section in view is marked (an
 * IntersectionObserver, not a scroll handler), and on a narrow screen the row
 * scrolls sideways with no scrollbar and a fade at the right edge that goes
 * once the row is scrolled to its end. Every link is a plain anchor, so the
 * row is reached and followed from the keyboard.
 */
import { useEffect, useId, useState } from 'react';
import { COPY } from '@/lib/finance-in-action/copy';
import { cn } from '@/lib/utils';
import { useScrollFade } from './useScrollFade';

/** The band of the viewport a section must cross to count as the one in view. */
const IN_VIEW_MARGIN = '-40% 0px -55% 0px';

/** The site header's height, so the row sticks just under it; 4rem until measured. */
function useHeaderHeight(): string {
  const [h, setH] = useState('4rem');
  useEffect(() => {
    const header = document.querySelector('body header');
    if (!header || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setH(`${(header as HTMLElement).offsetHeight}px`));
    ro.observe(header);
    return () => ro.disconnect();
  }, []);
  return h;
}

/** The id of the section in view, or null. */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(' ');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.fiaSection ?? null);
      },
      { rootMargin: IN_VIEW_MARGIN },
    );
    for (const id of key.split(' ')) {
      const section = document.getElementById(id)?.closest('section');
      if (section) {
        section.dataset.fiaSection = id;
        io.observe(section);
      }
    }
    return () => io.disconnect();
  }, [key]);
  return active;
}

export function SectionNav({ sections }: { sections: { id: string; title: string }[] }) {
  const id = useId();
  const top = useHeaderHeight();
  const active = useActiveSection(sections.map((s) => s.id));
  const { ref, faded } = useScrollFade<HTMLUListElement>();
  return (
    <nav
      aria-labelledby={id}
      style={{ ['--header-h' as string]: top }}
      className="sticky top-[var(--header-h)] z-30 -mx-4 mb-8 flex items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:-mx-8 sm:px-8"
      data-fia-section-nav
    >
      <span id={id} className="hidden shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
        {COPY.onThisPage}
      </span>
      <ul ref={ref} className={cn('fia-scroll-row -mx-1 flex min-w-0 gap-x-1 px-1', faded && 'fia-fade-right')}>
        {sections.map((s) => {
          const on = s.id === active;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={on ? 'location' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-xs font-semibold underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  on ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground',
                )}
              >
                {s.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
