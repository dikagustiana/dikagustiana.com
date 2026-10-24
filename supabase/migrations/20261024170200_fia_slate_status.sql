-- =============================================================================
-- Finance in Action: where each slate company stands before it is published
-- (docs/prd/finance-restructure §1 B, §4 "Coverage tracker").
--
-- The index's coverage tracker lists every company on the FSRE slate under its
-- sub-industry: published ones as links (fia.model_packages), the rest with a
-- status, queued, in review, rejected or not started. Published packages say
-- nothing about the rest, and fia_private.fsre_packages() reads approved
-- packages only (ticker, version, content_hash, approved_by, approved_at,
-- package; checked against 20261022100000_fia_two_gates.sql), so the FSRE
-- channel's status comes from a table of its own, as the PRD asks:
--
--   fia.slate_status    one row per ticker, written by the FSRE pipeline on
--                       each run (an upsert on ticker). Nothing else writes
--                       it. RLS on, no policy: the owner writes, and the
--                       FSRE writer once the owner grants it INSERT/UPDATE.
--   fia.slate_progress  what the site reads: the FSRE rows, and for the
--                       manual channel a ticker with a staged
--                       fia.manual_release row is in review. One row per
--                       ticker, the latest of the two winning. Published
--                       packages are not repeated here: the client counts a
--                       company with a package as modelled whatever this says,
--                       so nothing is stored twice.
--
-- fia.slate_progress runs with its owner's rights, as fia.model_packages does:
-- anon is granted the view and reads neither table.
--
-- Apply on its own through the Supabase MCP apply_migration (never
-- `supabase db push`), after 20261022100000_fia_two_gates.sql. Test:
-- supabase/tests/fia_slate_status.sql. Rollback:
-- supabase/rollback/20261024170300_fia_slate_status_down.sql.
-- =============================================================================

CREATE TABLE fia.slate_status (
  ticker      text        PRIMARY KEY CONSTRAINT slate_status_ticker_format CHECK (ticker ~ '^[A-Z0-9]{2,8}$'),
  status      text        NOT NULL CONSTRAINT slate_status_known CHECK (status IN ('queued', 'in_review', 'rejected', 'not_started')),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text        NOT NULL DEFAULT current_user
);
COMMENT ON TABLE fia.slate_status IS
  'Where each FSRE slate company stands before it is published; written by the FSRE pipeline on each run. Read through fia.slate_progress.';

ALTER TABLE fia.slate_status ENABLE ROW LEVEL SECURITY;   -- no policy: nobody but the owner and whom the owner grants

CREATE VIEW fia.slate_progress AS
WITH candidates AS (
  SELECT s.ticker, s.status, 'fsre'::text AS channel, s.updated_at AS at
  FROM fia.slate_status AS s
  UNION ALL
  SELECT m.ticker, 'in_review'::text, 'manual'::text, max(m.updated_at)
  FROM fia.manual_release AS m
  WHERE m.status = 'staged'
  GROUP BY m.ticker
)
SELECT DISTINCT ON (c.ticker) c.ticker, c.status, c.channel, c.at AS updated_at
FROM candidates AS c
ORDER BY c.ticker, c.at DESC, (c.channel = 'fsre') DESC;
COMMENT ON VIEW fia.slate_progress IS
  'The slate status the Finance in Action coverage tracker reads: FSRE rows and staged manual releases, one per ticker.';

REVOKE ALL ON fia.slate_status, fia.slate_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT ON fia.slate_progress TO anon;

NOTIFY pgrst, 'reload schema';
