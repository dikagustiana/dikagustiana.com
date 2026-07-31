-- P0 fix: stop exposing unpublished/draft essays to the public.
--
-- Migration 20260301073018 replaced the published-gated SELECT policy with an
-- unconditional one:
--   CREATE POLICY "Essays are publicly readable" ON essays FOR SELECT USING (true);
-- with the note "content visibility can be controlled at the application level".
--
-- RLS is the real trust boundary, not the app: USING (true) lets anyone read
-- every row (drafts, tone_pending, archived, plus the voice/tone JSONB config)
-- directly via the public PostgREST endpoint, regardless of app-level gating.
-- The public app already filters .eq('published', true) on its read paths, so
-- restoring RLS gating does not change what the public site shows; it only
-- closes the direct-API leak. Admins (the only authors) retain full access.
--
-- Role-split design (verified locally): the anon policy never references
-- has_role(), so anonymous reads of published essays cannot be affected by the
-- function's EXECUTE grant state.

DROP POLICY IF EXISTS "Essays are publicly readable" ON public.essays;

-- Anonymous visitors: published essays only.
CREATE POLICY "Anon can read published essays"
  ON public.essays
  FOR SELECT
  TO anon
  USING (published = true);

-- Authenticated users: published essays; admins additionally see drafts.
CREATE POLICY "Authenticated can read published or admin-all essays"
  ON public.essays
  FOR SELECT
  TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'));
