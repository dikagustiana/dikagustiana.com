import { NEXT_BIG_THING_THEMES, nextBigThingThemePath } from './nextBigThingThemes';

export interface NavItem {
  label: string;
  path: string;
}

export interface NavSection {
  label: string;
  path?: string;
  basePath?: string;
  items?: NavItem[];
  /**
   * The `essays.section` behind this dropdown's items. While that section has
   * no published essay, the dropdown collapses to a plain link to `basePath`:
   * a menu of four destinations that each say "nothing published yet" is a
   * promise the site cannot keep. The landing page still lists every phase,
   * with its count. Owner question Q14; this is the stated default.
   */
  essaySection?: string;
}

export const accountingItems: NavItem[] = [
  { label: 'FSLI Detail', path: '/accounting/fsli' },
  { label: 'Consolidated Reporting', path: '/accounting/consolidated-reporting' },
  { label: 'Statutory Reporting', path: '/accounting/statutory-reporting' },
];

/**
 * Track paths must use the SLUGS FROM `finance_sections` — fundamentals,
 * strategic-finance, planning, analytics, capital-allocation. The last was
 * left out "until it has modules", but its route is not a module index: it
 * renders the 21 capital conditions (FinanceInMotion), which /finance already
 * lists as the fifth track. Added 9 October 2026 so nav and landing agree.
 * Its label is the page's name, "Capital in Motion", not the slug's (owner
 * decision D6(a), 10 October 2026); the path keeps the slug, so the address
 * does not move. These used to say
 * `/finance/planning-forecasting` and `/finance/financial-analytics`: readable
 * labels, nonexistent tracks, and the two menu items rendered empty indexes
 * while the route sweep stayed green — it opened canonical URLs directly and
 * never clicked the nav. tests/unit/navConfig.test.ts now pins every path.
 */
export const financeItems: NavItem[] = [
  { label: 'Fundamentals', path: '/finance/fundamentals' },
  { label: 'Strategic Finance', path: '/finance/strategic-finance' },
  { label: 'Planning & Forecasting', path: '/finance/planning' },
  { label: 'Financial Analytics', path: '/finance/analytics' },
  { label: 'Capital in Motion', path: '/finance/capital-allocation' },
  { label: 'Finance in Action', path: '/finance/finance-in-action' },
];

export const greenTransitionItems: NavItem[] = [
  { label: 'Where We Are Now', path: '/green-transition/now' },
  { label: 'Challenges Ahead', path: '/green-transition/gaps' },
  { label: 'Pathways Forward', path: '/green-transition/future' },
  { label: 'Climate Finance', path: '/green-transition/climate-finance' },
];

export const developmentFinanceItems: NavItem[] = [
  { label: 'Sovereign Wealth Funds', path: '/development-finance/sovereign-wealth-funds' },
  { label: 'Multilateral Development Banks', path: '/development-finance/multilateral-development-banks' },
  { label: 'Blended Finance', path: '/development-finance/blended-finance' },
  { label: 'Indonesia\'s Capital Architecture', path: '/development-finance/indonesia-capital-architecture' },
];

export const learningItems: NavItem[] = [
  { label: 'Critical Thinking', path: '/critical-thinking-research' },
  { label: 'Books', path: '/books-academia' },
  { label: 'IELTS', path: '/english-ielts' },
];

/**
 * Derived from NEXT_BIG_THING_THEMES, never written out. The section page's
 * sub-navigation tabs are this same array, not a copy of it.
 */
export const nextBigThingItems: NavItem[] = NEXT_BIG_THING_THEMES.map(({ id, label }) => ({
  label,
  path: nextBigThingThemePath(id),
}));

export const navSections: NavSection[] = [
  /**
   * Home carries the revision of judgment under the glimpse. It used to be
   * About's, the second door in this row; the owner removed About on
   * 10 October 2026 (decision D4(a)) and what it carried moved to the page
   * every reader already lands on, so there is no About door.
   */
  { label: 'Home', path: '/' },
  {
    label: 'Accounting',
    basePath: '/accounting',
    items: accountingItems,
  },
  {
    label: 'Finance',
    basePath: '/finance',
    items: financeItems,
  },
  {
    label: 'Green Transition',
    basePath: '/green-transition',
    items: greenTransitionItems,
    essaySection: 'green-transition',
  },
  {
    label: 'The Next Big Thing',
    basePath: '/the-next-big-thing',
    items: nextBigThingItems,
  },
  {
    label: 'Development Finance',
    basePath: '/development-finance',
    items: developmentFinanceItems,
    essaySection: 'development-finance',
  },
  {
    label: 'Learning',
    items: learningItems,
  },
];
