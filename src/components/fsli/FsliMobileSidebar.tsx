import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFsliPages } from '@/hooks/queries/useFsliPages';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/** fsli_pages.category, in statement order, with the heading each group shows. */
const CATEGORY_GROUPS = [
  { category: 'current_assets', label: 'Current Assets' },
  { category: 'non_current_assets', label: 'Non-Current Assets' },
  { category: 'current_liabilities', label: 'Current Liabilities' },
  { category: 'non_current_liabilities', label: 'Non-Current Liabilities' },
  { category: 'equity', label: 'Equity' },
  { category: 'profit_or_loss', label: 'Profit or Loss' },
] as const;

export function FsliMobileSidebar() {
  const { slug } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const { data: fsliPages = [] } = useFsliPages();

  const currentItem = fsliPages.find(item => item.slug === slug);
  // A group with no line items shows no heading.
  const groups = CATEGORY_GROUPS
    .map((group) => ({ ...group, items: fsliPages.filter(item => item.category === group.category) }))
    .filter((group) => group.items.length > 0);

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
            {groups.map((group) => (
              <div key={group.category}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
                  {group.label}
                </h4>
                {group.items.map((item) => (
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
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
