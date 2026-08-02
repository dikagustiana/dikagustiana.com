import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LinkableHeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface LinkableHeadingProps {
  id: string;
  level: LinkableHeadingLevel;
  children: React.ReactNode;
  className?: string;
  /** Alignment set by the writer (TextAlign extension); default is left. */
  textAlign?: string | null;
}

/**
 * A body heading with a copy-link affordance. Typography — family, size,
 * weight, rhythm — comes from the shared editorial type system in
 * src/index.css (.prose-editorial h1…h6), the same rules the writing canvas
 * reads, so no size is declared here.
 */
export function LinkableHeading({ id, level, children, className, textAlign }: LinkableHeadingProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const Tag = level;

  return (
    <Tag
      id={id}
      className={cn('group scroll-mt-20', className)}
      style={textAlign && textAlign !== 'left' ? { textAlign: textAlign as 'center' | 'right' | 'justify' } : undefined}
    >
      <span>{children}</span>
      <button
        onClick={handleCopyLink}
        className="ml-2 inline-flex p-1.5 rounded align-middle opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
        aria-label="Copy link to heading"
      >
        {copied ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <Link2 className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </Tag>
  );
}
