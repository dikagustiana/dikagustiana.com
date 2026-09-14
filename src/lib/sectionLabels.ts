/**
 * The human name for a section slug, in one place.
 *
 * Three copies of this map existed (Index, About, and a partial one that fell
 * through to the raw slug), and they disagreed: the homepage cards printed
 * "finance" in lower case beside a hand-written "Green Transition", because
 * its map had two entries and a fallback.
 */
export const SECTION_LABELS: Record<string, string> = {
  finance: 'Finance',
  accounting: 'Accounting',
  'green-transition': 'Green Transition',
  'next-big-thing': 'The Next Big Thing',
  'development-finance': 'Development Finance',
  'critical-thinking': 'Critical Thinking',
  'critical-thinking-research': 'Critical Thinking',
};

/** The label, or the slug itself when the section is one this map has not met. */
export const sectionLabel = (section: string | null | undefined): string =>
  (section && SECTION_LABELS[section]) || section || '';
