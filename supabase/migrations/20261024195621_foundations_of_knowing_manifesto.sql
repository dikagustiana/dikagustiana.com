-- =============================================================================
-- Foundations of Knowing: the owner's manifesto, replacing Critical Thinking's
-- ("Critical thinking is pattern recognition applied to claims. It is
-- trainable."), which no longer described the section
-- (docs/prd/foundations-of-knowing/PRD.md, "Manifesto"). Chosen by the owner
-- on 2026-10-24. No page renders sections.manifesto (the banner was retired);
-- the value is the section's record.
--
-- Applied to asypkbkiebjvvpimewfp via apply_migration on 2026-10-24 (version
-- 20261024195621); this file is the repo mirror of what ran. Asserts exactly
-- one row changes.
--
-- DOWN:
--   UPDATE public.sections
--      SET manifesto = 'Critical thinking is pattern recognition applied to claims. It is trainable.'
--    WHERE slug = 'critical-thinking';
-- =============================================================================

-- Foundations of Knowing: the owner's manifesto (chosen 2026-10-24), replacing
-- the Critical Thinking one. Asserts exactly one row changes.
DO $$
DECLARE n integer;
BEGIN
  UPDATE public.sections
     SET manifesto = 'How we know comes before what we know. Every discipline on this site rests on it.'
   WHERE slug = 'critical-thinking';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'expected to update 1 section, updated %', n;
  END IF;
END $$;
