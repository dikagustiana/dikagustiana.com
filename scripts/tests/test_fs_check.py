"""
Tests for scripts/fs_check.py (Plan 1.3). Standard library only:

    python3 -m unittest discover -s scripts/tests

The fixture, fixtures/golden_fixture.json, is synthetic: its totals are PRD
§A6's golden values for PHE FY2024 and everything under them is invented so the
statements foot and cross-check. It exists so the checker is proven before a
single figure is read from the PDF (Plan 1.3, "checker first").
"""

import copy
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE.parent))

import fs_check  # noqa: E402

FIXTURE = HERE / 'fixtures' / 'golden_fixture.json'
GOLDEN = ROOT / 'data' / 'fs' / 'phe' / 'fy2024' / 'golden.json'
SCRIPT = HERE.parent / 'fs_check.py'

# Items with no parent are caught by the rule that reads their line_key.
RULE_FOR_KEY = {
    'profit_parent': 'PL-ATTR:profit',
    'profit_nci': 'PL-ATTR:profit',
    'tci_parent': 'PL-ATTR:tci',
    'tci_nci': 'PL-ATTR:tci',
}


def fixture():
    return fs_check.load_json(FIXTURE)


def golden():
    return fs_check.load_json(GOLDEN)


def failing(data, golden_values=None):
    results, _ = fs_check.run(data, golden_values)
    return [r.rule_id for r in results if not r.passed]


def line(data, stmt, sort_order):
    return next(l for l in data['lines'] if l['statement'] == stmt and l['sort_order'] == sort_order)


def keyed(data, stmt, key):
    return next(l for l in data['lines'] if l['statement'] == stmt and l.get('line_key') == key)


def cell(data, row_key, col_key):
    return next(c for c in data['soce_cells'] if c['row_key'] == row_key and c['col_key'] == col_key)


def row_name(data, stmt, sort_order):
    target = line(data, stmt, sort_order)
    return target.get('line_key') or f's{sort_order}'


class GoldenFixture(unittest.TestCase):
    """Plan 1.3 (a): the golden fixture passes."""

    def test_every_rule_passes(self):
        self.assertEqual(failing(fixture(), golden()), [])

    def test_the_golden_table_matches_to_the_unit(self):
        results, _ = fs_check.run(fixture(), golden())
        rows = [r for r in results if r.rule_id.startswith('GOLDEN:')]
        self.assertEqual(len(rows), 2 * len(golden()['values']))
        self.assertTrue(all(r.passed and r.diff == 0 for r in rows))

    def test_every_rule_family_in_the_prd_runs(self):
        results, _ = fs_check.run(fixture(), golden())
        families = {r.rule_id.split(':')[0] for r in results}
        for family in ('FOOT', 'SOFP-BAL', 'SOFP-EQ', 'PL-GP', 'PL-PBT', 'PL-NI', 'PL-TCI', 'PL-ATTR',
                       'XS-SOCE-PROFIT', 'XS-SOCE-BAL', 'XS-CF-CASH', 'SIGN', 'LABEL',
                       'SOCE-ROW', 'SOCE-COL', 'PAGE', 'COVER', 'STRUCT', 'GOLDEN'):
            self.assertIn(family, families)

    def test_computed_totals_equal_the_printed_ones(self):
        data = fixture()
        _, computed = fs_check.run(data, None)
        sums = [l for l in data['lines'] if l['line_type'] in ('subtotal', 'total')]
        self.assertEqual(sum(len(v) for v in computed.values()), len(sums))
        for l in sums:
            got = computed[l['statement']][str(l['sort_order'])]
            self.assertEqual(got, {'cy': l['value_cy'], 'py': l['value_py']}, l['label_en'])


class OneUnitErrors(unittest.TestCase):
    """PRD §A8 and Plan 1.3 (b): a deliberate 1-unit error in any item makes
    the checker fail and name the failing rule. Every item, both years, both
    directions, not a random sample."""

    def expected_rule(self, data, item, y):
        if item.get('parent') is not None:
            return f'FOOT:{item["statement"]}:{row_name(data, item["statement"], item["parent"])}:{y}'
        return f'{RULE_FOR_KEY[item["line_key"]]}:{y}'

    def test_every_item(self):
        base = fixture()
        items = [i for i, l in enumerate(base['lines']) if l['line_type'] == 'item']
        self.assertGreaterEqual(len(items), 30)
        for i in items:
            for y in ('cy', 'py'):
                for delta in (1, -1):
                    data = copy.deepcopy(base)
                    item = data['lines'][i]
                    item[f'value_{y}'] = (item[f'value_{y}'] or 0) + delta
                    with self.subTest(item=f'{item["statement"]}:{item["sort_order"]}', year=y, delta=delta):
                        self.assertIn(self.expected_rule(base, base['lines'][i], y), failing(data))

    def test_every_subtotal_and_total(self):
        base = fixture()
        for i, l in enumerate(base['lines']):
            if l['line_type'] not in ('subtotal', 'total'):
                continue
            for y in ('cy', 'py'):
                data = copy.deepcopy(base)
                data['lines'][i][f'value_{y}'] += 1
                with self.subTest(row=f'{l["statement"]}:{l["sort_order"]}', year=y):
                    self.assertIn(f'FOOT:{l["statement"]}:{row_name(base, l["statement"], l["sort_order"])}:{y}',
                                  failing(data))

    def test_every_soce_cell(self):
        base = fixture()
        for i, c in enumerate(base['soce_cells']):
            data = copy.deepcopy(base)
            data['soce_cells'][i]['value'] = (c['value'] or 0) + 1
            fails = failing(data)
            with self.subTest(cell=f'{c["row_key"]}:{c["col_key"]}'):
                self.assertTrue(
                    any(f.startswith(f'SOCE-ROW:{c["row_key"]}:') for f in fails)
                    or any(f.startswith(f'SOCE-COL:{c["col_key"]}:') for f in fails),
                    fails)

    def test_the_command_exits_non_zero_and_names_the_rule(self):
        data = fixture()
        line(data, 'sofp', 30)['value_cy'] += 1  # cash and cash equivalents
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'statements.json'
            path.write_text(json.dumps(data, default=str))
            proc = subprocess.run([sys.executable, str(SCRIPT), str(path), '--no-golden'],
                                  capture_output=True, text=True)
        self.assertEqual(proc.returncode, 1)
        self.assertIn('FAIL FOOT:sofp:total_current_assets:cy', proc.stdout)
        self.assertIn('FAIL XS-CF-CASH:cy', proc.stdout)


class Labels(unittest.TestCase):
    """Plan 1.3 (c): a missing label fails LABEL."""

    def test_missing_label_id(self):
        data = fixture()
        del line(data, 'sofp', 30)['label_id']
        self.assertIn('LABEL:sofp:30', failing(data))

    def test_blank_label_en(self):
        data = fixture()
        line(data, 'pl_oci', 70)['label_en'] = '   '
        self.assertIn('LABEL:pl_oci:70', failing(data))

    def test_blank_soce_label(self):
        data = fixture()
        cell(data, 'tci_2024', 'nci')['col_label_id'] = ''
        self.assertIn('LABEL:soce:tci_2024:nci', failing(data))


class NamedRules(unittest.TestCase):
    """Each rule of PRD §A6 fails when its own identity breaks, including where
    every subtotal still foots."""

    def test_sofp_bal_catches_an_imbalance_the_foots_cannot(self):
        data = fixture()
        for sort_order in (170, 190, 200, 290):  # a loan, and every total above it
            line(data, 'sofp', sort_order)['value_cy'] += 1
        fails = failing(data)
        self.assertIn('SOFP-BAL:cy', fails)
        self.assertFalse([f for f in fails if f.startswith('FOOT:')], fails)

    def test_sofp_eq(self):
        data = fixture()
        keyed(data, 'sofp', 'equity_parent')['value_py'] += 5
        self.assertIn('SOFP-EQ:py', failing(data))

    def test_pl_rules(self):
        for key, rule in (('gross_profit', 'PL-GP'), ('profit_before_tax', 'PL-PBT'),
                          ('profit_for_the_year', 'PL-NI'), ('total_comprehensive_income', 'PL-TCI')):
            data = fixture()
            keyed(data, 'pl_oci', key)['value_cy'] += 1
            with self.subTest(rule=rule):
                self.assertIn(f'{rule}:cy', failing(data))

    def test_pl_pbt_reads_the_rows_between_gross_profit_and_profit_before_tax(self):
        # Re-parenting an item below gross profit to nothing breaks the foot of
        # profit before tax but not PL-PBT, which reads the printed band.
        data = fixture()
        line(data, 'pl_oci', 80)['parent'] = None
        line(data, 'pl_oci', 80)['line_key'] = 'finance_costs_fixture'
        fails = failing(data)
        self.assertIn('FOOT:pl_oci:profit_before_tax:cy', fails)
        self.assertNotIn('PL-PBT:cy', fails)

    def test_pl_attr(self):
        data = fixture()
        keyed(data, 'pl_oci', 'tci_nci')['value_py'] -= 1
        fails = failing(data)
        self.assertIn('PL-ATTR:tci:py', fails)
        self.assertIn('XS-SOCE-PROFIT:nci:py', fails)

    def test_xs_soce_profit(self):
        data = fixture()
        keyed(data, 'pl_oci', 'tci_parent')['value_cy'] += 1
        self.assertIn('XS-SOCE-PROFIT:parent:cy', failing(data))

    def test_xs_soce_bal_catches_a_soce_that_foots_but_disagrees(self):
        data = fixture()
        for col_key in ('nci', 'total'):
            cell(data, 'balance_2022', col_key)['value'] += 7
            for row_key in ('balance_2023', 'balance_2024'):
                cell(data, row_key, col_key)['value'] += 7
        fails = failing(data)
        self.assertIn('XS-SOCE-BAL:nci:cy', fails)
        self.assertIn('XS-SOCE-BAL:total:py', fails)
        self.assertFalse([f for f in fails if f.startswith('SOCE-')], fails)

    def test_xs_cf_cash_catches_a_cash_flow_that_foots_but_disagrees(self):
        data = fixture()
        line(data, 'cf', 50)['value_cy'] += 3  # opening cash
        line(data, 'cf', 70)['value_cy'] += 3  # closing cash
        fails = failing(data)
        self.assertEqual(fails, ['XS-CF-CASH:cy'])

    def test_xs_cf_cash_runs_only_when_the_cash_flow_is_loaded(self):
        data = fixture()
        data['lines'] = [l for l in data['lines'] if l['statement'] != 'cf']
        results, _ = fs_check.run(data, golden())
        self.assertFalse([r for r in results if r.rule_id.startswith('XS-CF-CASH')])
        self.assertTrue(all(r.passed for r in results))

    def test_a_missing_key_fails_its_rule_and_says_which(self):
        data = fixture()
        keyed(data, 'sofp', 'nci')['line_key'] = None
        results, _ = fs_check.run(data, None)
        rule = next(r for r in results if r.rule_id == 'SOFP-EQ:cy')
        self.assertFalse(rule.passed)
        self.assertIn("line_key 'nci'", rule.description)


class Signs(unittest.TestCase):
    def test_a_positive_cost_fails(self):
        data = fixture()
        line(data, 'pl_oci', 30)['value_cy'] = 2500000
        self.assertIn('SIGN:pl_oci:30:cy', failing(data))

    def test_printed_positive_exempts_it(self):
        data = fixture()
        line(data, 'pl_oci', 30).update(value_cy=2500000, value_py=2400000, printed_positive=True)
        self.assertFalse([f for f in failing(data) if f.startswith('SIGN:')])

    def test_printed_positive_for_one_year_only(self):
        data = fixture()
        line(data, 'pl_oci', 30).update(value_cy=2500000, printed_positive=['cy'])
        self.assertFalse([f for f in failing(data) if f.startswith('SIGN:')])
        line(data, 'pl_oci', 30)['value_py'] = 2400000
        self.assertIn('SIGN:pl_oci:30:py', failing(data))

    def test_printed_positive_on_a_negative_figure_fails(self):
        data = fixture()
        line(data, 'pl_oci', 20)['printed_positive'] = True
        self.assertIn('SIGN:pl_oci:20:cy', failing(data))

    def test_items_outside_cost_groups_may_be_positive(self):
        data = fixture()
        self.assertGreater(line(data, 'pl_oci', 70)['value_cy'], 0)  # finance income
        self.assertFalse([f for f in failing(data) if f.startswith('SIGN:')])


class Structure(unittest.TestCase):
    def assertFails(self, data, rule_id):
        self.assertIn(rule_id, failing(data))

    def test_no_record_without_its_page(self):
        data = fixture()
        del line(data, 'sofp', 40)['source_page']
        self.assertFails(data, 'PAGE:sofp:40')

    def test_a_page_outside_the_statement(self):
        data = fixture()
        line(data, 'pl_oci', 10)['source_page'] = 11
        self.assertFails(data, 'PAGE:pl_oci:10')

    def test_a_soce_cell_without_its_page(self):
        data = fixture()
        cell(data, 'tci_2024', 'oci')['source_page'] = 0
        self.assertFails(data, 'PAGE:soce:tci_2024:oci')

    def test_parent_not_in_the_statement(self):
        data = fixture()
        line(data, 'sofp', 30)['parent'] = 999
        self.assertFails(data, 'STRUCT:sofp:30')

    def test_parent_that_is_an_item(self):
        data = fixture()
        line(data, 'sofp', 30)['parent'] = 40
        self.assertFails(data, 'STRUCT:sofp:30')

    def test_a_total_cannot_sum_into_another_row(self):
        data = fixture()
        line(data, 'sofp', 100)['parent'] = 290
        self.assertFails(data, 'STRUCT:sofp:100')

    def test_duplicate_sort_order(self):
        data = fixture()
        data['lines'].append(dict(line(data, 'sofp', 30)))
        self.assertFails(data, 'STRUCT:sofp:30')

    def test_duplicate_line_key(self):
        data = fixture()
        line(data, 'sofp', 40)['line_key'] = 'cash_and_cash_equivalents'
        self.assertFails(data, 'STRUCT:sofp:40')

    def test_a_header_with_a_figure(self):
        data = fixture()
        line(data, 'sofp', 10)['value_cy'] = 1
        self.assertFails(data, 'STRUCT:sofp:10')

    def test_a_subtotal_with_nothing_under_it(self):
        data = fixture()
        for sort_order in (30, 40):
            line(data, 'sofp', sort_order)['parent'] = None
        fails = failing(data)
        self.assertIn('STRUCT:sofp:50', fails)

    def test_a_cycle(self):
        data = fixture()
        line(data, 'sofp', 50)['parent'] = 90
        line(data, 'sofp', 90)['parent'] = 50
        self.assertFails(data, 'STRUCT:sofp:50')

    def test_a_figure_that_is_not_a_number(self):
        data = fixture()
        line(data, 'sofp', 30)['value_cy'] = '2,000,000'
        self.assertFails(data, 'STRUCT:sofp:30')

    def test_an_item_no_rule_would_catch(self):
        data = fixture()
        line(data, 'sofp', 40)['parent'] = None
        self.assertFails(data, 'COVER:sofp:40')

    def test_sofp_and_pl_are_required(self):
        data = fixture()
        data['lines'] = [l for l in data['lines'] if l['statement'] != 'pl_oci']
        self.assertFails(data, 'STRUCT:pl_oci:present')

    def test_the_soce_is_required(self):
        data = fixture()
        data['soce_cells'] = []
        self.assertFails(data, 'STRUCT:present')

    def test_the_soce_needs_its_total_columns(self):
        data = fixture()
        data['soce_cells'] = [c for c in data['soce_cells'] if c['col_key'] != 'nci']
        self.assertFails(data, 'STRUCT:columns')

    def test_the_soce_needs_two_balances(self):
        data = fixture()
        data['soce_cells'] = [c for c in data['soce_cells'] if c['row_key'] not in ('balance_2022', 'balance_2023')]
        self.assertFails(data, 'STRUCT:balances')

    def test_period_fields(self):
        data = fixture()
        data['period']['comparative_end'] = '2025-12-31'
        self.assertFails(data, 'STRUCT:period.comparative_end')


class Golden(unittest.TestCase):
    def test_a_golden_value_one_unit_off_fails(self):
        g = golden()
        g['values']['sofp.total_assets'][1] += 1
        self.assertEqual(failing(fixture(), g), ['GOLDEN:sofp.total_assets:py'])

    def test_a_golden_key_with_no_row_fails(self):
        data = fixture()
        keyed(data, 'pl_oci', 'revenue')['line_key'] = 'revenues'
        self.assertIn('GOLDEN:pl_oci.revenue:cy', failing(data, golden()))

    def test_a_unit_mismatch_fails(self):
        g = golden()
        g['unit'] = 'millions'
        self.assertIn('GOLDEN:unit', failing(fixture(), g))


class CommandLine(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)], capture_output=True, text=True)

    def test_exit_zero_on_the_fixture(self):
        proc = self.run_cli(FIXTURE, '--golden', GOLDEN)
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertRegex(proc.stdout, r'\d+ rules: \d+ passed, 0 failed\.')

    def test_exit_two_on_unreadable_input(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / 'statements.json'
            bad.write_text('{not json')
            self.assertEqual(self.run_cli(bad).returncode, 2)
            bad.write_text('{"company": {}, "period": {}}')
            self.assertEqual(self.run_cli(bad).returncode, 2)
        self.assertEqual(self.run_cli(Path('/nonexistent/statements.json')).returncode, 2)

    def test_golden_json_beside_the_file_is_used_unless_told_not_to(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'statements.json'
            path.write_text(FIXTURE.read_text())
            g = golden()
            g['values']['pl_oci.revenue'][0] += 1
            (Path(tmp) / 'golden.json').write_text(json.dumps(g))
            proc = self.run_cli(path)
            self.assertEqual(proc.returncode, 1)
            self.assertIn('FAIL GOLDEN:pl_oci.revenue:cy', proc.stdout)
            self.assertEqual(self.run_cli(path, '--no-golden').returncode, 0)

    def test_json_output_for_the_loader(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / 'results.json'
            proc = self.run_cli(FIXTURE, '--golden', GOLDEN, '--json', out)
            self.assertEqual(proc.returncode, 0)
            rep = json.loads(out.read_text())
        self.assertTrue(rep['passed'])
        self.assertEqual(rep['input_sha256'], hashlib.sha256(FIXTURE.read_bytes()).hexdigest())
        self.assertEqual(rep['golden_sha256'], hashlib.sha256(GOLDEN.read_bytes()).hexdigest())
        self.assertEqual(rep['counts']['failed'], 0)
        self.assertEqual(rep['counts']['rules'], len(rep['results']))
        first = rep['results'][0]
        self.assertEqual(set(first), {'rule_id', 'statement', 'description', 'expected', 'actual', 'diff', 'passed'})
        self.assertEqual(rep['computed']['sofp']['100'], {'cy': 30434955, 'py': 30888916})

    def test_failures_only(self):
        data = fixture()
        line(data, 'sofp', 30)['value_cy'] += 1
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'statements.json'
            path.write_text(json.dumps(data, default=str))
            proc = self.run_cli(path, '--no-golden', '--failures-only')
        table = proc.stdout.split('\n\n')[0]
        self.assertNotIn(' pass', table)
        self.assertIn('FOOT:sofp:total_current_assets:cy', table)


if __name__ == '__main__':
    unittest.main()
