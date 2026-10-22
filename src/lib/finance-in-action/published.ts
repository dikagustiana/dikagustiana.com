/**
 * Published model packages: what the owner approved, by either way in.
 *
 * The view fia.model_packages (supabase/migrations/20261022100000_fia_two_gates.sql)
 * joins the two channels a package can reach the section by: the FSRE suite,
 * whose approval function (fsre.approve_package) fills
 * fsre_published.model_packages, and the manual channel, fia.manual_release,
 * which the owner fills with scripts/fia/publish-manual.ts. It keeps one
 * package per ticker (the latest approval; FSRE on an exact tie) and never one
 * with a failed gate. This module only reads the view, with the site's
 * publishable key and no session, so the database answers as `anon` and shows
 * approved packages only. Nothing is written back (constraint 12). Every
 * package still passes the contract and formula checks in buildRegistry before
 * anything is drawn, whichever channel it came by.
 *
 * A failed read says WHICH failure it was (PRD "FSRE publish path" G8), because
 * the three mean different things to whoever reads the page:
 *   not-available  404, or PostgREST's PGRST106 (the schema is not exposed to
 *                  the Data API) or 42P01 (the view does not exist): the
 *                  database has not been brought up yet. Expected before
 *                  the first apply; not an error to a reader.
 *   refused        401 or 403: the key or the grant is wrong.
 *   failed         anything else: the network, a 5xx, a body that is not JSON.
 */
import type { ModelPackage } from './contract/types';

export const PUBLISHED_QUERY_KEY = ['finance-in-action', 'published'] as const;

/** The view, in the schema the Data API exposes for both channels' published output. */
const SCHEMA = 'fia';
const VIEW = 'model_packages';

export type PublishedFailureReason = 'not-available' | 'refused' | 'failed';

/** PostgREST codes that mean the schema or the view is not there yet. */
const NOT_AVAILABLE_CODES = new Set(['PGRST106', '42P01']);

export class PublishedReadError extends Error {
  readonly reason: PublishedFailureReason;
  readonly status: number;
  constructor(reason: PublishedFailureReason, status: number, message: string) {
    super(message);
    this.name = 'PublishedReadError';
    this.reason = reason;
    this.status = status;
  }
}

/** The failure a response is, from its status and PostgREST's error body. Exported for the tests. */
export function classifyFailure(status: number, body: unknown): PublishedFailureReason {
  const code = typeof body === 'object' && body !== null && 'code' in body ? String((body as { code: unknown }).code) : null;
  if (status === 404 || (code !== null && NOT_AVAILABLE_CODES.has(code))) return 'not-available';
  if (status === 401 || status === 403) return 'refused';
  return 'failed';
}

export async function fetchPublishedPackages(
  url: string | undefined = import.meta.env.VITE_SUPABASE_URL,
  key: string | undefined = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
): Promise<ModelPackage[]> {
  // A build without the site's Supabase settings (tests, a local preview) has nothing published.
  if (!url || !key) return [];
  const res = await fetch(`${url}/rest/v1/${VIEW}?select=package`, {
    headers: { apikey: key, 'Accept-Profile': SCHEMA, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const reason = classifyFailure(res.status, body);
    throw new PublishedReadError(reason, res.status, `published models answered ${res.status}${reason === 'failed' ? '' : ` (${reason})`}`);
  }
  const rows = (await res.json()) as { package: ModelPackage }[];
  return rows.map((r) => r.package).filter((p) => !!p && typeof p === 'object' && 'meta' in p);
}

/** The reason behind a query error, or `failed` for an error the read did not raise itself. */
export function failureOf(error: unknown): { reason: PublishedFailureReason; detail: string } {
  if (error instanceof PublishedReadError) return { reason: error.reason, detail: error.message };
  return { reason: 'failed', detail: error instanceof Error ? error.message : String(error) };
}
