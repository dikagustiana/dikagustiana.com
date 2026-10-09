-- The homepage glimpse runs in the owner's order, not in order of creation.
--
-- essays.is_selected stays the one featuring mechanism: it says WHO is on
-- the homepage. selected_rank says in WHAT ORDER. Lower comes first. NULL
-- means "starred but not placed yet" and sorts after every placed essay,
-- newest first, so a newly starred essay joins the end of the row rather
-- than the front. About and the Finance landing read the same order.
--
-- Applied by the owner through apply_migration (README, "Database &
-- migrations"). The site reads the column defensively: until it exists,
-- Postgres answers 42703 and every reader falls back to newest first, so a
-- deploy ahead of this migration changes nothing a reader can see.
--
-- One nullable integer on essays. The anon read policy on essays covers it
-- as it covers every other column; no new table, policy, role, view or
-- function.

ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS selected_rank integer;

COMMENT ON COLUMN public.essays.selected_rank IS
  'Position of a selected essay on the homepage; lower first, NULL after every placed one.';

-- Seed today's order from today's behaviour (newest first), so the column
-- changes nothing until the owner reorders. Only unplaced rows are touched,
-- so re-running the file is harmless.
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn
  FROM public.essays
  WHERE is_selected = true
)
UPDATE public.essays AS e
SET selected_rank = ranked.rn
FROM ranked
WHERE e.id = ranked.id
  AND e.selected_rank IS NULL;
