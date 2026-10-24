/**
 * What the library scripts share (scripts/books: spine-metrics, extract-paragraphs, rebuild-citations;
 * docs/prd/library-phase-2): the settings, a service-role client, and a book's file as bytes.
 *
 * The extracted text goes to R2 (extract-paragraphs.ts), never to the database.
 *
 * Settings come from .env.local in the folder the command runs in (parsed as scripts/fia/db.ts parses it),
 * else from the environment:
 *   SUPABASE_URL                 the project's URL
 *   SUPABASE_SERVICE_ROLE_KEY    the service-role key: these scripts write rows readers may not (page_count,
 *                                spine_color, ai_ready, book_citations); RLS lets only the admin and
 *                                the service role write them
 *   R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *                                the private bucket's credentials, for a file on R2 (file_store = 'r2') and
 *                                for the extracted text (text/<book id>/); every URL is signed by
 *                                supabase/functions/_shared/r2.ts, the same signer the edge functions use
 * Nothing here prints a value from them.
 */
import fs from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { r2Configured, r2FromEnv, signR2 } from '../../supabase/functions/_shared/r2';
import { ENV_FILE, parseEnvFile } from '../fia/db';

export interface Settings {
  url: string;
  serviceKey: string;
  env: Record<string, string>;
}

export function settings(): Settings {
  const file = fs.existsSync(ENV_FILE) ? parseEnvFile(fs.readFileSync(ENV_FILE, 'utf8')) : {};
  const env: Record<string, string> = { ...(process.env as Record<string, string>), ...file };
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error(`No SUPABASE_URL in ${ENV_FILE} or the environment.`);
  if (!serviceKey) throw new Error(`No SUPABASE_SERVICE_ROLE_KEY in ${ENV_FILE} or the environment.`);
  return { url: url.replace(/\/+$/, ''), serviceKey, env };
}

export const adminClient = (s: Settings): SupabaseClient =>
  createClient(s.url, s.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

export interface FileRow {
  slug: string;
  filepath: string | null;
  file_store: 'supabase' | 'r2';
}

/** The book's file: from R2 through a five-minute signed GET, or from the public `books` bucket. */
export async function fetchBookBytes(s: Settings, row: FileRow): Promise<Uint8Array> {
  if (!row.filepath) throw new Error(`${row.slug} has no file.`);
  let url: string;
  if (row.file_store === 'r2') {
    const r2 = r2FromEnv((name) => s.env[name]);
    if (!r2Configured(r2)) throw new Error(`${row.slug} is on R2, and the R2_* settings are missing.`);
    url = await signR2(r2, 'GET', row.filepath, 300);
  } else {
    url = `${s.url}/storage/v1/object/public/books/${row.filepath.split('/').map(encodeURIComponent).join('/')}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${row.slug}: the file answered ${res.status}.`);
  return new Uint8Array(await res.arrayBuffer());
}

export const isEpub = (filepath: string | null) => /\.epub$/i.test(filepath ?? '');

/** --flag and --key value from argv. */
export function args(argv = process.argv.slice(2)): { flags: Set<string>; values: Record<string, string> } {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      values[a.slice(2)] = next;
      i++;
    } else flags.add(a.slice(2));
  }
  return { flags, values };
}
