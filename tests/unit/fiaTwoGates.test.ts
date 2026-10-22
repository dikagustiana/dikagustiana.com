/**
 * Finance in Action, two ways in (docs/company-models/two-gates): what can be
 * proved about the fia migration and its SQL tests without a database. The
 * rules themselves run in supabase/tests/fia_manual_release.sql against a
 * real one; these tests keep the files honest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import packageSchema from '@/lib/finance-in-action/contract/model-package.schema.json';
import xcoa from '@/data/finance-in-action/fixtures/XCOA.SYNTHETIC.json';

const ROOT = path.resolve(__dirname, '../..');
const MIGRATION = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261022100000_fia_two_gates.sql'), 'utf8');
const SQL_TESTS = fs.readFileSync(path.join(ROOT, 'supabase/tests/fia_manual_release.sql'), 'utf8');

/** The SQL without its comments: line comments, outside dollar-quoted bodies only where it matters below. */
const code = (sql: string) => sql.replace(/--[^\n]*/g, '');

/** The text between the two delimiters, once. */
function dollarBlock(sql: string, tag: string): string {
  const open = `$${tag}$`;
  const start = sql.indexOf(open);
  const end = sql.indexOf(open, start + open.length);
  expect(start, `no ${open} block`).toBeGreaterThanOrEqual(0);
  expect(end, `${open} block not closed`).toBeGreaterThan(start);
  expect(sql.indexOf(open, end + open.length), `more than one ${open} block`).toBe(-1);
  return sql.slice(start + open.length, end);
}

describe('the contract the database holds (fia.contract_schema)', () => {
  it('is model-package.schema.json, exactly', () => {
    expect(JSON.parse(dollarBlock(MIGRATION, 'json'))).toEqual(packageSchema);
  });

  it('is stored under the version its $id names', () => {
    expect(MIGRATION).toMatch(/INSERT INTO fia\.contract_schema \(version, schema\) VALUES \('proposal-v3\.1', \$json\$/);
    expect(packageSchema.$id.endsWith(':proposal-v3.1')).toBe(true);
    expect(MIGRATION).toMatch(/WHERE c\.version = 'proposal-v3\.1'/);
  });
});

describe('the fia migration and the FSRE schemas', () => {
  it('writes nothing to fsre, fsre_private, fsre_status or fsre_published: no DDL, no grant, no row', () => {
    const sql = code(MIGRATION);
    // Every name in an FSRE schema sits inside the reader's definition, which only reads.
    const readerStart = sql.indexOf('CREATE FUNCTION fia_private.fsre_packages()');
    const readerEnd = sql.indexOf('$fn$;', readerStart);
    expect(readerStart).toBeGreaterThan(0);
    const named = [...sql.matchAll(/\bfsre(?:_private|_status|_published)?\.[a-z_]+/gi)];
    expect(named.map((m) => m[0])).toEqual(['fsre_published.model_packages', 'fsre_published.model_packages']);
    for (const m of named) expect(m.index! > readerStart && m.index! < readerEnd, m[0]).toBe(true);
    const reader = sql.slice(readerStart, readerEnd);
    expect(reader).toMatch(/IF to_regclass\('fsre_published\.model_packages'\) IS NULL THEN\s+RETURN;/);
    expect(reader).toMatch(/RETURN QUERY\s+SELECT [^;]+ FROM fsre_published\.model_packages AS p;/);
    // And no statement anywhere names an FSRE schema itself (CREATE SCHEMA, GRANT ... ON SCHEMA, ...).
    expect(sql).not.toMatch(/SCHEMA\s+(IF NOT EXISTS\s+)?fsre/i);
    expect(sql).not.toMatch(/\bIN SCHEMA fsre/i);
  });

  it('reads FSRE from plpgsql, as the caller, so no view depends on fsre_published', () => {
    expect(MIGRATION).toMatch(/CREATE FUNCTION fia_private\.fsre_packages\(\)[\s\S]*?LANGUAGE plpgsql[\s\S]*?\$fn\$;/);
    const reader = MIGRATION.slice(MIGRATION.indexOf('CREATE FUNCTION fia_private.fsre_packages()'));
    expect(reader.slice(0, reader.indexOf('$fn$'))).not.toMatch(/SECURITY DEFINER/);
    const view = MIGRATION.slice(MIGRATION.indexOf('CREATE VIEW fia.model_packages'), MIGRATION.indexOf('COMMENT ON VIEW fia.model_packages'));
    expect(view).not.toMatch(/fsre_published/);
    expect(view).toMatch(/FROM fia_private\.fsre_packages\(\) AS f/);
  });
});

describe('one way in does not take the other down', () => {
  it('leaves the FSRE channel empty, with a warning, when FSRE\'s view cannot be read as the reader reads it', () => {
    const reader = MIGRATION.slice(MIGRATION.indexOf('CREATE FUNCTION fia_private.fsre_packages()'));
    const body = reader.slice(0, reader.indexOf('$fn$;'));
    expect(body).toMatch(/EXCEPTION\s+WHEN insufficient_privilege OR undefined_table OR undefined_column OR invalid_schema_name\s+OR datatype_mismatch OR cannot_coerce OR undefined_function THEN\s+RAISE WARNING [^;]+;\s+RETURN;/);
    expect(body).toMatch(/p\.version::text, p\.content_hash::text, p\.approved_by::text,\s+p\.approved_at::timestamptz, p\.package::jsonb/);
  });

  it('fires the guards in every replication role', () => {
    for (const trigger of ['manual_release_guard', 'manual_release_no_truncate', 'contract_schema_insert_only', 'contract_schema_no_truncate']) {
      expect(MIGRATION).toMatch(new RegExp(`ENABLE ALWAYS TRIGGER ${trigger};`));
    }
  });
});

describe('the grants', () => {
  it('give anon the view and nothing else in fia, and authenticated nothing', () => {
    const grants = code(MIGRATION).match(/^GRANT [^;]+;/gm) ?? [];
    expect(grants).toEqual([
      'GRANT USAGE ON SCHEMA fia TO anon;',
      'GRANT SELECT ON fia.model_packages TO anon;',
      'GRANT EXECUTE ON FUNCTION fia_private.fsre_packages() TO anon;',
    ]);
    expect(code(MIGRATION)).toMatch(/ALTER TABLE fia\.manual_release ENABLE ROW LEVEL SECURITY;/);
    expect(code(MIGRATION)).not.toMatch(/CREATE POLICY/i);
  });
});

describe('the view (PRD R2, D2, D5)', () => {
  const view = MIGRATION.slice(MIGRATION.indexOf('CREATE VIEW fia.model_packages'), MIGRATION.indexOf('COMMENT ON VIEW fia.model_packages'));

  it('has the columns of R2, channel among them and not in the package', () => {
    expect(view).toMatch(/c\.ticker, c\.version, c\.channel, c\.content_hash, c\.approved_by, c\.approved_at, c\.package/);
    expect(view).not.toMatch(/'channel'/);
  });

  it('orders by the latest approval, nulls last, FSRE on an exact tie, then a fixed tie-break', () => {
    expect(view).toMatch(/SELECT DISTINCT ON \(c\.ticker\)/);
    expect(view).toMatch(/ORDER BY c\.ticker, c\.approved_at DESC NULLS LAST, \(c\.channel = 'fsre'\) DESC, c\.version DESC, c\.content_hash;/);
  });

  it('drops a package with a failed gate before choosing, from either channel', () => {
    expect(view).toMatch(/WHERE NOT jsonb_path_exists\(c\.package, '\$\.workpaper\.gates\[\*\] \? \(@\.status == "failed"\)'\)/);
  });
});

describe('the SQL tests (supabase/tests/fia_manual_release.sql)', () => {
  it('run in one transaction that is rolled back, and never commit', () => {
    const statements = code(SQL_TESTS).trim();
    expect(statements.startsWith('BEGIN;')).toBe(true);
    expect(statements.endsWith('ROLLBACK;')).toBe(true);
    expect(statements).not.toMatch(/(?<!ON )\bCOMMIT\b/i); // ON COMMIT DROP, on its temporary tables, is the only one
  });

  it('carry XCOA.SYNTHETIC.json exactly, still synthetic: the change to filings is made inside the transaction only', () => {
    const fixture = JSON.parse(dollarBlock(SQL_TESTS, 'fixture'));
    expect(fixture).toEqual(xcoa);
    expect(fixture.meta.provenance).toBe('synthetic');
    expect(SQL_TESTS).toMatch(/jsonb_set\(pkg, '\{meta,provenance\}', '"filings"'\)/);
  });

  it('name every refusal the migration can make, so each rule has a negative case', () => {
    const names = new Set([
      ...[...MIGRATION.matchAll(/CONSTRAINT (manual_release_[a-z_]+|contract_schema_[a-z_]+) (?:CHECK|PRIMARY KEY)/g)].map((m) => m[1]),
      ...[...MIGRATION.matchAll(/CONSTRAINT = '([a-z_]+)'/g)].map((m) => m[1]),
      ...[...MIGRATION.matchAll(/WHEN 'published' THEN '([a-z_]+)' ELSE '([a-z_]+)'/g)].flatMap((m) => [m[1], m[2]]),
    ]);
    names.add('manual_release_no_truncate');
    names.add('contract_schema_no_truncate');
    names.delete('contract_schema_is_a_schema'); // the stored contract's own guard; the tests check it holds a valid schema
    expect(names.size).toBeGreaterThanOrEqual(15);
    for (const n of names) expect(SQL_TESTS, n).toMatch(new RegExp(`'[^']*\\b${n}\\b[^']*'\\)`));
  });

  it('test A4, A5 and A6 by name', () => {
    for (const rule of ["'A4 D2'", "'A5 failed gate'", "'A6 anon'", "'A6 authenticated'", "'A7 fsre untouched'"]) expect(SQL_TESTS).toContain(rule);
  });
});
