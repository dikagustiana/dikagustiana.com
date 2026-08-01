import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TocItem {
  id: string;
  text: string;
  level: 'h2' | 'h3';
}

interface ArticleTocProps {
  content: string;
  className?: string;
  /**
   * `inline` (default) — the collapsible box above the body, kept for
   * viewports below `lg` where a sidebar would reintroduce horizontal scroll.
   * `sidebar` — an always-open list for the sticky aside at `lg:` and above.
   */
  variant?: 'inline' | 'sidebar';
}

function extractHeadings(content: string): TocItem[] {
  if (!content) return [];
  const items: TocItem[] = [];
  let headingCounter = 0;

  // Try parsing as HTML
  try {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    const headings = doc.querySelectorAll('h2, h3');
    headings.forEach((heading) => {
      headingCounter++;
      const text = heading.textContent || '';
      const level = heading.tagName.toLowerCase() as 'h2' | 'h3';
      const id = `section-${headingCounter}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
      items.push({ id, text, level });
    });
  } catch {
    // If parsing fails, try regex fallback
    const regex = /<(h2|h3)[^>]*>(.*?)<\/\1>/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      headingCounter++;
      const level = match[1].toLowerCase() as 'h2' | 'h3';
      const text = match[2].replace(/<[^>]*>/g, '');
      const id = `section-${headingCounter}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
      items.push({ id, text, level });
    }
  }

  return items;
}

/**
 * Smooth scrolling is the largest motion on the page and a nausea trigger for
 * readers who have asked the OS to reduce motion. Their preference wins.
 *
 * 'instant', not 'auto': per spec, behavior 'auto' defers to the CSS
 * `scroll-behavior` property, and the stylesheet sets `smooth` on `html` —
 * so 'auto' would quietly re-animate the very jump this exists to prevent.
 */
function scrollBehavior(): ScrollBehavior {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? ('instant' as ScrollBehavior)
    : 'smooth';
}

export function ArticleToc({ content, className, variant = 'inline' }: ArticleTocProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>('');
  const listRef = useRef<HTMLUListElement>(null);

  const headings = useMemo(() => extractHeadings(content), [content]);

  // Track active heading via intersection observer
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  // Keep the active entry visible INSIDE the sidebar list. On a long essay the
  // reader scrolls past entries that sit below the sidebar's own fold, and a
  // highlight outside the visible list is invisible exactly when it matters.
  // scrollTop is adjusted directly — scrollIntoView would also scroll the page.
  useEffect(() => {
    if (variant !== 'sidebar' || !activeId) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector<HTMLElement>(`[data-toc-id="${activeId}"]`);
    if (!item) return;

    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < listRect.top) {
      list.scrollTop += itemRect.top - listRect.top - 8;
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollTop += itemRect.bottom - listRect.bottom + 8;
    }
  }, [activeId, variant]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      setActiveId(id);
    }
    setIsOpen(false);
  }, []);

  if (headings.length < 3) return null;

  if (variant === 'sidebar') {
    return (
      <nav className={cn('text-sm', className)} aria-label="Table of contents">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <List className="h-3.5 w-3.5" />
          Contents
        </p>
        {/* The list scrolls inside itself: 13 entries on a short viewport would
            otherwise truncate with no way to reach the tail. */}
        <ul
          ref={listRef}
          className="mt-3 max-h-[calc(100vh-11rem)] space-y-0.5 overflow-y-auto pr-1"
        >
          {headings.map((heading) => (
            <li key={heading.id}>
              <button
                data-toc-id={heading.id}
                onClick={() => handleClick(heading.id)}
                className={cn(
                  'block w-full rounded px-2 py-1 text-left text-[13px] leading-snug transition-colors hover:bg-muted/50',
                  heading.level === 'h3' && 'pl-5',
                  activeId === heading.id
                    ? 'text-primary font-medium bg-muted/40'
                    : 'text-muted-foreground'
                )}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      className={cn('border border-border rounded-lg mb-8', className)}
      aria-label="Table of contents"
    >
      {/* Toggle header - always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 rounded-lg transition-colors"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <List className="h-4 w-4" />
          Table of Contents
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* TOC list */}
      {isOpen && (
        <ul className="px-4 pb-4 space-y-1">
          {headings.map((heading) => (
            <li key={heading.id}>
              <button
                onClick={() => handleClick(heading.id)}
                className={cn(
                  'block w-full text-left text-sm py-1.5 transition-colors rounded px-2 hover:bg-muted/50',
                  heading.level === 'h3' && 'pl-6',
                  activeId === heading.id
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
