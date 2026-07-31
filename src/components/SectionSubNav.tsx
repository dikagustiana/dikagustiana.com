import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SubNavTab {
  label: string;
  path: string;
}

interface SectionSubNavProps {
  tabs: SubNavTab[];
  backLink?: { label: string; path: string };
  className?: string;
}

export function SectionSubNav({ tabs, backLink, className }: SectionSubNavProps) {
  const location = useLocation();

  const isTabActive = (tabPath: string) => {
    const [pathname, search] = tabPath.split('?');
    if (search) {
      return location.pathname === pathname && location.search === `?${search}`;
    }
    return location.pathname === pathname || location.pathname.startsWith(pathname + '/');
  };

  return (
    <div className={cn('border-b border-border bg-background/95 backdrop-blur sticky top-16 z-40', className)}>
      <div className="container max-w-4xl">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {backLink && (
            <>
              <Link
                to={backLink.path}
                className="flex-shrink-0 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-3 pr-3"
                aria-label={backLink.label}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{backLink.label}</span>
              </Link>
              <div className="w-px h-6 bg-border flex-shrink-0" />
            </>
          )}
          <nav className="flex items-center gap-1" aria-label="Section navigation">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'flex-shrink-0 px-3 py-3 text-sm font-medium border-b-2 transition-colors',
                  isTabActive(tab.path)
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
