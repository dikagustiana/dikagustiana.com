#!/usr/bin/env node
/**
 * fs_load.mjs: one audited period's load into the fs_* tables, written as a
 * migration (Plan 1.5).
 *
 * Reads data/fs/<company>/<period>/statements.json and checks.json, the
 * output of `python3 scripts/fs_check.py statements.json --json checks.json`,
 * and writes the SQL that inserts the company, the period (as a draft), every
 * line, every SoCE cell and the checker's results. It refuses unless the
 * checker passed every rule on exactly this statements.json (its sha256 is in
 * checks.json). The SQL is applied with the Supabase MCP `apply_migration`,
 * like every migration here: neither CI nor this repo holds a service key.
 *
 *   node scripts/fs_load.mjs phe fy2024          (re)write the migration
 *   node scripts/fs_load.mjs phe fy2024 --check  exit 1 if it is out of date
 *
 * tests/unit/fs_load.test.ts runs the same comparison in CI.
 *
 * Ids are md5(name)::uuid of a stable name (https://dikagustiana.com/fs/
 * <company>/<period>[/<statement>/<sort_order>]), computed in SQL, so a parent
 * link is written as a sort order and the file is the same every time it is
 * generated. computed_cy and computed_py come from the checker's computed
 * sums, not from a second sum here; the printed figures go in value_cy and
 * value_py untouched.
 *
 * The migration verifies itself: its last statement hashes every row it
 * inserted, in a fixed text form, and raises unless each table's hash equals
 * the one this script computed from statements.json and checks.json. A
 * migration copied into the database with one character wrong fails and
 * loads nothing.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The migration each period loads through. */
export const MIGRATIONS = {
  'phe/fy2024': 'supabase/migrations/20261011180000_fs_phe_fy2024_load.sql',
};

const md5 = (text) => createHash('md5').update(text, 'utf8').digest('hex');
export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** md5(name)::uuid, as Postgres prints it. */
export function nameUuid(name) {
  const x = md5(name);
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

export function paths(company, period) {
  const folder = join(ROOT, 'data/fs', company, period);
  const migration = MIGRATIONS[`${company}/${period}`];
  if (!migration) throw new Error(`no migration path registered for ${company}/${period}`);
  return {
    statements: join(folder, 'statements.json'),
    checks: join(folder, 'checks.json'),
    migration: join(ROOT, migration),
  };
}

export function readInputs(company, period) {
  const p = paths(company, period);
  const statementsRaw = readFileSync(p.statements);
  return {
    statements: JSON.parse(statementsRaw.toString('utf8')),
    statementsSha256: sha256(statementsRaw),
    checks: JSON.parse(readFileSync(p.checks, 'utf8')),
  };
}

const lit = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const num = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return v; // the checker writes non-integral decimals as text
  throw new Error(`not a number: ${JSON.stringify(v)}`);
};
/** A field in the hashed text form: what Postgres's `coalesce(x::text, '')` gives. */
const txt = (v) => (v === null || v === undefined ? '' : typeof v === 'boolean' ? String(v) : String(v));
const US = '\u001f'; // between fields
const RS = '\u001e'; // between rows
const C = (a, b) => (a < b ? -1 : a > b ? 1 : 0); // code-point order, as COLLATE "C"

/** The refusal, before anything is written. */
export function assertLoadable({ statements, statementsSha256, checks }) {
  if (checks.input_sha256 !== statementsSha256) {
    throw new Error('checks.json was not produced from this statements.json (sha256 differs); rerun fs_check.py --json');
  }
  const failed = checks.results.filter((r) => !r.passed);
  if (!checks.passed || failed.length) {
    throw new Error(`the checker did not pass: ${failed.map((r) => r.rule_id).join(', ') || 'passed=false'}`);
  }
  if (!statements?.company?.id || !statements?.period?.period_key) {
    throw new Error('statements.json has no company id or period key');
  }
  const ruleIds = checks.results.map((r) => r.rule_id);
  if (new Set(ruleIds).size !== ruleIds.length) throw new Error('checks.json repeats a rule id');
}

/** The rows as the database will hold them, for the SQL and for the hashes. */
export function rowsFor(inputs) {
  const { statements: s, checks } = inputs;
  const base = `https://dikagustiana.com/fs/${s.company.id}/${s.period.period_key}`;
  const periodId = nameUuid(base);
  const lineId = (stmt, order) => nameUuid(`${base}/${stmt}/${order}`);
  const lines = s.lines.map((l) => {
    const isSum = l.line_type === 'subtotal' || l.line_type === 'total';
    const comp = isSum ? checks.computed?.[l.statement]?.[String(l.sort_order)] : null;
    if (isSum && !comp) throw new Error(`no computed sum in checks.json for ${l.statement}:${l.sort_order}`);
    const pd = l.printed_difference ?? null;
    return {
      id: lineId(l.statement, l.sort_order),
      parent_id: l.parent === null || l.parent === undefined ? null : lineId(l.statement, l.parent),
      parent_sort: l.parent ?? null,
      statement: l.statement,
      sort_order: l.sort_order,
      line_type: l.line_type,
      indent: l.indent ?? 0,
      label_id: l.label_id,
      label_en: l.label_en,
      notes_ref: l.notes_ref ?? null,
      value_cy: l.value_cy ?? null,
      value_py: l.value_py ?? null,
      computed_cy: comp ? comp.cy : null,
      computed_py: comp ? comp.py : null,
      source_page: l.source_page,
      line_key: l.line_key ?? null,
      fsli_slug: l.fsli_slug ?? null,
      printed_diff_cy: pd?.cy ?? null,
      printed_diff_py: pd?.py ?? null,
      printed_diff_note: pd?.note ?? null,
    };
  });
  return { base, periodId, lines, cells: s.soce_cells ?? [], results: checks.results };
}

const LINE_HASH_FIELDS = ['id', 'parent_id', 'statement', 'sort_order', 'line_type', 'indent', 'label_id', 'label_en',
  'notes_ref', 'value_cy', 'value_py', 'computed_cy', 'computed_py', 'source_page', 'line_key', 'fsli_slug',
  'printed_diff_cy', 'printed_diff_py', 'printed_diff_note'];
const CELL_HASH_FIELDS = ['row_key', 'col_key', 'row_label_id', 'row_label_en', 'row_order', 'col_label_id',
  'col_label_en', 'col_order', 'value', 'source_page', 'notes_ref'];
const CHECK_HASH_FIELDS = ['rule_id', 'statement', 'description', 'expected', 'actual', 'diff', 'passed'];

export function hashes({ lines, cells, results }) {
  const join = (rows, fields) => rows.map((r) => fields.map((f) => txt(r[f])).join(US)).join(RS);
  return {
    lines: md5(join([...lines].sort((a, b) => C(a.statement, b.statement) || a.sort_order - b.sort_order), LINE_HASH_FIELDS)),
    cells: md5(join([...cells].sort((a, b) => a.row_order - b.row_order || a.col_order - b.col_order), CELL_HASH_FIELDS)),
    checks: md5(join([...results].sort((a, b) => C(a.rule_id, b.rule_id)), CHECK_HASH_FIELDS)),
  };
}

const sqlHash = (fields, from, order) =>
  `(SELECT md5(coalesce(string_agg(concat_ws(chr(31), ${fields.map((f) => `coalesce(${f}::text, '')`).join(', ')}), chr(30) ORDER BY ${order}), ''))
     FROM ${from})`;

export function buildLoadSql(inputs) {
  assertLoadable(inputs);
  const { statements: s, checks } = inputs;
  const c = s.company;
  const p = s.period;
  const rows = rowsFor(inputs);
  const h = hashes(rows);
  const pid = `md5(${lit(rows.base)})::uuid`;

  const lineValues = rows.lines.map((l) => `  (${[
    lit(l.statement), num(l.sort_order), num(l.parent_sort), lit(l.line_type), num(l.indent), lit(l.label_id),
    lit(l.label_en), lit(l.notes_ref), num(l.value_cy), num(l.value_py), num(l.computed_cy), num(l.computed_py),
    num(l.source_page), lit(l.line_key), lit(l.fsli_slug), num(l.printed_diff_cy), num(l.printed_diff_py),
    lit(l.printed_diff_note),
  ].join(', ')})`);

  // The SoCE's labels once per row and once per column; the cells as keys and figures.
  const socRows = [...new Map(rows.cells.map((x) => [x.row_key, x])).values()].sort((a, b) => a.row_order - b.row_order);
  const socCols = [...new Map(rows.cells.map((x) => [x.col_key, x])).values()].sort((a, b) => a.col_order - b.col_order);
  for (const x of rows.cells) {
    const r = socRows.find((y) => y.row_key === x.row_key);
    const k = socCols.find((y) => y.col_key === x.col_key);
    if (r.row_label_id !== x.row_label_id || r.row_label_en !== x.row_label_en || r.row_order !== x.row_order
        || (r.notes_ref ?? null) !== (x.notes_ref ?? null)
        || k.col_label_id !== x.col_label_id || k.col_label_en !== x.col_label_en || k.col_order !== x.col_order) {
      throw new Error(`SoCE cell ${x.row_key}/${x.col_key} disagrees with its row or column`);
    }
  }
  const rowValues = socRows.map((x) => `  (${[lit(x.row_key), lit(x.row_label_id), lit(x.row_label_en), num(x.row_order), lit(x.notes_ref ?? null)].join(', ')})`);
  const colValues = socCols.map((x) => `  (${[lit(x.col_key), lit(x.col_label_id), lit(x.col_label_en), num(x.col_order)].join(', ')})`);
  const cellValues = rows.cells.map((x) => `(${[lit(x.row_key), lit(x.col_key), num(x.value), num(x.source_page)].join(', ')})`);
  const cellLines = [];
  for (let i = 0; i < cellValues.length; i += 5) cellLines.push(`  ${cellValues.slice(i, i + 5).join(', ')}`);

  const checkValues = rows.results.map((r) => `  (${[
    lit(r.rule_id), lit(r.statement), lit(r.description), num(r.expected), num(r.actual), num(r.diff),
    r.passed ? 'true' : 'false',
  ].join(', ')})`);

  return `-- =============================================================================
-- ${c.short_name} ${p.period_key.toUpperCase()}: the audited statements, loaded as a draft (Plan 1.5).
--
-- GENERATED by scripts/fs_load.mjs from data/fs/${c.id}/${p.period_key}/statements.json
-- (sha256 ${inputs.statementsSha256})
-- and checks.json, the checker's results on that file: ${checks.counts.rules} rules, ${checks.counts.passed} passed.
-- Do not edit by hand; tests/unit/fs_load.test.ts fails if this file and its
-- sources disagree. The last statement hashes every row inserted and raises
-- unless the hashes equal the ones computed from the sources.
--
-- The period lands as a draft. Only fs_publish_period(), which re-runs the
-- tie-out rules on these rows, publishes it.
--
-- DOWN (lines, cells and checks cascade):
--   DELETE FROM public.fs_period WHERE id = md5(${lit(rows.base)})::uuid;
-- =============================================================================

INSERT INTO public.fs_company (id, legal_name, short_name)
VALUES (${lit(c.id)}, ${lit(c.legal_name)}, ${lit(c.short_name)})
ON CONFLICT (id) DO UPDATE SET legal_name = EXCLUDED.legal_name, short_name = EXCLUDED.short_name;

INSERT INTO public.fs_period
  (id, company_id, period_key, period_end, comparative_end, currency, unit,
   auditor, auditor_report_no, auditor_opinion, source_file, status)
VALUES
  (${[
    pid, lit(c.id), lit(p.period_key), lit(p.period_end), lit(p.comparative_end), lit(p.currency), lit(p.unit),
    lit(p.auditor), lit(p.auditor_report_no), lit(p.auditor_opinion), lit(p.source_file), lit('draft'),
  ].join(', ')});

INSERT INTO public.fs_line
  (id, period_id, statement, parent_id, sort_order, line_type, indent, label_id, label_en,
   notes_ref, value_cy, value_py, computed_cy, computed_py, source_page, line_key, fsli_slug,
   printed_diff_cy, printed_diff_py, printed_diff_note)
SELECT
  md5(${lit(rows.base)} || '/' || v.statement || '/' || v.sort_order)::uuid,
  ${pid},
  v.statement,
  CASE WHEN v.parent_sort IS NULL THEN NULL
       ELSE md5(${lit(rows.base)} || '/' || v.statement || '/' || v.parent_sort)::uuid END,
  v.sort_order, v.line_type, v.indent, v.label_id, v.label_en, v.notes_ref,
  v.value_cy::numeric, v.value_py::numeric, v.computed_cy::numeric, v.computed_py::numeric,
  v.source_page, v.line_key, v.fsli_slug,
  v.printed_diff_cy::numeric, v.printed_diff_py::numeric, v.printed_diff_note
FROM (VALUES
${lineValues.join(',\n')}
) AS v(statement, sort_order, parent_sort, line_type, indent, label_id, label_en, notes_ref,
       value_cy, value_py, computed_cy, computed_py, source_page, line_key, fsli_slug,
       printed_diff_cy, printed_diff_py, printed_diff_note);

INSERT INTO public.fs_soce_cell
  (period_id, row_key, row_label_id, row_label_en, row_order, col_key, col_label_id,
   col_label_en, col_order, value, source_page, notes_ref)
SELECT ${pid}, r.row_key, r.label_id, r.label_en, r.row_order,
       k.col_key, k.label_id, k.label_en, k.col_order, v.value::numeric, v.source_page, r.notes_ref
FROM (VALUES
${cellLines.join(',\n')}
) AS v(row_key, col_key, value, source_page)
JOIN (VALUES
${rowValues.join(',\n')}
) AS r(row_key, label_id, label_en, row_order, notes_ref) USING (row_key)
JOIN (VALUES
${colValues.join(',\n')}
) AS k(col_key, label_id, label_en, col_order) USING (col_key);

-- The checker's run, as fs_check.py reported it (one run_at for the whole run).
INSERT INTO public.fs_check (period_id, rule_id, statement, description, expected, actual, diff, passed)
SELECT ${pid}, v.rule_id, v.statement, v.description,
       v.expected::numeric, v.actual::numeric, v.diff::numeric, v.passed
FROM (VALUES
${checkValues.join(',\n')}
) AS v(rule_id, statement, description, expected, actual, diff, passed);

-- What was inserted is what the sources say, to the character.
DO $verify$
DECLARE
  got_lines  text := ${sqlHash(LINE_HASH_FIELDS, `public.fs_line WHERE period_id = ${pid}`, 'statement COLLATE "C", sort_order')};
  got_cells  text := ${sqlHash(CELL_HASH_FIELDS, `public.fs_soce_cell WHERE period_id = ${pid}`, 'row_order, col_order')};
  got_checks text := ${sqlHash(CHECK_HASH_FIELDS, `public.fs_check WHERE period_id = ${pid}`, 'rule_id COLLATE "C"')};
BEGIN
  IF got_lines <> '${h.lines}' THEN
    RAISE EXCEPTION 'fs_line differs from statements.json (md5 %, expected ${h.lines})', got_lines;
  END IF;
  IF got_cells <> '${h.cells}' THEN
    RAISE EXCEPTION 'fs_soce_cell differs from statements.json (md5 %, expected ${h.cells})', got_cells;
  END IF;
  IF got_checks <> '${h.checks}' THEN
    RAISE EXCEPTION 'fs_check differs from checks.json (md5 %, expected ${h.checks})', got_checks;
  END IF;
END
$verify$;
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [company, period] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!company || !period) {
    console.error('usage: node scripts/fs_load.mjs <company> <period> [--check]');
    process.exit(2);
  }
  const p = paths(company, period);
  let sql;
  try {
    sql = buildLoadSql(readInputs(company, period));
  } catch (e) {
    console.error(`fs_load: refused: ${e.message}`);
    process.exit(1);
  }
  if (process.argv.includes('--check')) {
    if (readFileSync(p.migration, 'utf8') !== sql) {
      console.error(`fs_load: ${p.migration} is out of date; run node scripts/fs_load.mjs ${company} ${period}`);
      process.exit(1);
    }
    console.log(`fs_load: ${p.migration} is up to date`);
  } else {
    writeFileSync(p.migration, sql);
    console.log(`fs_load: wrote ${p.migration}`);
  }
}
