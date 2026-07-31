import { Link, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFsliPages } from '@/hooks/queries/useFsliPages';

export function FsliRelatedItems() {
  const { slug } = useParams();
  const { data: fsliPages = [] } = useFsliPages();

  // Show a curated list of related items - first 8 items that aren't the current one
  const relatedItems = fsliPages
    .filter(item => item.slug !== slug)
    .slice(0, 8);

  return (
    <aside className="w-56 flex-shrink-0 hidden lg:block">
      <div className="sticky top-24">
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4 text-sm">
            Related line items
          </h3>
          
          <nav className="space-y-1">
            {relatedItems.map((item) => (
              <Link
                key={item.slug}
                to={`/accounting/fsli/${item.slug}`}
                className={cn(
                  "block py-2 px-3 text-sm rounded-md transition-colors border-l-2",
                  slug === item.slug 
                    ? "bg-amber-50 text-amber-700 border-amber-500 font-medium dark:bg-amber-950/30 dark:text-amber-400" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
