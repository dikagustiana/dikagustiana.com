
-- Create depth enum
CREATE TYPE public.model_depth AS ENUM ('foundation', 'executive', 'institutional');

-- Create finance_models table
CREATE TABLE public.finance_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  number text NOT NULL,
  name text NOT NULL,
  description text,
  depth model_depth NOT NULL DEFAULT 'foundation',
  version text NOT NULL DEFAULT 'v1.0',
  last_updated date NOT NULL DEFAULT CURRENT_DATE,
  documentation jsonb NOT NULL DEFAULT '{}'::jsonb,
  module_references uuid[] NOT NULL DEFAULT '{}',
  excel_file_url text,
  is_flagship boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_models ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Finance models are publicly readable"
  ON public.finance_models FOR SELECT
  USING (true);

-- Admin write
CREATE POLICY "Admins can modify finance models"
  ON public.finance_models FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_finance_models_updated_at
  BEFORE UPDATE ON public.finance_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for model files
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-models', 'finance-models', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: public read
CREATE POLICY "Finance model files are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'finance-models');

-- Storage RLS: admin upload
CREATE POLICY "Admins can upload finance model files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'finance-models' AND has_role(auth.uid(), 'admin'::app_role));

-- Storage RLS: admin delete
CREATE POLICY "Admins can delete finance model files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'finance-models' AND has_role(auth.uid(), 'admin'::app_role));
