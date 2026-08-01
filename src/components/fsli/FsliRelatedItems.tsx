import { Link, useParams } from 'react-router-dom';
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
            {/* The list excludes the current item, so an "active" style can
                never render here — the amber-highlight branch this used to
                carry was dead code in a palette the site does not use. */}
            {relatedItems.map((item) => (
              <Link
                key={item.slug}
                to={`/accounting/fsli/${item.slug}`}
                className="block py-2 px-3 text-sm rounded-md transition-colors border-l-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
