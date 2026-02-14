
-- Add thesis (one-line preview) and number columns to finance_fundamentals
ALTER TABLE public.finance_fundamentals
  ADD COLUMN IF NOT EXISTS thesis TEXT,
  ADD COLUMN IF NOT EXISTS number INTEGER;

-- Rename core_content to framing_content for clarity
ALTER TABLE public.finance_fundamentals
  RENAME COLUMN core_content TO framing_content;

-- Populate number from sort_order for existing rows
UPDATE public.finance_fundamentals SET number = sort_order WHERE number IS NULL;

-- Add fundamental_id FK to essays table
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS fundamental_id UUID REFERENCES public.finance_fundamentals(id);
