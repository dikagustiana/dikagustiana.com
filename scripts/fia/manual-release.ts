/**
 * The manual channel's checks and writes (docs/company-models/two-gates/PRD.md
 * R4), kept apart from the command line (publish-manual.ts) so the tests can
 * run them without a database.
 *
 * A package is checked the way the site checks it in production, by the
 * site's own code, imported and not copied: buildLiveRegistry (the provenance
 * rule, validatePackage, the sub-industry the section lists, checkFormulas),
 * whose reasons are printed in its own words, `<path> <message>`, as the
 * page's RejectedPackages prints them. Before that, the contract's JSON
 * Schema (the same file fia.contract_schema holds), so a package the database
 * would refuse is refused here first; and the content hash, the SHA-256 of
 * the package serialised with an empty contentHash (the fixtures' rule). A
 * package with a failed gate may be staged but not published (D5).
 *
 * Nothing is written unless the check is clean, and the database then checks
 * everything again (supabase/migrations/20261022100000_fia_two_gates.sql).
 */
import { createHash } from 'node:crypto';
import Ajv, { type ErrorObject } from 'ajv';
import packageSchema from '../../src/lib/finance-in-action/contract/model-package.schema.json';
import type { ModelPackage } from '../../src/lib/finance-in-action/contract/types';
import type { ValidationIssue } from '../../src/lib/finance-in-action/contract/validate';
import { buildLiveRegistry } from '../../src/lib/finance-in-action/live';

/* ── The check ── */

export interface CheckResult {
  /** The package as it would be written: the content hash filled in when it was empty. */
  pkg: ModelPackage | null;
  ticker: string | null;
  version: string | null;
  /** Reasons that refuse the package outright, in the site's words. */
  issues: ValidationIssue[];
  /** Reasons that refuse publishing only (a failed gate, D5); the package may still be staged. */
  publishBlockers: ValidationIssue[];
  notes: string[];
}

const ajv = new Ajv({ allErrors: true, strict: false });
const matchesContract = ajv.compile(packageSchema);

/** SHA-256 of the package serialised with an empty contentHash, key order kept. */
export function contentHashOf(pkg: ModelPackage): string {
  const blank = { ...pkg, meta: { ...pkg.meta, contentHash: '' } };
  return createHash('sha256').update(JSON.stringify(blank)).digest('hex');
}

/** `/sheets/0/rows/3` → `sheets[0].rows[3]`, the site's way of naming a place in a package. */
function pathOf(pointer: string): string {
  if (!pointer) return 'package';
  return pointer
    .split('/')
    .slice(1)
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((acc, s) => (/^\d+$/.test(s) ? `${acc}[${s}]` : acc ? `${acc}.${s}` : s), '');
}

function schemaIssue(e: ErrorObject): ValidationIssue {
  const p = e.params as Record<string, unknown>;
  const extra =
    e.keyword === 'additionalProperties' ? ` (${String(p.additionalProperty)})`
      : e.keyword === 'enum' ? ` (${(p.allowedValues as unknown[]).map(String).join(', ')})`
        : '';
  return { path: pathOf(e.instancePath), message: `${e.message ?? 'does not match'}${extra} (model-package.schema.json)` };
}

export function checkPackage(raw: unknown): CheckResult {
  const result: CheckResult = { pkg: null, ticker: null, version: null, issues: [], publishBlockers: [], notes: [] };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !('meta' in raw) || typeof (raw as { meta: unknown }).meta !== 'object' || !(raw as { meta: unknown }).meta) {
    result.issues.push({ path: 'package', message: 'is not a model package: it has no meta' });
    return result;
  }
  const pkg = structuredClone(raw) as ModelPackage;
  result.pkg = pkg;
  result.ticker = typeof pkg.meta.ticker === 'string' ? pkg.meta.ticker : null;
  result.version = typeof pkg.meta.version === 'string' ? pkg.meta.version : null;

  // The content hash: filled in when empty, refused when it is not the package's.
  const computed = contentHashOf(pkg);
  if (pkg.meta.contentHash === '' || pkg.meta.contentHash === undefined) {
    pkg.meta.contentHash = computed;
    result.notes.push(`meta.contentHash was empty; the package hashes to ${computed}, which is what will be written`);
  } else if (pkg.meta.contentHash !== computed) {
    result.issues.push({
      path: 'meta.contentHash',
      message: `is ${String(pkg.meta.contentHash)}; the package hashes to ${computed} (SHA-256 of the package serialised with an empty contentHash)`,
    });
  }

  // The contract's JSON Schema, as the database will check it.
  const shapeOk = matchesContract(pkg) === true;
  if (!shapeOk) result.issues.push(...(matchesContract.errors ?? []).map(schemaIssue));

  // The site's own checks, in production (live.ts). On a package of the wrong
  // shape they may not run to the end; the schema's reasons then stand alone.
  try {
    const reg = buildLiveRegistry([pkg]);
    for (const r of reg.rejected) result.issues.push(...r.issues);
  } catch (e) {
    if (shapeOk) result.issues.push({ path: 'package', message: `could not be checked by the site: ${e instanceof Error ? e.message : String(e)}` });
  }

  // D5: a failed gate is never shown, so never published.
  const gates = Array.isArray(pkg.workpaper?.gates) ? pkg.workpaper.gates : [];
  gates.forEach((g, i) => {
    if (g?.status === 'failed') {
      result.publishBlockers.push({ path: `workpaper.gates[${i}]`, message: `${g.name} failed; a package with a failed gate is never shown, so it cannot be published` });
    }
  });
  return result;
}

/* ── The database ── */

export interface Db {
  query<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: R[] }>;
  end(): Promise<void>;
}

export interface Deps {
  /** Called only once a write or a read of the database is due; never for --check. */
  connect: () => Promise<Db>;
  readFile: (file: string) => string;
  out: (line: string) => void;
}

/** What the database's own refusals mean, by constraint (the migration's names). */
export const REFUSALS: Record<string, string> = {
  manual_release_contract: 'the package does not match the contract (model-package.schema.json)',
  manual_release_meta_ticker: 'the ticker column is not package.meta.ticker',
  manual_release_meta_version: 'the version column is not package.meta.version',
  manual_release_meta_content_hash: 'the content_hash column is not package.meta.contentHash',
  manual_release_content_hash_format: 'the content hash is not 64 lower-case hexadecimal digits',
  manual_release_ticker_format: 'the ticker is not 2 to 8 capital letters or digits',
  manual_release_provenance_filings: 'package.meta.provenance is not filings',
  manual_release_published_approved: 'a published row needs an approver and an approval time',
  manual_release_published_no_failed_gate: 'a package with a failed gate cannot be published',
  manual_release_published_locked: 'the row is published: it can only be withdrawn; a revision is a new version',
  manual_release_withdrawn_final: 'the row is withdrawn, which is final; a revision is a new version',
  manual_release_new_row_status: 'a new row is staged or published',
  manual_release_status_known: 'the status is not staged, published or withdrawn',
  manual_release_pkey: 'a row with this ticker and version already exists',
};

interface PgError {
  message?: string;
  constraint?: string;
  detail?: string;
  code?: string;
}

function describeDbError(e: unknown): string[] {
  const err = (e ?? {}) as PgError;
  const lines = [`the database refused it: ${err.message ?? String(e)}`];
  if (err.constraint && REFUSALS[err.constraint]) lines.push(`  meaning: ${REFUSALS[err.constraint]} (${err.constraint})`);
  if (err.detail) for (const d of err.detail.split('\n')) lines.push(`  ${d}`);
  if (err.code === '3F000' || err.code === '42P01') lines.push('  meaning: the fia schema is not in this database yet; apply the migration first (RUNBOOK.md)');
  return lines;
}

async function shownNow(db: Db, ticker: string): Promise<string> {
  const { rows } = await db.query<{ channel: string; version: string }>(
    'SELECT channel, version FROM fia.model_packages WHERE ticker = $1', [ticker]);
  return rows.length ? `${rows[0].channel} ${rows[0].version}` : 'nothing';
}

async function existingStatus(db: Db, ticker: string, version: string): Promise<string | null> {
  const { rows } = await db.query<{ status: string }>(
    'SELECT status FROM fia.manual_release WHERE ticker = $1 AND version = $2 FOR UPDATE', [ticker, version]);
  return rows[0]?.status ?? null;
}

/* ── The command line ── */

export const USAGE = [
  'usage: npx vite-node scripts/fia/publish-manual.ts <mode>',
  '  --check <file.json>                         check a package as the site does; writes nothing',
  '  --stage <file.json> [--note "…"]            check, then store it as staged (not shown)',
  '  --publish <file.json> --by "<name>" [--note "…"]   check, then publish it (shown on the site)',
  '  --withdraw <TICKER> <VERSION>               withdraw a manual row (no longer shown)',
  '  --list                                      the manual rows, and what the site shows per ticker',
];

function option(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function report(out: (l: string) => void, file: string, c: CheckResult, mode: '--check' | '--stage' | '--publish'): boolean {
  out(`publish-manual: ${file}`);
  if (c.ticker || c.version) {
    const m = c.pkg?.meta;
    out(`  ${c.ticker ?? '?'} ${c.version ?? '?'}, provenance ${m?.provenance ?? '?'}, sub-industry ${m?.subIndustry ?? '?'}`);
  }
  for (const n of c.notes) out(`  note: ${n}`);
  const blocking = mode === '--publish' ? [...c.issues, ...c.publishBlockers] : c.issues;
  if (blocking.length) {
    out(`Refused: ${c.ticker ?? 'the package'} fails the site's checks, ${blocking.length} reason(s); nothing written.`);
    for (const i of blocking) out(`  ${i.path} ${i.message}`);
    if (mode !== '--publish') for (const i of c.publishBlockers) out(`  (and for publishing) ${i.path} ${i.message}`);
    return false;
  }
  if (c.publishBlockers.length) {
    out("Passes the site's checks, but cannot be published:");
    for (const i of c.publishBlockers) out(`  ${i.path} ${i.message}`);
  }
  return true;
}

function load(deps: Deps, file: string): { ok: true; raw: unknown } | { ok: false } {
  let text: string;
  try {
    text = deps.readFile(file);
  } catch (e) {
    deps.out(`publish-manual: cannot read ${file}: ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false };
  }
  try {
    return { ok: true, raw: JSON.parse(text) };
  } catch (e) {
    deps.out(`publish-manual: ${file} is not JSON: ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false };
  }
}

/** Runs one mode; returns the exit code (0 done, 1 refused, 2 not understood). */
export async function run(argv: string[], deps: Deps): Promise<number> {
  const { out } = deps;
  const mode = argv.find((a) => ['--check', '--stage', '--publish', '--withdraw', '--list'].includes(a));
  if (!mode) {
    for (const l of USAGE) out(l);
    return 2;
  }

  if (mode === '--check' || mode === '--stage' || mode === '--publish') {
    const file = option(argv, mode);
    if (!file || file.startsWith('--')) {
      out(`publish-manual: ${mode} needs a package file`);
      return 2;
    }
    const by = option(argv, '--by');
    const note = option(argv, '--note') ?? null;
    if (mode === '--publish' && (!by || !by.trim() || by.startsWith('--'))) {
      out('publish-manual: --publish needs --by "<the approver\'s name>"');
      return 2;
    }
    const loaded = load(deps, file);
    if (!loaded.ok) return 1;
    const c = checkPackage(loaded.raw);
    const clean = report(out, file, c, mode);
    if (!clean || !c.pkg || !c.ticker || !c.version) return 1;
    if (mode === '--check') {
      out(c.publishBlockers.length ? `OK to stage: ${c.ticker} ${c.version}.` : `OK: ${c.ticker} ${c.version} passes the site's checks and can be published.`);
      return c.publishBlockers.length ? 1 : 0;
    }

    const db = await deps.connect();
    try {
      await db.query('BEGIN');
      const status = await existingStatus(db, c.ticker, c.version);
      if (status && status !== 'staged') {
        await db.query('ROLLBACK');
        out(`Refused: ${c.ticker} ${c.version} is already ${status}; nothing written. A revision is a new version (meta.version).`);
        return 1;
      }
      const pkgJson = JSON.stringify(c.pkg);
      if (mode === '--stage') {
        if (status === 'staged') {
          await db.query(
            'UPDATE fia.manual_release SET content_hash = $3, package = $4::jsonb, note = coalesce($5, note) WHERE ticker = $1 AND version = $2',
            [c.ticker, c.version, c.pkg.meta.contentHash, pkgJson, note]);
        } else {
          await db.query(
            "INSERT INTO fia.manual_release (ticker, version, content_hash, package, status, note) VALUES ($1, $2, $3, $4::jsonb, 'staged', $5)",
            [c.ticker, c.version, c.pkg.meta.contentHash, pkgJson, note]);
        }
        await db.query('COMMIT');
        out(`Staged: ${c.ticker} ${c.version}${status === 'staged' ? ' (replacing the staged copy)' : ''}. Not shown until published.`);
        return 0;
      }
      if (status === 'staged') {
        await db.query(
          "UPDATE fia.manual_release SET content_hash = $3, package = $4::jsonb, status = 'published', approved_by = $5, approved_at = now(), note = coalesce($6, note) WHERE ticker = $1 AND version = $2",
          [c.ticker, c.version, c.pkg.meta.contentHash, pkgJson, by!.trim(), note]);
      } else {
        await db.query(
          "INSERT INTO fia.manual_release (ticker, version, content_hash, package, status, approved_by, approved_at, note) VALUES ($1, $2, $3, $4::jsonb, 'published', $5, now(), $6)",
          [c.ticker, c.version, c.pkg.meta.contentHash, pkgJson, by!.trim(), note]);
      }
      await db.query('COMMIT');
      out(`Published: ${c.ticker} ${c.version}, approved by ${by!.trim()}.`);
      const shown = await shownNow(db, c.ticker);
      out(shown === `manual ${c.version}`
        ? `The site now shows ${c.ticker} from this row (manual ${c.version}).`
        : `The site shows ${c.ticker} as ${shown}: a more recent approval wins (D2), and FSRE wins an exact tie.`);
      return 0;
    } catch (e) {
      await db.query('ROLLBACK').catch(() => undefined);
      for (const l of describeDbError(e)) out(l);
      out('Nothing written.');
      return 1;
    } finally {
      await db.end();
    }
  }

  if (mode === '--withdraw') {
    const i = argv.indexOf('--withdraw');
    const ticker = argv[i + 1];
    const version = argv[i + 2];
    if (!ticker || !version || ticker.startsWith('--') || version.startsWith('--')) {
      out('publish-manual: --withdraw needs a ticker and a version, for example --withdraw INDY INDY-2025Q4-r1');
      return 2;
    }
    const db = await deps.connect();
    try {
      const { rows } = await db.query<{ status: string }>(
        "UPDATE fia.manual_release SET status = 'withdrawn' WHERE ticker = $1 AND version = $2 AND status IN ('staged', 'published') RETURNING status",
        [ticker, version]);
      if (!rows.length) {
        const { rows: found } = await db.query<{ status: string }>(
          'SELECT status FROM fia.manual_release WHERE ticker = $1 AND version = $2', [ticker, version]);
        out(found.length
          ? `${ticker} ${version} is already ${found[0].status}; nothing changed.`
          : `Refused: there is no manual row ${ticker} ${version} (--list shows them); nothing changed.`);
        return found.length ? 0 : 1;
      }
      out(`Withdrawn: ${ticker} ${version}. The site now shows ${ticker} as ${await shownNow(db, ticker)}.`);
      return 0;
    } catch (e) {
      for (const l of describeDbError(e)) out(l);
      return 1;
    } finally {
      await db.end();
    }
  }

  // --list
  const db = await deps.connect();
  try {
    const { rows } = await db.query<{ ticker: string; version: string; status: string; approved_by: string | null; approved_at: string | null; created_at: string; note: string | null }>(
      `SELECT ticker, version, status, approved_by,
              to_char(approved_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') AS approved_at,
              to_char(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') AS created_at, note
         FROM fia.manual_release ORDER BY ticker, created_at, version`);
    out(`Manual rows (${rows.length}), times in WIB:`);
    for (const r of rows) {
      out(`  ${r.ticker}  ${r.version}  ${r.status}${r.approved_by ? `  approved by ${r.approved_by} ${r.approved_at}` : ''}  (stored ${r.created_at})${r.note ? `  note: ${r.note}` : ''}`);
    }
    const { rows: shown } = await db.query<{ ticker: string; channel: string; version: string }>(
      'SELECT ticker, channel, version FROM fia.model_packages ORDER BY ticker');
    out(`What the site shows (fia.model_packages, ${shown.length}):`);
    for (const r of shown) out(`  ${r.ticker}  ${r.channel}  ${r.version}`);
    return 0;
  } catch (e) {
    for (const l of describeDbError(e)) out(l);
    return 1;
  } finally {
    await db.end();
  }
}
