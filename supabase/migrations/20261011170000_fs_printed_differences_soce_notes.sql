-- =============================================================================
-- Two columns the PHE FY2024 extraction showed the model needs (Plan 1.4;
-- decisions recorded in docs/spec/00_discovery.md §19).
--
-- fs_line.printed_diff_cy / printed_diff_py / printed_diff_note: a difference
-- the issuer printed between a subtotal and the sum of its own rows (sum minus
-- printed), with the reason. PHE's FY2024 cash flow statement prints net cash
-- from operating activities as 5,629,285 while its rows sum to 5,629,286. The
-- figure stays as printed; the tie-out rules (scripts/fs_check.py and
-- fs_publish_period) pass that foot at exactly the declared difference and at
-- no other, and list it, so a one-unit error anywhere else still fails.
--
-- fs_soce_cell.notes_ref: the note reference a statement of changes in equity
-- prints against a row (PHE: 34 on dividends, 33 on reserves). Stored on each
-- cell of the row, as the row's labels are.
--
-- DOWN:
--   ALTER TABLE public.fs_soce_cell DROP COLUMN notes_ref;
--   ALTER TABLE public.fs_line
--     DROP COLUMN printed_diff_note,
--     DROP COLUMN printed_diff_py,
--     DROP COLUMN printed_diff_cy;
-- =============================================================================

ALTER TABLE public.fs_line
  ADD COLUMN printed_diff_cy   numeric,
  ADD COLUMN printed_diff_py   numeric,
  ADD COLUMN printed_diff_note text,
  ADD CONSTRAINT fs_line_printed_diff_on_sums_only CHECK (
    line_type IN ('subtotal', 'total') OR (printed_diff_cy IS NULL AND printed_diff_py IS NULL)
  ),
  ADD CONSTRAINT fs_line_printed_diff_explained CHECK (
    ((printed_diff_cy IS NULL AND printed_diff_py IS NULL) = (printed_diff_note IS NULL))
    AND (printed_diff_note IS NULL OR btrim(printed_diff_note) <> '')
  ),
  ADD CONSTRAINT fs_line_printed_diff_not_zero CHECK (
    coalesce(printed_diff_cy, 1) <> 0 AND coalesce(printed_diff_py, 1) <> 0
  );

COMMENT ON COLUMN public.fs_line.printed_diff_cy IS
  'Sum of the rows minus the printed figure, where the issuer printed a difference (current year). The foot passes at exactly this difference.';
COMMENT ON COLUMN public.fs_line.printed_diff_py IS
  'As printed_diff_cy, prior year.';
COMMENT ON COLUMN public.fs_line.printed_diff_note IS
  'Why the printed figure differs from the sum of its rows.';

ALTER TABLE public.fs_soce_cell ADD COLUMN notes_ref text;

COMMENT ON COLUMN public.fs_soce_cell.notes_ref IS
  'The note reference the statement prints against this cell''s row, verbatim.';
