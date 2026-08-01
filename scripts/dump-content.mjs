#!/usr/bin/env node
/**
 * On-demand content backup.
 *
 * Why this exists: the project is on the Supabase free tier, which has no
 * point-in-time recovery. If a row is overwritten there is nothing to roll
 * back to.
 *
 * What is worth backing up is narrower than "the database". The curriculum —
 * sections, modules, categories, FSLI pages, the 161 essay stubs — is created
 * by the migrations in supabase/migrations and regenerates exactly by
 * replaying them. What does *not* regenerate is the writing: essay bodies
 * (`content`, `content_json`), the `presentation` payload (deck, references,
 * key takeaways, captions), and the autosave history in `essay_revisions`.
 * Those are typed by a human once and exist in exactly one place.
 *
 * So this dumps the authored layer, not the schema and not the seed.
 *
 * Usage:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_ANON_KEY=<anon key> \
 *   ADMIN_EMAIL=<admin email> ADMIN_PASSWORD=<password> \
 *   node scripts/dump-content.mjs [--out backups]
 *
 * Reads through an admin login rather than a service-role key, so no key that
 * bypasses RLS ever has to be stored. Drafts are included because the admin
 * policy can see them; an anonymous dump would silently capture only the two
 * published rows, which is the failure this script exists to avoid.
 *
 * Output: <out>/content-<timestamp>.json plus a printed summary. The summary
 * is the point — a backup nobody looked at is not a backup.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const URL_BASE = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

const outIndex = process.argv.indexOf('--out');
const OUT_DIR = outIndex > -1 ? process.argv[outIndex + 1] : 'backups';

function die(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

if (!URL_BASE || !ANON) die('SUPABASE_URL and SUPABASE_ANON_KEY are required.');
if (!EMAIL || !PASSWORD) die('ADMIN_EMAIL and ADMIN_PASSWORD are required (drafts need an admin session).');

/** Exchange the admin credentials for a short-lived JWT. */
async function signIn() {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await res.json();
  if (!body.access_token) die(`Sign-in failed: ${body.error_description || body.msg || res.status}`);
  return body.access_token;
}

/** Page through a table so a large revision history cannot be silently cut off. */
async function fetchAll(table, jwt, { select = '*', order = 'id' } = {}) {
  const PAGE = 500;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const url =
      `${URL_BASE}/rest/v1/${table}?select=${encodeURIComponent(select)}` +
      `&order=${encodeURIComponent(order)}`;
    const res = await fetch(url, {
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${jwt}`,
        Range: `${from}-${from + PAGE - 1}`,
        Prefer: 'count=exact',
      },
    });
    if (!res.ok) die(`GET ${table} → HTTP ${res.status}: ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

const jwt = await signIn();

// The authored layer. `essays` is taken whole: the stub columns are cheap and
// having the full row makes a restore a straight upsert rather than a merge.
const essays = await fetchAll('essays', jwt, { order: 'slug' });
const revisions = await fetchAll('essay_revisions', jwt, { order: 'created_at' });

const withBody = essays.filter(e => (e.content && e.content.trim()) || e.content_json);
const withPresentation = essays.filter(
  e => e.presentation && Object.keys(e.presentation).length > 0,
);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const payload = {
  meta: {
    taken_at: new Date().toISOString(),
    source: URL_BASE,
    note:
      'Authored content only. Schema and curriculum seed regenerate from ' +
      'supabase/migrations; this captures what does not.',
    counts: {
      essays: essays.length,
      essays_with_body: withBody.length,
      essays_with_presentation: withPresentation.length,
      essay_revisions: revisions.length,
    },
  },
  essays,
  essay_revisions: revisions,
};

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const file = join(OUT_DIR, `content-${stamp}.json`);
const json = JSON.stringify(payload, null, 2);
writeFileSync(file, json);

// ── Summary ───────────────────────────────────────────────────────────────
const kb = n => `${(n / 1024).toFixed(1)} KB`;
console.log(`\n  Content backup → ${file}`);
console.log(`  ${kb(Buffer.byteLength(json))} on disk\n`);
console.log(`  essays                  ${essays.length}`);
console.log(`  ├─ with a body          ${withBody.length}`);
console.log(`  └─ with presentation    ${withPresentation.length}`);
console.log(`  essay_revisions         ${revisions.length}\n`);

if (withBody.length === 0) {
  console.error('  ✗ No essay bodies captured. That is a broken dump, not an empty database.');
  process.exit(1);
}

console.log('  Essays carrying a body:');
for (const e of withBody) {
  const bytes = Buffer.byteLength(e.content || '');
  const blocks = e.content_json?.content?.length ?? 0;
  const pres = e.presentation ? Object.keys(e.presentation).length : 0;
  console.log(
    `    ${e.slug.padEnd(24)} ${String(bytes).padStart(6)} B content · ` +
      `${String(blocks).padStart(3)} json blocks · ${pres} presentation keys`,
  );
}
console.log('');
