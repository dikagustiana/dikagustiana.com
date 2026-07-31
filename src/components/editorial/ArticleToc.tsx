import { useState, useEffect, useMemo } from 'react';
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

export function ArticleToc({ content, className }: ArticleTocProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>('');

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

  if (headings.length < 3) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
    setIsOpen(false);
  };

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
