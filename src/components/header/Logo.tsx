import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * The header mark: icon only, and it is a LINK — clicking the logo goes
 * home. (The original defect was a <button> here that opened a dropdown
 * instead of navigating; that must not return.)
 *
 * Sign In lives beside the logo, revealed on hover AND on keyboard focus —
 * not as a top-level nav item advertising internal tooling to readers.
 * `focus-visible:opacity-100` is load-bearing: a hover-only control is
 * invisible to keyboard users, the exact defect class fixed on the
 * heading-copy buttons. This is PRESENTATION, not security — /auth is not
 * hidden, RLS and the admin role are the boundary. Desktop-only pattern:
 * touch screens have no hover, and the mobile drawer carries its own
 * Sign In control.
 */
export function Logo() {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="group relative flex items-center gap-2" ref={menuRef}>
      <Link
        to="/"
        aria-label="Home"
        className="flex min-h-[44px] min-w-[44px] items-center hover:opacity-80 transition-opacity"
      >
        <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
      </Link>

      {!user && (
        <Link
          to="/auth"
          className="nav-link hidden lg:flex min-h-[44px] items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          Sign In
        </Link>
      )}

      {user && (
        <div className="hidden lg:flex items-center gap-2">
          <Badge
            className={`text-xs font-bold uppercase tracking-wide ${
              isAdmin ? 'bg-accent text-accent-foreground' : 'bg-muted/50 text-muted-foreground'
            }`}
          >
            {isAdmin ? 'Admin' : 'Viewer'}
          </Badge>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="nav-link min-h-[44px] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            Account
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-2">
              <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border truncate">
                {user.email}
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 text-sm hover:bg-secondary"
                onClick={() => {
                  signOut();
                  setOpen(false);
                }}
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
