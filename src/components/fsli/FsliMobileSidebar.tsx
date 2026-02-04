import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFsliPages } from '@/hooks/queries/useFsliPages';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function FsliMobileSidebar() {
  const { slug } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const { data: fsliPages = [] } = useFsliPages();

  const currentItem = fsliPages.find(item => item.slug === slug);
  const currentAssets = fsliPages.filter(item => item.category === 'current_assets');
  const nonCurrentAssets = fsliPages.filter(item => item.category === 'non_current_assets');

  return (
    <div className="lg:hidden mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-card rounded-lg border border-border">
          <span className="font-medium text-sm">
            {currentItem?.title || 'Select FSLI Item'}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 bg-card rounded-lg border border-border max-h-64 overflow-y-auto">
          <div className="p-2 space-y-2">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
                Current Assets
              </h4>
              {currentAssets.map((item) => (
                <Link
                  key={item.slug}
                  to={`/accounting/fsli/${item.slug}`}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block py-2 px-3 text-sm rounded transition-colors",
                    slug === item.slug 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-secondary"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
                Non-Current Assets
              </h4>
              {nonCurrentAssets.map((item) => (
                <Link
                  key={item.slug}
                  to={`/accounting/fsli/${item.slug}`}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block py-2 px-3 text-sm rounded transition-colors",
                    slug === item.slug 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-secondary"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
