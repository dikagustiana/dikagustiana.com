import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavSection {
  label: string;
  path?: string;
  items?: { label: string; path: string }[];
}

const navSections: NavSection[] = [
  { label: 'Home', path: '/' },
  { label: 'Finance Workspace', path: '/finance-workspace' },
  { 
    label: 'Accounting',
    items: [
      { label: 'FSLI Detail', path: '/accounting/fsli' },
      { label: 'Consolidated Reporting', path: '/accounting/consolidated-reporting' },
      { label: 'Statutory Reporting', path: '/accounting/statutory-reporting' },
    ]
  },
  { 
    label: 'Finance',
    items: [
      { label: 'Financial Analytics', path: '/finance-101/financial-analytics' },
      { label: 'Financial Planning & Forecasting', path: '/finance-101/financial-planning-forecasting' },
      { label: 'Budgeting', path: '/finance-101/budgeting' },
      { label: 'CFA Prep', path: '/finance-101/cfa-prep' },
    ]
  },
  { 
    label: 'The Green Transition',
    items: [
      { label: 'Where We Are Now', path: '/green-transition/now' },
      { label: 'Challenges Ahead', path: '/green-transition/gaps' },
      { label: 'Pathways Forward', path: '/green-transition/future' },
    ]
  },
  { label: 'The Next Big Thing', path: '/the-next-big-thing' },
  // Flattened from "Masyarakat Baru" - direct section access
  { label: 'Critical Thinking', path: '/critical-thinking-research' },
  { label: 'Books', path: '/books-academia' },
  { label: 'IELTS', path: '/english-ielts' },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  const toggleSection = (label: string) => {
    setExpandedSection(expandedSection === label ? null : label);
  };

  return (
    <div className="lg:hidden">
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="text-primary-foreground"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-background border-b border-border shadow-lg z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="container py-4 space-y-2">
            {navSections.map((section) => (
              <div key={section.label}>
                {section.items ? (
                  <>
                    <button
                      onClick={() => toggleSection(section.label)}
                      className="flex items-center justify-between w-full py-3 px-4 text-left hover:bg-secondary rounded-lg"
                    >
                      <span className="font-medium">{section.label}</span>
                      <ChevronDown 
                        className={cn(
                          "h-4 w-4 transition-transform",
                          expandedSection === section.label && "rotate-180"
                        )} 
                      />
                    </button>
                    {expandedSection === section.label && (
                      <div className="ml-4 pl-4 border-l border-border space-y-1">
                        {section.items.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "block py-2 px-4 text-sm hover:bg-secondary rounded-lg",
                              location.pathname === item.path && "bg-secondary text-primary"
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
                      "block py-3 px-4 font-medium hover:bg-secondary rounded-lg",
                      location.pathname === section.path && "bg-secondary text-primary"
                    )}
                  >
                    {section.label}
                  </Link>
                )}
              </div>
            ))}

            {/* Admin Links */}
            {isAdmin && (
              <div className="pt-4 border-t border-border space-y-1">
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="block py-3 px-4 font-medium text-accent hover:bg-secondary rounded-lg"
                >
                  Writer's Studio
                </Link>
                <Link
                  to="/dikas-tools"
                  onClick={() => setIsOpen(false)}
                  className="block py-3 px-4 font-medium text-accent hover:bg-secondary rounded-lg"
                >
                  Dika's Tools
                </Link>
              </div>
            )}

            {/* Auth Section */}
            <div className="pt-4 border-t border-border">
              {user ? (
                <div className="space-y-2">
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    {user.email}
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => { signOut(); setIsOpen(false); }}
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
          </div>
        </div>
      )}
    </div>
  );
}
