/**
 * Runs one SQL file against the database in .env.local (scripts/fia/db.ts)
 * and prints what it returns, one row per line, columns joined by ` | `, as
 * `psql -A -F ' | '` would. For the fia tests and the FSRE fingerprint, so the
 * owner needs no psql:
 *
 *   npx vite-node scripts/fia/run-sql.ts supabase/tests/fia_manual_release.sql
 *   npx vite-node scripts/fia/run-sql.ts supabase/tests/fsre_fingerprint.sql
 *
 * The file runs as one simple-protocol request, so its own BEGIN and ROLLBACK
 * hold; on an error the connection is rolled back and closed. Exit 0 when the
 * file ran, 1 otherwise (a FAIL line in the tests' output does not change the
 * exit code; read the last line).
 */
import fs from 'node:fs';
import type pg from 'pg';
import { connect, redact } from './db';

const file = process.argv[2];
if (!file) {
  console.log('usage: npx vite-node scripts/fia/run-sql.ts <file.sql>');
  process.exit(2);
}
const sql = fs.readFileSync(file, 'utf8');
let secrets: string[] = [];
let client: pg.Client | null = null;
try {
  const c = await connect();
  client = c.client;
  secrets = c.secrets;
  client.on('notice', (n) => console.log(`NOTICE: ${n.message}`));
  const res = (await client.query(sql)) as pg.QueryResult | pg.QueryResult[];
  for (const r of Array.isArray(res) ? res : [res]) {
    if (!r.fields?.length) continue;
    for (const row of r.rows) console.log(r.fields.map((f) => (row[f.name] === null ? '' : String(row[f.name]))).join(' | '));
  }
  await client.end();
  process.exit(0);
} catch (e) {
  const err = e as { message?: string; detail?: string };
  console.log(`run-sql: ${redact(err.message ?? String(e), secrets)}${err.detail ? `\n  ${redact(err.detail, secrets)}` : ''}`);
  if (client) {
    await client.query('ROLLBACK').catch(() => undefined);
    await client.end().catch(() => undefined);
  }
  process.exit(1);
}
