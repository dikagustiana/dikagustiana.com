#!/usr/bin/env python3
"""
fs_check.py: the tie-out checker for audited financial statements (PRD §A6,
Plan 1.3). Python standard library only.

Reads data/fs/<company>/<period>/statements.json and proves the extracted
figures against the statements' own arithmetic: every subtotal and total
against its children, the statement of financial position against itself,
profit or loss down to total comprehensive income, and the four statements
against each other. Nothing is loaded unless this exits 0 (Plan 1.5). The
extractor's reading of the PDF is never trusted on its own.

    python3 scripts/fs_check.py data/fs/phe/fy2024/statements.json
    python3 scripts/fs_check.py statements.json --json results.json
    python3 scripts/fs_check.py statements.json --failures-only

A golden.json beside the statements file (PRD §A6's golden table) is compared
too, unless --no-golden or another --golden is given.

Exit status: 0 when every rule passes, 1 when any rule fails, 2 when the input
cannot be read as a statements file at all.

Input, statements.json
----------------------
  company   {id, legal_name, short_name}
  period    {period_key, period_end, comparative_end, currency, unit,
             auditor, auditor_report_no, auditor_opinion, source_file,
             statement_pages?: {sofp: [first, last], pl_oci: [...], ...}}
  lines     one object per printed line of sofp, pl_oci or cf:
              statement, sort_order (unique per statement), line_type
              (header | item | subtotal | total), indent, label_id, label_en,
              notes_ref, value_cy, value_py (as presented; null when blank),
              parent (the sort_order of the subtotal or total the row sums
              into, or null), line_key (the name the rules find a row by),
              fsli_slug, source_page,
              expect_sign ("negative" on a subtotal or total that a cost or
              expense group sums into), printed_positive (on an item of such a
              group that the FS prints without parentheses: true for both
              years, or the years it does, e.g. ["cy"])
  soce_cells one object per printed cell of the statement of changes in
             equity: row_key, row_label_id, row_label_en, row_order, col_key,
             col_label_id, col_label_en, col_order, value, source_page.
             Balance rows are keyed balance_<year>; the total comprehensive
             income row of a year is tci_<year>; the columns include
             total_parent, nci and total.

Rule ids are RULE:scope:year, year being cy (current) or py (prior):
  FOOT:<stmt>:<row>:<y>       a subtotal or total = the sum of its children
  SOFP-BAL:<y>                total assets = total liabilities + total equity
  SOFP-EQ:<y>                 equity to the parent + NCI = total equity
  PL-GP:<y>                   revenue + total costs of revenue = gross profit
  PL-PBT:<y>                  gross profit + the items below it = profit before tax
  PL-NI:<y>                   profit before tax + income tax = profit for the year
  PL-TCI:<y>                  profit + OCI items = total comprehensive income
  PL-ATTR:profit|tci:<y>      parent + NCI = profit; parent + NCI = TCI
  XS-SOCE-PROFIT:parent|nci:<y>  SoCE TCI row = P&L TCI attributable
  XS-SOCE-BAL:total|nci:<y>   SoCE closing balance = SoFP total equity / NCI
  XS-CF-CASH:<y>              CF closing cash = SoFP cash (only when CF is loaded)
  SOCE-ROW:<row>:<col>        a SoCE row's total columns = the sum of its parts
  SOCE-COL:<col>:<row>        a SoCE balance = the previous balance + movements
  SIGN:<stmt>:<row>:<y>       an item of a cost or expense group is not positive
                              unless the FS prints it positive
  LABEL:<scope>               every line and cell has label_id and label_en
  PAGE:<scope>                every record has its PDF page, within the
                              statement's pages when they are declared
  COVER:<scope>               every item sums into a row or feeds a named rule,
                              so a one-unit error in it cannot pass
  STRUCT:<scope>              the file is well-formed
  GOLDEN:<stmt>.<key>:<y>     a printed figure = PRD §A6's golden value
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

VERTICAL = ('sofp', 'pl_oci', 'cf')
LINE_TYPES = ('header', 'item', 'subtotal', 'total')
SUMS = ('subtotal', 'total')
YEARS = ('cy', 'py')
KEY_RE = re.compile(r'^[a-z0-9_]+$')
SLUG_RE = re.compile(r'^[a-z0-9-]+$')
ISO_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
BALANCE_ROW = re.compile(r'^balance_(\d{4})$')
SOCE_TOTALS = ('total_parent', 'nci', 'total')
REQUIRED = ('sofp', 'pl_oci')

# The line_keys the named rules read. An item that carries one is covered by
# its rule even without a parent (the attribution rows, for instance).
RULE_KEYS = {
    'sofp': {'total_assets', 'total_liabilities', 'total_equity', 'equity_parent', 'nci',
             'total_liabilities_and_equity', 'cash_and_cash_equivalents'},
    'pl_oci': {'revenue', 'total_cost_of_revenue', 'gross_profit', 'profit_before_tax',
               'income_tax', 'profit_for_the_year', 'total_comprehensive_income',
               'profit_parent', 'profit_nci', 'tci_parent', 'tci_nci'},
    'cf': {'cash_end'},
}


class InputError(Exception):
    """The file cannot be read as a statements file at all (exit 2)."""


@dataclass
class Result:
    rule_id: str
    statement: str | None
    description: str
    expected: object = None
    actual: object = None
    diff: object = None
    passed: bool = False


# --- numbers -------------------------------------------------------------------

def is_number(v) -> bool:
    return isinstance(v, (int, Decimal)) and not isinstance(v, bool)


def is_int(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def num(v):
    """A figure for arithmetic: blank is nil, anything else that is not a number
    is None so the rule using it fails."""
    if v is None:
        return 0
    return v if is_number(v) else None


def total(values):
    out = 0
    for v in values:
        if v is None:
            return None
        out += v
    return out


def compare(rule_id, statement, description, expected, actual) -> Result:
    if expected is None or actual is None:
        return Result(rule_id, statement, description, expected, actual, None, False)
    diff = actual - expected
    return Result(rule_id, statement, description, expected, actual, diff, diff == 0)


def fmt(v) -> str:
    if v is None:
        return ''
    if isinstance(v, Decimal) and v == v.to_integral_value():
        v = int(v)
    return f'{v:,}'


# --- reading --------------------------------------------------------------------

def load_json(path):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh, parse_float=Decimal)
    except OSError as e:
        raise InputError(f'cannot read {path}: {e.strerror}') from e
    except json.JSONDecodeError as e:
        raise InputError(f'{path} is not valid JSON: {e}') from e


class Collector:
    """Per-record rules (LABEL, PAGE, COVER, SIGN, STRUCT) report each failing
    record by name, and one passing row per scope when nothing in it failed,
    so the table stays readable and a failure still names its row."""

    def __init__(self, out):
        self.out = out
        self.failures = {}
        self.counts = {}

    def seen(self, rule, scope):
        self.counts[(rule, scope)] = self.counts.get((rule, scope), 0) + 1

    def fail(self, rule, scope, ref, description, statement=None, expected=None, actual=None):
        self.failures.setdefault((rule, scope), []).append(
            Result(f'{rule}:{ref}', statement, description, expected, actual, None, False))

    def flush(self, rule, scope, description, statement=None, skip_if_none=False):
        """skip_if_none: report nothing for a scope with nothing to check, so an
        empty scope does not count as a passed rule."""
        fails = self.failures.pop((rule, scope), [])
        n = self.counts.get((rule, scope), 0)
        if fails:
            self.out.extend(fails)
        elif n or not skip_if_none:
            self.out.append(Result(f'{rule}:{scope}', statement, f'{description} ({n} checked)',
                                   passed=True))


def year_labels(period):
    labels = {}
    for y, field in (('cy', 'period_end'), ('py', 'comparative_end')):
        v = period.get(field)
        labels[y] = v[:4] if isinstance(v, str) and ISO_DATE.match(v) else y
    return labels


# --- the header -----------------------------------------------------------------

def check_header(company, period, col: Collector):
    for field in ('id', 'legal_name', 'short_name'):
        col.seen('STRUCT', 'header')
        v = company.get(field)
        if not isinstance(v, str) or not v.strip():
            col.fail('STRUCT', 'header', f'company.{field}', f'company.{field} is missing or blank')
    if isinstance(company.get('id'), str) and not SLUG_RE.match(company['id']):
        col.fail('STRUCT', 'header', 'company.id', 'company.id must be lower case letters, digits and hyphens')
    for field in ('period_key', 'period_end', 'comparative_end', 'currency', 'unit', 'source_file'):
        col.seen('STRUCT', 'header')
        v = period.get(field)
        if not isinstance(v, str) or not v.strip():
            col.fail('STRUCT', 'header', f'period.{field}', f'period.{field} is missing or blank')
    for field in ('period_end', 'comparative_end'):
        v = period.get(field)
        if isinstance(v, str) and v.strip() and not ISO_DATE.match(v):
            col.fail('STRUCT', 'header', f'period.{field}', f'period.{field} must be an ISO date')
    pe, ce = period.get('period_end'), period.get('comparative_end')
    if isinstance(pe, str) and isinstance(ce, str) and ISO_DATE.match(pe) and ISO_DATE.match(ce) and not ce < pe:
        col.fail('STRUCT', 'header', 'period.comparative_end', 'comparative_end must precede period_end')
    if isinstance(period.get('currency'), str) and not re.match(r'^[A-Z]{3}$', period['currency']):
        col.fail('STRUCT', 'header', 'period.currency', 'currency must be a three-letter ISO code')
    pages = period.get('statement_pages')
    if pages is not None:
        if not isinstance(pages, dict):
            col.fail('STRUCT', 'header', 'period.statement_pages', 'statement_pages must be an object')
        else:
            for stmt, rng in pages.items():
                if not (isinstance(rng, list) and len(rng) == 2 and all(is_int(p) and p > 0 for p in rng)
                        and rng[0] <= rng[1]):
                    col.fail('STRUCT', 'header', f'period.statement_pages.{stmt}',
                             'a statement page range is [first, last], first <= last')
    col.flush('STRUCT', 'header', 'company and period fields are present and well-formed')


def page_ok(page, stmt, pages):
    if not is_int(page) or page <= 0:
        return False
    rng = pages.get(stmt) if isinstance(pages, dict) else None
    if isinstance(rng, list) and len(rng) == 2 and all(is_int(p) for p in rng):
        return rng[0] <= page <= rng[1]
    return True


# --- vertical statements --------------------------------------------------------

def index_lines(lines, pages, col: Collector):
    by_stmt = {s: [] for s in VERTICAL}
    index = {s: {} for s in VERTICAL}
    keyed = {s: {} for s in VERTICAL}

    for i, line in enumerate(lines):
        if not isinstance(line, dict):
            col.seen('STRUCT', 'lines')
            col.fail('STRUCT', 'lines', f'lines[{i}]', 'a line must be an object')
            continue
        stmt, so = line.get('statement'), line.get('sort_order')
        if stmt not in VERTICAL:
            col.seen('STRUCT', 'lines')
            col.fail('STRUCT', 'lines', f'lines[{i}]',
                     f'statement must be one of {", ".join(VERTICAL)}, not {stmt!r}')
            continue
        col.seen('STRUCT', stmt)
        if not is_int(so):
            col.fail('STRUCT', stmt, f'{stmt}:lines[{i}]', 'sort_order must be an integer', stmt)
            continue
        ref = f'{stmt}:{so}'
        if so in index[stmt]:
            col.fail('STRUCT', stmt, ref, f'sort_order {so} appears twice', stmt)
            continue
        index[stmt][so] = line
        by_stmt[stmt].append(line)

        lt = line.get('line_type')
        if lt not in LINE_TYPES:
            col.fail('STRUCT', stmt, ref, f'line_type must be one of {", ".join(LINE_TYPES)}', stmt)

        col.seen('LABEL', stmt)
        if not all(isinstance(line.get(f), str) and line[f].strip() for f in ('label_id', 'label_en')):
            col.fail('LABEL', stmt, ref, 'label_id and label_en must both be non-empty', stmt)

        col.seen('PAGE', stmt)
        if not page_ok(line.get('source_page'), stmt, pages):
            col.fail('PAGE', stmt, ref, f'source_page {line.get("source_page")!r} is not a page of this statement', stmt)

        indent = line.get('indent', 0)
        if not (is_int(indent) and indent >= 0):
            col.fail('STRUCT', stmt, ref, 'indent must be a non-negative integer', stmt)
        for y in YEARS:
            v = line.get(f'value_{y}')
            if v is not None and not is_number(v):
                col.fail('STRUCT', stmt, ref, f'value_{y} must be a number or null', stmt)
        if lt == 'header' and (line.get('value_cy') is not None or line.get('value_py') is not None):
            col.fail('STRUCT', stmt, ref, 'a header row carries no figure', stmt)
        if line.get('notes_ref') is not None and not isinstance(line.get('notes_ref'), str):
            col.fail('STRUCT', stmt, ref, 'notes_ref must be text or null', stmt)
        key = line.get('line_key')
        if key is not None:
            if not (isinstance(key, str) and KEY_RE.match(key)):
                col.fail('STRUCT', stmt, ref, 'line_key must be lower case letters, digits and underscores', stmt)
            elif key in keyed[stmt]:
                col.fail('STRUCT', stmt, ref, f'line_key {key!r} appears twice', stmt)
            else:
                keyed[stmt][key] = line
        slug = line.get('fsli_slug')
        if slug is not None and not (isinstance(slug, str) and SLUG_RE.match(slug)):
            col.fail('STRUCT', stmt, ref, 'fsli_slug must be lower case letters, digits and hyphens', stmt)
        if line.get('expect_sign') not in (None, 'negative'):
            col.fail('STRUCT', stmt, ref, 'expect_sign is "negative" or absent', stmt)
        if line.get('expect_sign') is not None and lt not in SUMS:
            col.fail('STRUCT', stmt, ref, 'expect_sign belongs on the subtotal or total a group sums into', stmt)
        pp = line.get('printed_positive')
        if not (pp in (None, True, False) or (isinstance(pp, list) and set(pp) <= set(YEARS))):
            col.fail('STRUCT', stmt, ref, 'printed_positive is true, false, a list of years or absent', stmt)

    children = {s: {} for s in VERTICAL}
    for stmt in VERTICAL:
        idx = index[stmt]
        for line in by_stmt[stmt]:
            ref = f'{stmt}:{line["sort_order"]}'
            p = line.get('parent')
            if p is None:
                continue
            if line.get('line_type') not in ('item', 'subtotal'):
                col.fail('STRUCT', stmt, ref, 'only an item or a subtotal sums into another row', stmt)
            elif not is_int(p) or p not in idx:
                col.fail('STRUCT', stmt, ref, f'parent {p!r} is not a row of this statement', stmt)
            elif idx[p].get('line_type') not in SUMS:
                col.fail('STRUCT', stmt, ref, f'parent {p} is not a subtotal or total', stmt)
            else:
                children[stmt].setdefault(p, []).append(line)
        for line in by_stmt[stmt]:
            ref = f'{stmt}:{line["sort_order"]}'
            if line.get('line_type') in SUMS and not children[stmt].get(line['sort_order']):
                col.fail('STRUCT', stmt, ref, 'a subtotal or total with no rows summing into it', stmt)
            seen, cur = set(), line
            while cur is not None and is_int(cur.get('parent')) and cur['parent'] in idx:
                if cur['sort_order'] in seen:
                    col.fail('STRUCT', stmt, ref, 'its parents form a cycle', stmt)
                    break
                seen.add(cur['sort_order'])
                cur = idx[cur['parent']]
            if line.get('line_type') == 'item':
                col.seen('COVER', stmt)
                if line.get('parent') is None and line.get('line_key') not in RULE_KEYS[stmt]:
                    col.fail('COVER', stmt, ref,
                             'an item with no parent and no rule key: an error in it would pass unseen', stmt)
    return by_stmt, index, keyed, children


def foot(stmt, rows, children, years, out):
    computed = {}
    for line in sorted(rows, key=lambda r: r['sort_order']):
        if line.get('line_type') not in SUMS:
            continue
        kids = children.get(line['sort_order'], [])
        if not kids:
            continue  # reported under STRUCT
        name = line.get('line_key') or f's{line["sort_order"]}'
        label = line.get('label_en') or name
        comp = {}
        for y in YEARS:
            actual = total(num(k.get(f'value_{y}')) for k in kids)
            comp[y] = actual
            out.append(compare(f'FOOT:{stmt}:{name}:{y}', stmt,
                               f'{label} = sum of its {len(kids)} rows ({years[y]})',
                               num(line.get(f'value_{y}')), actual))
        computed[str(line['sort_order'])] = comp
    return computed


def check_signs(by_stmt, index, col: Collector):
    for stmt in VERTICAL:
        for line in by_stmt[stmt]:
            p = line.get('parent')
            if line.get('line_type') != 'item' or not is_int(p) or p not in index[stmt]:
                continue
            if index[stmt][p].get('expect_sign') != 'negative':
                continue
            ref = f'{stmt}:{line["sort_order"]}'
            pp = line.get('printed_positive')
            positive_years = set(YEARS) if pp is True else set(pp) if isinstance(pp, list) else set()
            for y in YEARS:
                col.seen('SIGN', stmt)
                v = line.get(f'value_{y}')
                if not is_number(v):
                    continue
                if y in positive_years:
                    if v < 0:
                        col.fail('SIGN', stmt, f'{ref}:{y}',
                                 f'marked printed positive but stored negative ({fmt(v)})', stmt, actual=v)
                elif v > 0:
                    col.fail('SIGN', stmt, f'{ref}:{y}',
                             f'positive ({fmt(v)}) in a cost or expense group; the FS prints it in parentheses '
                             f'unless printed_positive says otherwise', stmt, actual=v)
        col.flush('SIGN', stmt, 'items of cost and expense groups carry the sign the FS prints', stmt,
                  skip_if_none=True)


def keyed_value(keyed, stmt, key, y):
    line = keyed.get(stmt, {}).get(key)
    if line is None:
        return None, f"no {stmt} row with line_key '{key}'"
    return num(line.get(f'value_{y}')), None


def identity(out, keyed, rule, stmt, description, years, expected_ref, actual_refs, extra=None):
    """expected_ref and actual_refs are (stmt, key); extra(y) adds a computed
    term to the actual side (the bands under PL-PBT and PL-TCI)."""
    for y in YEARS:
        expected, err = keyed_value(keyed, *expected_ref, y)
        missing = [err] if err else []
        parts = []
        for ref in actual_refs:
            v, e = keyed_value(keyed, *ref, y)
            if e:
                missing.append(e)
            parts.append(v)
        if extra is not None:
            v, e = extra(y)
            if e:
                missing.append(e)
            parts.append(v)
        desc = f'{description} ({years[y]})'
        if missing:
            out.append(Result(f'{rule}:{y}', stmt, f'{desc}: ' + '; '.join(missing)))
        else:
            out.append(compare(f'{rule}:{y}', stmt, desc, expected, total(parts)))


def check_identities(keyed, by_stmt, years, out):
    s, p = 'sofp', 'pl_oci'
    identity(out, keyed, 'SOFP-BAL', s, 'Total assets = total liabilities + total equity', years,
             (s, 'total_assets'), [(s, 'total_liabilities'), (s, 'total_equity')])
    if 'total_liabilities_and_equity' in keyed[s]:
        identity(out, keyed, 'SOFP-BAL:tle', s, 'Total liabilities and equity = total assets', years,
                 (s, 'total_assets'), [(s, 'total_liabilities_and_equity')])
    identity(out, keyed, 'SOFP-EQ', s, 'Equity attributable to the parent + NCI = total equity', years,
             (s, 'total_equity'), [(s, 'equity_parent'), (s, 'nci')])
    identity(out, keyed, 'PL-GP', p, 'Revenue + total costs of revenue = gross profit', years,
             (p, 'gross_profit'), [(p, 'revenue'), (p, 'total_cost_of_revenue')])
    identity(out, keyed, 'PL-PBT', p, 'Gross profit + the items below it = profit before tax', years,
             (p, 'profit_before_tax'), [(p, 'gross_profit')],
             extra=band(keyed, by_stmt, 'gross_profit', 'profit_before_tax'))
    identity(out, keyed, 'PL-NI', p, 'Profit before tax + income tax = profit for the year', years,
             (p, 'profit_for_the_year'), [(p, 'profit_before_tax'), (p, 'income_tax')])
    identity(out, keyed, 'PL-TCI', p, 'Profit for the year + OCI = total comprehensive income', years,
             (p, 'total_comprehensive_income'), [(p, 'profit_for_the_year')],
             extra=band(keyed, by_stmt, 'profit_for_the_year', 'total_comprehensive_income'))
    identity(out, keyed, 'PL-ATTR:profit', p, 'Profit attributable to the parent + NCI = profit for the year', years,
             (p, 'profit_for_the_year'), [(p, 'profit_parent'), (p, 'profit_nci')])
    identity(out, keyed, 'PL-ATTR:tci', p, 'TCI attributable to the parent + NCI = total comprehensive income', years,
             (p, 'total_comprehensive_income'), [(p, 'tci_parent'), (p, 'tci_nci')])


def band(keyed, by_stmt, from_key, to_key):
    """The rows printed strictly between two keyed rows of pl_oci that do not
    sum into another row of the same band, headers aside: the items below gross
    profit, or the OCI items."""

    def term(y):
        a, b = keyed['pl_oci'].get(from_key), keyed['pl_oci'].get(to_key)
        if a is None or b is None:
            return 0, None  # the missing key is reported by the rule itself
        lo, hi = a['sort_order'], b['sort_order']
        inside = [r for r in by_stmt['pl_oci'] if lo < r['sort_order'] < hi]
        orders = {r['sort_order'] for r in inside}
        top = [r for r in inside if r.get('line_type') != 'header' and r.get('parent') not in orders]
        return total(num(r.get(f'value_{y}')) for r in top), None

    return term


# --- statement of changes in equity --------------------------------------------

def index_soce(cells, pages, col: Collector):
    grid, rows, cols = {}, {}, {}
    for i, cell in enumerate(cells):
        col.seen('STRUCT', 'soce')
        if not isinstance(cell, dict):
            col.fail('STRUCT', 'soce', f'soce_cells[{i}]', 'a cell must be an object', 'soce')
            continue
        rk, ck = cell.get('row_key'), cell.get('col_key')
        if not (isinstance(rk, str) and KEY_RE.match(rk) and isinstance(ck, str) and KEY_RE.match(ck)):
            col.fail('STRUCT', 'soce', f'soce_cells[{i}]',
                     'row_key and col_key must be lower case letters, digits and underscores', 'soce')
            continue
        ref = f'soce:{rk}:{ck}'
        if (rk, ck) in grid:
            col.fail('STRUCT', 'soce', ref, 'this cell appears twice', 'soce')
            continue
        grid[(rk, ck)] = cell
        col.seen('LABEL', 'soce')
        if not all(isinstance(cell.get(f), str) and cell[f].strip()
                   for f in ('row_label_id', 'row_label_en', 'col_label_id', 'col_label_en')):
            col.fail('LABEL', 'soce', ref, 'row and column labels must be non-empty in both languages', 'soce')
        col.seen('PAGE', 'soce')
        if not page_ok(cell.get('source_page'), 'soce', pages):
            col.fail('PAGE', 'soce', ref, f'source_page {cell.get("source_page")!r} is not a page of this statement', 'soce')
        if not (is_int(cell.get('row_order')) and is_int(cell.get('col_order'))):
            col.fail('STRUCT', 'soce', ref, 'row_order and col_order must be integers', 'soce')
            continue
        v = cell.get('value')
        if v is not None and not is_number(v):
            col.fail('STRUCT', 'soce', ref, 'value must be a number or null', 'soce')
        row_sig = (cell['row_order'], cell.get('row_label_id'), cell.get('row_label_en'))
        col_sig = (cell['col_order'], cell.get('col_label_id'), cell.get('col_label_en'))
        if rows.setdefault(rk, row_sig) != row_sig:
            col.fail('STRUCT', 'soce', ref, f'row {rk} has differing order or labels across its cells', 'soce')
        if cols.setdefault(ck, col_sig) != col_sig:
            col.fail('STRUCT', 'soce', ref, f'column {ck} has differing order or labels across its cells', 'soce')
    if not grid:
        col.fail('STRUCT', 'soce', 'present', 'no statement of changes in equity')
    else:
        missing = [c for c in SOCE_TOTALS if c not in cols]
        if missing:
            col.fail('STRUCT', 'soce', 'columns', f'missing column(s): {", ".join(missing)}', 'soce')
        if len([r for r in rows if BALANCE_ROW.match(r)]) < 2:
            col.fail('STRUCT', 'soce', 'balances', 'needs an opening and a closing balance_<year> row', 'soce')
    return grid, rows, cols


def soce_value(grid, rk, ck):
    cell = grid.get((rk, ck))
    return 0 if cell is None else num(cell.get('value'))


def check_soce(grid, rows, cols, out):
    if not grid or any(c not in cols for c in SOCE_TOTALS):
        return
    parts = [c for c in sorted(cols, key=lambda c: cols[c][0]) if c not in SOCE_TOTALS]
    order = sorted(rows, key=lambda r: rows[r][0])
    for rk in order:
        label = rows[rk][2]
        out.append(compare(f'SOCE-ROW:{rk}:total_parent', 'soce',
                           f'{label}: the parent\'s columns sum to its total',
                           soce_value(grid, rk, 'total_parent'),
                           total(soce_value(grid, rk, c) for c in parts)))
        out.append(compare(f'SOCE-ROW:{rk}:total', 'soce', f'{label}: parent total + NCI = total',
                           soce_value(grid, rk, 'total'),
                           total([soce_value(grid, rk, 'total_parent'), soce_value(grid, rk, 'nci')])))
    balances = [rk for rk in order if BALANCE_ROW.match(rk)]
    for prev, cur in zip(balances, balances[1:]):
        lo, hi = rows[prev][0], rows[cur][0]
        moves = [rk for rk in order if lo < rows[rk][0] < hi]
        for ck in sorted(cols, key=lambda c: cols[c][0]):
            out.append(compare(f'SOCE-COL:{ck}:{cur}', 'soce',
                               f'{cols[ck][2]}: {rows[cur][2]} = {rows[prev][2]} + {len(moves)} movements',
                               soce_value(grid, cur, ck),
                               total([soce_value(grid, prev, ck)] + [soce_value(grid, rk, ck) for rk in moves])))


def check_xs_soce(grid, rows, keyed, years, out):
    if not grid:
        return
    for y in YEARS:
        yr = years[y]
        for scope, key, col_key in (('parent', 'tci_parent', 'total_parent'), ('nci', 'tci_nci', 'nci')):
            expected, err = keyed_value(keyed, 'pl_oci', key, y)
            row = f'tci_{yr}'
            desc = f'SoCE {row} ({col_key}) = P&L {key} ({yr})'
            if err or row not in rows:
                out.append(Result(f'XS-SOCE-PROFIT:{scope}:{y}', 'soce',
                                  f'{desc}: ' + (err or f"no SoCE row '{row}'")))
            else:
                out.append(compare(f'XS-SOCE-PROFIT:{scope}:{y}', 'soce', desc, expected,
                                   soce_value(grid, row, col_key)))
        for scope, key, col_key in (('total', 'total_equity', 'total'), ('nci', 'nci', 'nci')):
            expected, err = keyed_value(keyed, 'sofp', key, y)
            row = f'balance_{yr}'
            desc = f'SoCE {row} ({col_key}) = SoFP {key} ({yr})'
            if err or row not in rows:
                out.append(Result(f'XS-SOCE-BAL:{scope}:{y}', 'soce',
                                  f'{desc}: ' + (err or f"no SoCE row '{row}'")))
            else:
                out.append(compare(f'XS-SOCE-BAL:{scope}:{y}', 'soce', desc, expected,
                                   soce_value(grid, row, col_key)))


def check_xs_cf(keyed, years, out):
    for y in YEARS:
        expected, err1 = keyed_value(keyed, 'sofp', 'cash_and_cash_equivalents', y)
        actual, err2 = keyed_value(keyed, 'cf', 'cash_end', y)
        desc = f'Cash flow closing cash = SoFP cash and cash equivalents ({years[y]})'
        if err1 or err2:
            out.append(Result(f'XS-CF-CASH:{y}', 'cf', f'{desc}: ' + '; '.join(e for e in (err1, err2) if e)))
        else:
            out.append(compare(f'XS-CF-CASH:{y}', 'cf', desc, expected, actual))


# --- golden values --------------------------------------------------------------

def check_golden(golden, period, keyed, years, out):
    values = golden.get('values') if isinstance(golden, dict) else None
    if not isinstance(values, dict):
        out.append(Result('GOLDEN:file', None, 'the golden file has no "values" object'))
        return
    unit = golden.get('unit')
    if unit is not None and unit != period.get('unit'):
        out.append(Result('GOLDEN:unit', None, f'golden unit {unit!r} differs from the period unit {period.get("unit")!r}'))
    for name, pair in values.items():
        stmt, _, key = name.partition('.')
        if not (isinstance(pair, list) and len(pair) == 2 and all(is_number(v) for v in pair)):
            out.append(Result(f'GOLDEN:{name}', stmt or None, f'{name}: a golden value is [current, prior]'))
            continue
        for y, golden_value in zip(YEARS, pair):
            actual, err = keyed_value(keyed, stmt, key, y)
            desc = f'{name} = PRD §A6 golden value ({years[y]})'
            if err:
                out.append(Result(f'GOLDEN:{name}:{y}', stmt, f'{desc}: {err}', golden_value))
            else:
                out.append(compare(f'GOLDEN:{name}:{y}', stmt, desc, golden_value, actual))


# --- the run --------------------------------------------------------------------

def run(data, golden=None):
    """Every rule over one statements file. Returns (results, computed), where
    computed maps statement -> sort_order -> {cy, py}: the sum of each subtotal's
    and total's children, which the loader stores as computed_*."""
    if not isinstance(data, dict):
        raise InputError('the statements file must be a JSON object')
    company, period = data.get('company'), data.get('period')
    if not isinstance(company, dict) or not isinstance(period, dict):
        raise InputError('the statements file needs "company" and "period" objects')
    lines = data.get('lines')
    if not isinstance(lines, list):
        raise InputError('the statements file needs a "lines" list')
    cells = data.get('soce_cells', [])
    if not isinstance(cells, list):
        raise InputError('"soce_cells" must be a list')

    out = []
    col = Collector(out)
    years = year_labels(period)
    pages = period.get('statement_pages') or {}
    check_header(company, period, col)

    by_stmt, index, keyed, children = index_lines(lines, pages, col)
    for stmt in REQUIRED:
        if not by_stmt[stmt]:
            col.seen('STRUCT', stmt)
            col.fail('STRUCT', stmt, f'{stmt}:present', f'no {stmt} lines', stmt)
    for stmt in VERTICAL:
        if by_stmt[stmt] or stmt in REQUIRED:
            col.flush('STRUCT', stmt, 'lines are well-formed and every parent is a subtotal or total', stmt)
            col.flush('LABEL', stmt, 'every line has label_id and label_en', stmt)
            col.flush('PAGE', stmt, 'every line has its PDF page', stmt)
            col.flush('COVER', stmt, 'every item sums into a row or feeds a named rule', stmt)
    if col.failures.get(('STRUCT', 'lines')):
        col.flush('STRUCT', 'lines', 'every line names its statement')

    grid, rows, cols = index_soce(cells, pages, col)
    col.flush('STRUCT', 'soce', 'cells are well-formed, with the balance rows and total columns', 'soce')
    if grid:
        col.flush('LABEL', 'soce', 'every cell has row and column labels in both languages', 'soce')
        col.flush('PAGE', 'soce', 'every cell has its PDF page', 'soce')

    computed = {stmt: foot(stmt, by_stmt[stmt], children[stmt], years, out) for stmt in VERTICAL}
    check_signs(by_stmt, index, col)
    check_identities(keyed, by_stmt, years, out)
    check_soce(grid, rows, cols, out)
    check_xs_soce(grid, rows, keyed, years, out)
    if by_stmt['cf']:
        check_xs_cf(keyed, years, out)
    if golden is not None:
        check_golden(golden, period, keyed, years, out)
    return out, computed


# --- output ---------------------------------------------------------------------

def table(results, failures_only=False) -> str:
    shown = [r for r in results if not (failures_only and r.passed)]
    head = ('RULE', 'EXPECTED', 'ACTUAL', 'DIFF', 'RESULT')
    rows = [(r.rule_id, fmt(r.expected), fmt(r.actual), fmt(r.diff), 'pass' if r.passed else 'FAIL')
            for r in shown]
    widths = [max([len(head[i])] + [len(row[i]) for row in rows]) for i in range(5)]
    lines = []
    for row in [head] + rows:
        lines.append('  '.join([row[0].ljust(widths[0])] + [row[i].rjust(widths[i]) for i in range(1, 4)]
                               + [row[4]]))
    failed = [r for r in results if not r.passed]
    lines.append('')
    lines.append(f'{len(results)} rules: {len(results) - len(failed)} passed, {len(failed)} failed.')
    for r in failed:
        lines.append(f'FAIL {r.rule_id}: {r.description}')
    return '\n'.join(lines)


def to_json_number(v):
    if isinstance(v, Decimal):
        return int(v) if v == v.to_integral_value() else str(v)
    return v


def sha256(path) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


def report(results, computed, statements_path, golden_path) -> dict:
    failed = [r for r in results if not r.passed]
    return {
        'checker': 'scripts/fs_check.py',
        'input': str(statements_path),
        'input_sha256': sha256(statements_path),
        'golden': str(golden_path) if golden_path else None,
        'golden_sha256': sha256(golden_path) if golden_path else None,
        'passed': not failed,
        'counts': {'rules': len(results), 'passed': len(results) - len(failed), 'failed': len(failed)},
        'results': [
            {
                'rule_id': r.rule_id,
                'statement': r.statement,
                'description': r.description,
                'expected': to_json_number(r.expected),
                'actual': to_json_number(r.actual),
                'diff': to_json_number(r.diff),
                'passed': r.passed,
            }
            for r in results
        ],
        'computed': {
            stmt: {so: {y: to_json_number(v) for y, v in comp.items()} for so, comp in rows.items()}
            for stmt, rows in computed.items()
        },
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description='Tie-out checker for audited financial statements (PRD §A6).')
    ap.add_argument('statements', help='path to statements.json')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--golden', help='golden values to compare (default: golden.json beside the statements file)')
    g.add_argument('--no-golden', action='store_true', help='compare no golden values')
    ap.add_argument('--json', dest='json_out', help='write the results, with computed totals, to this file')
    ap.add_argument('--failures-only', action='store_true', help='print only the failing rules')
    args = ap.parse_args(argv)

    statements_path = Path(args.statements)
    golden_path = None
    if args.golden:
        golden_path = Path(args.golden)
    elif not args.no_golden:
        beside = statements_path.parent / 'golden.json'
        golden_path = beside if beside.exists() else None

    try:
        data = load_json(statements_path)
        golden = load_json(golden_path) if golden_path else None
        results, computed = run(data, golden)
    except InputError as e:
        print(f'fs_check: {e}', file=sys.stderr)
        return 2

    print(table(results, args.failures_only))
    if args.json_out:
        with open(args.json_out, 'w', encoding='utf-8') as fh:
            json.dump(report(results, computed, statements_path, golden_path), fh, indent=2, ensure_ascii=False)
            fh.write('\n')
    return 0 if all(r.passed for r in results) else 1


if __name__ == '__main__':
    sys.exit(main())
