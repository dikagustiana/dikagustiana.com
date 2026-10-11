-- =============================================================================
-- fs_*: audited financial statements, all four, for any company and period
-- (PRD §A5, D1, D4; Plan 1.1).
--
-- One audited report is one fs_period. The three vertical statements (sofp,
-- pl_oci, cf) are one fs_line row per printed line; the statement of changes
-- in equity is one fs_soce_cell row per printed cell; fs_check holds one row
-- per rule per checker run. A period stays a draft until fs_publish_period()
-- (Plan 1.7) has re-run the tie-out rules and found none failing.
--
-- Values are stored as presented: sign, classification, labels and note
-- references exactly as the issuer prints them. computed_* is the sum of a
-- subtotal's or total's children, stored beside the printed value so a
-- difference is visible rather than reconciled.
--
-- Beyond PRD §A5 (docs/spec/00_discovery.md §19):
--   * fs_line.line_key names the rows the rules address ('total_assets',
--     'gross_profit', ...). Labels are verbatim and are never matched on.
--   * fs_line.fsli_slug links a statement row to its line-item page in
--     fsli_pages, which stays as the index of those pages and their essays.
--   * NOT NULL on the foreign keys, and CHECKs for what §A5 states in prose:
--     labels non-empty, computed_* only on subtotal and total rows, no figure
--     on a header row, a parent in the same period and statement, and
--     source_page a real page.
--
-- RLS. Reading follows the essays pattern (20260731030000_baseline_cms.sql):
-- anon reads what is published, an admin reads everything, the admin check
-- inlined over user_roles. The child tables have no publish flag of their own,
-- so their anon policy tests the parent period; that works because anon can
-- read published fs_period rows (discovery §18, item 7).
--
-- Writing is admin-only and shaped so the publish gate cannot be stepped round
-- from the client:
--   * a period can be inserted only as a draft, and fs_period.status is left
--     out of authenticated's UPDATE grant: only fs_publish_period(), SECURITY
--     DEFINER (Plan 1.7), moves a period to published;
--   * lines and cells can be written only while their period is a draft, so a
--     published statement cannot change under its tie-out result;
--   * fs_check takes no client writes. Its rows come from the loader (applied
--     as a migration, Plan 1.5) and from fs_publish_period().
--
-- DOWN (one statement: fs_company's read policies name fs_period, and
-- fs_period's foreign key names fs_company, so neither drops first alone):
--   DROP TABLE public.fs_check, public.fs_soce_cell, public.fs_line,
--              public.fs_period, public.fs_company;
-- =============================================================================

-- --- Tables ------------------------------------------------------------------

CREATE TABLE public.fs_company (
  id         text        PRIMARY KEY CHECK (id ~ '^[a-z0-9-]+$'),   -- 'phe'; a URL segment
  legal_name text        NOT NULL CHECK (btrim(legal_name) <> ''),  -- 'PT Pertamina Hulu Energi dan entitas anaknya'
  short_name text        NOT NULL CHECK (btrim(short_name) <> ''),  -- 'PHE'
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fs_company IS
  'A company whose audited financial statements the FSLI viewer shows (PRD §A5).';

CREATE TABLE public.fs_period (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        text NOT NULL REFERENCES public.fs_company (id),
  period_key        text NOT NULL CHECK (period_key ~ '^[a-z0-9-]+$'),  -- 'fy2024'; a URL segment
  period_end        date NOT NULL,                                     -- 2024-12-31
  comparative_end   date NOT NULL,                                     -- 2023-12-31
  currency          text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),     -- 'USD'
  unit              text NOT NULL CHECK (btrim(unit) <> ''),           -- 'thousands'
  auditor           text,
  auditor_report_no text,
  auditor_opinion   text,                                              -- 'unmodified'
  source_file       text NOT NULL CHECK (btrim(source_file) <> ''),    -- 'data/fs/phe/fy2024/source.pdf'
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  CONSTRAINT fs_period_one_per_company_key UNIQUE (company_id, period_key),
  CONSTRAINT fs_period_comparative_first CHECK (comparative_end < period_end)
);

COMMENT ON TABLE public.fs_period IS
  'One audited report of one company. Published only through fs_publish_period(), which re-runs the tie-out rules (PRD §A6 step 5).';

CREATE TABLE public.fs_line (
  id          uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   uuid     NOT NULL REFERENCES public.fs_period (id) ON DELETE CASCADE,
  statement   text     NOT NULL CHECK (statement IN ('sofp', 'pl_oci', 'cf')),
  parent_id   uuid,                                -- the subtotal or total this row sums into
  sort_order  int      NOT NULL,
  line_type   text     NOT NULL CHECK (line_type IN ('header', 'item', 'subtotal', 'total')),
  indent      smallint NOT NULL DEFAULT 0 CHECK (indent >= 0),
  label_id    text     NOT NULL CHECK (btrim(label_id) <> ''),  -- Indonesian, verbatim
  label_en    text     NOT NULL CHECK (btrim(label_en) <> ''),  -- English, verbatim
  notes_ref   text,                                -- '3h,8,44c', verbatim
  value_cy    numeric,                             -- as presented: a negative is a negative
  value_py    numeric,
  computed_cy numeric,                             -- subtotal and total only: sum of children
  computed_py numeric,
  source_page int      NOT NULL CHECK (source_page > 0),  -- PDF page the figure was read from
  line_key    text     CHECK (line_key ~ '^[a-z0-9_]+$'),
  fsli_slug   text     REFERENCES public.fsli_pages (slug) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fs_line_one_per_order UNIQUE (period_id, statement, sort_order),
  CONSTRAINT fs_line_one_per_key UNIQUE (period_id, statement, line_key),
  -- The target of fs_line_parent_in_scope: a parent must be a row of the same
  -- period and the same statement.
  CONSTRAINT fs_line_scope UNIQUE (id, period_id, statement),
  CONSTRAINT fs_line_parent_in_scope FOREIGN KEY (parent_id, period_id, statement)
    REFERENCES public.fs_line (id, period_id, statement),
  CONSTRAINT fs_line_computed_on_sums_only CHECK (
    line_type IN ('subtotal', 'total') OR (computed_cy IS NULL AND computed_py IS NULL)
  ),
  CONSTRAINT fs_line_header_has_no_figure CHECK (
    line_type <> 'header' OR (value_cy IS NULL AND value_py IS NULL)
  )
);

COMMENT ON TABLE public.fs_line IS
  'One printed line of a statement of financial position, profit or loss and OCI, or cash flows, as presented (PRD §A5).';
COMMENT ON COLUMN public.fs_line.line_key IS
  'Stable name of a row the tie-out rules address (total_assets, gross_profit, ...). Not a label; labels are verbatim.';
COMMENT ON COLUMN public.fs_line.fsli_slug IS
  'The line-item page in fsli_pages this row links to, if it has one.';

CREATE TABLE public.fs_soce_cell (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id    uuid NOT NULL REFERENCES public.fs_period (id) ON DELETE CASCADE,
  row_key      text NOT NULL CHECK (row_key ~ '^[a-z0-9_]+$'),  -- 'balance_2023', 'tci_2024', ...
  row_label_id text NOT NULL CHECK (btrim(row_label_id) <> ''),
  row_label_en text NOT NULL CHECK (btrim(row_label_en) <> ''),
  row_order    int  NOT NULL,
  col_key      text NOT NULL CHECK (col_key ~ '^[a-z0-9_]+$'),  -- 'share_capital', ..., 'total_parent', 'nci', 'total'
  col_label_id text NOT NULL CHECK (btrim(col_label_id) <> ''),
  col_label_en text NOT NULL CHECK (btrim(col_label_en) <> ''),
  col_order    int  NOT NULL,
  value        numeric,
  source_page  int  NOT NULL CHECK (source_page > 0),
  CONSTRAINT fs_soce_cell_one_per_row_col UNIQUE (period_id, row_key, col_key)
);

COMMENT ON TABLE public.fs_soce_cell IS
  'One printed cell of a statement of changes in equity (PRD §A5).';

CREATE TABLE public.fs_check (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   uuid        NOT NULL REFERENCES public.fs_period (id) ON DELETE CASCADE,
  run_at      timestamptz NOT NULL DEFAULT now(),  -- one run = one run_at
  rule_id     text        NOT NULL CHECK (btrim(rule_id) <> ''),  -- 'SOFP-BAL:cy', 'FOOT:sofp:total_assets:py', ...
  statement   text,
  description text        NOT NULL,
  expected    numeric,
  actual      numeric,
  diff        numeric,
  passed      boolean     NOT NULL
);

CREATE INDEX fs_check_by_run ON public.fs_check (period_id, run_at DESC);

COMMENT ON TABLE public.fs_check IS
  'Tie-out results, one row per rule per run. The page''s badge reads the latest run (PRD §A7).';

-- --- RLS ---------------------------------------------------------------------

ALTER TABLE public.fs_company   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fs_period    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fs_line      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fs_soce_cell ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fs_check     ENABLE ROW LEVEL SECURITY;

-- fs_company: a company is visible once it has a published period.

CREATE POLICY "fs_company_select_anon"
  ON public.fs_company FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.fs_period p
    WHERE p.company_id = fs_company.id AND p.status = 'published'
  ));

CREATE POLICY "fs_company_select_authenticated"
  ON public.fs_company FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.company_id = fs_company.id AND p.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "fs_company_insert_admin"
  ON public.fs_company FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "fs_company_update_admin"
  ON public.fs_company FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

CREATE POLICY "fs_company_delete_admin"
  ON public.fs_company FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
  ));

-- fs_period: published rows for everyone, all rows for an admin. Written only
-- as a draft; status leaves draft only through fs_publish_period().

CREATE POLICY "fs_period_select_anon_published"
  ON public.fs_period FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "fs_period_select_authenticated"
  ON public.fs_period FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "fs_period_insert_admin_draft"
  ON public.fs_period FOR INSERT TO authenticated
  WITH CHECK (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "fs_period_update_admin_draft"
  ON public.fs_period FOR UPDATE TO authenticated
  USING (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "fs_period_delete_admin_draft"
  ON public.fs_period FOR DELETE TO authenticated
  USING (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

-- fs_line: readable with its period; writable by an admin while the period is
-- a draft.

CREATE POLICY "fs_line_select_anon_published"
  ON public.fs_line FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.fs_period p
    WHERE p.id = fs_line.period_id AND p.status = 'published'
  ));

CREATE POLICY "fs_line_select_authenticated"
  ON public.fs_line FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.id = fs_line.period_id AND p.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "fs_line_insert_admin_draft"
  ON public.fs_line FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.id = fs_line.period_id AND p.status = 'draft'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "fs_line_update_admin_draft"
  ON public.fs_line FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.id = fs_line.period_id AND p.status = 'draft'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.id = fs_line.period_id AND p.status = 'draft'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "fs_line_delete_admin_draft"
  ON public.fs_line FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.id = fs_line.period_id AND p.status = 'draft'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

-- fs_soce_cell: as fs_line.

CREATE POLICY "fs_soce_cell_select_anon_published"
  ON public.fs_soce_cell FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.fs_period p
    WHERE p.id = fs_soce_cell.period_id AND p.status = 'published'
  ));

CREATE POLICY "fs_soce_cell_select_authenticated"
  ON public.fs_soce_cell FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.id = fs_soce_cell.period_id AND p.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "fs_soce_cell_insert_admin_draft"
  ON public.fs_soce_cell FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.id = fs_soce_cell.period_id AND p.status = 'draft'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "fs_soce_cell_update_admin_draft"
  ON public.fs_soce_cell FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.id = fs_soce_cell.period_id AND p.status = 'draft'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.id = fs_soce_cell.period_id AND p.status = 'draft'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

CREATE POLICY "fs_soce_cell_delete_admin_draft"
  ON public.fs_soce_cell FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.id = fs_soce_cell.period_id AND p.status = 'draft'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

-- fs_check: readable with its period; no client writes (no policy, no grant).

CREATE POLICY "fs_check_select_anon_published"
  ON public.fs_check FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.fs_period p
    WHERE p.id = fs_check.period_id AND p.status = 'published'
  ));

CREATE POLICY "fs_check_select_authenticated"
  ON public.fs_check FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fs_period p
      WHERE p.id = fs_check.period_id AND p.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = 'admin'::public.app_role
    )
  );

-- --- Privileges --------------------------------------------------------------
-- Revoke first: Supabase's default privileges grant ALL on new public tables to
-- anon and authenticated, and a GRANT cannot take that away (baseline_cms §7).

REVOKE ALL ON public.fs_company, public.fs_period, public.fs_line, public.fs_soce_cell, public.fs_check
  FROM anon, authenticated;

GRANT SELECT ON public.fs_company, public.fs_period, public.fs_line, public.fs_soce_cell, public.fs_check
  TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fs_company, public.fs_line, public.fs_soce_cell
  TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.fs_period TO authenticated;
-- Every column but status.
GRANT UPDATE (company_id, period_key, period_end, comparative_end, currency, unit,
              auditor, auditor_report_no, auditor_opinion, source_file)
  ON public.fs_period TO authenticated;
GRANT SELECT ON public.fs_check TO authenticated;

GRANT ALL ON public.fs_company, public.fs_period, public.fs_line, public.fs_soce_cell, public.fs_check
  TO service_role;
