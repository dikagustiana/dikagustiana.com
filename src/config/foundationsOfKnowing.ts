/**
 * Single source of truth for Foundations of Knowing (docs/prd/foundations-of-knowing).
 *
 * The section was "Critical Thinking". Only the DISPLAY name and the public
 * address changed: the database slug stays `critical-thinking` (essays.section,
 * sections.slug), so nothing keyed on it moves. The ten parts are stored in
 * `essays.phase`; each has a category row `critical-thinking-<id>` (the
 * writer derives phase from the category, placement.ts derivePhase).
 *
 * ARRAY ORDER IS DISPLAY ORDER, and `number` is the part's number on the page.
 * It matches `sort_order` on the category rows, and an essay's `sort_order` is
 * number × 100 + its place in the part (Part 4, essay 2 = 402).
 */
export const FOUNDATIONS_SECTION = 'critical-thinking';
export const FOUNDATIONS_LABEL = 'Foundations of Knowing';
export const FOUNDATIONS_PATH = '/foundations-of-knowing';

export const FOUNDATIONS_PARTS = [
  { number: 0, id: 'before-we-go-far', label: 'Before We Go Far' },
  { number: 1, id: 'knowing', label: 'Knowing' },
  { number: 2, id: 'logic', label: 'Logic' },
  { number: 3, id: 'argument', label: 'Argument' },
  { number: 4, id: 'evidence-and-sources', label: 'Evidence & Sources' },
  { number: 5, id: 'how-science-corrects-itself', label: 'How Science Corrects Itself' },
  { number: 6, id: 'dialectics-and-change', label: 'Dialectics & Change' },
  { number: 7, id: 'uncertainty', label: 'Uncertainty' },
  { number: 8, id: 'judgment-under-pressure', label: 'Judgment Under Pressure' },
  { number: 9, id: 'strategic-finance', label: 'Strategic Finance as Applied Judgment' },
] as const;

export type FoundationsPart = (typeof FOUNDATIONS_PARTS)[number];
export type FoundationsPartId = FoundationsPart['id'];

export const foundationsPart = (id: string | null | undefined): FoundationsPart | undefined =>
  FOUNDATIONS_PARTS.find((p) => p.id === id);

/** "Part 4 · Evidence & Sources" — the name the writer's picker and the category rows use. */
export const foundationsPartName = (part: FoundationsPart) => `Part ${part.number} · ${part.label}`;

export const foundationsPartPath = (id: string) => `${FOUNDATIONS_PATH}/${id}`;
