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
  /**
   * Which edge of the label the panel lines up with. The last menu in the row
   * takes 'end': its panel is wider than its label, and lined up from the
   * left it ran past the right edge of the page.
   */
  align?: 'start' | 'end';
}

/**
 * How long the menu waits after the pointer leaves before it closes. A pointer
 * travelling from the label to an item can graze the edge of the hit area on
 * the way; re-entering within this window cancels the close.
 */
export const NAV_DROPDOWN_CLOSE_DELAY_MS = 150;

/**
 * The close of whichever menu is open, so the next one to open can close it at
 * once. Left to its delay, a menu the pointer has just left stays drawn over
 * its neighbour (later in the document, same z-index), and a pointer moving
 * into the overlap re-entered it and closed the menu it was heading for.
 */
let closeOpenMenu: (() => void) | null = null;

export function NavDropdown({ label, items, width = 'w-56', basePath, align = 'start' }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set only by a keyboard open; hover and pointer clicks never move focus.
  const focusFirstOnOpen = useRef(false);

  const isActive = basePath
    ? location.pathname.startsWith(basePath)
    : items.some((item) => {
        const itemPath = item.path.split('?')[0];
        return location.pathname.startsWith(itemPath);
      });

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const close = useCallback(() => {
    cancelClose();
    setIsOpen(false);
  }, [cancelClose]);

  const openFromKeyboard = useCallback(() => {
    cancelClose();
    focusFirstOnOpen.current = true;
    setIsOpen(true);
  }, [cancelClose]);

  // A timer left running after unmount would set state on nothing.
  useEffect(() => cancelClose, [cancelClose]);

  // One menu open at a time: opening this one closes the last without delay.
  useEffect(() => {
    if (!isOpen) return;
    if (closeOpenMenu !== close) closeOpenMenu?.();
    closeOpenMenu = close;
    return () => {
      if (closeOpenMenu === close) closeOpenMenu = null;
    };
  }, [isOpen, close]);

  const handlePointerEnter = () => {
    cancelClose();
    setIsOpen(true);
  };

  const handlePointerLeave = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setIsOpen(false);
    }, NAV_DROPDOWN_CLOSE_DELAY_MS);
  };

  // The menu buttons toggle. A click with detail 0 is a keyboard activation
  // (Enter or Space) or an assistive technology's, and that open moves focus
  // into the menu; a pointer's click counts from 1 and leaves focus alone.
  const handleToggleClick = (e: React.MouseEvent) => {
    if (isOpen) {
      close();
    } else if (e.detail === 0) {
      openFromKeyboard();
    } else {
      setIsOpen(true);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, close]);

  // Close on Escape — and RESTORE FOCUS to the trigger. Closing used to
  // strand keyboard focus on an unmounted menu item, dropping the user back
  // to the top of the tab order. Only focus that was in the menu is moved: a
  // menu the pointer opened leaves focus where it was, and Escape must not
  // pull it out of the page onto a chevron nobody focused.
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const focusInMenu = menuRef.current?.contains(document.activeElement) ?? false;
        close();
        if (focusInMenu) chevronRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  // Focus the first item when the menu opens via the keyboard, and only then:
  // this used to run on every open, so a pointer passing over the label pulled
  // keyboard focus into the menu without being asked.
  useEffect(() => {
    if (isOpen && focusFirstOnOpen.current) {
      focusFirstOnOpen.current = false;
      itemRefs.current[0]?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        openFromKeyboard();
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
    // The hover area is this wrapper, which holds both the trigger and the
    // panel, so moving from one to the other never leaves it.
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
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
            onClick={close}
          >
            {label}
          </Link>
        ) : (
          // No landing page (Learning): the label only opens the menu, and says so.
          <button
            onClick={handleToggleClick}
            aria-expanded={isOpen}
            aria-haspopup="true"
            className="hover:text-header-foreground transition-colors"
          >
            {label}
          </button>
        )}
        <button
          ref={chevronRef}
          onClick={handleToggleClick}
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
        // The 4px between trigger and panel is this wrapper's transparent
        // padding, not a margin: a margin there was outside every hit area, so
        // a pointer crossing it on the way to an item closed the menu.
        <div className={cn('absolute top-full z-50 pt-1', align === 'end' ? 'right-0' : 'left-0')}>
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              'bg-header border border-header/50 rounded-lg shadow-xl py-2',
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
                onClick={close}
                className={cn(
                  'block px-4 py-2 text-sm text-header-foreground/90 hover:bg-white/10 hover:text-header-foreground transition-colors focus:bg-white/10 focus:text-header-foreground focus:outline-none',
                  isItemActive(item.path) && 'bg-white/10 text-header-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
