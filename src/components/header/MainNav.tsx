import { Link, useLocation } from 'react-router-dom';
import { NavDropdown } from './NavDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  accountingItems,
  financeItems,
  greenTransitionItems,
  learningItems,
  nextBigThingItems,
  developmentFinanceItems,
} from '@/config/navConfig';

export function MainNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  return (
    <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
      <Link
        to="/"
        className={cn('nav-link', location.pathname === '/' && 'nav-link-active')}
      >
        Home
      </Link>

      {isAdmin && (
        <Link
          to="/finance-workspace"
          className={cn(
            'nav-link',
            location.pathname.startsWith('/finance-workspace') && 'nav-link-active'
          )}
        >
          Finance Workspace
        </Link>
      )}

      <NavDropdown
        label="Accounting"
        items={accountingItems}
        width="w-56"
        basePath="/accounting"
      />

      <NavDropdown
        label="Finance"
        items={financeItems}
        width="w-72"
        basePath="/finance"
      />

      <NavDropdown
        label="The Green Transition"
        items={greenTransitionItems}
        width="w-56"
        basePath="/green-transition"
      />

      <NavDropdown
        label="The Next Big Thing"
        items={nextBigThingItems}
        width="w-44"
        basePath="/the-next-big-thing"
      />

      <NavDropdown
        label="Development Finance"
        items={developmentFinanceItems}
        width="w-72"
        basePath="/development-finance"
      />

      <NavDropdown label="Learning" items={learningItems} width="w-48" />

      {isAdmin && (
        <Link
          to="/admin/dashboard"
          // No accent tint here. The accent is navy (215 60% 32%) and this
          // link sits on the dark slate header, where navy measures 1.64:1 —
          // invisible. `.nav-link` is white/80 at 9.89:1 on the header, and
          // `.nav-link-active` already marks the active state.
          className={cn(
            'nav-link',
            location.pathname.startsWith('/admin') && 'nav-link-active'
          )}
        >
          Writer's Studio
        </Link>
      )}
    </nav>
  );
}
