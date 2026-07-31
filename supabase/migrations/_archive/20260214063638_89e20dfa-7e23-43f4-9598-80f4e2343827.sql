
-- Add finance-specific fields to essays
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS finance_section text;
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS finance_order integer;

-- Create finance_fundamentals table
CREATE TABLE public.finance_fundamentals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  core_content text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_fundamentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance fundamentals are publicly readable"
  ON public.finance_fundamentals FOR SELECT USING (true);

CREATE POLICY "Admins can modify finance fundamentals"
  ON public.finance_fundamentals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_finance_fundamentals_updated_at
  BEFORE UPDATE ON public.finance_fundamentals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create finance_settings table
CREATE TABLE public.finance_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance settings are publicly readable"
  ON public.finance_settings FOR SELECT USING (true);

CREATE POLICY "Admins can modify finance settings"
  ON public.finance_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_finance_settings_updated_at
  BEFORE UPDATE ON public.finance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings
INSERT INTO public.finance_settings (key, value)
VALUES ('featured_finance_essay_id', null)
ON CONFLICT (key) DO NOTHING;

-- Seed the 12 fundamentals from existing hardcoded data
INSERT INTO public.finance_fundamentals (slug, title, core_content, sort_order) VALUES
  ('financial-management-creates-value', 'Financial management creates value', 'Finance exists to increase the value of the firm — not to produce reports.', 1),
  ('time-value-of-money', 'Time value of money is judgment', 'A dollar today is worth more than a dollar tomorrow — but by how much depends on the question you are answering.', 2),
  ('valuation-is-expectation', 'Valuation is expectation plus discipline', 'Valuation is not about finding the right number — it is about understanding what assumptions produce which prices.', 3),
  ('risk-is-uncertainty', 'Risk is uncertainty that matters', 'Risk is not volatility. Risk is the probability of permanent loss or failure to meet an obligation.', 4),
  ('financial-statements-tell-story', 'Financial statements tell a story', 'Statements are not just numbers — they are a structured narrative about what happened, why, and what it means.', 5),
  ('cash-flow-is-reality', 'Cash flow is reality', 'Profit is an opinion. Cash is a fact. The firm survives on cash, not on accounting income.', 6),
  ('working-capital-silent-value', 'Working capital is silent value creation', 'Working capital management determines whether growth creates or destroys cash.', 7),
  ('capital-budgeting', 'Capital budgeting earns finance its salary', 'Capital budgeting is where finance adds the most value: deciding which investments to make and which to reject.', 8),
  ('cost-of-capital', 'Cost of capital is the firm''s gravity', 'The cost of capital sets the minimum return a firm must earn. Every investment below it destroys value.', 9),
  ('payout-policy', 'Payout policy signals who you are', 'Dividends and buybacks are not just returns to shareholders — they are signals about what management believes about the future.', 10),
  ('financing-choices', 'Financing choices shape long-term control', 'How you fund the firm determines who controls it, how risky it is, and how much flexibility you have.', 11),
  ('special-situations', 'Special situations expose real financial skill', 'Mergers, restructurings, and distressed situations test whether you understand finance — or just its formulas.', 12)
ON CONFLICT (slug) DO NOTHING;
