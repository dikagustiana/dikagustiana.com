/**
 * The FSLI loader (Plan 1.5): the committed load migration is exactly what
 * scripts/fs_load.mjs writes from statements.json and the checker's results,
 * the loader refuses a file the checker has not passed, and the migration
 * ends by checking its own rows against hashes of the sources.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildLoadSql, hashes, nameUuid, paths, readInputs, rowsFor } from '../../scripts/fs_load.mjs';

const inputs = readInputs('phe', 'fy2024');
const sql = buildLoadSql(inputs);

type Line = { statement: string; sort_order: number; parent: number | null };

describe('the PHE FY2024 load', () => {
  it('is exactly what the loader writes from statements.json and checks.json', () => {
    expect(readFileSync(paths('phe', 'fy2024').migration, 'utf8')).toBe(sql);
  });

  it('was produced from a checker run that passed every rule on this exact file', () => {
    expect(inputs.checks.input_sha256).toBe(inputs.statementsSha256);
    expect(inputs.checks.passed).toBe(true);
    expect(inputs.checks.results.every((r: { passed: boolean }) => r.passed)).toBe(true);
  });

  it('inserts every line, cell and check, the period as a draft', () => {
    const lineRows = sql.match(/^ {2}\('(sofp|pl_oci|cf)', \d+, (NULL|\d+), '(header|item|subtotal|total)'/gm);
    expect(lineRows).toHaveLength(inputs.statements.lines.length);
    expect(sql).toMatch(/'unmodified', 'data\/fs\/phe\/fy2024\/source\.pdf', 'draft'\);/);
    const cells = sql.match(/\('[a-z0-9_]+', '[a-z0-9_]+', (NULL|-?\d+), \d+\)/g);
    expect(cells).toHaveLength(inputs.statements.soce_cells.length);
    const checkRows = sql.match(/^ {2}\('[A-Z][A-Z-]*:[^']*', /gm);
    expect(checkRows).toHaveLength(inputs.checks.results.length);
  });

  it('links every parent to a row of the same statement', () => {
    const lines = inputs.statements.lines as Line[];
    const keys = new Set(lines.map((l) => `${l.statement}/${l.sort_order}`));
    for (const l of lines) {
      if (l.parent !== null) expect(keys.has(`${l.statement}/${l.parent}`)).toBe(true);
    }
    const rows = rowsFor(inputs);
    const ids = new Map(rows.lines.map((l: { id: string; statement: string }) => [l.id, l.statement]));
    for (const l of rows.lines as Array<{ parent_id: string | null; statement: string }>) {
      if (l.parent_id !== null) expect(ids.get(l.parent_id)).toBe(l.statement);
    }
  });

  it('names ids as Postgres md5(name)::uuid does', () => {
    // python3 -c "import hashlib; print(hashlib.md5(b'https://dikagustiana.com/fs/phe/fy2024').hexdigest())"
    expect(nameUuid('https://dikagustiana.com/fs/phe/fy2024')).toBe('5fb9bdb5-3bde-31a9-86b3-a67369b95db9');
    expect(nameUuid('a')).toBe('0cc175b9-c0f1-b6a8-31c3-99e269772661');
    expect(sql).toContain("md5('https://dikagustiana.com/fs/phe/fy2024')::uuid");
  });

  it('carries the two declared printed differences with their reasons', () => {
    expect(sql).toMatch(
      /\('cf', \d+, \d+, 'subtotal', \d+, '[^']+', 'Net cash generated from operating activities', NULL, 5629285, 8663780, 5629286, 8663780, 17, 'net_cash_operating', NULL, 1, NULL, 'Rounding/,
    );
    expect(sql).toMatch(/'net_change_in_cash', NULL, -1, NULL, 'The FS prints/);
  });

  it('ends by checking every inserted row against hashes of the sources', () => {
    const h = hashes(rowsFor(inputs));
    expect(sql).toContain(`IF got_lines <> '${h.lines}' THEN`);
    expect(sql).toContain(`IF got_cells <> '${h.cells}' THEN`);
    expect(sql).toContain(`IF got_checks <> '${h.checks}' THEN`);
    expect(sql.trimEnd().endsWith('$verify$;')).toBe(true);
  });

  it('hashes a changed character to a different value', () => {
    const rows = rowsFor(inputs);
    const before = hashes(rows).lines;
    rows.lines[2] = { ...rows.lines[2], label_en: `${rows.lines[2].label_en}.` };
    expect(hashes(rows).lines).not.toBe(before);
  });
});

describe('the loader refuses', () => {
  it('a statements file the checker did not pass', () => {
    const checks = structuredClone(inputs.checks);
    checks.results[5].passed = false;
    expect(() => buildLoadSql({ ...inputs, checks })).toThrow(/did not pass/);
  });

  it('checker results produced from a different statements file', () => {
    expect(() => buildLoadSql({ ...inputs, statementsSha256: '0'.repeat(64) })).toThrow(/sha256 differs/);
  });

  it('checker results that repeat a rule id', () => {
    const checks = structuredClone(inputs.checks);
    checks.results.push(checks.results[0]);
    expect(() => buildLoadSql({ ...inputs, checks })).toThrow(/repeats a rule id/);
  });
});
