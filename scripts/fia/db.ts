/**
 * The database connection for the fia scripts (publish-manual.ts, run-sql.ts):
 * from .env.local in the folder the command runs in, and from nowhere else.
 *
 *   SUPABASE_DB_URL       the connection string (the session pooler's, from
 *                         the Supabase dashboard's Connect panel)
 *   SUPABASE_DB_PASSWORD  the database password, kept apart so a password
 *                         with @, # or / needs no URL encoding; it wins over
 *                         a password in the URL (the dashboard's string
 *                         carries [YOUR-PASSWORD] there)
 *   SUPABASE_DB_CA        optional: the path of Supabase's CA certificate, to
 *                         verify the server; without it the connection is
 *                         encrypted but the certificate is not checked, so
 *                         a network that can intercept it could pose as the
 *                         database
 *
 * .env.local is git-ignored (.gitignore: ".env.local"). Nothing here prints a
 * value from it; every error that leaves this module has the URL and the
 * password taken out.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

export const ENV_FILE = '.env.local';

/** KEY=VALUE lines; blank lines, # comments and a leading `export ` are allowed, quotes around a value are dropped. */
export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[m[1]] = value;
  }
  return out;
}

export class SetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SetupError';
  }
}

/** Takes every secret out of a message before it is printed. */
export function redact(message: string, secrets: (string | undefined)[]): string {
  let out = message;
  for (const s of secrets) if (s && s.length >= 4) out = out.split(s).join('***');
  return out;
}

export interface DbSettings {
  config: pg.ClientConfig;
  secrets: string[];
}

export function settingsFrom(env: Record<string, string>): DbSettings {
  const url = env.SUPABASE_DB_URL;
  if (!url) throw new SetupError(`${ENV_FILE} has no SUPABASE_DB_URL line (RUNBOOK.md, first-time setup)`);
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new SetupError(`SUPABASE_DB_URL in ${ENV_FILE} is not a connection string (postgresql://…)`);
  }
  if (u.protocol !== 'postgresql:' && u.protocol !== 'postgres:') {
    throw new SetupError(`SUPABASE_DB_URL in ${ENV_FILE} is not a connection string (postgresql://…)`);
  }
  const urlPassword = decodeURIComponent(u.password);
  // SUPABASE_DB_PASSWORD wins, so the dashboard's string can be pasted as it is, [YOUR-PASSWORD] and all.
  const password = env.SUPABASE_DB_PASSWORD || urlPassword;
  if (!password && !isLocal(u.hostname)) {
    throw new SetupError(`${ENV_FILE} has no SUPABASE_DB_PASSWORD line, and SUPABASE_DB_URL carries no password (RUNBOOK.md, first-time setup)`);
  }
  // Built from the parts, not passed as connectionString: node-postgres lets a
  // connection string override the options beside it, password included.
  const config: pg.ClientConfig = {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    user: decodeURIComponent(u.username) || 'postgres',
    database: decodeURIComponent(u.pathname.replace(/^\//, '')) || 'postgres',
    application_name: 'fia-scripts',
  };
  if (password) config.password = password;
  if (!isLocal(u.hostname)) {
    config.ssl = env.SUPABASE_DB_CA
      ? { ca: fs.readFileSync(path.resolve(env.SUPABASE_DB_CA), 'utf8') }
      : { rejectUnauthorized: false };
  }
  return { config, secrets: [url, password, urlPassword, u.password].filter(Boolean) };
}

function isLocal(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
}

export function readEnvLocal(dir: string = process.cwd()): Record<string, string> {
  const file = path.join(dir, ENV_FILE);
  if (!fs.existsSync(file)) throw new SetupError(`no ${ENV_FILE} in ${dir} (RUNBOOK.md, first-time setup)`);
  return parseEnvFile(fs.readFileSync(file, 'utf8'));
}

/** A connected client, or a SetupError whose message names no secret. */
export async function connect(dir: string = process.cwd()): Promise<{ client: pg.Client; secrets: string[] }> {
  const { config, secrets } = settingsFrom(readEnvLocal(dir));
  const client = new pg.Client(config);
  try {
    await client.connect();
  } catch (e) {
    const message = redact(e instanceof Error ? e.message : String(e), secrets);
    const hint = /tenant or user not found/i.test(message)
      ? ' (the pooler host in SUPABASE_DB_URL is not this project\'s: change aws-0 to aws-1, or copy the Session pooler string again; RUNBOOK.md)'
      : /password authentication failed/i.test(message)
        ? ' (the password in SUPABASE_DB_PASSWORD is not the database password; RUNBOOK.md)'
        : '';
    throw new SetupError(`could not connect to the database: ${message}${hint}`);
  }
  return { client, secrets };
}
