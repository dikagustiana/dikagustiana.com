import { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { scrollBehavior } from '@/lib/motion';

interface TocSection {
  id: string;
  title: string;
  children?: { id: string; title: string }[];
}

interface FsliOnThisPageProps {
  sections: TocSection[];
  activeSection?: string;
}

export function FsliOnThisPage({ sections, activeSection }: FsliOnThisPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'fundamentals': true,
    'issues': true,
    'examples': true,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

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

  const filteredSections = sections.filter(section => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    if (section.title.toLowerCase().includes(searchLower)) return true;
    if (section.children?.some(child => child.title.toLowerCase().includes(searchLower))) return true;
    return false;
  });

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

        {/* TOC */}
        <nav className="space-y-1 text-sm">
          {filteredSections.map((section) => (
            <div key={section.id}>
              {section.children && section.children.length > 0 ? (
                <Collapsible 
                  open={expandedGroups[section.id]} 
                  onOpenChange={() => toggleGroup(section.id)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-2 text-left text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors">
                    <span>{section.title}</span>
                    {expandedGroups[section.id] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-3 border-l border-border pl-3 space-y-1">
                      {section.children.map((child) => (
                        <button
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
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <button
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
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}