-- =============================================================================
-- Rollback of supabase/migrations/20261024170200_fia_slate_status.sql.
--
-- Kept OUT of supabase/migrations/ so `supabase db push` never applies it. Run
-- by hand, only on request. The site reads fia.slate_progress and treats a
-- missing view as "no status yet": every unmodelled slate company then shows
-- as not started, so the code need not be reverted first. The FSRE pipeline's
-- writes to fia.slate_status fail once the table is gone; stop them first.
-- =============================================================================
BEGIN;
DROP VIEW IF EXISTS fia.slate_progress;
DROP TABLE IF EXISTS fia.slate_status;
NOTIFY pgrst, 'reload schema';
COMMIT;
