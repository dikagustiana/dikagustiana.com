import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavDropdownItem {
  label: string;
  path: string;
}

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
  width?: string;
  basePath?: string;
}

export function NavDropdown({ label, items, width = 'w-56', basePath }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = basePath ? location.pathname.startsWith(basePath) : 
    items.some(item => location.pathname.startsWith(item.path));

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button 
        className={cn(
          "nav-link flex items-center gap-1",
          isActive && "nav-link-active"
        )}
      >
        {label}
        <ChevronDown 
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {isOpen && (
        <div 
          className={cn(
            "absolute top-full left-0 mt-1 bg-primary border border-border rounded-lg shadow-xl z-50 py-2",
            width
          )}
        >
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "block px-4 py-2 text-sm text-primary-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors",
                location.pathname === item.path && "bg-secondary text-secondary-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
