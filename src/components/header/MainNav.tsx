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

const financeWorkspaceItemsAdmin = [
  { label: "Dika's Tools", path: '/dikas-tools' },
];

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
        <NavDropdown
          label="Finance Workspace"
          items={financeWorkspaceItemsAdmin}
          width="w-48"
          basePath="/finance-workspace"
        />
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
          className={cn(
            'nav-link text-accent',
            location.pathname.startsWith('/admin') && 'nav-link-active'
          )}
        >
          Writer's Studio
        </Link>
      )}
    </nav>
  );
}
