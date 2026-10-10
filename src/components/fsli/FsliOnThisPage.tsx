import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { scrollBehavior } from '@/lib/motion';
import type { FsliTocEntry } from '@/lib/fsliToc';

interface FsliOnThisPageProps {
  /**
   * The essay's own h2s, each with its h3s (buildFsliToc). It used to be a
   * fixed Fundamentals / Issues / Examples outline whose prose was never
   * written; now there is nothing to list until the page has an essay.
   */
  sections: FsliTocEntry[];
  activeSection?: string;
}

export function FsliOnThisPage({ sections, activeSection }: FsliOnThisPageProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        // Jump, don't glide, for readers who asked for reduced motion.
        behavior: scrollBehavior(),
      });
    }
  };

  // An h2 whose own title matches keeps all its h3s; otherwise it stays only
  // as the parent of the h3s that match, so a hit is never shown out of place.
  const filteredSections = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    if (!searchLower) return sections;
    const matches = (title: string) => title.toLowerCase().includes(searchLower);
    return sections.flatMap((section) => {
      if (matches(section.title)) return [section];
      const children = section.children.filter((child) => matches(child.title));
      return children.length > 0 ? [{ ...section, children }] : [];
    });
  }, [sections, searchTerm]);

  // No essay, or an essay without h2/h3: nothing to find, so no box to find
  // it in.
  if (sections.length === 0) return null;

  return (
    <aside className="w-56 flex-shrink-0 hidden xl:block">
      <div className="sticky top-24">
        <h3 className="font-semibold text-foreground mb-4 text-sm">On this page</h3>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Find in page..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* TOC — internal overflow, so a long essay scrolls inside the rail
            instead of running below the fold. */}
        <nav aria-label="On this page" className="space-y-1 text-sm max-h-[calc(100vh-14rem)] overflow-y-auto">
          {filteredSections.map((section) => (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "block w-full text-left py-2 px-2 rounded-md transition-colors",
                  activeSection === section.id
                    ? "text-primary font-medium bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {section.title}
              </button>
              {section.children.length > 0 && (
                <div className="ml-3 border-l border-border pl-3 space-y-1">
                  {section.children.map((child) => (
                    <button
                      type="button"
                      key={child.id}
                      onClick={() => scrollToSection(child.id)}
                      className={cn(
                        "block w-full text-left py-1.5 px-2 rounded-md transition-colors",
                        activeSection === child.id
                          ? "text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {child.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
