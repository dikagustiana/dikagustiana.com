import { useMemo } from 'react';
import type { JSONContent } from '@tiptap/core';
import { cn } from '@/lib/utils';

interface LeftSidebarProps {
  contentJson: JSONContent | null;
}

interface HeadingItem {
  level: number;
  text: string;
  id: string;
}

function extractHeadings(doc: JSONContent | null): HeadingItem[] {
  if (!doc?.content) return [];
  const headings: HeadingItem[] = [];
  for (const node of doc.content) {
    if (node.type === 'heading' && (node.attrs?.level === 2 || node.attrs?.level === 3)) {
      const text = extractText(node);
      if (text.trim()) {
        headings.push({
          level: node.attrs.level as number,
          text: text.trim(),
          id: text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        });
      }
    }
  }
  return headings;
}

function extractText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? '';
  if (!node.content) return '';
  return node.content.map(extractText).join('');
}

function countWords(doc: JSONContent | null): number {
  if (!doc) return 0;
  const text = extractAllText(doc);
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function extractAllText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? '';
  if (!node.content) return '';
  return node.content.map(extractAllText).join(' ');
}

function estimateReadingTime(wordCount: number): string {
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

/**
 * Scroll the editor to the Nth outline heading. The outline (extractHeadings)
 * drops empty headings, so filter the DOM list the same way to keep indices aligned.
 */
function scrollToHeading(index: number): void {
  const editor = document.querySelector('.ProseMirror');
  if (!editor) return;
  const headingEls = Array.from(editor.querySelectorAll('h2, h3')).filter(
    (el) => (el.textContent || '').trim().length > 0,
  );
  const target = headingEls[index];
  if (!target) return;
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
}

export function LeftSidebar({ contentJson }: LeftSidebarProps) {
  const headings = useMemo(() => extractHeadings(contentJson), [contentJson]);
  const wordCount = useMemo(() => countWords(contentJson), [contentJson]);
  const readingTime = useMemo(() => estimateReadingTime(wordCount), [wordCount]);

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-muted/20 overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Stats */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stats</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Words</span>
            <span className="font-mono text-foreground">{wordCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reading</span>
            <span className="font-mono text-foreground">{readingTime}</span>
          </div>
        </div>

        {/* Outline */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outline</div>
          {headings.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No headings yet. Use H2/H3 to build structure.</p>
          ) : (
            <nav className="space-y-0.5">
              {headings.map((h, i) => (
                <button
                  key={`${h.id}-${i}`}
                  onClick={() => scrollToHeading(i)}
                  className={cn(
                    'block w-full text-left text-xs truncate rounded px-2 py-1 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    h.level === 2
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground pl-5'
                  )}
                  title={h.text}
                >
                  {h.text}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
    </aside>
  );
}
