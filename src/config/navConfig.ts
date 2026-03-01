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

export const financeItems: NavItem[] = [
  { label: 'Fundamentals', path: '/finance/fundamentals' },
  { label: 'Strategic Finance', path: '/finance/strategic-finance' },
  { label: 'Planning & Forecasting', path: '/finance/planning-forecasting' },
  { label: 'Financial Analytics', path: '/finance/financial-analytics' },
];

export const greenTransitionItems: NavItem[] = [
  { label: 'Where We Are Now', path: '/green-transition/now' },
  { label: 'Challenges Ahead', path: '/green-transition/gaps' },
  { label: 'Pathways Forward', path: '/green-transition/future' },
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
    label: 'Learning',
    items: learningItems,
  },
];
