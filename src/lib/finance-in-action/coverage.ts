/**
 * The coverage tracker (docs/prd/finance-restructure §1 B, §3, §4): under
 * each sub-industry of the index, how many of its companies are modelled and
 * where the rest stand, `4 of 11 modelled · 3 queued · 1 in review · 3 not
 * started`, the way the essay stubs are kept visible as a progress tracker.
 *
 * Counted on the client from the registry (packages and slate, already
 * merged in registry.companies) and the slate statuses fia.slate_progress
 * serves (slateProgress.ts). A company with a published package is modelled,
 * whatever its slate status; one with no status is not started. Nothing is
 * stored twice.
 */
import type { CompanyEntry } from './registry';

export const SLATE_STATUSES = [
  { id: 'queued', label: 'queued' },
  { id: 'in_review', label: 'in review' },
  { id: 'rejected', label: 'rejected' },
  { id: 'not_started', label: 'not started' },
] as const;
export type SlateStatus = (typeof SLATE_STATUSES)[number]['id'];

export const isSlateStatus = (s: unknown): s is SlateStatus => SLATE_STATUSES.some((x) => x.id === s);

export interface Coverage {
  total: number;
  modelled: number;
  counts: Record<SlateStatus, number>;
  /** The companies not modelled yet, with where each stands, by ticker. */
  pending: { company: CompanyEntry; status: SlateStatus }[];
}

export const isModelled = (c: CompanyEntry) => !!c.pkg;

export function coverageOf(companies: CompanyEntry[], progress: ReadonlyMap<string, SlateStatus>): Coverage {
  const counts: Record<SlateStatus, number> = { queued: 0, in_review: 0, rejected: 0, not_started: 0 };
  const pending: Coverage['pending'] = [];
  for (const company of [...companies].sort((a, b) => a.ticker.localeCompare(b.ticker))) {
    if (isModelled(company)) continue;
    const status = progress.get(company.ticker) ?? 'not_started';
    counts[status] += 1;
    pending.push({ company, status });
  }
  return { total: companies.length, modelled: companies.length - pending.length, counts, pending };
}

/** "4 of 11 modelled · 3 queued · 1 in review · 3 not started": the statuses that have a company, in the list's order. */
export function coverageLine(c: Coverage): string {
  const parts = SLATE_STATUSES.filter((s) => c.counts[s.id] > 0).map((s) => `${c.counts[s.id]} ${s.label}`);
  return [`${c.modelled} of ${c.total} modelled`, ...parts].join(' · ');
}

export const slateStatusLabel = (s: SlateStatus) => SLATE_STATUSES.find((x) => x.id === s)!.label;
