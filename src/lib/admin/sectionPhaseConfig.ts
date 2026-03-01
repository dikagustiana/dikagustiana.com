/**
 * Section → Phase configuration.
 *
 * Maps each section slug to the valid phase options that can be
 * selected in the admin editor. Sections with no phases defined
 * will hide the Phase field entirely.
 */

export interface PhaseOption {
  value: string;
  label: string;
}

export interface SectionPhaseEntry {
  /** Label shown above the dropdown (e.g. "Sub-theme", "Theme", "Phase") */
  phaseLabel: string;
  options: PhaseOption[];
}

/**
 * Topics available for the Finance → Financial Analytics sub-section.
 */
export const FINANCIAL_ANALYTICS_TOPICS: PhaseOption[] = [
  { value: 'variance-analysis', label: 'Variance Analysis' },
  { value: 'profitability-analysis', label: 'Profitability Analysis' },
  { value: 'liquidity-analysis', label: 'Liquidity Analysis' },
  { value: 'efficiency-analysis', label: 'Efficiency Analysis' },
  { value: 'financial-structure-analysis', label: 'Financial Structure Analysis' },
];

/**
 * Topics available for Accounting → Consolidated Reporting.
 */
export const CONSOLIDATION_TOPICS: PhaseOption[] = [
  { value: 'psak-principles', label: 'PSAK Principles' },
  { value: 'equity-adjustment-parent', label: 'Equity Adjustment - Parent' },
  { value: 'elimination-equity', label: 'Elimination of Equity' },
  { value: 'elimination-balance-sheet', label: 'Elimination - Balance Sheet' },
  { value: 'elimination-pnl', label: 'Elimination - P&L' },
  { value: 'control-soce', label: 'Control - SOCE' },
  { value: 'control-nci-movement', label: 'Control - NCI Movement' },
  { value: 'control-bs-schedule', label: 'Control - BS Schedule' },
  { value: 'control-segment-info', label: 'Control - Segment Info' },
];

/**
 * Maps section slug → phase configuration.
 *
 * Sections NOT listed here have no phases and the Phase field
 * is hidden in the admin editor.
 */
export const SECTION_PHASE_CONFIG: Record<string, SectionPhaseEntry> = {
  'green-transition': {
    phaseLabel: 'Sub-theme',
    options: [
      { value: 'where-we-are-now', label: 'Where We Are Now' },
      { value: 'challenges-ahead', label: 'Challenges Ahead' },
      { value: 'pathways-forward', label: 'Pathways Forward' },
      { value: 'climate-finance', label: 'Climate Finance' },
    ],
  },
  'development-finance': {
    phaseLabel: 'Topic',
    options: [
      { value: 'sovereign-wealth-funds', label: 'Sovereign Wealth Funds' },
      { value: 'multilateral-development-banks', label: 'Multilateral Development Banks' },
      { value: 'blended-finance', label: 'Blended Finance' },
      { value: 'indonesia-capital-architecture', label: 'Indonesia\'s Capital Architecture' },
    ],
  },
  'next-big-thing': {
    phaseLabel: 'Theme',
    options: [
      { value: 'technology', label: 'Technology' },
      { value: 'economy', label: 'Economy' },
      { value: 'society', label: 'Society' },
      { value: 'environment', label: 'Environment' },
      { value: 'governance', label: 'Governance' },
    ],
  },
  'critical-thinking': {
    phaseLabel: 'Phase',
    options: [
      { value: 'clarify', label: 'Clarify' },
      { value: 'analyze', label: 'Analyze' },
      { value: 'construct', label: 'Construct' },
      { value: 'apply', label: 'Apply' },
    ],
  },
  accounting: {
    phaseLabel: 'Sub-section',
    options: [
      { value: 'fsli', label: 'FSLI' },
      { value: 'consolidated-reporting', label: 'Consolidated Reporting' },
      { value: 'statutory-reporting', label: 'Statutory Reporting' },
    ],
  },
};

/**
 * Finance domain options.
 *
 * These map to the `finance_section` DB field on essays (not `phase`).
 * When section=finance, the admin editor shows these as "Finance Domain"
 * and writes to finance_section instead of phase.
 */
export const FINANCE_DOMAIN_OPTIONS: PhaseOption[] = [
  { value: 'fundamentals', label: 'Fundamentals' },
  { value: 'strategic-finance', label: 'Strategic Finance' },
  { value: 'planning', label: 'Planning & Forecasting' },
  { value: 'analytics', label: 'Financial Analytics' },
];

/**
 * Phases that require a secondary "topic" picker.
 * Maps `${section}/${phase}` → topic options.
 *
 * For finance/fundamentals, topics are loaded dynamically from DB
 * (see PostSettingsPanel), so they are not listed here.
 */
export const PHASE_TOPIC_CONFIG: Record<string, { topicLabel: string; options: PhaseOption[] }> = {
  'finance/financial-analytics': {
    topicLabel: 'Analytics Topic',
    options: FINANCIAL_ANALYTICS_TOPICS,
  },
  'accounting/consolidated-reporting': {
    topicLabel: 'Consolidation Topic',
    options: CONSOLIDATION_TOPICS,
  },
};
