/**
 * Single source of truth for Accounting → Consolidated Reporting topics.
 *
 * Used by the public consolidation pages AND by Writer Studio's placement panel,
 * so an essay placed on a topic resolves to the exact same route the public nav
 * builds. Keep keys in sync with `essays.topic` values.
 */
export interface ConsolidationTopic {
  slug: string;
  title: string;
  description: string;
}

export const CONSOLIDATION_TOPICS: ConsolidationTopic[] = [
  { slug: 'psak-principles', title: 'PSAK Principles', description: 'Understanding PSAK consolidation principles and their application.' },
  { slug: 'equity-adjustment-parent', title: 'Equity Adjustment - Parent', description: 'Parent company equity adjustments in consolidated statements.' },
  { slug: 'elimination-equity', title: 'Elimination of Equity', description: 'Intercompany equity elimination entries and procedures.' },
  { slug: 'elimination-balance-sheet', title: 'Elimination - Balance Sheet', description: 'Balance sheet elimination entries for intercompany transactions.' },
  { slug: 'elimination-pnl', title: 'Elimination - P&L', description: 'Income statement elimination entries for intercompany transactions.' },
  { slug: 'control-soce', title: 'Control - SOCE', description: 'Statement of Changes in Equity control procedures.' },
  { slug: 'control-nci-movement', title: 'Control - NCI Movement', description: 'Non-controlling interest movement tracking and reporting.' },
  { slug: 'control-bs-schedule', title: 'Control - BS Schedule', description: 'Balance sheet schedule controls and reconciliation.' },
  { slug: 'control-segment-info', title: 'Control - Segment Info', description: 'Segment information reporting and disclosure.' },
];

/** Lookup map keyed by slug (back-compat with the previous inline `topicDetails`). */
export const CONSOLIDATION_TOPIC_MAP: Record<string, { title: string; description: string }> =
  Object.fromEntries(CONSOLIDATION_TOPICS.map((t) => [t.slug, { title: t.title, description: t.description }]));
