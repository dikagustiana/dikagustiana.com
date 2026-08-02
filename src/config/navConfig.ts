export interface NavItem {
  label: string;
  path: string;
}

export interface NavSection {
  label: string;
  path?: string;
  basePath?: string;
  items?: NavItem[];
}

export const accountingItems: NavItem[] = [
  { label: 'FSLI Detail', path: '/accounting/fsli' },
  { label: 'Consolidated Reporting', path: '/accounting/consolidated-reporting' },
  { label: 'Statutory Reporting', path: '/accounting/statutory-reporting' },
];

/**
 * Track paths must use the SLUGS FROM `finance_sections` — fundamentals,
 * strategic-finance, planning, analytics (+ capital-allocation, deliberately
 * absent below until it has modules). These used to say
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

export const nextBigThingItems: NavItem[] = [
  { label: 'Technology', path: '/the-next-big-thing?theme=technology' },
  { label: 'Economy', path: '/the-next-big-thing?theme=economy' },
  { label: 'Society', path: '/the-next-big-thing?theme=society' },
  { label: 'Environment', path: '/the-next-big-thing?theme=environment' },
  { label: 'Governance', path: '/the-next-big-thing?theme=governance' },
];

export const navSections: NavSection[] = [
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
    label: 'The Green Transition',
    basePath: '/green-transition',
    items: greenTransitionItems,
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
  },
  {
    label: 'Learning',
    items: learningItems,
  },
];
