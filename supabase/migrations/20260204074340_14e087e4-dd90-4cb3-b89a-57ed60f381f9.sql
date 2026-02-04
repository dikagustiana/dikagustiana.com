-- 1. Create enums for voice role and content status
CREATE TYPE voice_role_enum AS ENUM ('manager', 'economist', 'educator', 'coach', 'hybrid');
CREATE TYPE content_status_enum AS ENUM ('draft', 'tone_pending', 'published', 'archived');

-- 2. Add new columns to essays table
ALTER TABLE public.essays 
  ADD COLUMN IF NOT EXISTS status content_status_enum DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS manager_fields JSONB,
  ADD COLUMN IF NOT EXISTS economist_fields JSONB,
  ADD COLUMN IF NOT EXISTS educator_fields JSONB,
  ADD COLUMN IF NOT EXISTS coach_fields JSONB,
  ADD COLUMN IF NOT EXISTS voice_validated_at TIMESTAMPTZ;

-- 3. Create validation trigger function (not CHECK constraint per guidelines)
CREATE OR REPLACE FUNCTION public.validate_essay_tone_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only enforce for published status
  IF NEW.status = 'published' THEN
    -- Validate based on voice_role
    IF NEW.voice_role = 'manager' AND (NEW.manager_fields IS NULL OR NEW.manager_fields = '{}'::jsonb) THEN
      RAISE EXCEPTION 'Manager articles require manager_fields to be published';
    END IF;
    
    IF NEW.voice_role = 'economist' AND (NEW.economist_fields IS NULL OR NEW.economist_fields = '{}'::jsonb) THEN
      RAISE EXCEPTION 'Economist essays require economist_fields to be published';
    END IF;
    
    IF NEW.voice_role = 'educator' AND (NEW.educator_fields IS NULL OR NEW.educator_fields = '{}'::jsonb) THEN
      RAISE EXCEPTION 'Educator entries require educator_fields to be published';
    END IF;
    
    IF NEW.voice_role = 'coach' AND (NEW.coach_fields IS NULL OR NEW.coach_fields = '{}'::jsonb) THEN
      RAISE EXCEPTION 'Coach lessons require coach_fields to be published';
    END IF;
    
    -- Set validation timestamp
    NEW.voice_validated_at = now();
  END IF;
  
  -- Auto-set status to tone_pending when tone fields are filled
  IF NEW.status = 'draft' THEN
    IF (NEW.voice_role = 'manager' AND NEW.manager_fields IS NOT NULL AND NEW.manager_fields != '{}'::jsonb) OR
       (NEW.voice_role = 'economist' AND NEW.economist_fields IS NOT NULL AND NEW.economist_fields != '{}'::jsonb) OR
       (NEW.voice_role = 'educator' AND NEW.educator_fields IS NOT NULL AND NEW.educator_fields != '{}'::jsonb) OR
       (NEW.voice_role = 'coach' AND NEW.coach_fields IS NOT NULL AND NEW.coach_fields != '{}'::jsonb) OR
       (NEW.voice_role = 'hybrid') THEN
      NEW.status = 'tone_pending';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create trigger
DROP TRIGGER IF EXISTS validate_essay_tone_fields_trigger ON public.essays;
CREATE TRIGGER validate_essay_tone_fields_trigger
  BEFORE INSERT OR UPDATE ON public.essays
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_essay_tone_fields();

-- 5. Upsert sections with manifestos
INSERT INTO public.sections (slug, name, voice_role, manifesto, sort_order) VALUES
  ('finance', 'Finance', 'manager', 'Finance exists to support decisions—not to produce reports.', 1),
  ('accounting', 'Accounting', 'manager', 'Accounting describes economic reality. Your job is to describe it accurately.', 2),
  ('green-transition', 'Green Transition', 'economist', 'The green transition is an economic problem—not just an environmental one.', 3),
  ('next-big-thing', 'The Next Big Thing', 'economist', 'Rigorous speculation about structural economic change.', 4),
  ('books', 'Books', 'educator', 'Books are tools. Use them or do not pick them up.', 5),
  ('ielts', 'IELTS', 'coach', 'A score is the only measure. Everything else is preparation.', 6),
  ('tools', 'Tools', 'manager', 'Tools exist to support decisions. If a tool doesn''t inform a decision, it''s entertainment.', 7),
  ('critical-thinking', 'Critical Thinking', 'economist', 'Critical thinking is pattern recognition applied to claims. It is trainable.', 8)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  voice_role = EXCLUDED.voice_role,
  manifesto = EXCLUDED.manifesto,
  sort_order = EXCLUDED.sort_order;