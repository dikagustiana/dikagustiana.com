/**
 * Finance in Action, two ways in (PRD R4, A9): scripts/fia/publish-manual.ts
 * checks a package with the site's own code and says why in the site's words,
 * writes nothing when the check fails, and never publishes a SYNTHETIC
 * fixture. The database is a fake that records what it is asked; the real
 * one is tested by supabase/tests/fia_manual_release.sql. Packages here are
 * the SYNTHETIC fixture XCOA, relabelled filings in memory only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import xcoa from '@/data/finance-in-action/fixtures/XCOA.SYNTHETIC.json';
import type { ModelPackage } from '@/lib/finance-in-action/contract/types';
import { validatePackage } from '@/lib/finance-in-action/contract/validate';
import { buildLiveRegistry } from '@/lib/finance-in-action/live';
import { checkPackage, contentHashOf, REFUSALS, run, type Db } from '../../scripts/fia/manual-release';
import { parseEnvFile, redact, settingsFrom } from '../../scripts/fia/db';

const SYNTHETIC = xcoa as unknown as ModelPackage;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** XCOA as a filings package in a sub-industry the section lists, with its own hash: what a real one looks like to the site. */
function filings(version = 'XCOA-2025Q4-r1'): ModelPackage {
  const p = clone(SYNTHETIC);
  p.meta.provenance = 'filings';
  p.meta.subIndustry = 'A121';
  p.meta.version = version;
  p.meta.contentHash = '';
  p.meta.contentHash = contentHashOf(p);
  return p;
}

interface FakeDb extends Db {
  calls: { sql: string; params?: unknown[] }[];
}

function fakeDb(answer: (sql: string, params?: unknown[]) => unknown[] | Error = () => []): FakeDb {
  const calls: FakeDb['calls'] = [];
  return {
    calls,
    async query<R>(sql: string, params?: unknown[]) {
      calls.push({ sql, params });
      const a = answer(sql, params);
      if (a instanceof Error) throw a;
      return { rows: a as R[] };
    },
    async end() {},
  };
}

function harness(files: Record<string, unknown>, db: FakeDb = fakeDb()) {
  const lines: string[] = [];
  const connect = vi.fn(async () => db);
  const deps = {
    connect,
    readFile: (f: string) => {
      if (!(f in files)) throw new Error(`ENOENT: ${f}`);
      return typeof files[f] === 'string' ? (files[f] as string) : JSON.stringify(files[f]);
    },
    out: (l: string) => lines.push(l),
  };
  return { deps, lines, connect, db };
}

describe('--check: the site\'s checks, in the site\'s words', () => {
  it('passes a filings package the site would draw, without connecting', async () => {
    const h = harness({ 'pkg.json': filings() });
    expect(await run(['--check', 'pkg.json'], h.deps)).toBe(0);
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.lines.at(-1)).toBe("OK: XCOA XCOA-2025Q4-r1 passes the site's checks and can be published.");
  });

  it('refuses a broken package with exactly the reason the site gives, and connects to nothing', async () => {
    const broken = filings();
    broken.meta.chainStage = 'nowhere';
    broken.meta.contentHash = '';
    broken.meta.contentHash = contentHashOf(broken);
    const siteSays = validatePackage(broken).map((i) => `  ${i.path} ${i.message}`);
    expect(siteSays).toEqual(['  meta.chainStage nowhere is not a chain map stage or spanning layer']);
    const h = harness({ 'broken.json': broken });
    expect(await run(['--check', 'broken.json'], h.deps)).toBe(1);
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.lines).toContain("Refused: XCOA fails the site's checks, 1 reason(s); nothing written.");
    expect(h.lines).toEqual(expect.arrayContaining(siteSays));
  });

  it('gives the live registry\'s reasons verbatim (here: a sub-industry the section does not list)', () => {
    const p = filings();
    p.meta.subIndustry = 'SYN-COAL';
    p.meta.contentHash = '';
    p.meta.contentHash = contentHashOf(p);
    const site = buildLiveRegistry([p]).rejected.flatMap((r) => r.issues);
    expect(site.length).toBeGreaterThan(0);
    expect(checkPackage(p).issues).toEqual(site);
  });

  it('refuses the SYNTHETIC fixture as filed, for its provenance, in the live registry\'s words', async () => {
    const h = harness({ 'XCOA.SYNTHETIC.json': SYNTHETIC });
    expect(await run(['--check', 'XCOA.SYNTHETIC.json'], h.deps)).toBe(1);
    expect(h.lines).toContain('  meta.provenance synthetic is not filings; production shows models built from filings only');
    expect(checkPackage(SYNTHETIC).issues).toEqual(buildLiveRegistry([SYNTHETIC]).rejected.flatMap((r) => r.issues));
  });

  it('names a shape the contract refuses by its place in the package', () => {
    const p = filings() as unknown as { sheets: { rows: { cells: Record<string, unknown>[] }[] }[] };
    delete p.sheets[0].rows[0].cells[0].kind;
    const { issues } = checkPackage(p);
    expect(issues).toContainEqual({ path: 'sheets[0].rows[0].cells[0]', message: "must have required property 'kind' (model-package.schema.json)" });
  });

  it('fills an empty content hash with the package\'s own, and refuses one that is not the package\'s', () => {
    const empty = filings();
    const hash = empty.meta.contentHash;
    empty.meta.contentHash = '';
    const filled = checkPackage(empty);
    expect(filled.issues).toEqual([]);
    expect(filled.pkg?.meta.contentHash).toBe(hash);
    expect(hash).toBe(contentHashOf(empty));

    const wrong = filings();
    wrong.meta.contentHash = '0'.repeat(64);
    expect(checkPackage(wrong).issues).toContainEqual({
      path: 'meta.contentHash',
      message: `is ${'0'.repeat(64)}; the package hashes to ${hash} (SHA-256 of the package serialised with an empty contentHash)`,
    });
  });

  it('agrees with the fixtures\' own content hash', () => {
    for (const f of ['XCOA', 'XCEM', 'SCOA', 'SCEM']) {
      const p = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../src/data/finance-in-action/fixtures/${f}.SYNTHETIC.json`), 'utf8')) as ModelPackage;
      expect(contentHashOf(p), f).toBe(p.meta.contentHash);
    }
  });

  it('says a package with a failed gate can be staged but not published (D5)', async () => {
    const p = filings();
    p.workpaper.gates[0].status = 'failed';
    p.meta.contentHash = '';
    p.meta.contentHash = contentHashOf(p);
    const h = harness({ 'gate.json': p });
    expect(await run(['--check', 'gate.json'], h.deps)).toBe(1);
    expect(h.lines).toContain('  workpaper.gates[0] Intake and tie-out failed; a package with a failed gate is never shown, so it cannot be published');
    expect(h.lines.at(-1)).toBe('OK to stage: XCOA XCOA-2025Q4-r1.');
    expect(h.connect).not.toHaveBeenCalled();
  });

  it('refuses a file that is not JSON, or not there, without connecting', async () => {
    const h = harness({ 'bad.json': '{ not json' });
    expect(await run(['--check', 'bad.json'], h.deps)).toBe(1);
    expect(await run(['--check', 'missing.json'], h.deps)).toBe(1);
    expect(h.connect).not.toHaveBeenCalled();
  });
});

describe('--publish', () => {
  it('never publishes a SYNTHETIC fixture: refused on provenance, nothing written, no connection', async () => {
    for (const f of ['XCOA', 'XCEM', 'SCOA', 'SCEM']) {
      const file = `src/data/finance-in-action/fixtures/${f}.SYNTHETIC.json`;
      const h = harness({ [file]: JSON.parse(fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8')) });
      expect(await run(['--publish', file, '--by', 'Dika Gustiana Irawan'], h.deps), f).toBe(1);
      expect(h.connect, f).not.toHaveBeenCalled();
      expect(h.lines, f).toContain('  meta.provenance synthetic is not filings; production shows models built from filings only');
    }
  });

  it('needs an approver', async () => {
    const h = harness({ 'pkg.json': filings() });
    expect(await run(['--publish', 'pkg.json'], h.deps)).toBe(2);
    expect(await run(['--publish', 'pkg.json', '--by', '  '], h.deps)).toBe(2);
    expect(h.connect).not.toHaveBeenCalled();
  });

  it('inserts a new version as published, approved by the name given at the database\'s time, in one transaction', async () => {
    const db = fakeDb((sql) => (sql.startsWith('SELECT channel') ? [{ channel: 'manual', version: 'XCOA-2025Q4-r1' }] : []));
    const h = harness({ 'pkg.json': filings() }, db);
    expect(await run(['--publish', 'pkg.json', '--by', 'Dika Gustiana Irawan', '--note', 'first'], h.deps)).toBe(0);
    const sqls = db.calls.map((c) => c.sql.split(' ').slice(0, 3).join(' '));
    expect(sqls).toEqual(['BEGIN', 'SELECT status FROM', 'INSERT INTO fia.manual_release', 'COMMIT', 'SELECT channel, version']);
    const insert = db.calls[2];
    expect(insert.sql).toMatch(/'published', \$5, now\(\), \$6\)/);
    expect(insert.params?.slice(0, 3)).toEqual(['XCOA', 'XCOA-2025Q4-r1', filings().meta.contentHash]);
    expect(insert.params?.[4]).toBe('Dika Gustiana Irawan');
    expect(insert.params?.[5]).toBe('first');
    expect(JSON.parse(insert.params?.[3] as string)).toEqual(filings());
    expect(h.lines.at(-1)).toBe('The site now shows XCOA from this row (manual XCOA-2025Q4-r1).');
  });

  it('publishes a staged row in place', async () => {
    const db = fakeDb((sql) => (sql.startsWith('SELECT status') ? [{ status: 'staged' }] : sql.startsWith('SELECT channel') ? [] : []));
    const h = harness({ 'pkg.json': filings() }, db);
    expect(await run(['--publish', 'pkg.json', '--by', 'Dika Gustiana Irawan'], h.deps)).toBe(0);
    expect(db.calls.some((c) => /^UPDATE fia\.manual_release SET content_hash = \$3, package = \$4::jsonb, status = 'published'/.test(c.sql))).toBe(true);
  });

  it('refuses a version that is already published or withdrawn, and writes nothing', async () => {
    for (const status of ['published', 'withdrawn']) {
      const db = fakeDb((sql) => (sql.startsWith('SELECT status') ? [{ status }] : []));
      const h = harness({ 'pkg.json': filings() }, db);
      expect(await run(['--publish', 'pkg.json', '--by', 'Dika Gustiana Irawan'], h.deps)).toBe(1);
      expect(db.calls.map((c) => c.sql.split(' ')[0])).toEqual(['BEGIN', 'SELECT', 'ROLLBACK']);
      expect(h.lines).toContain(`Refused: XCOA XCOA-2025Q4-r1 is already ${status}; nothing written. A revision is a new version (meta.version).`);
    }
  });

  it('says what the database\'s refusal means, by its constraint', async () => {
    const refusal = Object.assign(new Error('fia.manual_release XCOA XCOA-2025Q4-r1 does not match the contract'), {
      constraint: 'manual_release_contract',
      detail: '"nowhere" does not match "^(reported|model|assumptions)![A-Za-z0-9_]+$"',
    });
    const db = fakeDb((sql) => (sql.startsWith('INSERT') ? refusal : []));
    const h = harness({ 'pkg.json': filings() }, db);
    expect(await run(['--publish', 'pkg.json', '--by', 'Dika Gustiana Irawan'], h.deps)).toBe(1);
    expect(h.lines).toEqual(expect.arrayContaining([
      'the database refused it: fia.manual_release XCOA XCOA-2025Q4-r1 does not match the contract',
      `  meaning: ${REFUSALS.manual_release_contract} (manual_release_contract)`,
      '  "nowhere" does not match "^(reported|model|assumptions)![A-Za-z0-9_]+$"',
      'Nothing written.',
    ]));
    expect(db.calls.at(-1)?.sql).toBe('ROLLBACK');
  });
});

describe('--stage, --withdraw, --list', () => {
  it('stages a package with a failed gate (it is not shown)', async () => {
    const p = filings();
    p.workpaper.gates[0].status = 'failed';
    p.meta.contentHash = '';
    const db = fakeDb();
    const h = harness({ 'gate.json': p }, db);
    expect(await run(['--stage', 'gate.json'], h.deps)).toBe(0);
    expect(db.calls.some((c) => c.sql.startsWith('INSERT INTO fia.manual_release') && c.sql.includes("'staged'"))).toBe(true);
    expect(h.lines.at(-1)).toBe('Staged: XCOA XCOA-2025Q4-r1. Not shown until published.');
  });

  it('withdraws a published row and says what the site shows instead', async () => {
    const db = fakeDb((sql) => (sql.startsWith('UPDATE') ? [{ status: 'withdrawn' }] : sql.startsWith('SELECT channel') ? [{ channel: 'fsre', version: 'XCOA-f1' }] : []));
    const h = harness({}, db);
    expect(await run(['--withdraw', 'XCOA', 'XCOA-2025Q4-r1'], h.deps)).toBe(0);
    expect(db.calls[0].sql).toMatch(/SET status = 'withdrawn' WHERE ticker = \$1 AND version = \$2 AND status IN \('staged', 'published'\)/);
    expect(h.lines).toEqual(['Withdrawn: XCOA XCOA-2025Q4-r1. The site now shows XCOA as fsre XCOA-f1.']);
  });

  it('says so when there is no such row', async () => {
    const h = harness({}, fakeDb());
    expect(await run(['--withdraw', 'XCOA', 'nope'], h.deps)).toBe(1);
    expect(h.lines).toEqual(['Refused: there is no manual row XCOA nope (--list shows them); nothing changed.']);
  });

  it('lists the manual rows and what the site shows', async () => {
    const db = fakeDb((sql) => sql.includes('FROM fia.manual_release')
      ? [{ ticker: 'XCOA', version: 'r1', status: 'published', approved_by: 'Dika Gustiana Irawan', approved_at: '2026-10-22 14:00', created_at: '2026-10-22 13:00', note: null }]
      : [{ ticker: 'XCOA', channel: 'manual', version: 'r1' }]);
    const h = harness({}, db);
    expect(await run(['--list'], h.deps)).toBe(0);
    expect(h.lines).toEqual([
      'Manual rows (1), times in WIB:',
      '  XCOA  r1  published  approved by Dika Gustiana Irawan 2026-10-22 14:00  (stored 2026-10-22 13:00)',
      'What the site shows (fia.model_packages, 1):',
      '  XCOA  manual  r1',
    ]);
  });

  it('prints its usage for anything else', async () => {
    const h = harness({});
    expect(await run([], h.deps)).toBe(2);
    expect(h.lines[0]).toMatch(/^usage: npx vite-node scripts\/fia\/publish-manual\.ts/);
  });
});

describe('the connection settings (.env.local)', () => {
  it('are git-ignored', () => {
    const ignore = fs.readFileSync(path.resolve(__dirname, '../../.gitignore'), 'utf8').split('\n').map((l) => l.trim());
    expect(ignore).toContain('.env.local');
  });

  it('read KEY=VALUE lines, quotes and comments allowed', () => {
    expect(parseEnvFile('# a comment\nSUPABASE_DB_URL="postgresql://u@h:5432/postgres"\nexport SUPABASE_DB_PASSWORD=p@ss#w/rd\n\nnot a line'))
      .toEqual({ SUPABASE_DB_URL: 'postgresql://u@h:5432/postgres', SUPABASE_DB_PASSWORD: 'p@ss#w/rd' });
  });

  it('take the password apart from the URL, encrypt a remote connection, and keep every secret out of messages', () => {
    const s = settingsFrom({
      SUPABASE_DB_URL: 'postgresql://postgres.ref@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
      SUPABASE_DB_PASSWORD: 'p@ss#w/rd',
    });
    expect(s.config.password).toBe('p@ss#w/rd');
    expect(s.config.ssl).toEqual({ rejectUnauthorized: false });
    expect(redact('auth failed for p@ss#w/rd at postgresql://postgres.ref@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres', s.secrets))
      .toBe('auth failed for *** at ***');
    expect(settingsFrom({ SUPABASE_DB_URL: 'postgresql://postgres@localhost:54322/postgres' }).config.ssl).toBeUndefined();
    expect(() => settingsFrom({})).toThrow(/no SUPABASE_DB_URL/);
    expect(() => settingsFrom({ SUPABASE_DB_URL: 'postgresql://postgres.ref@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres' })).toThrow(/no SUPABASE_DB_PASSWORD/);
  });
});
