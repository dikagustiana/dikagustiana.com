/**
 * Reads the published model index exactly as the site does (the anonymous
 * role, `fia.model_packages`, both channels, through `fetchPublishedPackages`)
 * and prints the HTTP outcome and the package count. Read-only.
 *
 *   VITE_SUPABASE_URL=… VITE_SUPABASE_PUBLISHABLE_KEY=… npx vite-node scripts/world/check-published.ts
 *
 * Exit 0 on HTTP 200 (any count, zero included), 1 otherwise. Prints no key.
 */
import { fetchPublishedPackages } from '../../src/lib/finance-in-action/published';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('check-published: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}
try {
  const packages = await fetchPublishedPackages(url, key);
  const tickers = packages.map((p) => p.meta?.ticker).filter(Boolean).join(', ');
  console.log(`check-published: fia.model_packages HTTP 200, ${packages.length} package(s)${tickers ? `: ${tickers}` : ''}`);
} catch (e) {
  console.log(`check-published: fia.model_packages ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
