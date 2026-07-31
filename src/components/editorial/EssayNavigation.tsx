import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EssayNeighbor {
  slug: string;
  title: string;
}

interface EssayNavigationProps {
  backLink: { label: string; path: string };
  previous?: EssayNeighbor | null;
  next?: EssayNeighbor | null;
  getEssayUrl: (slug: string) => string;
  className?: string;
}

export function EssayNavigation({
  backLink,
  previous,
  next,
  getEssayUrl,
  className,
}: EssayNavigationProps) {
  const hasPrevOrNext = previous || next;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Previous / Next navigation */}
      {hasPrevOrNext && (
        <nav
          className="border-t border-border pt-8 mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4"
          aria-label="Essay navigation"
        >
          {previous ? (
            <Link
              to={getEssayUrl(previous.slug)}
              className="group flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Previous</div>
                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {previous.title}
                </div>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {next ? (
            <Link
              to={getEssayUrl(next.slug)}
              className="group flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors text-right sm:flex-row-reverse"
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Next</div>
                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {next.title}
                </div>
              </div>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      )}

      {/* Back to list */}
      <div className="text-center pb-4">
        <Link
          to={backLink.path}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLink.label}
        </Link>
      </div>
    </div>
  );
}
