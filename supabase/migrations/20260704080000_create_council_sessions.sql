-- Writing Council: persistent transcripts of advisor → peer-review → chairman sessions.
-- Admin-only feature; every policy is gated on has_role(auth.uid(), 'admin').

CREATE TABLE IF NOT EXISTS public.council_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.essays(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('brainstorm', 'review')),
  input_snapshot TEXT NOT NULL,
  advisors_config JSONB NOT NULL,
  advisor_responses JSONB NOT NULL,
  peer_reviews JSONB NOT NULL,
  verdict JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid()
);

-- History is queried per essay (newest first) and as a global timeline.
CREATE INDEX IF NOT EXISTS idx_council_sessions_post_id
  ON public.council_sessions (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_council_sessions_created_at
  ON public.council_sessions (created_at DESC);

ALTER TABLE public.council_sessions ENABLE ROW LEVEL SECURITY;

-- Admin-only access on every verb — no permissive policies: transcripts
-- contain unpublished draft content and must not be readable by regular users.
CREATE POLICY "Admins can view council sessions"
ON public.council_sessions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert council sessions"
ON public.council_sessions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins can update council sessions"
ON public.council_sessions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete council sessions"
ON public.council_sessions
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
