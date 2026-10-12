-- =============================================================================
-- The publish gate (Plan 1.7; PRD §A6 step 5).
--
-- fs_tieout(period) re-runs the tie-out rules in SQL against the rows the
-- database holds, the same arithmetic scripts/fs_check.py runs on
-- statements.json before the load:
--
--   FOOT, DECLARED      every subtotal and total against its rows, passing at
--                       a declared printed difference (fs_line.printed_diff_*)
--                       and at no other
--   SOFP-BAL, SOFP-EQ   the statement of financial position against itself
--   PL-GP .. PL-ATTR    profit or loss down to total comprehensive income
--   SOCE-ROW, SOCE-COL  the statement of changes in equity across and down
--   XS-SOCE-*, XS-CF-CASH  the statements against each other
--   COVER, STRUCT       an item no rule reads; a parent that is not a sum, a
--                       sum with no rows, a cycle; a SoCE without its totals
--
-- Rule ids, figures and descriptions are the checker's, so a run here can be
-- compared with checks.json row for row (docs/db/verify/04_fs_publish_gate.sql
-- does). Not re-run here: LABEL and PAGE, which the table constraints enforce;
-- SIGN, which needs the extraction's expect_sign marks; GOLDEN, which compares
-- against PRD §A6's fixture. Those ran in the checker before the load, and its
-- run is the period's first fs_check run.
--
-- fs_run_publish_gate(period) writes one fs_check run from fs_tieout and moves
-- the period to published only when the run has rules and none failed. The run
-- is kept either way. It checks no caller: EXECUTE is held back from anon and
-- authenticated, so it is reachable only as the database owner (a migration,
-- the Supabase MCP) or through fs_publish_period.
--
-- fs_publish_period(period) is the app's admin action: the admin check, then
-- fs_run_publish_gate. Granted to authenticated; a caller who is not an admin
-- gets an error and nothing is written.
--
-- All three run with an empty search_path and name every object by schema.
--
-- DOWN:
--   DROP FUNCTION public.fs_publish_period(uuid);
--   DROP FUNCTION public.fs_run_publish_gate(uuid);
--   DROP FUNCTION public.fs_tieout(uuid);
-- =============================================================================

CREATE FUNCTION public.fs_tieout(p_period_id uuid)
RETURNS TABLE (
  rule_id     text,
  statement   text,
  description text,
  expected    numeric,
  actual      numeric,
  diff        numeric,
  passed      boolean
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $fn$
#variable_conflict use_column
DECLARE
  yr_cy text;
  yr_py text;
BEGIN
  SELECT to_char(p.period_end, 'YYYY'), to_char(p.comparative_end, 'YYYY')
    INTO yr_cy, yr_py
    FROM public.fs_period p
   WHERE p.id = p_period_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no fs_period %', p_period_id USING ERRCODE = 'no_data_found';
  END IF;

  -- STRUCT and COVER on the vertical statements. One passing row per
  -- statement, or one failing row per offending line.
  RETURN QUERY
  WITH RECURSIVE stmts(statement, required) AS (VALUES ('sofp', true), ('pl_oci', true), ('cf', false)),
  l AS (
    SELECT x.*, par.sort_order AS parent_sort, par.line_type AS parent_type
      FROM public.fs_line x
      LEFT JOIN public.fs_line par ON par.id = x.parent_id
     WHERE x.period_id = p_period_id
  ),
  -- Walks up from every line; a line met again on its own path is a cycle.
  walk(start_id, statement, start_sort, cur_id, path, cyclic) AS (
    SELECT l.id, l.statement, l.sort_order, l.parent_id, ARRAY[l.id], false FROM l
    UNION ALL
    SELECT w.start_id, w.statement, w.start_sort, p.parent_id, w.path || p.id, p.id = ANY (w.path)
      FROM walk w
      JOIN public.fs_line p ON p.id = w.cur_id
     WHERE NOT w.cyclic
  ),
  rule_keys(statement, line_key) AS (VALUES
    ('sofp', 'total_assets'), ('sofp', 'total_liabilities'), ('sofp', 'total_equity'),
    ('sofp', 'equity_parent'), ('sofp', 'nci'), ('sofp', 'total_liabilities_and_equity'),
    ('sofp', 'cash_and_cash_equivalents'),
    ('pl_oci', 'revenue'), ('pl_oci', 'total_cost_of_revenue'), ('pl_oci', 'gross_profit'),
    ('pl_oci', 'profit_before_tax'), ('pl_oci', 'income_tax'), ('pl_oci', 'profit_for_the_year'),
    ('pl_oci', 'total_comprehensive_income'), ('pl_oci', 'profit_parent'), ('pl_oci', 'profit_nci'),
    ('pl_oci', 'tci_parent'), ('pl_oci', 'tci_nci'),
    ('cf', 'cash_end')
  ),
  struct_fail AS (
    SELECT l.statement, l.sort_order, 'only an item or a subtotal sums into another row' AS why
      FROM l WHERE l.parent_id IS NOT NULL AND l.line_type NOT IN ('item', 'subtotal')
    UNION ALL
    SELECT l.statement, l.sort_order, format('parent %s is not a subtotal or total', l.parent_sort)
      FROM l WHERE l.parent_id IS NOT NULL AND l.line_type IN ('item', 'subtotal')
                   AND l.parent_type NOT IN ('subtotal', 'total')
    UNION ALL
    SELECT l.statement, l.sort_order, 'a subtotal or total with no rows summing into it'
      FROM l WHERE l.line_type IN ('subtotal', 'total')
                   AND NOT EXISTS (SELECT 1 FROM l k WHERE k.parent_id = l.id)
    UNION ALL
    SELECT DISTINCT w.statement, w.start_sort, 'its parents form a cycle'
      FROM walk w WHERE w.cyclic
  ),
  cover_fail AS (
    SELECT l.statement, l.sort_order
      FROM l
     WHERE l.line_type = 'item' AND l.parent_id IS NULL
       AND NOT EXISTS (SELECT 1 FROM rule_keys r WHERE r.statement = l.statement AND r.line_key = l.line_key)
  ),
  present AS (
    SELECT s.statement, s.required,
           (SELECT count(*) FROM l WHERE l.statement = s.statement) AS n_lines,
           (SELECT count(*) FROM l WHERE l.statement = s.statement AND l.line_type = 'item') AS n_items
      FROM stmts s
  )
  SELECT format('STRUCT:%s:present', p.statement), p.statement, format('no %s lines', p.statement),
         NULL::numeric, NULL::numeric, NULL::numeric, false
    FROM present p WHERE p.required AND p.n_lines = 0
  UNION ALL
  SELECT format('STRUCT:%s:%s', f.statement, f.sort_order), f.statement, f.why,
         NULL::numeric, NULL::numeric, NULL::numeric, false
    FROM struct_fail f
  UNION ALL
  SELECT format('STRUCT:%s', p.statement), p.statement,
         format('lines are well-formed and every parent is a subtotal or total (%s checked)', p.n_lines),
         NULL::numeric, NULL::numeric, NULL::numeric, true
    FROM present p
   WHERE p.n_lines > 0 AND NOT EXISTS (SELECT 1 FROM struct_fail f WHERE f.statement = p.statement)
  UNION ALL
  SELECT format('COVER:%s:%s', c.statement, c.sort_order), c.statement,
         'an item with no parent and no rule key: an error in it would pass unseen',
         NULL::numeric, NULL::numeric, NULL::numeric, false
    FROM cover_fail c
  UNION ALL
  SELECT format('COVER:%s', p.statement), p.statement,
         format('every item sums into a row or feeds a named rule (%s checked)', p.n_items),
         NULL::numeric, NULL::numeric, NULL::numeric, true
    FROM present p
   WHERE (p.n_lines > 0 OR p.required) AND NOT EXISTS (SELECT 1 FROM cover_fail c WHERE c.statement = p.statement);

  -- FOOT and DECLARED: every subtotal and total with rows, each year. A blank
  -- figure counts as nil, as in the checker.
  RETURN QUERY
  WITH yrs(y, yr) AS (VALUES ('cy', yr_cy), ('py', yr_py)),
  sums AS (
    SELECT s.statement, s.sort_order, s.label_en, s.printed_diff_note,
           coalesce(s.line_key, 's' || s.sort_order) AS name,
           y.y, y.yr,
           coalesce(CASE y.y WHEN 'cy' THEN s.value_cy ELSE s.value_py END, 0) AS printed,
           CASE y.y WHEN 'cy' THEN s.printed_diff_cy ELSE s.printed_diff_py END AS want,
           count(k.id) AS n,
           sum(coalesce(CASE y.y WHEN 'cy' THEN k.value_cy ELSE k.value_py END, 0)) AS rows_sum
      FROM public.fs_line s
      JOIN public.fs_line k ON k.parent_id = s.id
     CROSS JOIN yrs y
     WHERE s.period_id = p_period_id AND s.line_type IN ('subtotal', 'total')
     GROUP BY s.id, y.y, y.yr
  ),
  foot AS (
    SELECT sums.*, rows_sum - printed AS d, (rows_sum - printed) = coalesce(want, 0) AS ok FROM sums
  )
  SELECT format('FOOT:%s:%s:%s', f.statement, f.name, f.y), f.statement,
         format('%s = sum of its %s rows (%s)', f.label_en, f.n, f.yr)
           || CASE WHEN f.want IS NULL THEN ''
                   ELSE format(': a printed difference of %s is declared', to_char(f.want, 'FMS999,999,999,999,990'))
                        || CASE WHEN f.ok THEN '' ELSE ', found ' || to_char(f.d, 'FM999,999,999,999,990') END
              END,
         f.printed, f.rows_sum, f.d, f.ok
    FROM foot f
  UNION ALL
  SELECT format('DECLARED:%s:%s:%s', f.statement, f.name, f.y), f.statement,
         format('%s (%s): printed %s, rows sum to %s. %s', f.label_en, f.yr,
                to_char(f.printed, 'FM999,999,999,999,990'), to_char(f.rows_sum, 'FM999,999,999,999,990'),
                f.printed_diff_note),
         f.want, f.d, 0::numeric, true
    FROM foot f
   WHERE f.want IS NOT NULL AND f.ok;

  -- The identities. Each names its rows by line_key in its own statement; a
  -- missing row fails the rule and says which. PL-PBT and PL-TCI add the rows
  -- printed between their two keyed rows that do not sum into another row of
  -- that band, headers aside: the items below gross profit, the OCI items.
  RETURN QUERY
  WITH yrs(y, yr) AS (VALUES ('cy', yr_cy), ('py', yr_py)),
  rules(rule, statement, descr, exp_key, act_keys, band_from, band_to) AS (
    SELECT * FROM (VALUES
      ('SOFP-BAL', 'sofp', 'Total assets = total liabilities + total equity',
       'total_assets', ARRAY['total_liabilities', 'total_equity'], NULL, NULL),
      ('SOFP-BAL:tle', 'sofp', 'Total liabilities and equity = total assets',
       'total_assets', ARRAY['total_liabilities_and_equity'], NULL, NULL),
      ('SOFP-EQ', 'sofp', 'Equity attributable to the parent + NCI = total equity',
       'total_equity', ARRAY['equity_parent', 'nci'], NULL, NULL),
      ('PL-GP', 'pl_oci', 'Revenue + total costs of revenue = gross profit',
       'gross_profit', ARRAY['revenue', 'total_cost_of_revenue'], NULL, NULL),
      ('PL-PBT', 'pl_oci', 'Gross profit + the items below it = profit before tax',
       'profit_before_tax', ARRAY['gross_profit'], 'gross_profit', 'profit_before_tax'),
      ('PL-NI', 'pl_oci', 'Profit before tax + income tax = profit for the year',
       'profit_for_the_year', ARRAY['profit_before_tax', 'income_tax'], NULL, NULL),
      ('PL-TCI', 'pl_oci', 'Profit for the year + OCI = total comprehensive income',
       'total_comprehensive_income', ARRAY['profit_for_the_year'], 'profit_for_the_year', 'total_comprehensive_income'),
      ('PL-ATTR:profit', 'pl_oci', 'Profit attributable to the parent + NCI = profit for the year',
       'profit_for_the_year', ARRAY['profit_parent', 'profit_nci'], NULL, NULL),
      ('PL-ATTR:tci', 'pl_oci', 'TCI attributable to the parent + NCI = total comprehensive income',
       'total_comprehensive_income', ARRAY['tci_parent', 'tci_nci'], NULL, NULL)
    ) AS v(rule, statement, descr, exp_key, act_keys, band_from, band_to)
    -- As in the checker, SOFP-BAL:tle runs only where the statement prints the row.
    WHERE v.rule <> 'SOFP-BAL:tle' OR EXISTS (
      SELECT 1 FROM public.fs_line t
       WHERE t.period_id = p_period_id AND t.statement = 'sofp' AND t.line_key = 'total_liabilities_and_equity')
  ),
  keyed AS (
    SELECT x.statement, x.line_key, x.sort_order, y.y,
           coalesce(CASE y.y WHEN 'cy' THEN x.value_cy ELSE x.value_py END, 0) AS v
      FROM public.fs_line x CROSS JOIN yrs y
     WHERE x.period_id = p_period_id AND x.line_key IS NOT NULL
  ),
  terms AS (
    -- The expected row first, then the actual rows in order: the order the
    -- checker names missing rows in.
    SELECT r.rule, y.y, 0 AS pos, r.exp_key AS key, true AS is_expected
      FROM rules r CROSS JOIN yrs y
    UNION ALL
    SELECT r.rule, y.y, a.pos, a.key, false
      FROM rules r CROSS JOIN yrs y
     CROSS JOIN LATERAL unnest(r.act_keys) WITH ORDINALITY AS a(key, pos)
  ),
  resolved AS (
    SELECT t.rule, t.y,
           sum(k.v) FILTER (WHERE t.is_expected) AS exp_v,
           sum(k.v) FILTER (WHERE NOT t.is_expected) AS act_v,
           string_agg(CASE WHEN k.line_key IS NULL
                           THEN format('no %s row with line_key ''%s''', r.statement, t.key) END,
                      '; ' ORDER BY t.pos) AS missing
      FROM terms t
      JOIN rules r ON r.rule = t.rule
      LEFT JOIN keyed k ON k.statement = r.statement AND k.line_key = t.key AND k.y = t.y
     GROUP BY t.rule, t.y
  ),
  band AS (
    SELECT r.rule, y.y,
           coalesce(sum(coalesce(CASE y.y WHEN 'cy' THEN x.value_cy ELSE x.value_py END, 0)), 0) AS v
      FROM rules r
     CROSS JOIN yrs y
      JOIN keyed a ON a.statement = 'pl_oci' AND a.line_key = r.band_from AND a.y = y.y
      JOIN keyed b ON b.statement = 'pl_oci' AND b.line_key = r.band_to AND b.y = y.y
      LEFT JOIN public.fs_line x
        ON x.period_id = p_period_id AND x.statement = 'pl_oci'
       AND x.sort_order > a.sort_order AND x.sort_order < b.sort_order
       AND x.line_type <> 'header'
       AND NOT EXISTS (
         SELECT 1 FROM public.fs_line par
          WHERE par.id = x.parent_id AND par.sort_order > a.sort_order AND par.sort_order < b.sort_order)
     GROUP BY r.rule, y.y
  )
  SELECT format('%s:%s', r.rule, y.y), r.statement,
         format('%s (%s)', r.descr, y.yr) || coalesce(': ' || s.missing, ''),
         CASE WHEN s.missing IS NULL THEN s.exp_v END,
         CASE WHEN s.missing IS NULL THEN s.act_v + coalesce(b.v, 0) END,
         CASE WHEN s.missing IS NULL THEN s.act_v + coalesce(b.v, 0) - s.exp_v END,
         s.missing IS NULL AND s.act_v + coalesce(b.v, 0) = s.exp_v
    FROM rules r
   CROSS JOIN yrs y
    JOIN resolved s ON s.rule = r.rule AND s.y = y.y
    LEFT JOIN band b ON b.rule = r.rule AND b.y = y.y;

  -- The statement of changes in equity: STRUCT, then across each row, then
  -- down each column between consecutive balance rows. A missing cell is nil.
  RETURN QUERY
  WITH c AS (SELECT * FROM public.fs_soce_cell x WHERE x.period_id = p_period_id),
  rws AS (
    SELECT c.row_key, min(c.row_order) AS row_order, min(c.row_label_en) AS label,
           count(DISTINCT (c.row_order, c.row_label_id, c.row_label_en, coalesce(c.notes_ref, ''))) AS sigs
      FROM c GROUP BY c.row_key
  ),
  cls AS (
    SELECT c.col_key, min(c.col_order) AS col_order, min(c.col_label_en) AS label,
           count(DISTINCT (c.col_order, c.col_label_id, c.col_label_en)) AS sigs
      FROM c GROUP BY c.col_key
  ),
  struct_fail AS (
    SELECT 'STRUCT:soce:present' AS rule, 'no statement of changes in equity' AS why
     WHERE NOT EXISTS (SELECT 1 FROM c)
    UNION ALL
    SELECT 'STRUCT:soce:columns',
           'missing column(s): ' || string_agg(t.col_key, ', ' ORDER BY t.ord)
      FROM (VALUES ('total_parent', 1), ('nci', 2), ('total', 3)) AS t(col_key, ord)
     WHERE EXISTS (SELECT 1 FROM c) AND NOT EXISTS (SELECT 1 FROM cls WHERE cls.col_key = t.col_key)
    HAVING count(*) > 0
    UNION ALL
    SELECT 'STRUCT:soce:balances', 'needs an opening and a closing balance_<year> row'
     WHERE EXISTS (SELECT 1 FROM c)
       AND (SELECT count(*) FROM rws WHERE rws.row_key ~ '^balance_[0-9]{4}$') < 2
    UNION ALL
    SELECT 'STRUCT:soce:' || rws.row_key, format('row %s has differing order, labels or notes across its cells', rws.row_key)
      FROM rws WHERE rws.sigs > 1
    UNION ALL
    SELECT 'STRUCT:soce:' || cls.col_key, format('column %s has differing order or labels across its cells', cls.col_key)
      FROM cls WHERE cls.sigs > 1
  ),
  ok AS (
    SELECT NOT EXISTS (SELECT 1 FROM struct_fail f WHERE f.rule IN ('STRUCT:soce:present', 'STRUCT:soce:columns')) AS go
  ),
  v AS (SELECT c.row_key, c.col_key, coalesce(c.value, 0) AS v FROM c),
  parts AS (SELECT cls.col_key FROM cls WHERE cls.col_key NOT IN ('total_parent', 'nci', 'total')),
  cell AS (
    SELECT rws.row_key, cls.col_key, coalesce(v.v, 0) AS v
      FROM rws CROSS JOIN cls
      LEFT JOIN v ON v.row_key = rws.row_key AND v.col_key = cls.col_key
  ),
  bal AS (
    SELECT rws.*, lag(rws.row_key) OVER (ORDER BY rws.row_order) AS prev_key,
           lag(rws.row_order) OVER (ORDER BY rws.row_order) AS prev_order,
           lag(rws.label) OVER (ORDER BY rws.row_order) AS prev_label
      FROM rws WHERE rws.row_key ~ '^balance_[0-9]{4}$'
  )
  SELECT f.rule, 'soce', f.why, NULL::numeric, NULL::numeric, NULL::numeric, false FROM struct_fail f
  UNION ALL
  SELECT 'STRUCT:soce', 'soce',
         format('cells are well-formed, with the balance rows and total columns (%s checked)', (SELECT count(*) FROM c)),
         NULL::numeric, NULL::numeric, NULL::numeric, true
   WHERE NOT EXISTS (SELECT 1 FROM struct_fail)
  UNION ALL
  SELECT format('SOCE-ROW:%s:total_parent', r.row_key), 'soce',
         format('%s: the parent''s columns sum to its total', r.label),
         tp.v, s.v, s.v - tp.v, s.v = tp.v
    FROM rws r
    JOIN cell tp ON tp.row_key = r.row_key AND tp.col_key = 'total_parent'
   CROSS JOIN LATERAL (
     SELECT coalesce(sum(x.v), 0) AS v FROM cell x WHERE x.row_key = r.row_key AND x.col_key IN (SELECT col_key FROM parts)
   ) s
   WHERE (SELECT go FROM ok)
  UNION ALL
  SELECT format('SOCE-ROW:%s:total', r.row_key), 'soce',
         format('%s: parent total + NCI = total', r.label),
         t.v, tp.v + n.v, tp.v + n.v - t.v, tp.v + n.v = t.v
    FROM rws r
    JOIN cell t  ON t.row_key = r.row_key AND t.col_key = 'total'
    JOIN cell tp ON tp.row_key = r.row_key AND tp.col_key = 'total_parent'
    JOIN cell n  ON n.row_key = r.row_key AND n.col_key = 'nci'
   WHERE (SELECT go FROM ok)
  UNION ALL
  SELECT format('SOCE-COL:%s:%s', k.col_key, b.row_key), 'soce',
         format('%s: %s = %s + %s movements', k.label, b.label, b.prev_label, m.n),
         cur.v, pv.v + m.v, pv.v + m.v - cur.v, pv.v + m.v = cur.v
    FROM bal b
   CROSS JOIN cls k
    JOIN cell cur ON cur.row_key = b.row_key AND cur.col_key = k.col_key
    JOIN cell pv  ON pv.row_key = b.prev_key AND pv.col_key = k.col_key
   CROSS JOIN LATERAL (
     SELECT count(*) AS n, coalesce(sum(x.v), 0) AS v
       FROM rws mr JOIN cell x ON x.row_key = mr.row_key AND x.col_key = k.col_key
      WHERE mr.row_order > b.prev_order AND mr.row_order < b.row_order
   ) m
   WHERE b.prev_key IS NOT NULL AND (SELECT go FROM ok);

  -- Across the statements: the SoCE's TCI row and closing balance against
  -- profit or loss and the statement of financial position, and the cash flow
  -- statement's closing cash against cash (only when cash flows are loaded).
  RETURN QUERY
  WITH yrs(y, yr) AS (VALUES ('cy', yr_cy), ('py', yr_py)),
  c AS (SELECT * FROM public.fs_soce_cell x WHERE x.period_id = p_period_id),
  keyed AS (
    SELECT x.statement, x.line_key, y.y,
           coalesce(CASE y.y WHEN 'cy' THEN x.value_cy ELSE x.value_py END, 0) AS v
      FROM public.fs_line x CROSS JOIN yrs y
     WHERE x.period_id = p_period_id AND x.line_key IS NOT NULL
  ),
  xs(rule, scope, ord, row_prefix, key_stmt, key_label, line_key, col_key) AS (VALUES
    ('XS-SOCE-PROFIT', 'parent', 1, 'tci_', 'pl_oci', 'P&L', 'tci_parent', 'total_parent'),
    ('XS-SOCE-PROFIT', 'nci', 2, 'tci_', 'pl_oci', 'P&L', 'tci_nci', 'nci'),
    ('XS-SOCE-BAL', 'total', 3, 'balance_', 'sofp', 'SoFP', 'total_equity', 'total'),
    ('XS-SOCE-BAL', 'nci', 4, 'balance_', 'sofp', 'SoFP', 'nci', 'nci')
  ),
  xs_run AS (
    SELECT x.*, y.y, y.yr, x.row_prefix || y.yr AS row_key, k.v AS key_v, k.line_key IS NOT NULL AS has_key,
           EXISTS (SELECT 1 FROM c WHERE c.row_key = x.row_prefix || y.yr) AS has_row,
           (SELECT coalesce(c.value, 0) FROM c WHERE c.row_key = x.row_prefix || y.yr AND c.col_key = x.col_key) AS cell_v
      FROM xs x CROSS JOIN yrs y
      LEFT JOIN keyed k ON k.statement = x.key_stmt AND k.line_key = x.line_key AND k.y = y.y
     WHERE EXISTS (SELECT 1 FROM c)
  ),
  cash AS (
    SELECT y.y, y.yr, a.v AS sofp_v, b.v AS cf_v
      FROM yrs y
      LEFT JOIN keyed a ON a.statement = 'sofp' AND a.line_key = 'cash_and_cash_equivalents' AND a.y = y.y
      LEFT JOIN keyed b ON b.statement = 'cf' AND b.line_key = 'cash_end' AND b.y = y.y
     WHERE EXISTS (SELECT 1 FROM public.fs_line l WHERE l.period_id = p_period_id AND l.statement = 'cf')
  )
  SELECT format('%s:%s:%s', r.rule, r.scope, r.y), 'soce',
         format('SoCE %s (%s) = %s %s (%s)', r.row_key, r.col_key, r.key_label, r.line_key, r.yr)
           || CASE WHEN NOT r.has_key THEN format(': no %s row with line_key ''%s''', r.key_stmt, r.line_key)
                   WHEN NOT r.has_row THEN format(': no SoCE row ''%s''', r.row_key)
                   ELSE '' END,
         CASE WHEN r.has_key AND r.has_row THEN r.key_v END,
         CASE WHEN r.has_key AND r.has_row THEN coalesce(r.cell_v, 0) END,
         CASE WHEN r.has_key AND r.has_row THEN coalesce(r.cell_v, 0) - r.key_v END,
         r.has_key AND r.has_row AND coalesce(r.cell_v, 0) = r.key_v
    FROM xs_run r
  UNION ALL
  SELECT format('XS-CF-CASH:%s', k.y), 'cf',
         format('Cash flow closing cash = SoFP cash and cash equivalents (%s)', k.yr)
           || CASE WHEN k.sofp_v IS NULL OR k.cf_v IS NULL
                   THEN ': ' || concat_ws('; ',
                          CASE WHEN k.sofp_v IS NULL THEN 'no sofp row with line_key ''cash_and_cash_equivalents''' END,
                          CASE WHEN k.cf_v IS NULL THEN 'no cf row with line_key ''cash_end''' END)
                   ELSE '' END,
         k.sofp_v, k.cf_v, k.cf_v - k.sofp_v, coalesce(k.cf_v = k.sofp_v, false)
    FROM cash k;
END
$fn$;

COMMENT ON FUNCTION public.fs_tieout(uuid) IS
  'The tie-out rules of scripts/fs_check.py that read only the stored rows, re-run in SQL against one period. Read-only.';

CREATE FUNCTION public.fs_run_publish_gate(p_period_id uuid)
RETURNS TABLE (run_at timestamptz, rules integer, failed integer, published boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
#variable_conflict use_column
DECLARE
  v_status text;
  v_run    timestamptz := clock_timestamp();
  v_rules  integer;
  v_failed integer;
BEGIN
  -- The row lock holds the period's status still while its rows are checked.
  SELECT p.status INTO v_status FROM public.fs_period p WHERE p.id = p_period_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no fs_period %', p_period_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'fs_period % is % already', p_period_id, v_status USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.fs_check (period_id, run_at, rule_id, statement, description, expected, actual, diff, passed)
  SELECT p_period_id, v_run, t.rule_id, t.statement, t.description, t.expected, t.actual, t.diff, t.passed
    FROM public.fs_tieout(p_period_id) t;
  GET DIAGNOSTICS v_rules = ROW_COUNT;

  SELECT count(*) INTO v_failed
    FROM public.fs_check c
   WHERE c.period_id = p_period_id AND c.run_at = v_run AND NOT c.passed;

  IF v_rules > 0 AND v_failed = 0 THEN
    UPDATE public.fs_period SET status = 'published' WHERE id = p_period_id;
  END IF;

  RETURN QUERY SELECT v_run, v_rules, v_failed, (v_rules > 0 AND v_failed = 0);
END
$fn$;

COMMENT ON FUNCTION public.fs_run_publish_gate(uuid) IS
  'Writes one fs_check run from fs_tieout() and publishes the draft period only when no rule failed. No caller check: not executable by anon or authenticated.';

CREATE FUNCTION public.fs_publish_period(p_period_id uuid)
RETURNS TABLE (run_at timestamptz, rules integer, failed integer, published boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'only an admin can publish a period' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY SELECT * FROM public.fs_run_publish_gate(p_period_id);
END
$fn$;

COMMENT ON FUNCTION public.fs_publish_period(uuid) IS
  'The admin action that publishes a period (Plan 1.7): re-runs the tie-out rules, records the run, publishes only if every rule passed.';

-- CREATE FUNCTION grants EXECUTE to PUBLIC, and Supabase's default privileges
-- grant it to anon and authenticated by name; take all three away, then give
-- back only what each function needs (baseline_foundation, has_role).
REVOKE EXECUTE ON FUNCTION public.fs_tieout(uuid)           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fs_run_publish_gate(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fs_publish_period(uuid)   FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fs_tieout(uuid)           TO service_role;
GRANT EXECUTE ON FUNCTION public.fs_run_publish_gate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fs_publish_period(uuid)   TO authenticated, service_role;
