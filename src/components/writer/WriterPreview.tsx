import { useMemo } from 'react';
import { User, Calendar, Clock, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { contentToHtml } from '@/lib/tiptap/serialize';

interface WriterPreviewProps {
  title: string;
  deck: string;
  author: string;
  date: string;
  readTime: string;
  phase: string;
  phaseOptions: { id: string; label: string }[];
  heroImageUrl: string;
  heroCaption: string;
  content: string;
  keyTakeaways: string[];
  references: { label: string; url?: string }[];
  authorBio: string;
  section: string;
  updatedAt: string | null;
  createdAt: string | null;
}

export function WriterPreview({
  title,
  deck,
  author,
  date,
  readTime,
  phase,
  phaseOptions,
  heroImageUrl,
  heroCaption,
  content,
  keyTakeaways,
  references,
  authorBio,
  section,
  updatedAt,
  createdAt,
}: WriterPreviewProps) {
  const phaseLabel = phaseOptions.find(p => p.id === phase)?.label || phase;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Check if we should show "Updated on"
  const showUpdated = useMemo(() => {
    if (!updatedAt || !createdAt) return false;
    const created = new Date(createdAt);
    const updated = new Date(updatedAt);
    const diffDays = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 7;
  }, [updatedAt, createdAt]);

  return (
    <article className="max-w-3xl mx-auto py-8 px-6">
      {/* Progress bar simulation */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div className="h-full bg-primary w-1/3" />
      </div>

      {/* Header */}
      <header className="mb-10">
        {/* Topic badge */}
        {phase && (
          <div className="mb-4">
            <Badge variant="secondary" className="text-xs uppercase tracking-wide">
              <Tag className="h-3 w-3 mr-1" />
              {phaseLabel}
            </Badge>
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight mb-4">
          {title || 'Untitled Essay'}
        </h1>

        {/* Deck line */}
        {deck && (
          <p className="text-xl text-muted-foreground leading-relaxed font-light mb-6">
            {deck}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground border-b border-border pb-6 mb-8">
          {author && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span className="font-medium text-foreground">{author}</span>
            </span>
          )}
          {date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(date)}
            </span>
          )}
          {readTime && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {readTime}
            </span>
          )}
          {showUpdated && updatedAt && (
            <span className="text-xs italic">
              Updated {formatDate(updatedAt)}
            </span>
          )}
        </div>

        {/* Hero image */}
        {heroImageUrl && (
          <figure className="mb-10">
            <img
              src={heroImageUrl}
              alt={title}
              className="w-full rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {heroCaption && (
              <figcaption className="text-sm text-muted-foreground mt-3 text-center italic">
                {heroCaption}
              </figcaption>
            )}
          </figure>
        )}
      </header>

      {/* Content */}
      <div 
        className={cn(
          "prose prose-lg max-w-none",
          "prose-headings:font-display prose-headings:font-semibold prose-headings:text-foreground",
          "prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4",
          "prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3",
          "prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-6",
          "prose-strong:text-foreground prose-strong:font-semibold",
          "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-6 prose-blockquote:py-2 prose-blockquote:my-8 prose-blockquote:italic prose-blockquote:text-xl prose-blockquote:text-muted-foreground",
          "prose-ul:list-disc prose-ul:list-outside prose-ul:ml-6 prose-ul:space-y-2 prose-ul:my-6",
          "prose-ol:list-decimal prose-ol:list-outside prose-ol:ml-6 prose-ol:space-y-2 prose-ol:my-6",
          "prose-li:text-muted-foreground",
          "prose-a:text-primary prose-a:underline prose-a:underline-offset-4 prose-a:hover:text-primary/80",
        )}
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(contentToHtml(content)) || '<p class="text-muted-foreground italic">Start writing to see your content here...</p>'
        }}
      />

      {/* Key Takeaways */}
      {keyTakeaways.length > 0 && (
        <div className="bg-muted/50 border border-border rounded-lg p-6 my-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">💡</span>
            <h3 className="font-semibold text-foreground">Key Takeaways</h3>
          </div>
          <ul className="space-y-3">
            {keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-muted-foreground">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
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
        <div className="border-t border-border pt-8 mt-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">{author}</p>
              <p className="text-sm text-muted-foreground">
                {authorBio || 'Author and analyst'}
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
