import { useState } from 'react';
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

interface NavSection {
  label: string;
  path?: string;
  basePath?: string;
  items?: { label: string; path: string }[];
}

const navSections: NavSection[] = [
  { label: 'Home', path: '/' },
  {
    label: 'Accounting',
    basePath: '/accounting',
    items: [
      { label: 'FSLI Detail', path: '/accounting/fsli' },
      { label: 'Consolidated Reporting', path: '/accounting/consolidated-reporting' },
      { label: 'Statutory Reporting', path: '/accounting/statutory-reporting' },
    ],
  },
  {
    label: 'Finance',
    basePath: '/finance-101',
    items: [
      { label: 'Financial Analytics', path: '/finance-101/financial-analytics' },
      { label: 'Financial Planning & Forecasting', path: '/finance-101/financial-planning-forecasting' },
      { label: 'Budgeting', path: '/finance-101/budgeting' },
      { label: 'CFA Prep', path: '/finance-101/cfa-prep' },
    ],
  },
  {
    label: 'The Green Transition',
    basePath: '/green-transition',
    items: [
      { label: 'Where We Are Now', path: '/green-transition/now' },
      { label: 'Challenges Ahead', path: '/green-transition/gaps' },
      { label: 'Pathways Forward', path: '/green-transition/future' },
    ],
  },
  {
    label: 'The Next Big Thing',
    basePath: '/the-next-big-thing',
    items: [
      { label: 'Technology', path: '/the-next-big-thing?theme=technology' },
      { label: 'Economy', path: '/the-next-big-thing?theme=economy' },
      { label: 'Society', path: '/the-next-big-thing?theme=society' },
      { label: 'Environment', path: '/the-next-big-thing?theme=environment' },
      { label: 'Governance', path: '/the-next-big-thing?theme=governance' },
    ],
  },
  {
    label: 'Learning',
    items: [
      { label: 'Critical Thinking', path: '/critical-thinking-research' },
      { label: 'Books', path: '/books-academia' },
      { label: 'IELTS', path: '/english-ielts' },
    ],
  },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

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
            className="text-primary-foreground"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 overflow-y-auto p-0">
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <SheetTitle className="text-left">Navigation</SheetTitle>
          </SheetHeader>

          <nav className="py-4 space-y-1 px-4" aria-label="Mobile navigation">
            {navSections.map((section) => {
              if (section.label === 'Home' && !isAdmin) {
                // Show Home for everyone
              }
              if (section.label === 'Finance Workspace' && !isAdmin) return null;

              return (
                <div key={section.label}>
                  {section.items ? (
                    <>
                      <button
                        onClick={() => toggleSection(section.label)}
                        aria-expanded={expandedSection === section.label}
                        className={cn(
                          'flex items-center justify-between w-full py-3 px-4 text-left hover:bg-secondary rounded-lg transition-colors',
                          isSectionActive(section) && 'text-primary font-semibold'
                        )}
                      >
                        <span className="font-medium">{section.label}</span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform',
                            expandedSection === section.label && 'rotate-180'
                          )}
                        />
                      </button>
                      {expandedSection === section.label && (
                        <div className="ml-4 pl-4 border-l border-border space-y-1 pb-2">
                          {section.items.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                'block py-2 px-4 text-sm hover:bg-secondary rounded-lg transition-colors',
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
                        'block py-3 px-4 font-medium hover:bg-secondary rounded-lg transition-colors',
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
                    'block py-3 px-4 font-medium text-accent hover:bg-secondary rounded-lg transition-colors',
                    location.pathname.startsWith('/finance-workspace') && 'bg-secondary'
                  )}
                >
                  Finance Workspace
                </Link>
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'block py-3 px-4 font-medium text-accent hover:bg-secondary rounded-lg transition-colors',
                    location.pathname.startsWith('/admin') && 'bg-secondary'
                  )}
                >
                  Writer's Studio
                </Link>
                <Link
                  to="/dikas-tools"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'block py-3 px-4 font-medium text-accent hover:bg-secondary rounded-lg transition-colors',
                    location.pathname.startsWith('/dikas-tools') && 'bg-secondary'
                  )}
                >
                  Dika's Tools
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
                <Link to="/auth" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
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
