import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  // Wraps instead of overflowing. A long final crumb (essay and book titles run
  // long) pushed the page past 375px on five routes — the breadcrumb trail was
  // the single most common cause of horizontal scroll on mobile. `min-w-0` lets
  // the label shrink; `break-words` lets it wrap rather than force the row wide.
  return (
    <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground min-w-0">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isFirst = index === 0;

        return (
          <div key={index} className="flex items-center gap-2 min-w-0">
            {index > 0 && <ChevronRight className="w-4 h-4 shrink-0" />}
            {isLast ? (
              <span className="text-foreground font-medium min-w-0 break-words">{item.label}</span>
            ) : item.path ? (
              <Link 
                to={item.path} 
                className="hover:text-foreground transition-colors flex items-center gap-1 min-w-0 break-words"
              >
                {isFirst && <Home className="w-4 h-4 shrink-0" />}
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
