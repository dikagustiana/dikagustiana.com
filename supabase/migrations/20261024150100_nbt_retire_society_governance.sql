-- =============================================================================
-- The Next Big Thing: Society and Governance retired
-- (docs/prd/2026-10-fia-fixes/README.md item 13).
--
-- The site no longer lists the two themes (src/config/nextBigThingThemes.ts).
-- Their one essay, "Thinking Was Expensive, but Attention with Discernment and
-- Curiosity Is Appreciating" (phase society), moves to Growth. Its category
-- moves with its phase: the writer derives phase from the category
-- (placement.ts derivePhase), so a phase moved alone would be put back to
-- 'society' by the next save. The category rows next-big-thing-society and
-- next-big-thing-governance stay; the writer no longer offers them.
--
-- The essay's URL becomes /the-next-big-thing/growth/<slug>; the old
-- /the-next-big-thing/society/<slug> still resolves and redirects there
-- (NextBigThingEssayPage canonical redirect).
--
-- Asserts that exactly one row changes, and that no essay of the section is
-- left in either retired theme; otherwise it raises and nothing is changed.
--
-- Apply individually (MCP apply_migration or the SQL editor), never with
-- `supabase db push` (docs/company-models, 2026-10-24).
--
-- DOWN (the one essay back to Society):
--   UPDATE public.essays e
--      SET phase = 'society',
--          category_id = (SELECT id FROM public.categories WHERE slug = 'next-big-thing-society')
--    WHERE e.id = 'be59ec76-c79d-4994-aca3-d9494ca3b9b2'
--      AND e.section = 'next-big-thing'
--      AND e.phase = 'growth';
-- =============================================================================

DO $$
DECLARE
  growth uuid;
  moved integer;
  left_over integer;
BEGIN
  SELECT id INTO growth FROM public.categories WHERE slug = 'next-big-thing-growth';
  IF growth IS NULL THEN
    RAISE EXCEPTION 'category next-big-thing-growth not found';
  END IF;

  UPDATE public.essays
     SET phase = 'growth',
         category_id = growth
   WHERE section = 'next-big-thing'
     AND phase = 'society';
  GET DIAGNOSTICS moved = ROW_COUNT;
  IF moved <> 1 THEN
    RAISE EXCEPTION 'expected to move exactly 1 essay from society to growth, moved %', moved;
  END IF;

  SELECT count(*) INTO left_over FROM public.essays WHERE section = 'next-big-thing' AND phase IN ('society', 'governance');
  IF left_over <> 0 THEN
    RAISE EXCEPTION '% next-big-thing essays are still in a retired theme', left_over;
  END IF;
END $$;
