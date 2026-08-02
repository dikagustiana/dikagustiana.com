import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { prefersReducedMotion } from '@/lib/motion';

interface TocItem {
  id: string;
  text: string;
  level: 'h2' | 'h3';
}

interface ArticleTocProps {
  content: string;
  className?: string;
  /**
   * 'inline'  — collapsible box above the body. The only mode below lg:,
   *             where a sidebar would reintroduce horizontal scroll.
   * 'sidebar' — always-expanded list for the sticky aside at lg: and up.
   */
  variant?: 'inline' | 'sidebar';
}

// Exported for the unit test that pins these ids to the ones ArticleBody
// actually renders — the two counters must walk the same heading set.
export function extractHeadings(content: string): TocItem[] {
  if (!content) return [];
  const items: TocItem[] = [];
  let headingCounter = 0;

  // The counter MUST advance over every h1–h6, because ArticleBody numbers
  // its `section-N-…` ids over all six levels. Counting only the listed
  // levels here would desync every anchor the moment an h1/h4/h5/h6
  // precedes an h2 — the ToC still LISTS only h2/h3.
  try {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((heading) => {
      headingCounter++;
      const level = heading.tagName.toLowerCase();
      if (level === 'h2' || level === 'h3') {
        const text = heading.textContent || '';
        const id = `section-${headingCounter}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
        items.push({ id, text, level });
      }
    });
  } catch {
    // If parsing fails, try regex fallback
    const regex = /<(h[1-6])[^>]*>(.*?)<\/\1>/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      headingCounter++;
      const level = match[1].toLowerCase();
      if (level === 'h2' || level === 'h3') {
        const text = match[2].replace(/<[^>]*>/g, '');
        const id = `section-${headingCounter}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;
        items.push({ id, text, level });
      }
    }
  }

  return items;
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
        // Entries arrive in observation order, not document order — pick the
        // topmost visible heading so a fast scroll past several sections does
        // not leave a lower one highlighted.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
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

  // Keep the active entry visible inside the sidebar's OWN scroll container.
  // The page must not move — the reader's scroll position is the thing being
  // tracked — so this adjusts list.scrollTo only. scrollIntoView is wrong
  // here: it walks up and scrolls every scrollable ancestor, page included.
  useEffect(() => {
    if (variant !== 'sidebar' || !activeId) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector<HTMLElement>(
      `[data-toc-id="${CSS.escape(activeId)}"]`
    );
    if (!item) return;

    const above = item.offsetTop < list.scrollTop;
    const below =
      item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight;
    if (above || below) {
      list.scrollTo({
        top: Math.max(
          0,
          item.offsetTop - list.clientHeight / 2 + item.offsetHeight / 2
        ),
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }, [variant, activeId]);

  if (headings.length < 3) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // The largest motion on the page honours the reader's setting: jump,
      // don't glide, under prefers-reduced-motion. 'instant', not 'auto' —
      // 'auto' defers to the computed scroll-behavior, which is smooth here.
      el.scrollIntoView({
        behavior: prefersReducedMotion() ? 'instant' : 'smooth',
        block: 'start',
      });
      setActiveId(id);
    }
    setIsOpen(false);
  };

  if (variant === 'sidebar') {
    return (
      <nav className={cn('text-sm', className)} aria-label="Table of contents">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          On this page
        </p>
        {/* max-h + internal overflow: 13 entries on a short viewport must
            scroll inside the rail, not truncate below the fold. `relative` so
            entry offsetTop is measured against this list for the auto-scroll. */}
        <ul
          ref={listRef}
          className="relative max-h-[calc(100vh-12rem)] overflow-y-auto border-l border-border"
        >
          {headings.map((heading) => (
            <li key={heading.id} data-toc-id={heading.id}>
              <button
                onClick={() => handleClick(heading.id)}
                aria-current={activeId === heading.id ? 'location' : undefined}
                className={cn(
                  '-ml-px block w-full border-l-2 py-1.5 pr-2 text-left leading-snug transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  heading.level === 'h3' ? 'pl-7' : 'pl-4',
                  activeId === heading.id
                    ? 'border-primary font-medium text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
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
