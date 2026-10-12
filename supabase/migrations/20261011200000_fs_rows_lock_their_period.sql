-- =============================================================================
-- A statement row is written only while its period is a draft, and the check
-- holds against a publish running at the same moment (Codex review of
-- dikagustiana/dikagustiana.com#73).
--
-- fs_run_publish_gate() locks the period row FOR UPDATE, re-runs the rules and
-- publishes. The RLS policies on fs_line and fs_soce_cell let an admin write
-- while the period reads as a draft, but they read it without a lock: under
-- READ COMMITTED an edit whose statement began before the publish committed
-- could still land after it, in a published period the passing run never
-- covered.
--
-- This trigger makes every insert, update and delete of a statement row take
-- FOR SHARE on its period first. FOR SHARE and the gate's FOR UPDATE exclude
-- each other, so one waits for the other:
--   * an edit that waits for a publish re-reads the period once the publish
--     commits, finds it published and is refused;
--   * a publish that waits for an edit runs its rules after the edit commits,
--     on rows that include it.
-- It applies to every writer, the table owner included: a published period's
-- rows change only after its status is set back to draft. Two writes are let
-- through: a row whose period is gone (the cascade of a period's own delete),
-- and an update of fs_line that changes nothing but fsli_slug, which is what
-- renaming or deleting a line-item page does through the foreign key
-- (ON UPDATE CASCADE, ON DELETE SET NULL). A link to a page is not a figure;
-- no rule reads it.
--
-- SECURITY DEFINER so the lock and the status read do not depend on the
-- caller's RLS or grants on fs_period; search_path is empty.
--
-- DOWN:
--   DROP TRIGGER fs_soce_cell_period_is_draft ON public.fs_soce_cell;
--   DROP TRIGGER fs_line_period_is_draft ON public.fs_line;
--   DROP FUNCTION public.fs_row_period_is_draft();
-- =============================================================================

CREATE FUNCTION public.fs_row_period_is_draft()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  pid      uuid;
  v_status text;
BEGIN
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'fs_line'
     AND (to_jsonb(NEW) - 'fsli_slug') = (to_jsonb(OLD) - 'fsli_slug') THEN
    RETURN NEW;
  END IF;
  FOR pid IN
    SELECT DISTINCT x FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.period_id END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.period_id END
    ]) AS x WHERE x IS NOT NULL
  LOOP
    SELECT p.status INTO v_status FROM public.fs_period p WHERE p.id = pid FOR SHARE;
    IF FOUND AND v_status <> 'draft' THEN
      RAISE EXCEPTION 'fs_period % is %: its statement rows do not change', pid, v_status
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END
$fn$;

COMMENT ON FUNCTION public.fs_row_period_is_draft() IS
  'Trigger: a statement row is written only while its period is a draft, under a FOR SHARE lock on the period that a concurrent fs_run_publish_gate() cannot pass.';

REVOKE EXECUTE ON FUNCTION public.fs_row_period_is_draft() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER fs_line_period_is_draft
  BEFORE INSERT OR UPDATE OR DELETE ON public.fs_line
  FOR EACH ROW EXECUTE FUNCTION public.fs_row_period_is_draft();

CREATE TRIGGER fs_soce_cell_period_is_draft
  BEFORE INSERT OR UPDATE OR DELETE ON public.fs_soce_cell
  FOR EACH ROW EXECUTE FUNCTION public.fs_row_period_is_draft();
