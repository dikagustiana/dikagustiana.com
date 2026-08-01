import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { navSections, type NavSection } from '@/config/navConfig';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close sheet on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  const toggleSection = (label: string) => {
    setExpandedSection(expandedSection === label ? null : label);
  };

  const isSectionActive = (section: NavSection) => {
    if (section.path) return location.pathname === section.path;
    if (section.basePath) return location.pathname.startsWith(section.basePath);
    return section.items?.some((item) => {
      const itemPath = item.path.split('?')[0];
      return location.pathname.startsWith(itemPath);
    });
  };

  const isItemActive = (itemPath: string) => {
    const [pathname, search] = itemPath.split('?');
    if (search) {
      return location.pathname === pathname && location.search === `?${search}`;
    }
    return location.pathname === pathname || location.pathname.startsWith(pathname + '/');
  };

  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            /* 44x44 minimum touch target — the icon button default is 40px. */
            className="text-primary-foreground min-h-[44px] min-w-[44px]"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-80 overflow-y-auto p-0"
        >
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <SheetTitle className="text-left">Navigation</SheetTitle>
          </SheetHeader>

          <nav className="py-4 space-y-1 px-4" aria-label="Mobile navigation">
            {navSections.map((section) => {
              if (section.label === 'Finance Workspace' && !isAdmin) return null;

              return (
                <div key={section.label}>
                  {section.items ? (
                    <>
                      {/* Section header: clickable label + expand toggle */}
                      <div
                        className={cn(
                          'flex items-center w-full rounded-lg transition-colors',
                          isSectionActive(section) && 'text-primary font-semibold'
                        )}
                      >
                        {/* Clickable section label — navigates to landing page */}
                        {section.basePath ? (
                          <Link
                            to={section.basePath}
                            onClick={() => setIsOpen(false)}
                            className="flex flex-1 min-h-[44px] items-center py-3 px-4 text-left font-medium hover:bg-secondary rounded-l-lg transition-colors"
                          >
                            {section.label}
                          </Link>
                        ) : (
                          <span className="flex-1 py-3 px-4 text-left font-medium">
                            {section.label}
                          </span>
                        )}
                        {/* Expand/collapse button */}
                        <button
                          onClick={() => toggleSection(section.label)}
                          aria-expanded={expandedSection === section.label}
                          aria-label={`Expand ${section.label} submenu`}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center p-3 hover:bg-secondary rounded-r-lg transition-colors"
                        >
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform',
                              expandedSection === section.label && 'rotate-180'
                            )}
                          />
                        </button>
                      </div>
                      {expandedSection === section.label && (
                        <div className="ml-4 pl-4 border-l border-border space-y-1 pb-2">
                          {section.items.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                'flex min-h-[44px] items-center py-2 px-4 text-sm hover:bg-secondary rounded-lg transition-colors',
                                isItemActive(item.path) && 'bg-secondary text-primary font-medium'
                              )}
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={section.path!}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex min-h-[44px] items-center py-3 px-4 font-medium hover:bg-secondary rounded-lg transition-colors',
                        isSectionActive(section) && 'bg-secondary text-primary'
                      )}
                    >
                      {section.label}
                    </Link>
                  )}
                </div>
              );
            })}

            {/* Admin Links */}
            {isAdmin && (
              <div className="pt-4 border-t border-border space-y-1">
                <Link
                  to="/finance-workspace"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex min-h-[44px] items-center py-3 px-4 font-medium text-accent hover:bg-secondary rounded-lg transition-colors',
                    location.pathname.startsWith('/finance-workspace') && 'bg-secondary'
                  )}
                >
                  Finance Workspace
                </Link>
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex min-h-[44px] items-center py-3 px-4 font-medium text-accent hover:bg-secondary rounded-lg transition-colors',
                    location.pathname.startsWith('/admin') && 'bg-secondary'
                  )}
                >
                  Writer's Studio
                </Link>
              </div>
            )}

            {/* Auth Section */}
            <div className="pt-4 border-t border-border">
              {user ? (
                <div className="space-y-2">
                  <div className="px-4 py-2 text-sm text-muted-foreground">{user.email}</div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      signOut();
                      setIsOpen(false);
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Link to="/auth" onClick={() => setIsOpen(false)} className="block">
                  <Button variant="ghost" className="w-full min-h-[44px] justify-start">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
