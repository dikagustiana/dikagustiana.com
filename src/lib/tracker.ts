/**
 * The Green Transition Tracker register: types, labels, and the one rule for
 * numbering its sources.
 *
 * The register lives in `public.tracker_entry` (migration
 * 20261011100000_tracker_entry): one row per sector per quarter, each with a
 * one-sentence finding, a short detail, and the primary documents behind
 * both. The page reads it through useTrackerEntries; nothing here touches the
 * network.
 */

export type TrackerSector =
  | 'geothermal'
  | 'solar'
  | 'pln_procurement'
  | 'jetp'
  | 'ojk_taxonomy'
  | 'danantara'
  | 'other';

export type TrackerStatus = 'advanced' | 'unchanged' | 'regressed' | 'mixed';

/**
 * One primary document, as the `sources jsonb` column stores it (PRD §B4).
 * The table's CHECK requires only a title, an https url, and a doc_no or a
 * date, so the other fields are optional here and SourceList renders each
 * only when present. The repo's own content carries all of them.
 */
export interface TrackerSource {
  title: string;
  issuer?: string;
  doc_no?: string;
  /** ISO date of the document: signing date for a regulation, release date otherwise. */
  date?: string;
  url: string;
  /** ISO date the document was opened and checked. */
  accessed?: string;
}

export interface TrackerEntry {
  id: string;
  /** '2025Q1', '2025Q2'. */
  quarter: string;
  sector: TrackerSector;
  status: TrackerStatus;
  finding: string;
  detail: string;
  sources: TrackerSource[];
  verification: 'verified' | 'unverifiable';
  /** False only for rows an admin can see before they are published. */
  published: boolean;
}

/** Register rows, top to bottom. */
export const SECTOR_ORDER: TrackerSector[] = [
  'geothermal',
  'solar',
  'pln_procurement',
  'jetp',
  'ojk_taxonomy',
  'danantara',
  'other',
];

export const SECTOR_LABEL: Record<TrackerSector, string> = {
  geothermal: 'Geothermal',
  solar: 'Solar',
  pln_procurement: 'PLN procurement',
  jetp: 'JETP',
  ojk_taxonomy: 'OJK taxonomy',
  danantara: 'Danantara',
  other: 'Other',
};

/** Shown as words, never as a colour alone (PRD §B5). */
export const STATUS_LABEL: Record<TrackerStatus, string> = {
  advanced: 'Advanced',
  unchanged: 'Unchanged',
  regressed: 'Regressed',
  mixed: 'Mixed',
};

/**
 * The page's one-line standfirst (PRD §B5, item 1). It names the H1 2025
 * findings and claims nothing the entries do not: RUPTL 2025–2034
 * (pln_procurement-2025q2), TKBI v2 (ojk_taxonomy-2025q1), JETP financing
 * (jetp-2025q2), and geothermal tariffs and solar local-content rules left at
 * Perpres 112/2022 and the 2024 TKDN rules (geothermal-2025q2, solar-2025q1/q2).
 */
export const TRACKER_STANDFIRST =
  'In the first half of 2025 Indonesia ratified its ten-year power plan (RUPTL 2025–2034, 26 May), OJK issued version 2 of its sustainable-finance taxonomy (11 February), and new JETP financing was signed; geothermal tariffs and solar local-content rules stayed at their 2022 and 2024 settings.';

export interface TrackerQuarter {
  key: string;
  label: string;
  period: string;
  /** The fragment an issue section is reached by; the old issue routes redirect to it. */
  anchor: string;
  /** Finding-first title of the issue section (PRD §B5, W-20). */
  title: string;
}

/**
 * The quarters this release covers, in register column order. Issue sections
 * run the other way, newest first.
 */
export const TRACKER_QUARTERS: TrackerQuarter[] = [
  {
    key: '2025Q1',
    label: 'Q1 2025',
    period: 'January–March 2025',
    anchor: 'q1-2025',
    title: 'A national electricity plan, new PPA rules and TKBI version 2; the United States leaves JETP',
  },
  {
    key: '2025Q2',
    label: 'Q2 2025',
    period: 'April–June 2025',
    anchor: 'q2-2025',
    title: 'RUPTL 2025–2034 is ratified, JETP financing is signed, and the solar import relaxation ends',
  },
];

/** The register as a grid: sector → quarter → entry. Unknown sectors and quarters are dropped. */
export function registerGrid(entries: TrackerEntry[]) {
  const grid = new Map<TrackerSector, Map<string, TrackerEntry>>();
  for (const sector of SECTOR_ORDER) grid.set(sector, new Map());
  const quarters = new Set(TRACKER_QUARTERS.map((q) => q.key));
  for (const entry of entries) {
    if (!quarters.has(entry.quarter)) continue;
    grid.get(entry.sector)?.set(entry.quarter, entry);
  }
  return grid;
}

/** A quarter's entries in register order. */
export function entriesForQuarter(entries: TrackerEntry[], quarter: string): TrackerEntry[] {
  return SECTOR_ORDER.map((sector) => entries.find((e) => e.sector === sector && e.quarter === quarter)).filter(
    (e): e is TrackerEntry => e !== undefined,
  );
}

/**
 * The consolidated source list and each document's number.
 *
 * A document is numbered where it is first cited in reading order: the issue
 * sections, newest quarter first, sectors top to bottom, each entry's sources
 * in their stored order. The same document cited by several entries keeps one
 * number, keyed by its URL, so an inline [n] and the list always agree.
 */
export function numberSources(entries: TrackerEntry[]) {
  const ordered: TrackerSource[] = [];
  const numberOf = new Map<string, number>();
  const newestFirst = [...TRACKER_QUARTERS].reverse();
  for (const quarter of newestFirst) {
    for (const entry of entriesForQuarter(entries, quarter.key)) {
      for (const source of entry.sources) {
        if (numberOf.has(source.url)) continue;
        ordered.push(source);
        numberOf.set(source.url, ordered.length);
      }
    }
  }
  return { ordered, numberOf };
}

/** The numbers an entry cites, in order, without repeats. */
export function sourceNumbers(entry: TrackerEntry, numberOf: Map<string, number>): number[] {
  const seen = new Set<number>();
  for (const source of entry.sources) {
    const n = numberOf.get(source.url);
    if (n !== undefined) seen.add(n);
  }
  return [...seen];
}
