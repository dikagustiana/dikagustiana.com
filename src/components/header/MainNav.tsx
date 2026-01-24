import { Link, useLocation } from 'react-router-dom';
import { NavDropdown } from './NavDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const accountingItems = [
  { label: 'FSLI Detail', path: '/accounting/fsli' },
  { label: 'Consolidated Reporting', path: '/accounting/consolidated-reporting' },
  { label: 'Statutory Reporting', path: '/accounting/statutory-reporting' },
];

const financeItems = [
  { label: 'Financial Analytics', path: '/finance-101/financial-analytics' },
  { label: 'Financial Planning & Forecasting', path: '/finance-101/financial-planning-forecasting' },
  { label: 'Budgeting', path: '/finance-101/budgeting' },
  { label: 'CFA Prep', path: '/finance-101/cfa-prep' },
];

const greenTransitionItems = [
  { label: 'Where We Are Now', path: '/green-transition/now' },
  { label: 'Challenges Ahead', path: '/green-transition/gaps' },
  { label: 'Pathways Forward', path: '/green-transition/future' },
];

const masyarakatBaruItems = [
  { label: 'Critical Thinking and Research', path: '/critical-thinking-research' },
  { label: 'Books and Academia', path: '/books-academia' },
  { label: 'English - IELTS', path: '/english-ielts' },
];

const financeWorkspaceItemsAdmin = [
  { label: "Dika's Tools", path: '/dikas-tools' },
];

export function MainNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="hidden lg:flex items-center gap-1">
      <Link 
        to="/" 
        className={cn("nav-link", isActive('/') && "nav-link-active")}
      >
        Home
      </Link>

      {isAdmin ? (
        <NavDropdown 
          label="Finance Workspace" 
          items={financeWorkspaceItemsAdmin}
          width="w-48"
          basePath="/finance-workspace"
        />
      ) : (
        <Link 
          to="/finance-workspace" 
          className={cn("nav-link", isActive('/finance-workspace') && "nav-link-active")}
        >
          Finance Workspace
        </Link>
      )}

      <NavDropdown 
        label="Masyarakat Baru" 
        items={masyarakatBaruItems}
        width="w-64"
      />

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
        basePath="/finance-101"
      />

      <NavDropdown 
        label="The Green Transition" 
        items={greenTransitionItems}
        width="w-56"
        basePath="/green-transition"
      />

      <Link 
        to="/the-next-big-thing" 
        className={cn("nav-link", isActive('/the-next-big-thing') && "nav-link-active")}
      >
        The Next Big Thing
      </Link>
    </nav>
  );
}
