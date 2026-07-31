-- =============================================================================
-- Framework v2 taxonomy — ADVERSARIAL MINIMUM (import test for T4-M07-1).
-- Applied to asypkbkiebjvvpimewfp via apply_migration on 2026-07-31; this file
-- is the repo mirror of exactly what ran.
--
-- curriculum_framework_v2.docx is the taxonomy of record: 6 sections,
-- 49 modules, 160 essays. This migration deliberately converts ONLY the four
-- modules that make the two constraint collisions bite, before any full seed:
--
--   * "Module 07" exists in FOUR sections. finance_modules.slug is globally
--     UNIQUE, so a naive slug of 'module-07' inserts once and then fails.
--     The framework's own cross-references are written T1-M09 / T3-M01 /
--     T4-M07 (and T4-QM3 for the quantitative-methods modules), so the slug
--     scheme is the lowercase of that convention: t4-m07, t1-m07, t1-m08a,
--     t4-qm1. Converting BOTH t4-m07 and t1-m07 proves two Module 07s coexist.
--
--   * Module numbering is not integers: 08A, 08B, 14B, 14C, QM1-QM3.
--     sort_order stays an INTEGER = ordinal position within the track; the
--     label the reader sees moves to module_meta.display_label ('07', '08A',
--     'QM1'). 08A and 08B are ordinals 8 and 9 — never coerced into one
--     number. t1-m08a / t1-m08b exercise exactly that split.
--
-- Academic Mapping tables land in module_meta.academic_mapping (reference /
-- chapters / depth), merged with || so existing keys (variant) survive.
-- The full statements are in the applied migration history
-- (supabase migration list, name: adversarial_taxonomy_framework_v2); they are
-- reproduced verbatim below.
-- =============================================================================

UPDATE public.finance_modules SET
  slug = 't4-m07',
  title = 'Driver-Based Forecasting and Business Model Mapping',
  module_meta = coalesce(module_meta,'{}'::jsonb)
    || jsonb_build_object('display_label', '07')
    || jsonb_build_object('academic_mapping', $am$[{"reference": "Damodaran (5e)", "chapters": "Ch. 5 — Return measures and value drivers", "depth": "L1 Conceptual"}, {"reference": "Brealey et al. (14e)", "chapters": "Ch. 30 — Financial Planning", "depth": "L1 Conceptual"}, {"reference": "Hillier et al. (3e)", "chapters": "Ch. 12 — Allocating Capital and Corporate Strategy", "depth": "L1 Conceptual"}, {"reference": "Tirole", "chapters": "No direct anchor", "depth": "No Anchor"}, {"reference": "Palepu et al. (6e)", "chapters": "Ch. 6 — Prospective Analysis: Forecasting; Ch. 2 — Strategy Analysis", "depth": "L2 Full Coverage"}, {"reference": "Sydsæter et al. (6e)", "chapters": "Ch. 11 — Functions of Many Variables; Ch. 15 — Matrix and Vector Algebra", "depth": "L1 Conceptual"}]$am$::jsonb)
WHERE track_slug = 'analytics' AND sort_order = 7;

UPDATE public.finance_modules SET
  slug = 't1-m07',
  title = 'The CAPM, Factor Models, and the Price of Risk',
  module_meta = coalesce(module_meta,'{}'::jsonb)
    || jsonb_build_object('display_label', '07')
    || jsonb_build_object('academic_mapping', $am$[{"reference": "Damodaran (5e)", "chapters": "Ch. 3 — Basics of Risk; Ch. 4 — Risk Measurement and Hurdle Rates", "depth": "L2 Full Coverage"}, {"reference": "Brealey et al. (14e)", "chapters": "Ch. 8 — The Capital Asset Pricing Model; Ch. 9 — Risk and the Cost of Capital", "depth": "L2 Full Coverage"}, {"reference": "Hillier et al. (3e)", "chapters": "Ch. 5 — Mean-Variance Analysis and CAPM; Ch. 6 — Factor Models and APT", "depth": "L2 Full Coverage"}, {"reference": "Tirole", "chapters": "No direct anchor", "depth": "No Anchor"}, {"reference": "Palepu et al. (6e)", "chapters": "No direct anchor", "depth": "No Anchor"}, {"reference": "Sydsæter et al. (6e)", "chapters": "Ch. 6–7 — Differentiation and Derivatives in Use; Ch. 13–14 — Multivariable and Constrained Optimization", "depth": "L2 Full Coverage"}]$am$::jsonb)
WHERE track_slug = 'fundamentals' AND sort_order = 7;

UPDATE public.finance_modules SET
  slug = 't1-m08a',
  title = 'Financial Statement Construction and Quality Analysis',
  module_meta = coalesce(module_meta,'{}'::jsonb)
    || jsonb_build_object('display_label', '08A')
    || jsonb_build_object('academic_mapping', $am$[{"reference": "Damodaran (5e)", "chapters": "Appendix 2 — Financial Statements (overview)", "depth": "L1 Conceptual"}, {"reference": "Brealey et al. (14e)", "chapters": "Ch. 29 — Financial Analysis (statement structure, partial)", "depth": "L1 Conceptual"}, {"reference": "Hillier et al. (3e)", "chapters": "No direct anchor", "depth": "No Anchor"}, {"reference": "Tirole", "chapters": "No direct anchor", "depth": "No Anchor"}, {"reference": "Palepu et al. (6e)", "chapters": "Ch. 3 — Accounting Analysis: The Basics; Ch. 4 — Accounting Analysis: Accounting Adjustments", "depth": "L2 Full Coverage"}, {"reference": "Sydsæter et al. (6e)", "chapters": "No direct anchor", "depth": "No Anchor"}]$am$::jsonb)
WHERE track_slug = 'fundamentals' AND sort_order = 8;

UPDATE public.finance_modules SET
  slug = 't1-m08b',
  title = 'Financial Statement Analysis: Ratios, Profitability, and Risk Signals',
  module_meta = coalesce(module_meta,'{}'::jsonb)
    || jsonb_build_object('display_label', '08B')
    || jsonb_build_object('academic_mapping', $am$[{"reference": "Damodaran (5e)", "chapters": "Ch. 5 — Return measurement sections", "depth": "L1 Conceptual"}, {"reference": "Brealey et al. (14e)", "chapters": "Ch. 29 — Financial Analysis (full chapter)", "depth": "L2 Full Coverage"}, {"reference": "Hillier et al. (3e)", "chapters": "No direct anchor", "depth": "No Anchor"}, {"reference": "Tirole", "chapters": "No direct anchor", "depth": "No Anchor"}, {"reference": "Palepu et al. (6e)", "chapters": "Ch. 5 — Financial Analysis; Ch. 10 — Credit Analysis and Distress Prediction", "depth": "L2 Full Coverage"}, {"reference": "Sydsæter et al. (6e)", "chapters": "Ch. 6–7 — Differentiation (DuPont as algebraic decomposition)", "depth": "L1 Conceptual"}]$am$::jsonb)
WHERE track_slug = 'fundamentals' AND sort_order = 9;

DO $assert$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM public.finance_modules
   WHERE module_meta->>'display_label' = '07';
  IF n <> 2 THEN RAISE EXCEPTION 'expected 2 modules labelled 07, found %', n; END IF;

  SELECT count(*) INTO n FROM public.finance_modules
   WHERE slug IN ('t1-m08a','t1-m08b')
     AND track_slug='fundamentals' AND sort_order IN (8,9);
  IF n <> 2 THEN RAISE EXCEPTION '08A/08B not at ordinals 8/9 (found %)', n; END IF;

  SELECT count(*) INTO n FROM public.essays e
    JOIN public.finance_modules m ON m.id = e.module_id
   WHERE m.slug = 't4-m07';
  IF n < 3 THEN RAISE EXCEPTION 'expected >=3 essays under t4-m07, found %', n; END IF;

  SELECT count(*) INTO n FROM public.finance_modules
   WHERE slug IN ('t4-m07') AND module_meta->>'variant' IS DISTINCT FROM 'analytics';
  IF n <> 0 THEN RAISE EXCEPTION 't4-m07 lost its variant key'; END IF;
END
$assert$;
