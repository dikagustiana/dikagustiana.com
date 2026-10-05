/**
 * Published model packages: what the owner approved, read from the FSRE suite.
 *
 * The suite's approval function (fsre.approve_package) is the only way a package
 * reaches the view fsre_published.model_packages; this module only reads it,
 * with the site's publishable key and no session, so the database answers as
 * `anon` and shows approved packages only. Nothing is written back
 * (constraint 12). Every package still passes the contract and formula checks
 * in buildRegistry before anything is drawn.
 */
import type { ModelPackage } from './contract/types';

export const PUBLISHED_QUERY_KEY = ['finance-in-action', 'published'] as const;

/** The view, in the schema the Data API exposes for the suite's published output. */
const SCHEMA = 'fsre_published';
const VIEW = 'model_packages';

export async function fetchPublishedPackages(
  url: string | undefined = import.meta.env.VITE_SUPABASE_URL,
  key: string | undefined = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
): Promise<ModelPackage[]> {
  // A build without the site's Supabase settings (tests, a local preview) has nothing published.
  if (!url || !key) return [];
  const res = await fetch(`${url}/rest/v1/${VIEW}?select=package`, {
    headers: { apikey: key, 'Accept-Profile': SCHEMA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`published models answered ${res.status}`);
  const rows = (await res.json()) as { package: ModelPackage }[];
  return rows.map((r) => r.package).filter((p) => !!p && typeof p === 'object' && 'meta' in p);
}
