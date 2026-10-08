-- The think tank's fields on essays (docs/world/PRD-kawasan-industri.md §8.5).
--
-- NOT APPLIED TO PRODUCTION. Mega prompt rule 2: this file is applied only to
-- a Supabase branch or a local database, after the backup check of rule 3,
-- and only after gate 3; the owner applies it to production himself, later,
-- through the apply_migration tooling (README, "Database & migrations").
-- Until then the world reads docs/world/think-tank-tags.json.
--
-- Four nullable columns, so the existing anon policy
-- (essays_select_anon_published, USING (published = true)) covers them and no
-- new table, policy, role, view or function is added:
--   world_kind       'thesis' | 'model-based', the owner's kind for the piece
--   world_tags       IDX-IC sub-industry codes, chain node ids and tickers
--   world_evidence   links the thesis rests on: [{ "label", "href" }]
--   world_falsifier  what would prove the thesis wrong
-- Nothing here is written by the site: Writer Studio may edit them later.

ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS world_kind text
    CONSTRAINT essays_world_kind_check CHECK (world_kind IS NULL OR world_kind IN ('thesis', 'model-based')),
  ADD COLUMN IF NOT EXISTS world_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS world_evidence jsonb,
  ADD COLUMN IF NOT EXISTS world_falsifier text;

COMMENT ON COLUMN public.essays.world_kind IS 'Kawasan Industri think tank: thesis or model-based (PRD §7.10).';
COMMENT ON COLUMN public.essays.world_tags IS 'Kawasan Industri think tank: sub-industry codes, chain node ids and tickers the piece lights.';
COMMENT ON COLUMN public.essays.world_evidence IS 'Kawasan Industri think tank: the links a thesis rests on, [{label, href}].';
COMMENT ON COLUMN public.essays.world_falsifier IS 'Kawasan Industri think tank: what would prove the thesis wrong.';

-- Tagged pieces are looked up by tag; a GIN index keeps that cheap.
CREATE INDEX IF NOT EXISTS idx_essays_world_tags ON public.essays USING gin (world_tags);
