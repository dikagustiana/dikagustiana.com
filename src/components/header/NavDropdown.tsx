import { useState, useRef, useEffect, useCallback } from 'react';
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
  /** When set, clicking the label navigates here. */
  basePath?: string;
}

export function NavDropdown({ label, items, width = 'w-56', basePath }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const isActive = basePath
    ? location.pathname.startsWith(basePath)
    : items.some((item) => {
        const itemPath = item.path.split('?')[0];
        return location.pathname.startsWith(itemPath);
      });

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape — and RESTORE FOCUS to the trigger. Closing used to
  // strand keyboard focus on an unmounted menu item, dropping the user back
  // to the top of the tab order.
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
        chevronRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  // Focus first item when menu opens via keyboard
  useEffect(() => {
    if (isOpen && itemRefs.current[0]) {
      itemRefs.current[0].focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const current = document.activeElement as HTMLElement;
        const idx = itemRefs.current.indexOf(current as HTMLAnchorElement);
        const next = itemRefs.current[idx + 1];
        next?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        const current = document.activeElement as HTMLElement;
        const idx = itemRefs.current.indexOf(current as HTMLAnchorElement);
        if (idx <= 0) {
          close();
        } else {
          itemRefs.current[idx - 1]?.focus();
        }
      }
    }
  };

  const isItemActive = (itemPath: string) => {
    const [pathname, search] = itemPath.split('?');
    if (search) {
      return location.pathname === pathname && location.search === `?${search}`;
    }
    return location.pathname === pathname || location.pathname.startsWith(pathname + '/');
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onKeyDown={handleKeyDown}
    >
      {/* Split trigger: clickable label + dropdown chevron */}
      <div
        ref={triggerRef}
        className={cn(
          'nav-link flex items-center gap-0.5',
          isActive && 'nav-link-active'
        )}
      >
        {basePath ? (
          <Link
            to={basePath}
            className="hover:text-header-foreground transition-colors"
            onClick={() => setIsOpen(false)}
          >
            {label}
          </Link>
        ) : (
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="hover:text-header-foreground transition-colors"
          >
            {label}
          </button>
        )}
        <button
          ref={chevronRef}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={`${label} submenu`}
          // ≥24px in both axes (WCAG 2.5.8) with full header height for the
          // pointer — the old p-0.5 around a 14px icon was an ~18px target.
          className="flex min-h-[44px] min-w-[28px] items-center justify-center hover:text-header-foreground transition-colors"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            'absolute top-full left-0 mt-1 bg-header border border-header/50 rounded-lg shadow-xl z-50 py-2',
            width
          )}
        >
          {items.map((item, i) => (
            <Link
              key={item.path}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              to={item.path}
              role="menuitem"
              tabIndex={-1}
              onClick={() => setIsOpen(false)}
              className={cn(
                'block px-4 py-2 text-sm text-header-foreground/90 hover:bg-white/10 hover:text-header-foreground transition-colors focus:bg-white/10 focus:text-header-foreground focus:outline-none',
                isItemActive(item.path) && 'bg-white/10 text-header-foreground'
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
