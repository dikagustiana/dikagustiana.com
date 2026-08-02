import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Auth on the right of the header, where account controls belong. This used
 * to hide behind the logo as a dropdown, which cost the logo its home link.
 * Desktop only — the mobile sheet carries its own auth section.
 */
export function AuthControl() {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <Link to="/auth" className="nav-link hidden lg:flex min-h-[44px] items-center">
        Sign In
      </Link>
    );
  }

  return (
    <div className="relative hidden lg:flex items-center gap-2" ref={ref}>
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
        className="nav-link min-h-[44px]"
      >
        Account
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-2">
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
  );
}
