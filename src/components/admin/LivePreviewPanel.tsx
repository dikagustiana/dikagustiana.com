/**
 * LivePreviewPanel — Desktop live preview using production rendering components.
 *
 * Renders the essay exactly as it appears on the published site using
 * ArticleHeader, ArticleBody, KeyTakeaways, AuthorBox from the editorial system.
 * Content updates are debounced to avoid lag while typing.
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import type { JSONContent } from '@tiptap/core';
import { ArticleHeader } from '@/components/editorial/ArticleHeader';
import { ArticleBody } from '@/components/editorial/ArticleBody';
import { KeyTakeaways } from '@/components/editorial/KeyTakeaways';
import { AuthorBox } from '@/components/editorial/AuthorBox';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LivePreviewPanelProps {
  title: string;
  snippet: string;
  author: string;
  date: string;
  readTime: string;
  phase: string;
  sectionSlug: string | null;
  contentJson: JSONContent | null;
  economistFields?: {
    deck?: string;
    hero_image_url?: string;
    hero_caption?: string;
    key_takeaways?: string[];
    references?: { label: string; url?: string }[];
    author_bio?: string;
  };
  className?: string;
}

const DEBOUNCE_MS = 300;

export function LivePreviewPanel({
  title,
  snippet,
  author,
  date,
  readTime,
  phase,
  sectionSlug,
  contentJson,
  economistFields,
  className,
}: LivePreviewPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [debouncedContent, setDebouncedContent] = useState(contentJson);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce content updates
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedContent(contentJson);
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [contentJson]);

  // Non-content fields update immediately (title, author, etc.)
  const contentString = useMemo(() => {
    if (!debouncedContent) return '';
    return JSON.stringify(debouncedContent);
  }, [debouncedContent]);

  const isEditorialSection = sectionSlug === 'next-big-thing' || sectionSlug === 'green-transition';

  const deck = economistFields?.deck || snippet;
  const heroImage = economistFields?.hero_image_url;
  const heroCaption = economistFields?.hero_caption;
  const keyTakeaways = economistFields?.key_takeaways || [];
  const references = economistFields?.references || [];
  const authorBio = economistFields?.author_bio;

  if (collapsed) {
    return (
      <div className={cn("flex flex-col items-center pt-4", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(false)}
          className="gap-2 text-muted-foreground"
        >
          <Eye className="h-4 w-4" />
          Show Preview
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Preview header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Live Preview</span>
          {!sectionSlug && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Section not selected. Using default preview.
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(true)}
          className="h-7 px-2 text-muted-foreground"
        >
          <EyeOff className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview content — scrollable, mimics production layout */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-3xl mx-auto py-8 px-6">
          {/* Production ArticleHeader */}
          <ArticleHeader
            title={title || 'Untitled Essay'}
            deck={deck || null}
            author={author || null}
            publishedAt={date || null}
            readTime={readTime || null}
            topic={phase || null}
            heroImage={heroImage || null}
            heroCaption={heroCaption || null}
          />

          {/* Production ArticleBody */}
          {contentString ? (
            <ArticleBody content={contentString} />
          ) : (
            <p className="text-muted-foreground italic">
              Start writing to see your content here...
            </p>
          )}

          {/* Key Takeaways */}
          {keyTakeaways.length > 0 && (
            <KeyTakeaways takeaways={keyTakeaways} />
          )}

          {/* References */}
          {references.length > 0 && (
            <div className="border-t border-border pt-8 mt-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📚</span>
                <h3 className="font-semibold text-foreground">References</h3>
              </div>
              <ol className="space-y-2 text-sm list-decimal list-inside">
                {references.map((ref, idx) => (
                  <li key={idx} className="text-muted-foreground">
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors underline"
                      >
                        {ref.label}
                      </a>
                    ) : (
                      ref.label
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Author Box */}
          {author && (
            <AuthorBox name={author} bio={authorBio} />
          )}
        </div>
      </div>
    </div>
  );
}
