import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function Logo() {
  const { user, isAdmin, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      className="relative flex items-center gap-3"
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex min-h-[44px] items-center gap-3 group cursor-pointer"
      >
        <img 
          src="/logo.png" 
          alt="Dika Gustiana"
          className="h-8 w-8 object-contain"
        />
        <span className="hidden sm:block text-lg font-semibold text-header-foreground group-hover:opacity-80 transition-opacity">
          Friendly learning buddy
        </span>
      </button>

      {user && (
        <Badge 
          className={`ml-2 text-xs font-bold uppercase tracking-wide ${isAdmin ? 'bg-accent text-accent-foreground' : 'bg-muted/50 text-muted-foreground'}`}
        >
          {isAdmin ? 'Admin' : 'Viewer'}
        </Badge>
      )}

      {/* Auth Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-2">
          {user ? (
            <>
              <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
                {user.email}
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start px-4 py-2 text-sm hover:bg-secondary"
                onClick={() => {
                  signOut();
                  setShowDropdown(false);
                }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link 
              to="/auth" 
              onClick={() => setShowDropdown(false)}
              className="block"
            >
              <Button 
                variant="ghost" 
                className="w-full justify-start px-4 py-2 text-sm hover:bg-secondary"
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
