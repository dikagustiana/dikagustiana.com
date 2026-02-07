import { useMemo } from 'react';
import { User, Calendar, Clock, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ArticleHeaderProps {
  title: string;
  deck?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  readTime?: string | null;
  topic?: string | null;
  heroImage?: string | null;
  heroCaption?: string | null;
  className?: string;
}

export function ArticleHeader({
  title,
  deck,
  author,
  publishedAt,
  updatedAt,
  createdAt,
  readTime,
  topic,
  heroImage,
  heroCaption,
  className,
}: ArticleHeaderProps) {
  // Check if we should show "Updated on" (7+ days after creation)
  const showUpdated = useMemo(() => {
    if (!updatedAt || !createdAt) return false;
    const created = new Date(createdAt);
    const updated = new Date(updatedAt);
    const diffDays = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 7;
  }, [updatedAt, createdAt]);
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <header className={cn("mb-10", className)}>
      {/* Topic badge */}
      {topic && (
        <div className="mb-4">
          <Badge variant="secondary" className="text-xs uppercase tracking-wide">
            <Tag className="h-3 w-3 mr-1" />
            {topic}
          </Badge>
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground leading-tight mb-4">
        {title}
      </h1>

      {/* Deck line (one sentence thesis) */}
      {deck && (
        <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-light mb-6">
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
        {publishedAt && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatDate(publishedAt)}
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
      {heroImage && (
        <figure className="mb-10">
          <img
            src={heroImage}
            alt={title}
            loading="lazy"
            className="w-full rounded-lg"
          />
          {heroCaption && (
            <figcaption className="text-sm text-muted-foreground mt-3 text-center italic">
              {heroCaption}
            </figcaption>
          )}
        </figure>
      )}
    </header>
  );
}
