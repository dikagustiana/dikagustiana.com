-- DESTRUCTIVE: Only run after verifying module_id migration is complete
-- and all pages reference finance_modules instead of finance_fundamentals.

-- =============================================================================
-- Migration: 20260218_003_drop_deprecated_finance_tables.sql
--
-- 1. Drop essays.fundamental_id  (superseded by essays.module_id)
-- 2. Drop finance_fundamentals table  (data lives in finance_modules)
-- 3. Idempotent safeguard: re-apply finance_section slug renames on essays
--    in case any row was inserted with the old slugs after Phase 1 ran.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Drop essays.fundamental_id
--    module_id is now the canonical FK; fundamental_id is no longer needed.
-- -----------------------------------------------------------------------------

ALTER TABLE public.essays
  DROP COLUMN IF EXISTS fundamental_id;

-- -----------------------------------------------------------------------------
-- 2. Drop finance_fundamentals
--    All rows were migrated to finance_modules in
--    20260218_001_finance_modules_and_slug_unification.sql.
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS public.finance_fundamentals;

-- -----------------------------------------------------------------------------
-- 3. Idempotent safeguard: ensure essays.finance_section reflects new slugs.
--    These are no-ops if Phase 1 already ran correctly; safe to re-execute.
-- -----------------------------------------------------------------------------

UPDATE public.essays SET finance_section = 'planning'   WHERE finance_section = 'planning';
UPDATE public.essays SET finance_section = 'analytics'  WHERE finance_section = 'analytics';

COMMIT;
