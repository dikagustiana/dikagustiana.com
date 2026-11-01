-- Foundations of Knowing, Part 0: retitle essays 001 and 002 (owner decisions 2026-10-31).
-- 001 now answers why some people understand a problem differently (cutting a
-- problem at its joints); 002 follows with which cut comes first. Slugs are
-- unchanged, so existing links keep working.
--
-- Rollback:
--   UPDATE public.essays SET title = 'Why a Finance Site Needs Epistemology'
--   WHERE section = 'critical-thinking' AND slug = 'why-a-finance-site-needs-epistemology';
--   UPDATE public.essays SET title = 'Sequence Matters: Foundations Before Disciplines'
--   WHERE section = 'critical-thinking' AND slug = 'sequence-matters';

UPDATE public.essays
SET title = 'Cutting at the Joints: Why Epistemology Comes First'
WHERE section = 'critical-thinking'
  AND slug = 'why-a-finance-site-needs-epistemology';

UPDATE public.essays
SET title = 'Sequence Matters: Which Cut Comes First'
WHERE section = 'critical-thinking'
  AND slug = 'sequence-matters';
