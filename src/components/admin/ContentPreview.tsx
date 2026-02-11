import { cn } from '@/lib/utils';
import { contentToHtml } from '@/lib/tiptap/serialize';

interface ContentPreviewProps {
  title: string;
  snippet?: string;
  content: string;
  author?: string;
  date?: string;
  readTime?: string;
  className?: string;
}

export function ContentPreview({
  title,
  snippet,
  content,
  author,
  date,
  readTime,
  className,
}: ContentPreviewProps) {
  // Handles both TipTap JSON (canonical) and legacy HTML
  const htmlContent = contentToHtml(content) || '<p class="text-muted-foreground italic">No content yet. Start writing to see your preview here.</p>';

  return (
    <article className={cn("max-w-3xl mx-auto", className)}>
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-4 text-foreground">
          {title || 'Untitled'}
        </h1>

        {snippet && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            {snippet}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {author && <span>{author}</span>}
          {date && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span>{date}</span>
            </>
          )}
          {readTime && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span>{readTime}</span>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <div
        className={cn(
          "prose prose-lg max-w-none",
          "prose-headings:font-display prose-headings:font-semibold prose-headings:text-foreground",
          "prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4",
          "prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3",
          "prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2",
          "prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4",
          "prose-strong:text-foreground prose-strong:font-semibold",
          "prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",
          "prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4",
          "prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4",
          "prose-li:text-foreground prose-li:my-1",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono",
          "prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto",
          "prose-a:text-accent prose-a:underline prose-a:hover:text-accent/80",
          "prose-hr:border-border prose-hr:my-8"
        )}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </article>
  );
}
