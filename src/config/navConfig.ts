import { NEXT_BIG_THING_THEMES, nextBigThingThemePath } from './nextBigThingThemes';
import { FOUNDATIONS_LABEL, FOUNDATIONS_PATH } from './foundationsOfKnowing';

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

/**
 * Critical Thinking left this menu on 2026-10-24: renamed Foundations of
 * Knowing, it is a door of its own, second in the row (docs/prd/foundations-of-knowing).
 */
export const learningItems: NavItem[] = [
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
   * There is no About door. About was the second door in this row; the owner
   * removed it on 10 October 2026 (decision D4(a)), moved what it carried to
   * Home, and removed that from Home on 11 October 2026.
   */
  { label: 'Home', path: '/' },
  /**
   * Foundations of Knowing sits right of Home, before the disciplines: the
   * section argues that the foundations come first. A plain link — the ten
   * parts are on its page. basePath only, so every page under it marks it
   * active, in the drawer as on the row.
   */
  { label: FOUNDATIONS_LABEL, basePath: FOUNDATIONS_PATH },
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
    // The section has no landing page (item 12): its link opens the first phase; basePath still marks it active.
    path: '/green-transition/now',
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
    label: 'Learning',
    items: learningItems,
  },
];
