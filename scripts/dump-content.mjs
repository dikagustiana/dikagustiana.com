#!/usr/bin/env node
/**
 * On-demand content dump.
 *
 * Why this exists: the free tier has no PITR. The curriculum regenerates from
 * migrations, but essay bodies and presentation payloads do not — if a row is
 * lost there is no way back. This is the only backup.
 *
 * What it captures (everything that is authored, nothing that is derived):
 *   - essays: all columns, including content, content_json and presentation
 *   - essay_revisions: the autosave/version history
 *   - the taxonomy needed to make sense of placement (sections, categories,
 *     finance_sections, finance_modules)
 *   - fsli_pages / fsli_sections, which are hand-written prose
 *
 * Usage
 *   npm run dump:content
 *   npm run dump:content -- --out backups/2026-08-01
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (or an admin access token in
 * SUPABASE_ACCESS_TOKEN_USER) so RLS does not silently hide the 160 drafts —
 * an anon dump would "succeed" and contain almost nothing, which is the worst
 * possible failure for a backup. The script refuses to write a dump that looks
 * suspiciously small rather than let you believe you have one.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TABLES, assessTable, assessTableError, buildIntegrity } from './lib/dumpAssess.mjs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function readEnvFile() {
  const out = {};
  if (!existsSync('.env')) return out;
  for (const line of readFileSync('.env', 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...readEnvFile(), ...process.env };
const URL_BASE = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const USER_TOKEN = env.SUPABASE_ACCESS_TOKEN_USER;

if (!URL_BASE) {
  console.error('FATAL: VITE_SUPABASE_URL not set (checked .env and the environment).');
  process.exit(1);
}
if (!SERVICE && !USER_TOKEN) {
  console.error(
    'FATAL: need SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ACCESS_TOKEN_USER (an admin JWT).\n' +
    '       Without one, RLS hides every draft and the dump would be near-empty.',
  );
  process.exit(1);
}

const apikey = SERVICE || ANON;
const bearer = SERVICE || USER_TOKEN;

const argOut = process.argv.indexOf('--out');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT_DIR = argOut > -1 ? process.argv[argOut + 1] : join('backups', stamp);

// ---------------------------------------------------------------------------
// Tables. `min` is a floor below which the dump is considered untrustworthy.
// ---------------------------------------------------------------------------

async function fetchAll(table) {
  const rows = [];
  const PAGE = 500;
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${URL_BASE}/rest/v1/${table}?select=*`, {
      headers: {
        apikey,
        Authorization: `Bearer ${bearer}`,
        Range: `${from}-${from + PAGE - 1}`,
        Prefer: 'count=exact',
      },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

// ---------------------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });
const manifest = { taken_at: new Date().toISOString(), project_url: URL_BASE, tables: {} };
let suspicious = false;

for (const { name, min } of TABLES) {
  try {
    const rows = await fetchAll(name);
    const path = join(OUT_DIR, `${name}.json`);
    writeFileSync(path, JSON.stringify(rows, null, 2));
    const json = JSON.stringify(rows, null, 2);
    writeFileSync(path, json);
    const assessed = assessTable(name, min, rows.length, json.length);
    manifest.tables[name] = assessed.entry;
    if (assessed.belowFloor) suspicious = true;
    const flag = assessed.belowFloor ? '  << BELOW EXPECTED FLOOR' : '';
    console.log(`${name.padEnd(20)} ${String(rows.length).padStart(5)} rows${flag}`);
  } catch (e) {
    manifest.tables[name] = assessTableError(e.message).entry;
    suspicious = true;
    console.error(`${name.padEnd(20)} FAILED: ${e.message}`);
  }
}

// The thing the backup exists for: verify the authored bodies are actually in it.
const essays = JSON.parse(readFileSync(join(OUT_DIR, 'essays.json'), 'utf-8'));
const integrity = buildIntegrity(essays);
manifest.integrity = integrity;
const withBody = integrity.essays_with_body;
const withPresentation = integrity.essays_with_presentation;

writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log('');
console.log(`Wrote ${OUT_DIR}`);
console.log(`  essays with a body:         ${withBody.length}`);
console.log(`  essays with a presentation: ${withPresentation.length}`);

if (suspicious) {
  console.error('\nWARNING: at least one table came back below its expected floor.');
  console.error('Most likely cause: the credential used lacks the rights to see drafts.');
  console.error('Do NOT treat this as a good backup.');
  process.exit(2);
}
console.log('\nDump looks complete.');
