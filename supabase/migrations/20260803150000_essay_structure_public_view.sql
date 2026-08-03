-- The curriculum's structure becomes publicly visible: titles and decks of
-- unwritten essays render to everyone, labelled "Coming soon", with the
-- author shown. This deliberately reverses the 2026-08-01 "do not make
-- drafts anon-readable" rule — FOR TITLES AND DECKS ONLY. Bodies stay
-- exactly as locked as they are today.
-- (Mirror of the migration applied live via apply_migration on 2026-08-03.)
--
-- Postgres RLS is row-level, not column-level, so the essays policy cannot
-- express "unpublished rows, some columns". Loosening
-- essays_select_anon_published would hand anon the WHOLE row, content and
-- content_json included — publishing 161 unwritten essays and exposing
-- whatever is in progress. That policy is therefore NOT touched; the
-- exposure is this separate view, which enumerates exactly the columns that
-- may be public and nothing else.
--
-- security_invoker is EXPLICITLY false, and that is the design, not an
-- accident: with security_invoker = true the querying role's RLS would
-- apply to `essays` underneath, anon would see only published rows through
-- the view, and the whole feature would expose nothing. With definer
-- semantics the view reads `essays` as the view's owner (postgres, the
-- table owner, whom RLS does not bind), and the column list + WHERE clause
-- of this view become the entire public contract. Supabase's linter will
-- flag a SECURITY DEFINER view — here that property is the point.
-- security_barrier stops leaky functions in a caller's WHERE from being
-- pushed down past the status filter.
--
-- Row scope: draft and published only. Archived essays are soft-deleted and
-- must not resurface as "Coming soon"; the whitelist also keeps any future
-- status hidden until deliberately exposed (fail closed).
--
-- read_time and lesson_type exist for the published rendering and are
-- NULLed for drafts, so an unpublished row exposes EXACTLY the enumerated
-- set: title, deck, slug, author, module reference, ordering, published
-- flag — the line docs/DECISIONS.md 2026-08-03 draws.
CREATE VIEW public.essay_structure
WITH (security_invoker = false, security_barrier = true) AS
SELECT
  e.id,
  e.slug,
  e.title,
  e.snippet,
  e.author,
  e.section,
  e.module_id,
  e.finance_order,
  e.published,
  CASE WHEN e.published THEN e.read_time END AS read_time,
  CASE WHEN e.published THEN e.lesson_type END AS lesson_type
FROM public.essays e
WHERE e.status IN ('draft'::content_status_enum, 'published'::content_status_enum);

COMMENT ON VIEW public.essay_structure IS
  'Public curriculum structure: titles/decks/placement of draft AND published essays (never bodies — content/content_json are not selectable here). SECURITY DEFINER on purpose; the column list is the security boundary. Scope and rationale: docs/DECISIONS.md 2026-08-03.';

-- A view cannot carry CREATE POLICY (RLS attaches to tables), so its
-- explicit access policy is the privilege layer — and on managed Supabase a
-- new object is BORN with ALL granted to anon/authenticated via default
-- privileges, so the revoke must come first and must name the roles
-- (SCHEMA_PLAN §1 rule). SELECT-only, to the two client roles.
REVOKE ALL ON public.essay_structure FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.essay_structure TO anon, authenticated;
