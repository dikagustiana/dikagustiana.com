-- The homepage glimpse is ordered by the owner, not by recency.
--
-- `is_selected` stays the one featuring mechanism (who is featured);
-- `selected_rank` only says in what order. Lower comes first. NULL means
-- "not placed yet" and sorts after every placed essay, then newest first,
-- so a freshly starred essay never jumps the queue on its own.
--
-- Applied by the owner through apply_migration (README, "Database &
-- migrations"). The site reads this column defensively: until it exists the
-- homepage falls back to newest-first instead of failing.
--
-- One nullable integer on essays: the existing anon policy
-- (essays_select_anon_published, USING (published = true)) covers it, and no
-- new table, policy, role, view or function is added.

ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS selected_rank integer;

COMMENT ON COLUMN public.essays.selected_rank IS
  'Order of a selected essay in the homepage glimpse; lower first, NULL after all placed ones.';

-- Seed today's order from today's behaviour (newest first), so the switch
-- changes nothing a reader can see until the owner reorders.
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn
  FROM public.essays
  WHERE is_selected = true
)
UPDATE public.essays e
SET selected_rank = ranked.rn
FROM ranked
WHERE e.id = ranked.id
  AND e.selected_rank IS NULL;

-- Unstarring clears the place in the same update (useToggleSelectContent),
-- so a re-starred essay is not silently returned to an old slot.
