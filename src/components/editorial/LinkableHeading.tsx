import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkableHeadingProps {
  id: string;
  level: 'h2' | 'h3';
  children: React.ReactNode;
  className?: string;
}

export function LinkableHeading({ id, level, children, className }: LinkableHeadingProps) {
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
  const baseStyles = level === 'h2' 
    ? 'text-xl md:text-2xl font-display font-semibold text-foreground mt-10 mb-4'
    : 'text-lg md:text-xl font-semibold text-foreground mt-8 mb-3';

  return (
    <Tag 
      id={id} 
      className={cn(
        baseStyles,
        "group flex items-center gap-2 scroll-mt-20",
        className
      )}
    >
      <span>{children}</span>
      <button
        onClick={handleCopyLink}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-muted"
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
