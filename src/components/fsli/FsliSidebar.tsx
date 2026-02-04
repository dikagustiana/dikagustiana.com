import { Link, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFsliPages } from '@/hooks/queries/useFsliPages';

export function FsliSidebar() {
  const { slug } = useParams();
  const { data: fsliPages = [] } = useFsliPages();

  const currentAssets = fsliPages.filter(item => item.category === 'current_assets');
  const nonCurrentAssets = fsliPages.filter(item => item.category === 'non_current_assets');

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="fixed w-64 h-[calc(100vh-8rem)] overflow-y-auto pr-4">
        <h3 className="font-semibold text-foreground mb-4">Related Items</h3>
        
        <div className="space-y-4">
          {/* Current Assets */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Current Assets
            </h4>
            <ul className="space-y-1">
              {currentAssets.map((item) => (
                <li key={item.slug}>
                  <Link
                    to={`/accounting/fsli/${item.slug}`}
                    className={cn(
                      "block py-2 px-3 text-sm rounded-lg transition-colors border-l-2",
                      slug === item.slug 
                        ? "bg-secondary text-foreground border-primary font-medium" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent"
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Non-Current Assets */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Non-Current Assets
            </h4>
            <ul className="space-y-1">
              {nonCurrentAssets.map((item) => (
                <li key={item.slug}>
                  <Link
                    to={`/accounting/fsli/${item.slug}`}
                    className={cn(
                      "block py-2 px-3 text-sm rounded-lg transition-colors border-l-2",
                      slug === item.slug 
                        ? "bg-secondary text-foreground border-primary font-medium" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent"
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}
