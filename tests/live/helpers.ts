import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Helpers for the LIVE e2e suite — these talk to a REAL (local/staging) Supabase.
 * They are gated by E2E_LIVE=1 so they never run (and never fail) in the default
 * mock suite. Required env (see docs/e2e-live-testing.md):
 *   E2E_LIVE=1
 *   SUPABASE_URL                e.g. http://127.0.0.1:54321
 *   SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY   (used only for admin-side setup/cleanup)
 */

export const LIVE = process.env.E2E_LIVE === '1';

export const ENV = {
  url: process.env.SUPABASE_URL ?? '',
  anon: process.env.SUPABASE_ANON_KEY ?? '',
  service: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
};

// Seeded fixtures (see supabase/seed.sql).
export const ADMIN = { email: 'admin@dika.test', password: 'Admin123!' };
export const USER = { email: 'user@dika.test', password: 'User1234!' };

export function anonClient(): SupabaseClient {
  return createClient(ENV.url, ENV.anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(ENV.url, ENV.service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A fresh anon client already signed in as the given fixture user. */
export async function signedInClient(creds: { email: string; password: string }) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword(creds);
  if (error) throw new Error(`sign-in failed for ${creds.email}: ${error.message}`);
  return { client, session: data.session! };
}

export function missingEnv(): string | null {
  if (!ENV.url) return 'SUPABASE_URL';
  if (!ENV.anon) return 'SUPABASE_ANON_KEY';
  return null;
}
