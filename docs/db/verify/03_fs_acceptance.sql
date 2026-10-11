-- =============================================================================
-- fs_* acceptance (Plan 1.1). Run after the baseline and
-- 20261011130000_fs_statements.sql, on the throwaway cluster described in
-- README.md here:
--
--   psql -d dry -f supabase/migrations/20261009090000_fsli_component_flag.sql
--   psql -d dry -f supabase/migrations/20261011130000_fs_statements.sql
--   psql -d dry -f supabase/migrations/20261011170000_fs_printed_differences_soce_notes.sql
--   psql -d dry -f docs/db/verify/03_fs_acceptance.sql
--
-- It runs as well after the later fs_* migrations (the PHE FY2024 load, the
-- publish gate); 04_fs_publish_gate.sql covers those.
--
-- Every check raises on failure, so a clean run prints only PASS lines and the
-- script exits 0. Everything it writes is rolled back. Fixture users match
-- 01_rls_acceptance.sql. The fixture company and figures are invented.
-- =============================================================================
\set ON_ERROR_STOP 1
\pset pager off

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@dika.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'user@dika.test')
  ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (user_id, role)
  VALUES ('00000000-0000-0000-0000-0000000000a1', 'admin') ON CONFLICT DO NOTHING;

BEGIN;

-- The counts below are the fixture's alone: periods a load migration put here
-- (20261011180000, PHE FY2024) are set aside for the run, which rolls back.
DELETE FROM public.fs_period;
DELETE FROM public.fs_company;

-- ---------------------------------------------------------------- fixture
-- Written as the table owner, as the loader's migration is. Two companies:
-- 'acme' with one published and one draft period, 'beta' with a draft only.
INSERT INTO public.fsli_pages (slug, title) VALUES ('fixture-line', 'Fixture line');
INSERT INTO public.fs_company (id, legal_name, short_name) VALUES
  ('acme', 'PT Acme Fixture', 'ACME'),
  ('beta', 'PT Beta Fixture', 'BETA');
INSERT INTO public.fs_period (id, company_id, period_key, period_end, comparative_end, currency, unit, source_file, status) VALUES
  ('00000000-0000-0000-0000-00000000f001', 'acme', 'fy2024', '2024-12-31', '2023-12-31', 'USD', 'thousands', 'data/fs/acme/fy2024/source.pdf', 'published'),
  ('00000000-0000-0000-0000-00000000f002', 'acme', 'fy2025', '2025-12-31', '2024-12-31', 'USD', 'thousands', 'data/fs/acme/fy2025/source.pdf', 'draft'),
  ('00000000-0000-0000-0000-00000000f003', 'beta', 'fy2024', '2024-12-31', '2023-12-31', 'USD', 'thousands', 'data/fs/beta/fy2024/source.pdf', 'draft');
INSERT INTO public.fs_line (id, period_id, statement, parent_id, sort_order, line_type, label_id, label_en, value_cy, value_py, computed_cy, computed_py, source_page, line_key, fsli_slug) VALUES
  ('00000000-0000-0000-0000-0000000a0010', '00000000-0000-0000-0000-00000000f001', 'sofp', NULL, 10, 'header', 'ASET', 'ASSETS', NULL, NULL, NULL, NULL, 11, NULL, NULL),
  ('00000000-0000-0000-0000-0000000a0030', '00000000-0000-0000-0000-00000000f001', 'sofp', NULL, 30, 'total', 'JUMLAH ASET', 'TOTAL ASSETS', 100, 90, 100, 90, 11, 'total_assets', NULL),
  ('00000000-0000-0000-0000-0000000a0020', '00000000-0000-0000-0000-00000000f001', 'sofp', '00000000-0000-0000-0000-0000000a0030', 20, 'item', 'Kas', 'Cash', 100, 90, NULL, NULL, 11, NULL, 'fixture-line'),
  ('00000000-0000-0000-0000-0000000b0010', '00000000-0000-0000-0000-00000000f002', 'sofp', NULL, 10, 'item', 'Kas', 'Cash', 5, 4, NULL, NULL, 11, NULL, NULL),
  ('00000000-0000-0000-0000-0000000c0010', '00000000-0000-0000-0000-00000000f001', 'pl_oci', NULL, 10, 'item', 'Pendapatan', 'Revenues', 50, 40, NULL, NULL, 14, 'revenue', NULL);
INSERT INTO public.fs_soce_cell (period_id, row_key, row_label_id, row_label_en, row_order, col_key, col_label_id, col_label_en, col_order, value, source_page) VALUES
  ('00000000-0000-0000-0000-00000000f001', 'balance_2024', 'Saldo 31 Desember 2024', 'Balance as of 31 December 2024', 1, 'total', 'Jumlah', 'Total', 1, 100, 16),
  ('00000000-0000-0000-0000-00000000f002', 'balance_2025', 'Saldo 31 Desember 2025', 'Balance as of 31 December 2025', 1, 'total', 'Jumlah', 'Total', 1, 5, 16);
INSERT INTO public.fs_check (period_id, rule_id, description, passed) VALUES
  ('00000000-0000-0000-0000-00000000f001', 'SOFP-BAL:cy', 'fixture', true),
  ('00000000-0000-0000-0000-00000000f002', 'SOFP-BAL:cy', 'fixture', false);

-- ---------------------------------------------------------------- constraints
DO $$
BEGIN
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, source_page)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'sofp', 90, 'item', ' ', 'Cash', 11);
    RAISE EXCEPTION 'blank label_id accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS blank label rejected';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, value_cy, computed_cy, source_page)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'sofp', 90, 'item', 'Kas', 'Cash', 1, 1, 11);
    RAISE EXCEPTION 'computed value on an item accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS computed_* refused on an item row';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, value_cy, source_page)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'sofp', 90, 'header', 'ASET', 'ASSETS', 1, 11);
    RAISE EXCEPTION 'figure on a header accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS figure refused on a header row';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, source_page)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'sofp', 90, 'item', 'Kas', 'Cash', 0);
    RAISE EXCEPTION 'source_page 0 accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS source_page must be a real page';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, source_page)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'sofp', 90, 'item', 'Kas', 'Cash', NULL);
    RAISE EXCEPTION 'missing source_page accepted';
  EXCEPTION WHEN not_null_violation THEN
    RAISE NOTICE 'PASS no record without source_page';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, parent_id, sort_order, line_type, label_id, label_en, source_page)
    VALUES ('00000000-0000-0000-0000-00000000f001', 'pl_oci', '00000000-0000-0000-0000-0000000a0030', 90, 'item', 'X', 'X', 14);
    RAISE EXCEPTION 'parent in another statement accepted';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'PASS parent must be in the same statement';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, parent_id, sort_order, line_type, label_id, label_en, source_page)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'sofp', '00000000-0000-0000-0000-0000000a0030', 90, 'item', 'X', 'X', 11);
    RAISE EXCEPTION 'parent in another period accepted';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'PASS parent must be in the same period';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, source_page)
    VALUES ('00000000-0000-0000-0000-00000000f001', 'sofp', 20, 'item', 'X', 'X', 11);
    RAISE EXCEPTION 'duplicate sort_order accepted';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS one row per sort_order per statement';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, source_page, line_key)
    VALUES ('00000000-0000-0000-0000-00000000f001', 'sofp', 90, 'item', 'X', 'X', 11, 'total_assets');
    RAISE EXCEPTION 'duplicate line_key accepted';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS one row per line_key per statement';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, source_page, fsli_slug)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'sofp', 90, 'item', 'X', 'X', 11, 'no-such-page');
    RAISE EXCEPTION 'unknown fsli_slug accepted';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'PASS fsli_slug must name a line-item page';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, source_page)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'soce', 90, 'item', 'X', 'X', 16);
    RAISE EXCEPTION 'statement soce accepted on fs_line';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS fs_line holds sofp, pl_oci and cf only';
  END;
  BEGIN
    INSERT INTO public.fs_period (company_id, period_key, period_end, comparative_end, currency, unit, source_file, status)
    VALUES ('acme', 'fy2026', '2026-12-31', '2025-12-31', 'USD', 'thousands', 'x.pdf', 'final');
    RAISE EXCEPTION 'status final accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS status is draft or published';
  END;
  BEGIN
    INSERT INTO public.fs_period (company_id, period_key, period_end, comparative_end, currency, unit, source_file)
    VALUES ('acme', 'fy2026', '2026-12-31', '2026-12-31', 'USD', 'thousands', 'x.pdf');
    RAISE EXCEPTION 'comparative not before period accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS comparative_end precedes period_end';
  END;
  BEGIN
    INSERT INTO public.fs_period (company_id, period_key, period_end, comparative_end, currency, unit, source_file)
    VALUES ('acme', 'fy2024', '2024-12-31', '2023-12-31', 'USD', 'thousands', 'x.pdf');
    RAISE EXCEPTION 'second fy2024 for acme accepted';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS one period per company and key';
  END;
  BEGIN
    INSERT INTO public.fs_soce_cell (period_id, row_key, row_label_id, row_label_en, row_order, col_key, col_label_id, col_label_en, col_order, value, source_page)
    VALUES ('00000000-0000-0000-0000-00000000f001', 'balance_2024', 'S', 'B', 1, 'total', 'J', 'T', 1, 1, 16);
    RAISE EXCEPTION 'duplicate SoCE cell accepted';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS one SoCE cell per row and column';
  END;
END $$;

-- The gate holds twice: the UPDATE policy's WITH CHECK keeps status at
-- 'draft', and the column is not granted at all. Each is checked on its own,
-- so loosening either one shows here.
DO $$
BEGIN
  IF has_column_privilege('authenticated', 'public.fs_period', 'status', 'UPDATE')
     OR has_column_privilege('anon', 'public.fs_period', 'status', 'UPDATE') THEN
    RAISE EXCEPTION 'a client role holds UPDATE on fs_period.status';
  END IF;
  IF has_table_privilege('authenticated', 'public.fs_check', 'INSERT, UPDATE, DELETE')
     OR has_table_privilege('anon', 'public.fs_check', 'INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'a client role can write fs_check';
  END IF;
  RAISE NOTICE 'PASS no client role can write fs_period.status or fs_check';
END $$;

-- Declared printed differences (20261011170000): on sums only, always explained.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, value_cy, source_page, printed_diff_cy, printed_diff_note)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'sofp', 93, 'item', 'X', 'X', 1, 11, 1, 'x');
    RAISE EXCEPTION 'printed difference on an item accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS a printed difference sits on a subtotal or total only';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, value_cy, source_page, printed_diff_cy)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'sofp', 93, 'subtotal', 'X', 'X', 1, 11, 1);
    RAISE EXCEPTION 'unexplained printed difference accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS a printed difference carries its reason';
  END;
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, value_cy, source_page, printed_diff_cy, printed_diff_note)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'sofp', 93, 'subtotal', 'X', 'X', 1, 11, 0, 'x');
    RAISE EXCEPTION 'zero printed difference accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS a declared difference is never zero';
  END;
END $$;

-- Two NULL line_keys in one statement are allowed (most rows have none).
DO $$
BEGIN
  INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, source_page)
  VALUES ('00000000-0000-0000-0000-00000000f002', 'sofp', 91, 'item', 'A', 'A', 11),
         ('00000000-0000-0000-0000-00000000f002', 'sofp', 92, 'item', 'B', 'B', 11);
  DELETE FROM public.fs_line WHERE period_id = '00000000-0000-0000-0000-00000000f002' AND sort_order IN (91, 92);
  RAISE NOTICE 'PASS rows without a line_key coexist';
END $$;

-- ---------------------------------------------------------------- anon
SET ROLE anon;
SELECT set_config('request.jwt.claims', NULL, true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.fs_company) <> 1 THEN
    RAISE EXCEPTION 'anon: expected only the company with a published period';
  END IF;
  IF (SELECT count(*) FROM public.fs_period) <> 1 OR EXISTS (SELECT 1 FROM public.fs_period WHERE status <> 'published') THEN
    RAISE EXCEPTION 'anon: expected the one published period';
  END IF;
  IF (SELECT count(*) FROM public.fs_line) <> 4 THEN
    RAISE EXCEPTION 'anon: expected the 4 lines of the published period, saw %', (SELECT count(*) FROM public.fs_line);
  END IF;
  IF (SELECT count(*) FROM public.fs_soce_cell) <> 1 OR (SELECT count(*) FROM public.fs_check) <> 1 THEN
    RAISE EXCEPTION 'anon: expected only the published period''s SoCE cell and check';
  END IF;
  RAISE NOTICE 'PASS anon reads the published period, its company, lines, cells and checks, nothing else';
  BEGIN
    INSERT INTO public.fs_check (period_id, rule_id, description, passed)
    VALUES ('00000000-0000-0000-0000-00000000f001', 'X', 'x', true);
    RAISE EXCEPTION 'anon: fs_check INSERT succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS anon fs_check INSERT denied';
  END;
  BEGIN
    UPDATE public.fs_line SET value_cy = 0;
    RAISE EXCEPTION 'anon: fs_line UPDATE succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS anon fs_line UPDATE denied';
  END;
  BEGIN
    UPDATE public.fs_period SET status = 'draft';
    RAISE EXCEPTION 'anon: fs_period UPDATE succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS anon fs_period UPDATE denied';
  END;
  BEGIN
    DELETE FROM public.fs_company;
    RAISE EXCEPTION 'anon: fs_company DELETE succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS anon fs_company DELETE denied';
  END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- signed-in non-admin
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2"}', true);
DO $$
DECLARE n int;
BEGIN
  IF (SELECT count(*) FROM public.fs_period) <> 1 OR (SELECT count(*) FROM public.fs_line) <> 4 THEN
    RAISE EXCEPTION 'non-admin: expected the published period and its lines only';
  END IF;
  RAISE NOTICE 'PASS non-admin reads published only';
  UPDATE public.fs_line SET value_cy = 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'non-admin: fs_line UPDATE changed % rows', n; END IF;
  RAISE NOTICE 'PASS non-admin fs_line UPDATE changes nothing';
  BEGIN
    INSERT INTO public.fs_company (id, legal_name, short_name) VALUES ('evil', 'Evil', 'E');
    RAISE EXCEPTION 'non-admin: fs_company INSERT succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS non-admin fs_company INSERT denied by RLS';
  END;
  BEGIN
    INSERT INTO public.fs_check (period_id, rule_id, description, passed)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'X', 'x', true);
    RAISE EXCEPTION 'non-admin: fs_check INSERT succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS non-admin fs_check INSERT denied';
  END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------- admin
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1"}', true);
DO $$
DECLARE n int;
BEGIN
  IF (SELECT count(*) FROM public.fs_period) <> 3 OR (SELECT count(*) FROM public.fs_company) <> 2 THEN
    RAISE EXCEPTION 'admin: expected every period and company';
  END IF;
  IF (SELECT count(*) FROM public.fs_check) <> 2 THEN
    RAISE EXCEPTION 'admin: expected every check row';
  END IF;
  RAISE NOTICE 'PASS admin reads drafts and published alike';

  -- The gate: status is not the client's to write.
  BEGIN
    UPDATE public.fs_period SET status = 'published' WHERE id = '00000000-0000-0000-0000-00000000f002';
    RAISE EXCEPTION 'admin: status UPDATE succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS admin cannot set status directly (column not granted)';
  END;
  BEGIN
    INSERT INTO public.fs_period (company_id, period_key, period_end, comparative_end, currency, unit, source_file, status)
    VALUES ('acme', 'fy2026', '2026-12-31', '2025-12-31', 'USD', 'thousands', 'x.pdf', 'published');
    RAISE EXCEPTION 'admin: published INSERT succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS admin cannot insert a period as published';
  END;
  INSERT INTO public.fs_period (company_id, period_key, period_end, comparative_end, currency, unit, source_file)
  VALUES ('acme', 'fy2026', '2026-12-31', '2025-12-31', 'USD', 'thousands', 'x.pdf');
  RAISE NOTICE 'PASS admin inserts a draft period';
  BEGIN
    INSERT INTO public.fs_check (period_id, rule_id, description, passed)
    VALUES ('00000000-0000-0000-0000-00000000f002', 'X', 'x', true);
    RAISE EXCEPTION 'admin: fs_check INSERT succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS admin cannot write fs_check (no grant)';
  END;

  -- A draft is editable; a published statement is frozen.
  UPDATE public.fs_period SET auditor = 'Fixture & Co' WHERE id = '00000000-0000-0000-0000-00000000f002';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'admin: draft period UPDATE changed % rows', n; END IF;
  UPDATE public.fs_period SET auditor = 'Fixture & Co' WHERE id = '00000000-0000-0000-0000-00000000f001';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'admin: published period UPDATE changed % rows', n; END IF;
  RAISE NOTICE 'PASS admin edits a draft period, not a published one';

  UPDATE public.fs_line SET value_cy = 6 WHERE period_id = '00000000-0000-0000-0000-00000000f002';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'admin: draft line UPDATE changed % rows', n; END IF;
  UPDATE public.fs_line SET value_cy = 0 WHERE period_id = '00000000-0000-0000-0000-00000000f001';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'admin: published line UPDATE changed % rows', n; END IF;
  DELETE FROM public.fs_line WHERE period_id = '00000000-0000-0000-0000-00000000f001';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'admin: published line DELETE removed % rows', n; END IF;
  RAISE NOTICE 'PASS admin edits draft lines; published lines neither change nor go';
  BEGIN
    INSERT INTO public.fs_line (period_id, statement, sort_order, line_type, label_id, label_en, source_page)
    VALUES ('00000000-0000-0000-0000-00000000f001', 'sofp', 90, 'item', 'X', 'X', 11);
    RAISE EXCEPTION 'admin: line INSERT into a published period succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS admin cannot add a line to a published period';
  END;
  BEGIN
    UPDATE public.fs_line SET period_id = '00000000-0000-0000-0000-00000000f001'
    WHERE period_id = '00000000-0000-0000-0000-00000000f002';
    RAISE EXCEPTION 'admin: moving a line into a published period succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS admin cannot move a line into a published period';
  END;
  UPDATE public.fs_soce_cell SET value = 0 WHERE period_id = '00000000-0000-0000-0000-00000000f001';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'admin: published SoCE UPDATE changed % rows', n; END IF;
  RAISE NOTICE 'PASS published SoCE cells are frozen';

  DELETE FROM public.fs_period WHERE id = '00000000-0000-0000-0000-00000000f001';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'admin: published period DELETE removed % rows', n; END IF;
  DELETE FROM public.fs_period WHERE id = '00000000-0000-0000-0000-00000000f002';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'admin: draft period DELETE removed % rows', n; END IF;
  RAISE NOTICE 'PASS admin deletes a draft period, not a published one';
END $$;
RESET ROLE;

-- The draft's lines, cells and checks went with it (ON DELETE CASCADE).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.fs_line WHERE period_id = '00000000-0000-0000-0000-00000000f002')
     OR EXISTS (SELECT 1 FROM public.fs_soce_cell WHERE period_id = '00000000-0000-0000-0000-00000000f002')
     OR EXISTS (SELECT 1 FROM public.fs_check WHERE period_id = '00000000-0000-0000-0000-00000000f002') THEN
    RAISE EXCEPTION 'deleting a period left rows behind';
  END IF;
  RAISE NOTICE 'PASS a deleted period takes its lines, cells and checks';
END $$;

-- A line-item page that goes leaves its statement row in place, unlinked.
DO $$
BEGIN
  DELETE FROM public.fsli_pages WHERE slug = 'fixture-line';
  IF (SELECT fsli_slug FROM public.fs_line WHERE id = '00000000-0000-0000-0000-0000000a0020') IS NOT NULL THEN
    RAISE EXCEPTION 'fsli_slug survived its page';
  END IF;
  RAISE NOTICE 'PASS deleting a line-item page unlinks its statement row';
END $$;

ROLLBACK;
\echo fs_* acceptance: all checks passed
