-- ============================================================================
-- import.sql — combined, ORDERED schema for a FRESH / EMPTY Supabase Postgres DB
-- Generated from supabase/migrations/*.sql in timestamp order.
-- DO NOT run against the live DB owned by the concurrent migration session.
-- Prefer 'supabase db push' (uses supabase/migrations) — this file is a convenience
-- bundle for a one-shot manual import into an empty database.
-- See docs/DB_READINESS.md for the full runbook.
-- ============================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20251223113138_7f971e9c-4d54-42dc-8122-b9939721a56e.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Create app_role enum for admin roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create pages table for page metadata
CREATE TABLE public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    hero_title TEXT,
    hero_subtitle TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Pages are readable by everyone
CREATE POLICY "Pages are publicly readable"
ON public.pages
FOR SELECT
USING (true);

-- Only admins can modify pages
CREATE POLICY "Admins can modify pages"
ON public.pages
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create content_blocks table for editable content
CREATE TABLE public.content_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_slug TEXT NOT NULL,
    block_key TEXT NOT NULL,
    content TEXT NOT NULL,
    block_type TEXT DEFAULT 'text',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (page_slug, block_key)
);

-- Enable RLS on content_blocks
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;

-- Content blocks are readable by everyone
CREATE POLICY "Content blocks are publicly readable"
ON public.content_blocks
FOR SELECT
USING (true);

-- Only admins can modify content blocks
CREATE POLICY "Admins can modify content blocks"
ON public.content_blocks
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create category_cards table for section cards
CREATE TABLE public.category_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'file-text',
    link_url TEXT,
    link_text TEXT DEFAULT 'Learn More',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on category_cards
ALTER TABLE public.category_cards ENABLE ROW LEVEL SECURITY;

-- Category cards are readable by everyone
CREATE POLICY "Category cards are publicly readable"
ON public.category_cards
FOR SELECT
USING (true);

-- Only admins can modify category cards
CREATE POLICY "Admins can modify category cards"
ON public.category_cards
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_blocks_updated_at
  BEFORE UPDATE ON public.content_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_category_cards_updated_at
  BEFORE UPDATE ON public.category_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20251223120457_1f1d9359-ac71-46c3-893a-372a54b27a3e.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Create fsli_pages table for FSLI items
CREATE TABLE IF NOT EXISTS public.fsli_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  notes_ref TEXT,
  dec_2024 TEXT,
  dec_2023 TEXT,
  category TEXT DEFAULT 'current_assets',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fsli_pages ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "FSLI pages are publicly readable" 
ON public.fsli_pages 
FOR SELECT 
USING (true);

-- Admin write access
CREATE POLICY "Admins can modify FSLI pages" 
ON public.fsli_pages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create fsli_sections table for editable content sections
CREATE TABLE IF NOT EXISTS public.fsli_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug TEXT NOT NULL,
  section_key TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_slug, section_key)
);

-- Enable RLS
ALTER TABLE public.fsli_sections ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "FSLI sections are publicly readable" 
ON public.fsli_sections 
FOR SELECT 
USING (true);

-- Admin write access
CREATE POLICY "Admins can modify FSLI sections" 
ON public.fsli_sections 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create essays table for Critical Thinking, Green Transition essays
CREATE TABLE IF NOT EXISTS public.essays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL, -- 'critical-thinking', 'green-transition', 'english-ielts'
  phase TEXT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  snippet TEXT,
  author TEXT DEFAULT 'Dika Gustiana',
  date TEXT,
  read_time TEXT,
  thumbnail_url TEXT,
  content TEXT,
  published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section, phase, slug)
);

-- Enable RLS
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

-- Public read access for published essays
CREATE POLICY "Published essays are publicly readable" 
ON public.essays 
FOR SELECT 
USING (published = true OR has_role(auth.uid(), 'admin'));

-- Admin write access
CREATE POLICY "Admins can modify essays" 
ON public.essays 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create books_uploads table
CREATE TABLE IF NOT EXISTS public.books_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  filepath TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  title TEXT,
  author TEXT,
  year INTEGER,
  cover_path TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.books_uploads ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Books are publicly readable" 
ON public.books_uploads 
FOR SELECT 
USING (deleted_at IS NULL);

-- Admin write access
CREATE POLICY "Admins can modify books" 
ON public.books_uploads 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create embeds table for FSLI embeds
CREATE TABLE IF NOT EXISTS public.embeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug TEXT NOT NULL,
  embed_type TEXT NOT NULL, -- 'file', 'iframe', 'link'
  src TEXT NOT NULL,
  title TEXT,
  width INTEGER,
  height INTEGER,
  scrollable BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.embeds ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Embeds are publicly readable" 
ON public.embeds 
FOR SELECT 
USING (true);

-- Admin write access
CREATE POLICY "Admins can modify embeds" 
ON public.embeds 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for embeds
INSERT INTO storage.buckets (id, name, public) 
VALUES ('embeds', 'embeds', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for books
INSERT INTO storage.buckets (id, name, public) 
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for embeds bucket
CREATE POLICY "Embeds are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'embeds');

CREATE POLICY "Admins can upload embeds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'embeds' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete embeds" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'embeds' AND has_role(auth.uid(), 'admin'));

-- Storage policies for books bucket
CREATE POLICY "Books are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'books');

CREATE POLICY "Admins can upload books" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'books' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete books" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'books' AND has_role(auth.uid(), 'admin'));

-- Seed FSLI pages with all items
INSERT INTO public.fsli_pages (slug, title, subtitle, notes_ref, dec_2024, dec_2023, category, sort_order) VALUES
('cash-and-cash-equivalents', 'Cash and cash equivalents', 'Kas dan setara kas', '3i.6', '2,614,318', '5,018,739', 'current_assets', 1),
('restricted-cash', 'Restricted cash', 'Kas yang dibatasi penggunaannya', '3i.7', '154,217', '133,537', 'current_assets', 2),
('trade-receivables-net', 'Trade receivables, net', 'Piutang usaha, neto', '3b,4dc', '2,203,018', '2,063,070', 'current_assets', 3),
('third-parties', 'Third parties', 'Piutang ketiga', '3b.5', '520,885', '715,327', 'current_assets', 4),
('related-parties', 'Related parties', 'Piutang bermiutah', '3g.9', '823,348', '801,429', 'current_assets', 5),
('other-receivables-net', 'Other receivables, net', 'Piutang lain-lain, neto', '3h,10,14d', '28,830', '28,217', 'current_assets', 6),
('due-from-government', 'Due from the Government', 'Piutang dari Pemerintah', '3h,10', '85,053', '94,887', 'current_assets', 7),
('inventories-net', 'Inventories, net', 'Persediaan, neto', '3j,11', '809,397', '658,712', 'current_assets', 8),
('corporate-dividend-taxes-receivable-current', 'Corporate and dividend taxes receivable - current portion', 'Piutang pajak penghasilan dan dividen taxes', '3c,43a', '300,738', '275,812', 'current_assets', 9),
('advances-prepayments-current', 'Advances and prepayments - current portion', 'Uang muka dan biaya dibayar di muka', '3c,43a', '20,268', '12,503', 'current_assets', 10),
('other-current-assets', 'Other current assets', 'Aset lancar lainnya', '3h,15', '179,426', '177,429', 'current_assets', 11),
('other-non-current-assets', 'Other non-current assets', 'Aset tidak lancar lainnya', '14a', '60,913', '210,253', 'non_current_assets', 12),
('restricted-cash-non-current', 'Restricted cash - non-current portion', 'Kas yang dibatasi penggunaannya', '3i,7', '1,890,493', '1,700,675', 'non_current_assets', 13),
('trade-receivables-net-non-current', 'Trade receivables, net - non-current portion', 'Piutang usaha, neto', '3i,12', '544,278', '522,121', 'non_current_assets', 14),
('fixed-assets-net', 'Fixed assets, net', 'Aset tetap, neto', '3d,13', '71,814', '73,800', 'non_current_assets', 15),
('investment-properties', 'Investment properties', 'Properti investasi', '3c,43a', '5,149', '3,301', 'non_current_assets', 16),
('deferred-tax-assets', 'Deferred tax assets', 'Aset pajak tangguhan', '10', '53,721', '95,263', 'non_current_assets', 17),
('long-term-investments', 'Long-term investments', 'Investasi jangka panjang', '', '1,109,172', '1,602,821', 'non_current_assets', 18),
('advances-prepayments-non-current', 'Advances and prepayments - non-current portion', 'Uang muka dan biaya dibayar di muka', '3h,15', '50', '2,242', 'non_current_assets', 19),
('corporate-dividend-taxes-receivable-non-current', 'Corporate and dividend taxes receivable - non-current portion', 'Piutang pajak penghasilan dan dividen taxes', '3c,43a', '262,713', '213,492', 'non_current_assets', 20),
('other-non-current-receivables', 'Other non-current receivables', 'Piutang tidak lancar lainnya', '3c,43a', '3,106', '3,460', 'non_current_assets', 21),
('oil-gas-properties-net', 'Oil and gas properties, net', 'Aset hak dan gas bumi, neto', '3m,17', '17,905,149', '16,130,200', 'non_current_assets', 22),
('right-of-use-assets-net', 'Right of use assets, net', 'Aset hak guna, neto', '3n,18', '123,977', '203,379', 'non_current_assets', 23),
('other-non-current-assets-final', 'Other non-current assets', 'Aset tidak lancar lainnya', '15b', '533,865', '455,380', 'non_current_assets', 24)
ON CONFLICT (slug) DO NOTHING;

-- Create triggers for updated_at
CREATE TRIGGER update_fsli_pages_updated_at
BEFORE UPDATE ON public.fsli_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fsli_sections_updated_at
BEFORE UPDATE ON public.fsli_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_essays_updated_at
BEFORE UPDATE ON public.essays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20251225064909_3e857885-3dec-40d8-8af9-7e6424486759.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Create account types enum
CREATE TYPE public.account_type AS ENUM (
  'checking',
  'savings',
  'credit_card',
  'investment',
  'loan',
  'property',
  'vehicle',
  'crypto',
  'other'
);

-- Create transaction types enum
CREATE TYPE public.transaction_type AS ENUM (
  'income',
  'expense',
  'transfer'
);

-- Create accounts table for tracking financial accounts
CREATE TABLE public.finance_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  account_type account_type NOT NULL DEFAULT 'checking',
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  institution TEXT,
  account_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table for transaction categorization
CREATE TABLE public.finance_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.finance_categories(id),
  icon TEXT,
  color TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  category_type transaction_type NOT NULL DEFAULT 'expense',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.finance_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.finance_accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.finance_categories(id),
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  merchant TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  transfer_to_account_id UUID REFERENCES public.finance_accounts(id),
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create net worth history for tracking over time
CREATE TABLE public.finance_net_worth_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_assets DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_liabilities DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_worth DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create budgets table
CREATE TABLE public.finance_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.finance_categories(id),
  name TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_net_worth_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for finance_accounts
CREATE POLICY "Users can view own accounts"
ON public.finance_accounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own accounts"
ON public.finance_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
ON public.finance_accounts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
ON public.finance_accounts
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for finance_categories
CREATE POLICY "Users can view own categories and system categories"
ON public.finance_categories
FOR SELECT
USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can create own categories"
ON public.finance_categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
ON public.finance_categories
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
ON public.finance_categories
FOR DELETE
USING (auth.uid() = user_id AND is_system = false);

-- RLS Policies for finance_transactions
CREATE POLICY "Users can view own transactions"
ON public.finance_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
ON public.finance_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
ON public.finance_transactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
ON public.finance_transactions
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for finance_net_worth_history
CREATE POLICY "Users can view own net worth history"
ON public.finance_net_worth_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own net worth history"
ON public.finance_net_worth_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own net worth history"
ON public.finance_net_worth_history
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for finance_budgets
CREATE POLICY "Users can view own budgets"
ON public.finance_budgets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own budgets"
ON public.finance_budgets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
ON public.finance_budgets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
ON public.finance_budgets
FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_finance_accounts_updated_at
BEFORE UPDATE ON public.finance_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_transactions_updated_at
BEFORE UPDATE ON public.finance_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_budgets_updated_at
BEFORE UPDATE ON public.finance_budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system categories
INSERT INTO public.finance_categories (name, icon, color, is_system, category_type, user_id) VALUES
-- Income categories
('Salary', 'briefcase', '#22c55e', true, 'income', NULL),
('Freelance', 'laptop', '#16a34a', true, 'income', NULL),
('Investment Returns', 'trending-up', '#15803d', true, 'income', NULL),
('Other Income', 'plus-circle', '#14532d', true, 'income', NULL),

-- Expense categories
('Food & Dining', 'utensils', '#ef4444', true, 'expense', NULL),
('Transportation', 'car', '#f97316', true, 'expense', NULL),
('Shopping', 'shopping-bag', '#eab308', true, 'expense', NULL),
('Bills & Utilities', 'file-text', '#3b82f6', true, 'expense', NULL),
('Entertainment', 'film', '#8b5cf6', true, 'expense', NULL),
('Health & Fitness', 'heart', '#ec4899', true, 'expense', NULL),
('Education', 'book-open', '#06b6d4', true, 'expense', NULL),
('Housing', 'home', '#6366f1', true, 'expense', NULL),
('Insurance', 'shield', '#0ea5e9', true, 'expense', NULL),
('Personal Care', 'smile', '#f43f5e', true, 'expense', NULL),
('Travel', 'plane', '#a855f7', true, 'expense', NULL),
('Gifts & Donations', 'gift', '#10b981', true, 'expense', NULL),
('Other Expense', 'minus-circle', '#71717a', true, 'expense', NULL),

-- Transfer category
('Transfer', 'arrow-right-left', '#94a3b8', true, 'transfer', NULL);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20251231044124_126761b2-dede-4f31-9eb5-a9fe053a44d5.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Remora Trading System Tables

-- Stocks master table
CREATE TABLE public.remora_stocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sector TEXT,
  subsector TEXT,
  listing_date DATE,
  free_float_shares BIGINT,
  total_shares BIGINT,
  market_cap NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily OHLCV data
CREATE TABLE public.remora_ohlcv_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES public.remora_stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open_price NUMERIC NOT NULL,
  high_price NUMERIC NOT NULL,
  low_price NUMERIC NOT NULL,
  close_price NUMERIC NOT NULL,
  volume BIGINT NOT NULL,
  value NUMERIC,
  frequency INTEGER,
  foreign_buy BIGINT,
  foreign_sell BIGINT,
  data_source TEXT,
  ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_valid BOOLEAN NOT NULL DEFAULT true,
  validation_errors TEXT[],
  UNIQUE(stock_id, date)
);

-- Corporate actions
CREATE TABLE public.remora_corporate_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES public.remora_stocks(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  ex_date DATE,
  record_date DATE,
  payment_date DATE,
  ratio_old INTEGER,
  ratio_new INTEGER,
  dividend_amount NUMERIC,
  notes TEXT,
  data_source TEXT,
  ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trading signals
CREATE TABLE public.remora_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES public.remora_stocks(id) ON DELETE CASCADE,
  signal_date DATE NOT NULL,
  signal_type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('bullish', 'bearish', 'neutral')),
  strength NUMERIC NOT NULL CHECK (strength >= 0 AND strength <= 100),
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  price_at_signal NUMERIC NOT NULL,
  target_price NUMERIC,
  stop_loss NUMERIC,
  reasoning JSONB,
  input_data_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  is_stale BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stock_id, signal_date, signal_type)
);

-- Data ingestion logs
CREATE TABLE public.remora_ingestion_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_type TEXT NOT NULL,
  source_url TEXT,
  source_name TEXT NOT NULL,
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_valid INTEGER NOT NULL DEFAULT 0,
  records_invalid INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
  error_message TEXT,
  metadata JSONB
);

-- System health logs
CREATE TABLE public.remora_system_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'failed', 'maintenance')),
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_success_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  metadata JSONB,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Data freshness tracking
CREATE TABLE public.remora_data_freshness (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_type TEXT NOT NULL UNIQUE,
  last_update TIMESTAMP WITH TIME ZONE,
  expected_update_frequency TEXT NOT NULL,
  staleness_threshold_minutes INTEGER NOT NULL DEFAULT 1440,
  is_stale BOOLEAN NOT NULL DEFAULT false,
  source_name TEXT,
  source_url TEXT,
  record_count INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Watchlist for user-specific stock monitoring
CREATE TABLE public.remora_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stock_id UUID NOT NULL REFERENCES public.remora_stocks(id) ON DELETE CASCADE,
  notes TEXT,
  alert_on_signal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, stock_id)
);

-- Enable RLS
ALTER TABLE public.remora_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remora_ohlcv_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remora_corporate_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remora_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remora_ingestion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remora_system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remora_data_freshness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remora_watchlist ENABLE ROW LEVEL SECURITY;

-- Public read policies for market data (no auth required for viewing)
CREATE POLICY "Stocks are publicly readable" ON public.remora_stocks FOR SELECT USING (true);
CREATE POLICY "OHLCV data is publicly readable" ON public.remora_ohlcv_daily FOR SELECT USING (true);
CREATE POLICY "Corporate actions are publicly readable" ON public.remora_corporate_actions FOR SELECT USING (true);
CREATE POLICY "Signals are publicly readable" ON public.remora_signals FOR SELECT USING (true);
CREATE POLICY "Ingestion logs are publicly readable" ON public.remora_ingestion_logs FOR SELECT USING (true);
CREATE POLICY "System health is publicly readable" ON public.remora_system_health FOR SELECT USING (true);
CREATE POLICY "Data freshness is publicly readable" ON public.remora_data_freshness FOR SELECT USING (true);

-- Admin write policies
CREATE POLICY "Admins can manage stocks" ON public.remora_stocks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage OHLCV" ON public.remora_ohlcv_daily FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage corporate actions" ON public.remora_corporate_actions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage signals" ON public.remora_signals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage ingestion logs" ON public.remora_ingestion_logs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage system health" ON public.remora_system_health FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage data freshness" ON public.remora_data_freshness FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Watchlist user policies
CREATE POLICY "Users can view own watchlist" ON public.remora_watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own watchlist" ON public.remora_watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watchlist" ON public.remora_watchlist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlist" ON public.remora_watchlist FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_ohlcv_stock_date ON public.remora_ohlcv_daily(stock_id, date DESC);
CREATE INDEX idx_ohlcv_date ON public.remora_ohlcv_daily(date DESC);
CREATE INDEX idx_signals_stock_date ON public.remora_signals(stock_id, signal_date DESC);
CREATE INDEX idx_signals_date ON public.remora_signals(signal_date DESC);
CREATE INDEX idx_corporate_actions_stock ON public.remora_corporate_actions(stock_id);
CREATE INDEX idx_watchlist_user ON public.remora_watchlist(user_id);

-- Insert initial data freshness tracking records
INSERT INTO public.remora_data_freshness (dataset_type, expected_update_frequency, staleness_threshold_minutes, source_name)
VALUES 
  ('daily_ohlcv', 'daily', 1440, 'IDX'),
  ('corporate_actions', 'daily', 1440, 'IDX'),
  ('stock_master', 'weekly', 10080, 'IDX'),
  ('free_float', 'monthly', 43200, 'IDX');

-- Insert initial system health records
INSERT INTO public.remora_system_health (module_name, status)
VALUES 
  ('data_ingestion', 'healthy'),
  ('data_validation', 'healthy'),
  ('signal_generation', 'healthy'),
  ('pipeline_testing', 'healthy');

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260103080807_5a0d5523-7694-42c7-a73a-3bbb97909162.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Dika Quant Engine Database Schema
-- Extends Remora tables with quantitative engine capabilities

-- Market Regimes table (HMM regime detection results)
CREATE TABLE public.quant_regimes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  regime_date DATE NOT NULL,
  regime_id INTEGER NOT NULL, -- 0, 1, 2 etc
  regime_label TEXT NOT NULL, -- 'low_vol', 'high_vol', 'trending', 'mean_reverting'
  probability NUMERIC NOT NULL, -- probability of being in this regime
  regime_probabilities JSONB NOT NULL, -- full probability vector for all regimes
  volatility_state TEXT, -- 'low', 'medium', 'high'
  trend_state TEXT, -- 'bullish', 'bearish', 'neutral'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol, regime_date)
);

-- Feature store for computed features
CREATE TABLE public.quant_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID REFERENCES public.remora_stocks(id),
  feature_date DATE NOT NULL,
  log_return NUMERIC,
  rolling_vol_5d NUMERIC,
  rolling_vol_20d NUMERIC,
  volume_zscore NUMERIC,
  price_zscore_20d NUMERIC,
  rsi_14 NUMERIC,
  sma_cross_signal NUMERIC, -- 1 for bullish cross, -1 for bearish
  momentum_10d NUMERIC,
  mean_reversion_signal NUMERIC,
  trend_signal NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stock_id, feature_date)
);

-- Trading signals with probability distributions
CREATE TABLE public.quant_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID REFERENCES public.remora_stocks(id),
  signal_date DATE NOT NULL,
  signal_type TEXT NOT NULL, -- 'mean_reversion', 'trend', 'stat_arb', 'pairs'
  direction TEXT NOT NULL, -- 'long', 'short', 'neutral'
  probability NUMERIC NOT NULL, -- signal probability/confidence
  expected_return NUMERIC, -- expected return estimate
  expected_vol NUMERIC, -- expected volatility
  regime_context JSONB, -- regime probabilities at signal time
  raw_score NUMERIC, -- underlying signal score before transformation
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at DATE, -- when signal expires
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stock_id, signal_date, signal_type)
);

-- Position sizing and risk calculations
CREATE TABLE public.quant_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID REFERENCES public.remora_stocks(id),
  calculation_date DATE NOT NULL,
  kelly_fraction NUMERIC, -- full Kelly
  half_kelly_size NUMERIC, -- recommended position size
  max_position_pct NUMERIC, -- max allowed position %
  current_exposure NUMERIC DEFAULT 0,
  var_1d NUMERIC, -- 1-day VaR
  expected_shortfall NUMERIC,
  liquidity_score NUMERIC, -- 0-1 liquidity assessment
  execution_feasibility TEXT, -- 'good', 'moderate', 'poor'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stock_id, calculation_date)
);

-- Backtest runs
CREATE TABLE public.quant_backtests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL, -- backtest configuration
  universe JSONB NOT NULL, -- list of symbols
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  training_window_days INTEGER NOT NULL DEFAULT 252,
  rebalance_frequency TEXT NOT NULL DEFAULT 'daily',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Backtest results
CREATE TABLE public.quant_backtest_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backtest_id UUID REFERENCES public.quant_backtests(id) ON DELETE CASCADE,
  -- Overall metrics
  cagr NUMERIC,
  sharpe_ratio NUMERIC,
  sortino_ratio NUMERIC,
  max_drawdown NUMERIC,
  max_drawdown_duration INTEGER, -- days
  win_rate NUMERIC,
  profit_factor NUMERIC,
  total_trades INTEGER,
  avg_trade_return NUMERIC,
  -- Regime-specific metrics stored as JSONB
  regime_metrics JSONB,
  -- Equity curve data
  equity_curve JSONB,
  drawdown_curve JSONB,
  -- Trade log
  trade_log JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Data quality log
CREATE TABLE public.quant_data_quality (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID REFERENCES public.remora_stocks(id),
  check_date DATE NOT NULL,
  check_type TEXT NOT NULL, -- 'missing_days', 'volume_anomaly', 'price_jump', 'corp_action_mismatch'
  severity TEXT NOT NULL, -- 'warning', 'error', 'critical'
  details JSONB,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.quant_regimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quant_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quant_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quant_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quant_backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quant_backtest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quant_data_quality ENABLE ROW LEVEL SECURITY;

-- Public read access for market data tables
CREATE POLICY "Regimes are publicly readable" ON public.quant_regimes FOR SELECT USING (true);
CREATE POLICY "Features are publicly readable" ON public.quant_features FOR SELECT USING (true);
CREATE POLICY "Signals are publicly readable" ON public.quant_signals FOR SELECT USING (true);
CREATE POLICY "Positions are publicly readable" ON public.quant_positions FOR SELECT USING (true);
CREATE POLICY "Data quality is publicly readable" ON public.quant_data_quality FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Admins can manage regimes" ON public.quant_regimes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage features" ON public.quant_features FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage signals" ON public.quant_signals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage positions" ON public.quant_positions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage data quality" ON public.quant_data_quality FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Backtest tables - users can manage their own
CREATE POLICY "Backtests are publicly readable" ON public.quant_backtests FOR SELECT USING (true);
CREATE POLICY "Users can create backtests" ON public.quant_backtests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all backtests" ON public.quant_backtests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Backtest results are publicly readable" ON public.quant_backtest_results FOR SELECT USING (true);
CREATE POLICY "Admins can manage backtest results" ON public.quant_backtest_results FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_quant_regimes_symbol_date ON public.quant_regimes(symbol, regime_date DESC);
CREATE INDEX idx_quant_features_stock_date ON public.quant_features(stock_id, feature_date DESC);
CREATE INDEX idx_quant_signals_stock_date ON public.quant_signals(stock_id, signal_date DESC);
CREATE INDEX idx_quant_signals_active ON public.quant_signals(is_active, signal_date DESC);
CREATE INDEX idx_quant_positions_stock_date ON public.quant_positions(stock_id, calculation_date DESC);
CREATE INDEX idx_quant_backtests_status ON public.quant_backtests(status);
CREATE INDEX idx_quant_data_quality_unresolved ON public.quant_data_quality(is_resolved, check_date DESC);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260103082156_bf5a7c81-43ff-4388-87a2-6e656c783d17.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Enable required extensions for cron and HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260203043313_cdf7af96-4518-4fae-acb2-37c761d9bbc2.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Drop existing SELECT policy that may not explicitly restrict to authenticated users
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a more secure policy that explicitly restricts to authenticated users only
CREATE POLICY "Users can view own profile"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260203162402_424e06b9-a8a3-4cb8-b43f-249260f059fc.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Create sections table for voice/role management
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  voice_role TEXT NOT NULL CHECK (voice_role IN ('manager', 'economist', 'educator', 'coach', 'hybrid')),
  manifesto TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table for content organization
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section_id, slug)
);

-- Add new columns to essays table
ALTER TABLE public.essays 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voice_role TEXT,
  ADD COLUMN IF NOT EXISTS prerequisites TEXT[],
  ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[];

-- Enable RLS on sections
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Sections are publicly readable
CREATE POLICY "Sections are publicly readable"
ON public.sections
FOR SELECT
USING (true);

-- Admins can modify sections
CREATE POLICY "Admins can modify sections"
ON public.sections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Categories are publicly readable
CREATE POLICY "Categories are publicly readable"
ON public.categories
FOR SELECT
USING (true);

-- Admins can modify categories
CREATE POLICY "Admins can modify categories"
ON public.categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at triggers
CREATE TRIGGER update_sections_updated_at
BEFORE UPDATE ON public.sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial sections data
INSERT INTO public.sections (slug, name, voice_role, manifesto, sort_order) VALUES
('finance', 'Finance', 'manager', 'Finance exists to support decisions—not to produce reports.', 1),
('accounting', 'Accounting', 'manager', 'Accounting describes economic reality. Your job is to describe it accurately.', 2),
('green-transition', 'Green Transition', 'economist', 'The green transition is an economic problem—not just an environmental one.', 3),
('next-big-thing', 'The Next Big Thing', 'economist', 'Rigorous speculation about structural economic change.', 4),
('books', 'Books', 'educator', 'Books are tools. Use them or do not pick them up.', 5),
('ielts', 'IELTS', 'coach', 'A score is the only measure. Everything else is preparation.', 6);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260204043610_fb53313f-7245-4315-bc62-ef30cee17dad.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Drop existing policy and recreate with proper role specification
DROP POLICY IF EXISTS "Admins can modify FSLI sections" ON public.fsli_sections;

-- Create policy that explicitly targets authenticated users
CREATE POLICY "Admins can modify FSLI sections"
ON public.fsli_sections
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260204074340_14e087e4-dd90-4cb3-b89a-57ed60f381f9.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
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

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260207030055_e3d4e410-bec1-4fd2-8b34-ee6385678f75.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Create storage bucket for essay images
INSERT INTO storage.buckets (id, name, public)
VALUES ('essay-images', 'essay-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Anyone can read essay images
CREATE POLICY "Essay images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'essay-images');

-- RLS policy: Only admins can upload images
CREATE POLICY "Admins can upload essay images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'essay-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policy: Admins can update/delete images
CREATE POLICY "Admins can update essay images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'essay-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete essay images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'essay-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260211011758_8bda436b-b189-4493-8cb3-0fba83fa8c81.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS fsli_slug TEXT;
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS topic TEXT;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260211100000_add_essay_topic_and_fsli_slug.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Add fsli_slug column for linking essays to FSLI pages
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS fsli_slug TEXT;
CREATE INDEX IF NOT EXISTS idx_essays_fsli_slug ON public.essays(fsli_slug) WHERE fsli_slug IS NOT NULL;

-- Add topic column for sub-topic linking (finance analytics, consolidation topics, etc.)
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS topic TEXT;
CREATE INDEX IF NOT EXISTS idx_essays_topic ON public.essays(topic) WHERE topic IS NOT NULL;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260211100001_fix_essay_images_bucket_rls.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Ensure essay-images bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('essay-images', 'essay-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies (ignore errors if names differ)
DROP POLICY IF EXISTS "Essay images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload essay images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update essay images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete essay images" ON storage.objects;
DROP POLICY IF EXISTS "essay_images_select" ON storage.objects;
DROP POLICY IF EXISTS "essay_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "essay_images_update" ON storage.objects;
DROP POLICY IF EXISTS "essay_images_delete" ON storage.objects;

-- Recreate with direct subqueries (avoids issues with custom function calls in storage policies)
CREATE POLICY "essay_images_select" ON storage.objects
FOR SELECT USING (bucket_id = 'essay-images');

CREATE POLICY "essay_images_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'essay-images'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "essay_images_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'essay-images'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "essay_images_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'essay-images'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260212090000_add_content_json_layout_and_revisions.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Add canonical content and constrained layout config to essays
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS content_json JSONB,
  ADD COLUMN IF NOT EXISTS layout_config JSONB;

-- Optional supporting indexes for JSONB querying/diagnostics
CREATE INDEX IF NOT EXISTS idx_essays_content_json_gin
  ON public.essays
  USING GIN (content_json)
  WHERE content_json IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_essays_layout_config_gin
  ON public.essays
  USING GIN (layout_config)
  WHERE layout_config IS NOT NULL;

-- Revision history table
CREATE TABLE IF NOT EXISTS public.essay_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'autosave', 'manual_save', 'publish', 'unpublish', 'rollback', 'migration')),
  title TEXT,
  snippet TEXT,
  content_json JSONB,
  layout_config JSONB,
  status public.content_status_enum,
  voice_role TEXT,
  changed_by UUID,
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (essay_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_essay_revisions_essay_created_at
  ON public.essay_revisions (essay_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_essay_revisions_essay_revision_no
  ON public.essay_revisions (essay_id, revision_no DESC);

-- Enable RLS and restrict to admins (aligns with existing essay admin model)
ALTER TABLE public.essay_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read essay revisions" ON public.essay_revisions;
CREATE POLICY "Admins can read essay revisions"
ON public.essay_revisions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert essay revisions" ON public.essay_revisions;
CREATE POLICY "Admins can insert essay revisions"
ON public.essay_revisions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update essay revisions" ON public.essay_revisions;
CREATE POLICY "Admins can update essay revisions"
ON public.essay_revisions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete essay revisions" ON public.essay_revisions;
CREATE POLICY "Admins can delete essay revisions"
ON public.essay_revisions
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260212091000_backfill_content_json_from_content.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Backfill canonical JSON content from legacy string content where possible.
-- Only copy rows where content parses as JSON and has type='doc'.

CREATE OR REPLACE FUNCTION public.try_parse_jsonb(input_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parsed JSONB;
BEGIN
  BEGIN
    parsed := input_text::jsonb;
    RETURN parsed;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

WITH parsed AS (
  SELECT
    id,
    public.try_parse_jsonb(content) AS parsed_json
  FROM public.essays
  WHERE content IS NOT NULL
    AND btrim(content) <> ''
    AND content_json IS NULL
)
UPDATE public.essays e
SET content_json = p.parsed_json
FROM parsed p
WHERE e.id = p.id
  AND p.parsed_json IS NOT NULL
  AND (p.parsed_json ->> 'type') = 'doc';


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260214063638_89e20dfa-7e23-43f4-9598-80f4e2343827.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260214113534_c0c83c0e-9484-49c4-ab1a-af5e3f475dcf.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Create finance_sections table for domain entry points on landing page
CREATE TABLE public.finance_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance sections are publicly readable"
  ON public.finance_sections FOR SELECT USING (true);

CREATE POLICY "Admins can modify finance sections"
  ON public.finance_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed four domain entry points
INSERT INTO public.finance_sections (slug, title, description, icon, sort_order) VALUES
  ('fundamentals', 'Fundamentals', 'Core concepts every finance professional must master.', 'Landmark', 1),
  ('strategic-finance', 'Strategic Finance', 'Capital allocation, M&A, and value creation.', 'Target', 2),
  ('planning-forecasting', 'Planning & Forecasting', 'Budgeting, forecasting, and scenario analysis.', 'BarChart3', 3),
  ('financial-analytics', 'Financial Analytics', 'Performance measurement and data-driven decisions.', 'TrendingUp', 4);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260214115009_2a492e8b-6c69-4083-9422-5a7a988172cd.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260214120000_create_finance_sections.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Create finance_sections table for DB-backed domain entry points.
-- Replaces hardcoded domain arrays in FinanceLanding and FinanceLifecyclePage.
CREATE TABLE IF NOT EXISTS public.finance_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance sections are publicly readable"
  ON public.finance_sections FOR SELECT USING (true);

CREATE POLICY "Admins can modify finance sections"
  ON public.finance_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_finance_sections_updated_at
  BEFORE UPDATE ON public.finance_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 4 finance domains
INSERT INTO public.finance_sections (slug, title, description, icon, sort_order) VALUES
  ('fundamentals', 'Fundamentals', 'The 12 foundational ideas that everything else builds on.', 'Landmark', 1),
  ('strategic-finance', 'Strategic Finance', 'Where finance meets strategy. Capital allocation, investment decisions, and long-term value creation.', 'Target', 2),
  ('planning-forecasting', 'Planning & Forecasting', 'Translating strategy into numbers. Assumptions, scenarios, and action triggers.', 'BarChart3', 3),
  ('financial-analytics', 'Financial Analytics', 'Turning data into insight. Variance analysis, trend identification, and performance diagnosis.', 'TrendingUp', 4)
ON CONFLICT (slug) DO NOTHING;

-- Seed additional finance_settings for the finance landing tagline
INSERT INTO public.finance_settings (key, value)
VALUES ('finance_tagline', 'Finance exists to support decisions — not to produce reports.')
ON CONFLICT (key) DO NOTHING;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260215_001_enforce_category_hierarchy.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration: Enforce strict Section → Category → Essay hierarchy
--
-- BEFORE: essays.section (string slug), essays.category_id (nullable)
-- AFTER:  essays.category_id (NOT NULL FK), section derived via category.section_id
--
-- Steps:
--   1. Ensure categories.section_id is NOT NULL
--   2. Create "General" category for each section that has essays without a category
--   3. Assign orphaned essays to their section's "General" category
--   4. Make essays.category_id NOT NULL
--   5. Add unique index on essays.slug
--   6. Drop essays.section column

BEGIN;

-- Step 1: Ensure every section in use has at least one category
-- Create "General" category for each section that has essays
INSERT INTO categories (name, slug, section_id, sort_order)
SELECT
  'General',
  s.slug || '-general',
  s.id,
  0
FROM sections s
WHERE s.id NOT IN (SELECT DISTINCT section_id FROM categories WHERE section_id IS NOT NULL)
  AND s.slug IN (SELECT DISTINCT section FROM essays)
ON CONFLICT DO NOTHING;

-- Also create "General" for sections that have essays with NULL category_id
INSERT INTO categories (name, slug, section_id, sort_order)
SELECT DISTINCT
  'General',
  s.slug || '-general',
  s.id,
  0
FROM essays e
JOIN sections s ON s.slug = e.section
WHERE e.category_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.section_id = s.id AND c.slug = s.slug || '-general'
  )
ON CONFLICT DO NOTHING;

-- Step 2: Assign orphaned essays to their section's "General" category
UPDATE essays e
SET category_id = (
  SELECT c.id
  FROM categories c
  JOIN sections s ON s.id = c.section_id
  WHERE s.slug = e.section
    AND c.slug = s.slug || '-general'
  LIMIT 1
)
WHERE e.category_id IS NULL;

-- Step 3: For any remaining NULL category_id essays, create categories from phase
-- (e.g., green-transition essays with phase "where-we-are-now" get that category)
INSERT INTO categories (name, slug, section_id, sort_order)
SELECT DISTINCT
  INITCAP(REPLACE(e.phase, '-', ' ')),
  e.section || '-' || e.phase,
  s.id,
  1
FROM essays e
JOIN sections s ON s.slug = e.section
WHERE e.category_id IS NULL
  AND e.phase IS NOT NULL
  AND e.phase != ''
  AND NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.section_id = s.id AND c.slug = e.section || '-' || e.phase
  )
ON CONFLICT DO NOTHING;

-- Assign phase-based essays to phase categories
UPDATE essays e
SET category_id = (
  SELECT c.id
  FROM categories c
  JOIN sections s ON s.id = c.section_id
  WHERE s.slug = e.section
    AND c.slug = e.section || '-' || e.phase
  LIMIT 1
)
WHERE e.category_id IS NULL
  AND e.phase IS NOT NULL
  AND e.phase != '';

-- Final fallback: any still-NULL essays get the first category in their section
UPDATE essays e
SET category_id = (
  SELECT c.id
  FROM categories c
  JOIN sections s ON s.id = c.section_id
  WHERE s.slug = e.section
  ORDER BY c.sort_order ASC
  LIMIT 1
)
WHERE e.category_id IS NULL;

-- Step 4: Make category_id NOT NULL
ALTER TABLE essays ALTER COLUMN category_id SET NOT NULL;

-- Step 5: Add unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS essays_slug_unique ON essays (slug);

-- Step 6: Ensure FK constraint exists with RESTRICT on delete
-- (Don't drop section column yet - keep for backward compat during transition)
-- The section column becomes denormalized cache, derived from category.section_id

-- Step 7: Ensure categories.section_id has proper NOT NULL constraint
-- First update any NULL section_id categories
DELETE FROM categories WHERE section_id IS NULL AND id NOT IN (SELECT category_id FROM essays);

-- Add constraint for future categories
ALTER TABLE categories ALTER COLUMN section_id SET NOT NULL;

-- Step 8: Add ON DELETE RESTRICT if not already present
-- (Supabase manages FKs, but let's ensure the constraint)
ALTER TABLE essays DROP CONSTRAINT IF EXISTS essays_category_id_fkey;
ALTER TABLE essays ADD CONSTRAINT essays_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_section_id_fkey;
ALTER TABLE categories ADD CONSTRAINT categories_section_id_fkey
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;

COMMIT;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260218_001_finance_modules_and_slug_unification.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =============================================================================
-- Migration: 20260218_001_finance_modules_and_slug_unification.sql
--
-- 1. Unify finance_sections slugs
--      planning-forecasting  →  planning
--      financial-analytics   →  analytics
-- 2. Sync essays.finance_section to new slugs (plain-text column, no FK cascade)
-- 3. Create finance_modules table (FK → finance_sections.slug)
-- 4. Apply RLS — same pattern as finance_sections / finance_fundamentals
-- 5. Add updated_at trigger using the project-wide helper
-- 6. Add module_id (nullable FK → finance_modules.id) to essays
-- 7. Migrate finance_fundamentals rows into finance_modules (track = 'fundamentals')
-- 8. Back-fill essays.module_id from essays.fundamental_id via slug match
--
-- NOTE: finance_fundamentals is NOT dropped here.
--       That happens in a subsequent cleanup migration.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Rename finance_sections slugs to match new route structure
-- -----------------------------------------------------------------------------

UPDATE public.finance_sections
  SET slug = 'planning'
  WHERE slug = 'planning-forecasting';

UPDATE public.finance_sections
  SET slug = 'analytics'
  WHERE slug = 'financial-analytics';

-- -----------------------------------------------------------------------------
-- 2. Sync essays.finance_section to new slugs
--    essays.finance_section is plain text — no FK cascade fires automatically.
-- -----------------------------------------------------------------------------

UPDATE public.essays
  SET finance_section = 'planning'
  WHERE finance_section = 'planning-forecasting';

UPDATE public.essays
  SET finance_section = 'analytics'
  WHERE finance_section = 'financial-analytics';

-- -----------------------------------------------------------------------------
-- 3. Create finance_modules table
--    track_slug FK keeps every module anchored to a valid finance_sections row.
--    finance_sections slugs have already been updated above, so 'fundamentals',
--    'strategic-finance', 'planning', and 'analytics' are all valid at this point.
-- -----------------------------------------------------------------------------

CREATE TABLE public.finance_modules (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_slug      text        NOT NULL REFERENCES public.finance_sections (slug),
  slug            text        NOT NULL UNIQUE,
  title           text        NOT NULL,
  thesis          text,
  sort_order      integer     NOT NULL DEFAULT 0,
  framing_content text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. Row-Level Security — mirrors finance_sections and finance_fundamentals
-- -----------------------------------------------------------------------------

ALTER TABLE public.finance_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance modules are publicly readable"
  ON public.finance_modules
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify finance modules"
  ON public.finance_modules
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- -----------------------------------------------------------------------------
-- 5. updated_at trigger — reuses the project-wide helper function
-- -----------------------------------------------------------------------------

CREATE TRIGGER update_finance_modules_updated_at
  BEFORE UPDATE ON public.finance_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 6. Add module_id to essays (nullable; populated in step 8)
-- -----------------------------------------------------------------------------

ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.finance_modules (id);

-- -----------------------------------------------------------------------------
-- 7. Migrate finance_fundamentals rows → finance_modules
--    All 12 rows belong to the 'fundamentals' track.
--    Columns map directly: slug, title, thesis, sort_order, framing_content.
-- -----------------------------------------------------------------------------

INSERT INTO public.finance_modules
  (track_slug, slug, title, thesis, sort_order, framing_content)
SELECT
  'fundamentals',
  slug,
  title,
  thesis,
  sort_order,
  framing_content
FROM public.finance_fundamentals;

-- -----------------------------------------------------------------------------
-- 8. Back-fill essays.module_id from essays.fundamental_id
--    Join through finance_fundamentals so the slug acts as the stable key,
--    guarding against any id mismatch between environments.
-- -----------------------------------------------------------------------------

UPDATE public.essays e
SET module_id = fm.id
FROM public.finance_modules fm
INNER JOIN public.finance_fundamentals ff ON fm.slug = ff.slug
WHERE e.fundamental_id = ff.id;

COMMIT;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260218_002_seed_finance_modules.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =============================================================================
-- Seed: 20260218_002_seed_finance_modules.sql
--
-- Inserts all curriculum modules for all 4 finance tracks:
--   fundamentals (14 modules)
--   strategic-finance (6 modules)
--   planning (6 modules)
--   analytics (6 modules)
--
-- Prerequisites:
--   20260218_001_finance_modules_and_slug_unification.sql must have run first
--   (creates the finance_modules table and unifies finance_sections slugs).
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING
-- framing_content is omitted here; populate via separate content migration.
-- =============================================================================

INSERT INTO public.finance_modules (track_slug, slug, title, thesis, sort_order)
VALUES

  -- -------------------------------------------------------------------------
  -- FUNDAMENTALS — 14 modules
  -- -------------------------------------------------------------------------

  (
    'fundamentals',
    'purpose-of-financial-management',
    'The Purpose of Financial Management',
    'Finance exists to increase the value of the firm, not to produce reports.',
    1
  ),
  (
    'fundamentals',
    'business-tax-financial-environment',
    'The Business, Tax, and Financial Environment',
    'Every financial decision happens inside a system of legal forms, tax rules, and market structures.',
    2
  ),
  (
    'fundamentals',
    'time-value-of-money',
    'Time Value of Money',
    'A dollar today is worth more than a dollar tomorrow — but by how much depends on the question.',
    3
  ),
  (
    'fundamentals',
    'valuation-of-securities',
    'Valuation of Securities',
    'Valuation is not about finding the right number — it is about understanding what assumptions produce which prices.',
    4
  ),
  (
    'fundamentals',
    'risk-and-return',
    'Risk and Return',
    'Risk is not volatility. Risk is the probability of permanent loss or failure to meet an obligation.',
    5
  ),
  (
    'fundamentals',
    'financial-statement-analysis',
    'Financial Statement Analysis',
    'Financial statements are a structured narrative — read them as a system, not as line items.',
    6
  ),
  (
    'fundamentals',
    'cash-flow-and-financial-planning',
    'Cash Flow Analysis and Financial Planning',
    'Profit is an opinion. Cash is a fact.',
    7
  ),
  (
    'fundamentals',
    'working-capital-management',
    'Working Capital Management',
    'Working capital is the silent value driver that most managers ignore until it becomes a crisis.',
    8
  ),
  (
    'fundamentals',
    'capital-budgeting',
    'Capital Budgeting',
    'Capital budgeting is the most consequential decision in finance — it determines what the firm becomes.',
    9
  ),
  (
    'fundamentals',
    'cost-of-capital',
    'Cost of Capital and Required Returns',
    'The cost of capital is the hurdle rate that separates value-creating investments from value-destroying ones.',
    10
  ),
  (
    'fundamentals',
    'capital-structure-and-leverage',
    'Capital Structure and Leverage',
    'How a firm finances itself changes its risk, its cost of capital, and the distribution of value.',
    11
  ),
  (
    'fundamentals',
    'dividend-policy',
    'Dividend Policy',
    'Dividend policy is a signaling mechanism and a capital allocation decision.',
    12
  ),
  (
    'fundamentals',
    'capital-markets-and-instruments',
    'Capital Markets and Financing Instruments',
    'Understanding how markets price and distribute capital is essential to making intelligent financing decisions.',
    13
  ),
  (
    'fundamentals',
    'mergers-restructuring-international',
    'Mergers, Restructuring, and International Finance',
    'Where all fundamentals converge into high-stakes, irreversible decisions.',
    14
  ),

  -- -------------------------------------------------------------------------
  -- STRATEGIC FINANCE — 6 modules
  -- -------------------------------------------------------------------------

  (
    'strategic-finance',
    'capital-allocation-strategy',
    'Capital Allocation Strategy',
    'Given finite resources, where should the firm invest to maximize long-term value?',
    1
  ),
  (
    'strategic-finance',
    'corporate-restructuring-logic',
    'Corporate Restructuring Logic',
    'When does breaking a company apart create more value than keeping it together?',
    2
  ),
  (
    'strategic-finance',
    'ma-value-creation',
    'M&A Value Creation and Destruction',
    'How do you distinguish acquisitions that create value from those that only transfer it?',
    3
  ),
  (
    'strategic-finance',
    'strategic-capital-structure',
    'Strategic Capital Structure',
    'How should the firm''s financing mix evolve as its strategy evolves?',
    4
  ),
  (
    'strategic-finance',
    'shareholder-signaling-payout',
    'Shareholder Signaling and Payout Design',
    'How do capital return decisions communicate management''s view of the firm''s future?',
    5
  ),
  (
    'strategic-finance',
    'long-term-value-architecture',
    'Long-Term Value Architecture',
    'How do you design a firm''s financial architecture for sustainable value creation over decades?',
    6
  ),

  -- -------------------------------------------------------------------------
  -- PLANNING (financial planning & forecasting) — 6 modules
  -- -------------------------------------------------------------------------

  (
    'planning',
    'budget-architecture',
    'Budget Architecture',
    'Structure matters more than numbers in budget design.',
    1
  ),
  (
    'planning',
    'rolling-forecast-systems',
    'Rolling Forecast Systems',
    'Rolling forecasts and annual budgets solve different problems.',
    2
  ),
  (
    'planning',
    'scenario-sensitivity-modeling',
    'Scenario and Sensitivity Modeling',
    'Scenario modeling is not optimism/pessimism — it is different futures.',
    3
  ),
  (
    'planning',
    'cash-runway-liquidity',
    'Cash Runway and Liquidity Planning',
    'The 13-week cash flow is the most important model in a crisis.',
    4
  ),
  (
    'planning',
    'working-capital-optimization',
    'Working Capital Optimization',
    'Working capital optimization is a source of internal financing.',
    5
  ),
  (
    'planning',
    'growth-financing-planning',
    'Growth Financing Planning',
    'The sustainable growth rate is your company''s speed limit.',
    6
  ),

  -- -------------------------------------------------------------------------
  -- ANALYTICS (financial analytics) — 6 modules
  -- -------------------------------------------------------------------------

  (
    'analytics',
    'ratio-architecture',
    'Ratio Architecture',
    'Designing a measurement system, not a checklist.',
    1
  ),
  (
    'analytics',
    'unit-economics-contribution',
    'Unit Economics and Contribution Margin',
    'Not all revenue is equal.',
    2
  ),
  (
    'analytics',
    'variance-decomposition',
    'Variance Decomposition',
    'Variance analysis is storytelling, not arithmetic.',
    3
  ),
  (
    'analytics',
    'driver-based-forecasting',
    'Driver-Based Forecasting',
    'Operational inputs beat financial extrapolation.',
    4
  ),
  (
    'analytics',
    'sensitivity-decision-modeling',
    'Sensitivity Analysis and Decision Modeling',
    'Sensitivity analysis as decision support, not model decoration.',
    5
  ),
  (
    'analytics',
    'performance-dashboards',
    'Performance Dashboards and Reporting',
    'What to show, what to hide, and why.',
    6
  )

ON CONFLICT (slug) DO NOTHING;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260218_003_drop_deprecated_finance_tables.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- DESTRUCTIVE: Only run after verifying module_id migration is complete
-- and all pages reference finance_modules instead of finance_fundamentals.

-- =============================================================================
-- Migration: 20260218_003_drop_deprecated_finance_tables.sql
--
-- 1. Drop essays.fundamental_id  (superseded by essays.module_id)
-- 2. Drop finance_fundamentals table  (data lives in finance_modules)
-- 3. Idempotent safeguard: re-apply finance_section slug renames on essays
--    in case any row was inserted with the old slugs after Phase 1 ran.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Drop essays.fundamental_id
--    module_id is now the canonical FK; fundamental_id is no longer needed.
-- -----------------------------------------------------------------------------

ALTER TABLE public.essays
  DROP COLUMN IF EXISTS fundamental_id;

-- -----------------------------------------------------------------------------
-- 2. Drop finance_fundamentals
--    All rows were migrated to finance_modules in
--    20260218_001_finance_modules_and_slug_unification.sql.
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS public.finance_fundamentals;

-- -----------------------------------------------------------------------------
-- 3. Idempotent safeguard: ensure essays.finance_section reflects new slugs.
--    These are no-ops if Phase 1 already ran correctly; safe to re-execute.
-- -----------------------------------------------------------------------------

UPDATE public.essays SET finance_section = 'planning'   WHERE finance_section = 'planning';
UPDATE public.essays SET finance_section = 'analytics'  WHERE finance_section = 'analytics';

COMMIT;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260219_001_add_lesson_type_and_module_meta.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
BEGIN;

-- 1. Add lesson_type enum
DO $$ BEGIN
  CREATE TYPE public.lesson_type_enum AS ENUM (
    'concept',        -- Explanatory essay (default)
    'framework',      -- Structured decision framework
    'case-study',     -- Applied case analysis
    'exercise',       -- Practice problem or walkthrough
    'model-walkthrough' -- Step-by-step model build (Planning/Analytics)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add lesson_type to essays (nullable, defaults to 'concept')
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS lesson_type public.lesson_type_enum DEFAULT 'concept';

-- 3. Add module_meta JSONB to finance_modules for pillar-specific config
-- Schema: { "variant": "standard"|"board"|"planning"|"analytics",
--           "icon"?: string, "color_accent"?: string }
ALTER TABLE public.finance_modules
  ADD COLUMN IF NOT EXISTS module_meta jsonb DEFAULT '{}';

-- 4. Seed module_meta variants for each track
UPDATE public.finance_modules SET module_meta = '{"variant":"standard"}'
  WHERE track_slug = 'fundamentals' AND (module_meta IS NULL OR module_meta = '{}');

UPDATE public.finance_modules SET module_meta = '{"variant":"board"}'
  WHERE track_slug = 'strategic-finance' AND (module_meta IS NULL OR module_meta = '{}');

UPDATE public.finance_modules SET module_meta = '{"variant":"planning"}'
  WHERE track_slug = 'planning' AND (module_meta IS NULL OR module_meta = '{}');

UPDATE public.finance_modules SET module_meta = '{"variant":"analytics"}'
  WHERE track_slug = 'analytics' AND (module_meta IS NULL OR module_meta = '{}');

COMMIT;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260219_004_seed_fundamentals_lessons.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
BEGIN;

-- =========================================================================
-- MODULE 01: purpose-of-financial-management (4 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'What Financial Management Actually Is',
    'what-financial-management-actually-is',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'purpose-of-financial-management'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Value Maximization vs Profit Maximization',
    'value-maximization-vs-profit-maximization',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'purpose-of-financial-management'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'The Agency Problem and Corporate Governance',
    'the-agency-problem-and-corporate-governance',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'purpose-of-financial-management'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'The Finance Function in an Organization',
    'the-finance-function-in-an-organization',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'purpose-of-financial-management'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 02: business-tax-financial-environment (4 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Legal Forms of Business Organization',
    'legal-forms-of-business-organization',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'business-tax-financial-environment'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'The Tax Environment for Financial Decisions',
    'the-tax-environment-for-financial-decisions',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'business-tax-financial-environment'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Financial Intermediaries and Markets',
    'financial-intermediaries-and-markets',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'business-tax-financial-environment'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'The Flow of Funds in an Economy',
    'the-flow-of-funds-in-an-economy',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'business-tax-financial-environment'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 03: time-value-of-money (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Why a Dollar Today Is Worth More',
    'why-a-dollar-today-is-worth-more',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'time-value-of-money'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Compounding and Discounting',
    'compounding-and-discounting',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'time-value-of-money'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Annuities, Perpetuities, and Uneven Streams',
    'annuities-perpetuities-and-uneven-streams',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'time-value-of-money'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Compounding Frequency and Effective Rates',
    'compounding-frequency-and-effective-rates',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'time-value-of-money'),
    'draft', false, 'exercise', 4, 4, 'Dika Gustiana'
  ),
  (
    'Loan Amortization',
    'loan-amortization',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'time-value-of-money'),
    'draft', false, 'exercise', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 04: valuation-of-securities (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'The Logic of Valuation',
    'the-logic-of-valuation',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'valuation-of-securities'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Bond Valuation and Yield',
    'bond-valuation-and-yield',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'valuation-of-securities'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Preferred Stock Valuation',
    'preferred-stock-valuation',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'valuation-of-securities'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Common Stock Valuation Models',
    'common-stock-valuation-models',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'valuation-of-securities'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  ),
  (
    'When Valuation Models Break Down',
    'when-valuation-models-break-down',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'valuation-of-securities'),
    'draft', false, 'framework', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 05: risk-and-return (4 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Defining Risk and Measuring It',
    'defining-risk-and-measuring-it',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'risk-and-return'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Portfolio Diversification',
    'portfolio-diversification',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'risk-and-return'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'The Capital Asset Pricing Model',
    'the-capital-asset-pricing-model',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'risk-and-return'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Efficient Markets and What They Mean for You',
    'efficient-markets-and-what-they-mean-for-you',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'risk-and-return'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 06: financial-statement-analysis (6 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Reading Financial Statements as a System',
    'reading-financial-statements-as-a-system',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Liquidity and Activity Ratios',
    'liquidity-and-activity-ratios',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Leverage and Coverage Ratios',
    'leverage-and-coverage-ratios',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Profitability Ratios and DuPont Decomposition',
    'profitability-ratios-and-dupont-decomposition',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  ),
  (
    'Trend Analysis and Common-Size Statements',
    'trend-analysis-and-common-size-statements',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'framework', 5, 5, 'Dika Gustiana'
  ),
  (
    'Statement Analysis in Practice',
    'statement-analysis-in-practice',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'financial-statement-analysis'),
    'draft', false, 'case-study', 6, 6, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 07: cash-flow-and-financial-planning (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Sources and Uses of Funds',
    'sources-and-uses-of-funds',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cash-flow-and-financial-planning'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'The Statement of Cash Flows',
    'the-statement-of-cash-flows',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cash-flow-and-financial-planning'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Cash-Flow Forecasting',
    'cash-flow-forecasting',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cash-flow-and-financial-planning'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Pro Forma Financial Statements',
    'pro-forma-financial-statements',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cash-flow-and-financial-planning'),
    'draft', false, 'exercise', 4, 4, 'Dika Gustiana'
  ),
  (
    'Sustainable Growth Rate',
    'sustainable-growth-rate',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cash-flow-and-financial-planning'),
    'draft', false, 'framework', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 08: working-capital-management (6 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Working Capital as a Value Driver',
    'working-capital-as-a-value-driver',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Cash and Liquidity Management',
    'cash-and-liquidity-management',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Receivables and Credit Policy',
    'receivables-and-credit-policy',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Inventory Management and Control',
    'inventory-management-and-control',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  ),
  (
    'Short-Term Financing Sources',
    'short-term-financing-sources',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'concept', 5, 5, 'Dika Gustiana'
  ),
  (
    'The Working Capital Policy Decision',
    'the-working-capital-policy-decision',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'working-capital-management'),
    'draft', false, 'framework', 6, 6, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 09: capital-budgeting (6 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Why Capital Budgeting Is the Most Important Decision',
    'why-capital-budgeting-is-the-most-important-decision',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Estimating Incremental Cash Flows',
    'estimating-incremental-cash-flows',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'NPV, IRR, and Payback',
    'npv-irr-and-payback',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'When IRR and NPV Disagree',
    'when-irr-and-npv-disagree',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  ),
  (
    'Real Options in Capital Budgeting',
    'real-options-in-capital-budgeting',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'concept', 5, 5, 'Dika Gustiana'
  ),
  (
    'Capital Budgeting Under Uncertainty',
    'capital-budgeting-under-uncertainty',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-budgeting'),
    'draft', false, 'exercise', 6, 6, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 10: cost-of-capital (4 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'What Cost of Capital Means',
    'what-cost-of-capital-means',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cost-of-capital'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'The Weighted Average Cost of Capital',
    'the-weighted-average-cost-of-capital',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cost-of-capital'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Estimating the Cost of Equity',
    'estimating-the-cost-of-equity',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cost-of-capital'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Project-Specific Required Returns',
    'project-specific-required-returns',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'cost-of-capital'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 11: capital-structure-and-leverage (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Operating Leverage',
    'operating-leverage',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-structure-and-leverage'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Financial Leverage',
    'financial-leverage',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-structure-and-leverage'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'The Modigliani-Miller Propositions',
    'the-modigliani-miller-propositions',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-structure-and-leverage'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Capital Structure in Practice',
    'capital-structure-in-practice',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-structure-and-leverage'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  ),
  (
    'Debt Capacity and Cash Flow Analysis',
    'debt-capacity-and-cash-flow-analysis',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-structure-and-leverage'),
    'draft', false, 'exercise', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 12: dividend-policy (4 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Does Dividend Policy Matter?',
    'does-dividend-policy-matter',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'dividend-policy'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Factors That Influence Payout',
    'factors-that-influence-payout',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'dividend-policy'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Stock Dividends, Splits, and Repurchases',
    'stock-dividends-splits-and-repurchases',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'dividend-policy'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Designing a Payout Policy',
    'designing-a-payout-policy',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'dividend-policy'),
    'draft', false, 'framework', 4, 4, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 13: capital-markets-and-instruments (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'How Capital Markets Work',
    'how-capital-markets-work',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-markets-and-instruments'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Equity Financing — IPOs and SEOs',
    'equity-financing-ipos-and-seos',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-markets-and-instruments'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Debt Instruments and Term Loans',
    'debt-instruments-and-term-loans',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-markets-and-instruments'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Leases, Convertibles, and Warrants',
    'leases-convertibles-and-warrants',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-markets-and-instruments'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  ),
  (
    'Choosing a Financing Instrument',
    'choosing-a-financing-instrument',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'capital-markets-and-instruments'),
    'draft', false, 'framework', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- MODULE 14: mergers-restructuring-international (5 lessons)
-- =========================================================================

INSERT INTO public.essays (title, slug, section, finance_section, module_id, status, published, lesson_type, finance_order, sort_order, author)
VALUES
  (
    'Sources of Value in M&A',
    'sources-of-value-in-ma',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'mergers-restructuring-international'),
    'draft', false, 'concept', 1, 1, 'Dika Gustiana'
  ),
  (
    'Acquisition Valuation and Deal Structure',
    'acquisition-valuation-and-deal-structure',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'mergers-restructuring-international'),
    'draft', false, 'concept', 2, 2, 'Dika Gustiana'
  ),
  (
    'Corporate Restructuring and Divestitures',
    'corporate-restructuring-and-divestitures',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'mergers-restructuring-international'),
    'draft', false, 'concept', 3, 3, 'Dika Gustiana'
  ),
  (
    'Exchange-Rate Risk and International Finance',
    'exchange-rate-risk-and-international-finance',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'mergers-restructuring-international'),
    'draft', false, 'concept', 4, 4, 'Dika Gustiana'
  ),
  (
    'When All Fundamentals Converge',
    'when-all-fundamentals-converge',
    'finance', 'fundamentals',
    (SELECT id FROM public.finance_modules WHERE slug = 'mergers-restructuring-international'),
    'draft', false, 'framework', 5, 5, 'Dika Gustiana'
  )
ON CONFLICT (slug) DO NOTHING;

COMMIT;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260220180718_0a9748a3-8ed9-4dbe-b2df-e05560e1a5af.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- 1. Create finance_modules table
CREATE TABLE IF NOT EXISTS public.finance_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_slug text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  thesis text,
  sort_order integer NOT NULL DEFAULT 0,
  framing_content text,
  module_meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance modules are publicly readable"
  ON public.finance_modules FOR SELECT USING (true);

CREATE POLICY "Admins can modify finance modules"
  ON public.finance_modules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_finance_modules_updated_at
  BEFORE UPDATE ON public.finance_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add module_id to essays (FK to finance_modules)
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.finance_modules(id);

-- 3. Add lesson_type enum + column
DO $$ BEGIN
  CREATE TYPE public.lesson_type_enum AS ENUM (
    'concept',
    'framework',
    'case-study',
    'exercise',
    'model-walkthrough'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS lesson_type public.lesson_type_enum DEFAULT 'concept';


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260220181848_593ba7fa-f31a-4ffb-9282-3a5dc7fb6f91.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Performance indexes for finance essay lookups at scale (100+ essays)

-- Index for module_id + published (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_essays_module_published
  ON public.essays (module_id, published)
  WHERE module_id IS NOT NULL;

-- Index for finance_section + published (track-level queries)
CREATE INDEX IF NOT EXISTS idx_essays_finance_section_published
  ON public.essays (finance_section, published)
  WHERE finance_section IS NOT NULL;

-- Index for slug lookups (essay page rendering)
CREATE INDEX IF NOT EXISTS idx_essays_slug
  ON public.essays (slug);

-- Index for module slug lookups
CREATE INDEX IF NOT EXISTS idx_finance_modules_slug
  ON public.finance_modules (slug);

-- Composite index for track-level module listing
CREATE INDEX IF NOT EXISTS idx_finance_modules_track_order
  ON public.finance_modules (track_slug, sort_order);

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260220_001_fix_production_finance_data.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
BEGIN;

-- STEP 1 — Fix finance_sections slugs if they are stale
UPDATE public.finance_sections
  SET slug = 'planning'
  WHERE slug = 'planning-forecasting';

UPDATE public.finance_sections
  SET slug = 'analytics'
  WHERE slug = 'financial-analytics';

UPDATE public.finance_sections
  SET description = 'Translating strategy into numbers. Assumptions, scenarios, and action triggers.',
      icon = 'BarChart3'
  WHERE slug = 'planning';

UPDATE public.finance_sections
  SET description = 'Turning data into insight. Variance analysis, trend identification, and performance diagnosis.',
      icon = 'TrendingUp'
  WHERE slug = 'analytics';

-- STEP 2 — Create finance_modules table if it does not exist
CREATE TABLE IF NOT EXISTS public.finance_modules (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_slug      text        NOT NULL REFERENCES public.finance_sections (slug),
  slug            text        NOT NULL UNIQUE,
  title           text        NOT NULL,
  thesis          text,
  sort_order      integer     NOT NULL DEFAULT 0,
  framing_content text,
  module_meta     jsonb       DEFAULT '{}',
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.finance_modules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'finance_modules'
    AND policyname = 'Finance modules are publicly readable'
  ) THEN
    CREATE POLICY "Finance modules are publicly readable"
      ON public.finance_modules FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'finance_modules'
    AND policyname = 'Admins can modify finance modules'
  ) THEN
    CREATE POLICY "Admins can modify finance modules"
      ON public.finance_modules FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add module_id FK to essays if it does not exist
ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.finance_modules (id);

-- STEP 3 — Add lesson_type enum and column if missing
DO $$ BEGIN
  CREATE TYPE public.lesson_type_enum AS ENUM (
    'concept',
    'framework',
    'case-study',
    'exercise',
    'model-walkthrough'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.essays
  ADD COLUMN IF NOT EXISTS lesson_type public.lesson_type_enum DEFAULT 'concept';

ALTER TABLE public.finance_modules
  ADD COLUMN IF NOT EXISTS module_meta jsonb DEFAULT '{}';

-- STEP 4 — Seed all 32 finance modules (idempotent)
INSERT INTO public.finance_modules (track_slug, slug, title, thesis, sort_order, module_meta)
VALUES

  -- FUNDAMENTALS (14 modules)
  ('fundamentals', 'purpose-of-financial-management',
   'The Purpose of Financial Management',
   'Finance exists to increase the value of the firm, not to produce reports.',
   1, '{"variant":"standard"}'),

  ('fundamentals', 'business-tax-financial-environment',
   'The Business, Tax, and Financial Environment',
   'Every financial decision happens inside a system of legal forms, tax rules, and market structures.',
   2, '{"variant":"standard"}'),

  ('fundamentals', 'time-value-of-money',
   'Time Value of Money',
   'A dollar today is worth more than a dollar tomorrow — but by how much depends on the question.',
   3, '{"variant":"standard"}'),

  ('fundamentals', 'valuation-of-securities',
   'Valuation of Securities',
   'Valuation is not about finding the right number — it is about understanding what assumptions produce which prices.',
   4, '{"variant":"standard"}'),

  ('fundamentals', 'risk-and-return',
   'Risk and Return',
   'Risk is not volatility. Risk is the probability of permanent loss or failure to meet an obligation.',
   5, '{"variant":"standard"}'),

  ('fundamentals', 'financial-statement-analysis',
   'Financial Statement Analysis',
   'Financial statements are a structured narrative — read them as a system, not as line items.',
   6, '{"variant":"standard"}'),

  ('fundamentals', 'cash-flow-and-financial-planning',
   'Cash Flow Analysis and Financial Planning',
   'Profit is an opinion. Cash is a fact.',
   7, '{"variant":"standard"}'),

  ('fundamentals', 'working-capital-management',
   'Working Capital Management',
   'Working capital is the silent value driver that most managers ignore until it becomes a crisis.',
   8, '{"variant":"standard"}'),

  ('fundamentals', 'capital-budgeting',
   'Capital Budgeting',
   'Capital budgeting is the most consequential decision in finance — it determines what the firm becomes.',
   9, '{"variant":"standard"}'),

  ('fundamentals', 'cost-of-capital',
   'Cost of Capital and Required Returns',
   'The cost of capital is the hurdle rate that separates value-creating investments from value-destroying ones.',
   10, '{"variant":"standard"}'),

  ('fundamentals', 'capital-structure-and-leverage',
   'Capital Structure and Leverage',
   'How a firm finances itself changes its risk, its cost of capital, and the distribution of value.',
   11, '{"variant":"standard"}'),

  ('fundamentals', 'dividend-policy',
   'Dividend Policy',
   'Dividend policy is a signaling mechanism and a capital allocation decision.',
   12, '{"variant":"standard"}'),

  ('fundamentals', 'capital-markets-and-instruments',
   'Capital Markets and Financing Instruments',
   'Understanding how markets price and distribute capital is essential to making intelligent financing decisions.',
   13, '{"variant":"standard"}'),

  ('fundamentals', 'mergers-restructuring-international',
   'Mergers, Restructuring, and International Finance',
   'Where all fundamentals converge into high-stakes, irreversible decisions.',
   14, '{"variant":"standard"}'),

  -- STRATEGIC FINANCE (6 modules)
  ('strategic-finance', 'capital-allocation-strategy',
   'Capital Allocation Strategy',
   'Given finite resources, where should the firm invest to maximize long-term value?',
   1, '{"variant":"board"}'),

  ('strategic-finance', 'corporate-restructuring-logic',
   'Corporate Restructuring Logic',
   'When does breaking a company apart create more value than keeping it together?',
   2, '{"variant":"board"}'),

  ('strategic-finance', 'ma-value-creation',
   'M&A Value Creation and Destruction',
   'How do you distinguish acquisitions that create value from those that only transfer it?',
   3, '{"variant":"board"}'),

  ('strategic-finance', 'strategic-capital-structure',
   'Strategic Capital Structure',
   'How should the firm''s financing mix evolve as its strategy evolves?',
   4, '{"variant":"board"}'),

  ('strategic-finance', 'shareholder-signaling-payout',
   'Shareholder Signaling and Payout Design',
   'How do capital return decisions communicate management''s view of the firm''s future?',
   5, '{"variant":"board"}'),

  ('strategic-finance', 'long-term-value-architecture',
   'Long-Term Value Architecture',
   'How do you design a firm''s financial architecture for sustainable value creation over decades?',
   6, '{"variant":"board"}'),

  -- PLANNING (6 modules)
  ('planning', 'budget-architecture',
   'Budget Architecture',
   'Structure matters more than numbers in budget design.',
   1, '{"variant":"planning"}'),

  ('planning', 'rolling-forecast-systems',
   'Rolling Forecast Systems',
   'Rolling forecasts and annual budgets solve different problems.',
   2, '{"variant":"planning"}'),

  ('planning', 'scenario-sensitivity-modeling',
   'Scenario and Sensitivity Modeling',
   'Scenario modeling is not optimism/pessimism — it is different futures.',
   3, '{"variant":"planning"}'),

  ('planning', 'cash-runway-liquidity',
   'Cash Runway and Liquidity Planning',
   'The 13-week cash flow is the most important model in a crisis.',
   4, '{"variant":"planning"}'),

  ('planning', 'working-capital-optimization',
   'Working Capital Optimization',
   'Working capital optimization is a source of internal financing.',
   5, '{"variant":"planning"}'),

  ('planning', 'growth-financing-planning',
   'Growth Financing Planning',
   'The sustainable growth rate is your company''s speed limit.',
   6, '{"variant":"planning"}'),

  -- ANALYTICS (6 modules)
  ('analytics', 'ratio-architecture',
   'Ratio Architecture',
   'Designing a measurement system, not a checklist.',
   1, '{"variant":"analytics"}'),

  ('analytics', 'unit-economics-contribution',
   'Unit Economics and Contribution Margin',
   'Not all revenue is equal.',
   2, '{"variant":"analytics"}'),

  ('analytics', 'variance-decomposition',
   'Variance Decomposition',
   'Variance analysis is storytelling, not arithmetic.',
   3, '{"variant":"analytics"}'),

  ('analytics', 'driver-based-forecasting',
   'Driver-Based Forecasting',
   'Operational inputs beat financial extrapolation.',
   4, '{"variant":"analytics"}'),

  ('analytics', 'sensitivity-decision-modeling',
   'Sensitivity Analysis and Decision Modeling',
   'Sensitivity analysis as decision support, not model decoration.',
   5, '{"variant":"analytics"}'),

  ('analytics', 'performance-dashboards',
   'Performance Dashboards and Reporting',
   'What to show, what to hide, and why.',
   6, '{"variant":"analytics"}')

ON CONFLICT (slug) DO NOTHING;

COMMIT;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260227153508_99407ed6-c198-4608-ad8b-bf43030f51bc.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
UPDATE public.finance_sections 
SET title = 'Capital Allocation', 
    description = '15 recurring capital conditions observed in Indonesian markets. Institutional framework for allocators.'
WHERE slug = 'finance-in-motion';

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260301070510_bb746555-d919-4c60-ab62-d69f5193405b.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Delete existing fundamentals modules and re-insert with updated curriculum
DELETE FROM finance_modules WHERE track_slug = 'fundamentals';

INSERT INTO finance_modules (track_slug, slug, sort_order, title, thesis) VALUES
('fundamentals', 'purpose-of-financial-management', 1, 'The Purpose of Financial Management', 'Why finance exists in an organization — and whose interests it serves.'),
('fundamentals', 'business-tax-financial-environment', 2, 'The Business, Tax, and Financial Environment', 'Legal forms, tax logic, and the flow of funds that shape every financial decision.'),
('fundamentals', 'time-value-of-money', 3, 'Time Value of Money', 'A dollar today is worth more than a dollar tomorrow — and everything follows from this.'),
('fundamentals', 'valuation-of-securities', 4, 'Valuation of Securities and Instruments', 'The logic of pricing bonds, preferred stock, and common equity.'),
('fundamentals', 'firm-valuation', 5, 'Firm Valuation: DCF and Relative Methods', 'How to value an entire business using discounted cash flows and market multiples.'),
('fundamentals', 'risk-return-portfolio-theory', 6, 'Risk, Return, and Portfolio Theory', 'How diversification works, and what it means to price risk in a portfolio.'),
('fundamentals', 'capm-factor-models', 7, 'The CAPM, Factor Models, and the Price of Risk', 'From beta to cost of equity — how markets translate risk into required returns.'),
('fundamentals', 'financial-statement-construction', 8, 'Financial Statement Construction and Quality Analysis', 'How to read what financial statements say — and detect when they mislead.'),
('fundamentals', 'financial-statement-analysis', 9, 'Financial Statement Analysis: Ratios, Profitability, and Risk Signals', 'Diagnostic tools for measuring financial health, profitability, and distress signals.'),
('fundamentals', 'cash-flow-analysis', 10, 'Cash Flow Analysis and Financial Forecasting', 'How cash moves through a business — and how to project it forward.'),
('fundamentals', 'working-capital-management', 11, 'Working Capital Management', 'The mechanics of receivables, payables, and inventory as capital decisions.'),
('fundamentals', 'capital-budgeting', 12, 'Capital Budgeting: Principles and Decision Rules', 'How firms decide which investments to make — and which to reject.'),
('fundamentals', 'real-options', 13, 'Real Options and Strategic Investment Flexibility', 'When the right to wait, expand, or exit is worth more than the base case.'),
('fundamentals', 'cost-of-capital', 14, 'Cost of Capital and Hurdle Rates', 'Building the discount rate that separates value creation from value destruction.'),
('fundamentals', 'capital-structure', 15, 'Capital Structure: Theory and the Optimal Debt Mix', 'Why the debt-equity mix matters — from Modigliani-Miller to real-world trade-offs.'),
('fundamentals', 'financial-contracting', 16, 'Financial Contracting and Security Design', 'Why debt, equity, and hybrids exist — and what contracting problems each solves.'),
('fundamentals', 'debt-as-control', 17, 'Debt as a Control Instrument and Governance Mechanism', 'How leverage disciplines managers and reallocates control rights when performance declines.'),
('fundamentals', 'dividend-policy', 18, 'Dividend Policy: Theory and Evidence', 'What finance theory says about returning cash — and what firms actually do.'),
('fundamentals', 'capital-markets', 19, 'Capital Markets, Instruments, and Market Efficiency', 'How capital markets work, how securities are issued, and how prices reflect information.'),
('fundamentals', 'international-capital-markets', 20, 'International Capital Markets and Cross-Border Finance', 'Financing across borders — instruments, country risk, and emerging market constraints.');

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260301073018_198ed5b3-6e96-4da4-8510-49fd2e715b7c.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Published essays are publicly readable" ON essays;

-- Create a new policy that allows all essays to be read publicly
-- (content visibility can be controlled at the application level)
CREATE POLICY "Essays are publicly readable"
  ON essays
  FOR SELECT
  USING (true);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260301073238_cd28465a-44e8-47d1-9f8f-a83e9ad96295.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Module 01: Corporate Governance and Agency Theory (4 essays)
INSERT INTO essays (section, slug, title, module_id, finance_order, published, status, author) VALUES
('finance','sf-01-01','The Principal-Agent Problem as the Central Problem of Corporate Finance: How the Separation of Ownership and Control Creates Costs That Capital Structure and Governance Mechanisms Exist to Manage','7efedd3a-5a4f-47f0-9df8-bd47b2046ce9',1,false,'draft','Dika Gustiana'),
('finance','sf-01-02','Board Architecture and CFO Accountability: Independence, Audit Committee Design, and the Governance Structures That Actually Constrain Executive Behavior','7efedd3a-5a4f-47f0-9df8-bd47b2046ce9',2,false,'draft','Dika Gustiana'),
('finance','sf-01-03','Ownership Concentration and Governance Quality in Emerging Market Business Groups: Why Blockholder Monitoring and Tunneling Coexist in the Same Institutional Structure','7efedd3a-5a4f-47f0-9df8-bd47b2046ce9',3,false,'draft','Dika Gustiana'),
('finance','sf-01-04','Stakeholder Capitalism vs. Shareholder Primacy: The Empirical Record, the Contractual Argument, and Why the Debate Matters for Capital Allocation Doctrine','7efedd3a-5a4f-47f0-9df8-bd47b2046ce9',4,false,'draft','Dika Gustiana'),

-- Module 02: Capital Allocation Strategy (5 essays)
('finance','sf-02-01','ROIC as the Master Capital Allocation Metric: Why Return on Invested Capital Above the Cost of Capital Is the Necessary and Sufficient Condition for Value Creation','f104c091-8782-44c2-8077-23bc1fac39d1',1,false,'draft','Dika Gustiana'),
('finance','sf-02-02','The Capital Allocation Hierarchy: How Boards and CFOs Should Prioritize Between Organic Investment, M&A, Debt Reduction, and Shareholder Returns Across the Business Cycle','f104c091-8782-44c2-8077-23bc1fac39d1',2,false,'draft','Dika Gustiana'),
('finance','sf-02-03','Portfolio Capital Allocation in Multi-Business Firms: BCG Matrix, McKinsey GE Framework, and Why Internal Capital Markets Systematically Misallocate Relative to External Markets','f104c091-8782-44c2-8077-23bc1fac39d1',3,false,'draft','Dika Gustiana'),
('finance','sf-02-04','The Capital Budget as a Governance Document: How the Annual Investment Approval Process Either Enforces or Undermines the Strategic Capital Allocation Framework','f104c091-8782-44c2-8077-23bc1fac39d1',4,false,'draft','Dika Gustiana'),
('finance','sf-02-05','Communicating Capital Allocation Doctrine to Boards and Investors: The Investor Letter, the Capital Markets Day, and the Metrics That Build Long-Term Institutional Credibility','f104c091-8782-44c2-8077-23bc1fac39d1',5,false,'draft','Dika Gustiana'),

-- Module 03: M&A (5 essays)
('finance','sf-03-01','Synergy Valuation Methodology: How to Decompose Revenue, Cost, and Financial Synergies into Present Value Without Replicating the Optimism Bias That Destroys M&A Value','28eff272-4440-4a78-89ab-cbe5a8e95a3c',1,false,'draft','Dika Gustiana'),
('finance','sf-03-02','Deal Structure and Consideration Design: When to Use Cash vs. Stock, How Earnouts Solve Valuation Disagreements, and the Tax Implications of Each Structure','28eff272-4440-4a78-89ab-cbe5a8e95a3c',2,false,'draft','Dika Gustiana'),
('finance','sf-03-03','Accretion/Dilution Analysis as a Flawed Primary Decision Framework: Why EPS Accretion Is a Necessary but Insufficient Condition for Value Creation','28eff272-4440-4a78-89ab-cbe5a8e95a3c',3,false,'draft','Dika Gustiana'),
('finance','sf-03-04','Post-Merger Integration Failure: The Organizational, Cultural, and Financial Mechanisms Through Which 60–70% of Acquisitions Destroy Shareholder Value','28eff272-4440-4a78-89ab-cbe5a8e95a3c',4,false,'draft','Dika Gustiana'),
('finance','sf-03-05','LBO Architecture and Return Attribution: How Leverage, Multiple Expansion, and Operational Improvement Each Contribute to Private Equity Returns','28eff272-4440-4a78-89ab-cbe5a8e95a3c',5,false,'draft','Dika Gustiana'),

-- Module 04: Corporate Restructuring (4 essays)
('finance','sf-04-01','Spin-Off, Carve-Out, and Split-Off: The Valuation Logic for Separation Transactions and When Sum-of-Parts Exceeds Conglomerate Value','98ecb726-0bc6-4e39-9598-ecf832cb21d7',1,false,'draft','Dika Gustiana'),
('finance','sf-04-02','Balance Sheet Restructuring as Strategic Finance: How Recapitalizations, Debt-for-Equity Swaps, and Liability Management Operations Change the Risk Profile of the Firm','98ecb726-0bc6-4e39-9598-ecf832cb21d7',2,false,'draft','Dika Gustiana'),
('finance','sf-04-03','Distress-Driven Restructuring: The Decision Tree from Covenant Breach to Out-of-Court Workout to Chapter 11, and How Each Path Allocates Value Across Claimants','98ecb726-0bc6-4e39-9598-ecf832cb21d7',3,false,'draft','Dika Gustiana'),
('finance','sf-04-04','Divestitures as Capital Reallocation: How Asset Sales, Sale-Leasebacks, and Portfolio Simplification Programs Release Trapped Value and Fund Core Investment','98ecb726-0bc6-4e39-9598-ecf832cb21d7',4,false,'draft','Dika Gustiana'),

-- Module 05: Strategic Capital Structure (5 essays)
('finance','sf-05-01','The Operating Income Approach to Optimal Leverage: How to Use Cash Flow Stress Tests to Find the Debt Level a Business Can Sustain Across the Cycle Without Covenant Breach','ba675855-92be-4a7f-bae0-c1fbc8ea224b',1,false,'draft','Dika Gustiana'),
('finance','sf-05-02','Financing Instrument Selection Under Information Asymmetry: Why the Pecking Order Reflects a Rational Response to Adverse Selection Rather Than Simple Preference','ba675855-92be-4a7f-bae0-c1fbc8ea224b',2,false,'draft','Dika Gustiana'),
('finance','sf-05-03','Credit Rating Management as a Capital Structure Objective: How CFOs Engineer Leverage, Coverage, and Liquidity to Target and Defend Specific Rating Levels','ba675855-92be-4a7f-bae0-c1fbc8ea224b',3,false,'draft','Dika Gustiana'),
('finance','sf-05-04','Capital Structure Across the Business Cycle: When to Lever Up, When to Deleverage, and How to Use the Cycle to Refinance at Lower Rates Before Others Do','ba675855-92be-4a7f-bae0-c1fbc8ea224b',4,false,'draft','Dika Gustiana'),
('finance','sf-05-05','Convertible Bonds, Hybrid Instruments, and the Strategic Use of Ambiguous Securities: How Instruments at the Debt-Equity Boundary Solve Specific Contracting and Signaling Problems','ba675855-92be-4a7f-bae0-c1fbc8ea224b',5,false,'draft','Dika Gustiana'),

-- Module 06: Interest Rate Risk (4 essays)
('finance','sf-06-01','Duration, Convexity, and the Interest Rate Sensitivity of Debt Portfolios: How Small Rate Movements Translate Into Large Market Value Changes for Long-Duration Liabilities','b28215ea-4425-4023-b9a7-d7e654fa39b7',1,false,'draft','Dika Gustiana'),
('finance','sf-06-02','Fixed vs. Floating Debt Strategy Under Different Rate Environments: When to Lock In Rates, When to Stay Variable, and How the Choice Interacts With Asset Duration','b28215ea-4425-4023-b9a7-d7e654fa39b7',2,false,'draft','Dika Gustiana'),
('finance','sf-06-03','Interest Rate Swap Architecture: How Plain Vanilla, Basis, and Cross-Currency Swaps Are Used to Engineer the Desired Rate Exposure Without Altering Debt Principal','b28215ea-4425-4023-b9a7-d7e654fa39b7',3,false,'draft','Dika Gustiana'),
('finance','sf-06-04','Refinancing Risk and Debt Maturity Management: How Laddering, Bullet Avoidance, and Covenant-Aware Refinancing Protect Against Liquidity Events','b28215ea-4425-4023-b9a7-d7e654fa39b7',4,false,'draft','Dika Gustiana'),

-- Module 07: Credit Risk (5 essays)
('finance','sf-07-01','Credit Rating Agency Methodology: How S&P, Moody''s, and Fitch Convert Financial Ratios into Letter Ratings, and Why the Same EBITDA Can Support Different Ratings in Different Industries','57eb6979-68d3-43d8-afa8-6008c094a188',1,false,'draft','Dika Gustiana'),
('finance','sf-07-02','Covenant Architecture and Control Rights Transfer: How Maintenance Covenants, Incurrence Covenants, and Cross-Default Provisions Reallocate Decision Authority from Management to Creditors','57eb6979-68d3-43d8-afa8-6008c094a188',2,false,'draft','Dika Gustiana'),
('finance','sf-07-03','Distress Prediction Frameworks: Altman Z-Score, Ohlson O-Score, and the Financial Ratios That Signal Distress 12–24 Months Before Default','57eb6979-68d3-43d8-afa8-6008c094a188',3,false,'draft','Dika Gustiana'),
('finance','sf-07-04','Out-of-Court Restructuring vs. Formal Insolvency: The Economics of Consent Solicitations, Exchange Offers, and Pre-Packaged Plans — and Who Bears the Cost of Each Process','57eb6979-68d3-43d8-afa8-6008c094a188',4,false,'draft','Dika Gustiana'),
('finance','sf-07-05','Lender Negotiation in Distress: The Information Asymmetry Between Debtor and Creditor, Holdout Problems, and How CFOs Manage the Stakeholder Map in Financial Distress','57eb6979-68d3-43d8-afa8-6008c094a188',5,false,'draft','Dika Gustiana'),

-- Module 08: FX Risk (4 essays)
('finance','sf-08-01','Transaction, Translation, and Economic FX Exposure: Why the Third Is the Most Important and the Most Difficult to Hedge, and How Multinationals Systematically Underestimate It','e2f9acb8-7d41-4524-be5d-e8580d43ce74',1,false,'draft','Dika Gustiana'),
('finance','sf-08-02','FX Hedging Instruments: Forwards, Futures, Options, and Cross-Currency Swaps — Construction, Cost, and the Conditions Under Which Each Is Preferred','e2f9acb8-7d41-4524-be5d-e8580d43ce74',2,false,'draft','Dika Gustiana'),
('finance','sf-08-03','Natural Hedging and Operational FX Management: How Revenue Currency Matching, Local Funding, and Supply Chain Design Reduce FX Exposure Before Financial Instruments Are Required','e2f9acb8-7d41-4524-be5d-e8580d43ce74',3,false,'draft','Dika Gustiana'),
('finance','sf-08-04','IFRS 9 Hedge Accounting and Its CFO Implications: Qualifying Hedges, Effectiveness Testing, and How Accounting Treatment Affects the Incentive to Hedge','e2f9acb8-7d41-4524-be5d-e8580d43ce74',4,false,'draft','Dika Gustiana'),

-- Module 09: Derivatives (4 essays)
('finance','sf-09-01','Options Pricing Logic: How Black-Scholes Translates Volatility, Time, and the Risk-Free Rate into a Premium — and Why Understanding the Greeks Matters for Corporate Hedging Decisions','079a771d-21bd-4eca-9ceb-d9943552c1bd',1,false,'draft','Dika Gustiana'),
('finance','sf-09-02','Corporate Commodity Hedging Strategy: When to Hedge Commodity Input Prices, How Much to Hedge, Over What Horizon, and How to Communicate the Hedging Policy to Investors','079a771d-21bd-4eca-9ceb-d9943552c1bd',2,false,'draft','Dika Gustiana'),
('finance','sf-09-03','Credit Default Swaps as Capital Structure Instruments: How CDS Spreads Price Default Risk and Why They Matter for Treasury Risk Monitoring','079a771d-21bd-4eca-9ceb-d9943552c1bd',3,false,'draft','Dika Gustiana'),
('finance','sf-09-04','When Not to Hedge: The Cases Where Hedging Destroys Value — Speculative Positions, Benchmark Confusion, and the Risk of Replacing Operational Risk with Counterparty Risk','079a771d-21bd-4eca-9ceb-d9943552c1bd',4,false,'draft','Dika Gustiana'),

-- Module 10: Shareholder Signaling (5 essays)
('finance','sf-10-01','The Dividend vs. Buyback Decision: How Tax Position, Signaling Intent, Flexibility Requirements, and Investor Base Composition Should Drive the Payout Instrument Choice','d0ac8e82-9463-450e-8468-caf8273b5144',1,false,'draft','Dika Gustiana'),
('finance','sf-10-02','Buyback Mechanics: Open Market Repurchases, Fixed-Price Tenders, Accelerated Share Repurchases, and How Each Is Perceived by the Market','d0ac8e82-9463-450e-8468-caf8273b5144',2,false,'draft','Dika Gustiana'),
('finance','sf-10-03','Payout Policy Across the Capital Allocation Hierarchy: How CFOs Should Frame the Decision to Return Capital vs. Reinvest — and Why Most Payout Announcements Are Made at the Wrong Point in the Cycle','d0ac8e82-9463-450e-8468-caf8273b5144',3,false,'draft','Dika Gustiana'),
('finance','sf-10-04','Information Content of Payout Decisions: How Initiating, Increasing, Cutting, or Suspending Dividends Signals Management''s Private Information About Future Earnings Quality','d0ac8e82-9463-450e-8468-caf8273b5144',4,false,'draft','Dika Gustiana'),
('finance','sf-10-05','Activist Shareholder Engagement and Payout Pressure: The Playbook, the Counter-Arguments, and How CFOs Construct a Capital Return Narrative That Preempts Activism','d0ac8e82-9463-450e-8468-caf8273b5144',5,false,'draft','Dika Gustiana'),

-- Module 11: Long-Term Value Architecture (4 essays)
('finance','sf-11-01','ROIC Decomposition: How Splitting Return on Invested Capital Into Margin and Asset Turnover Reveals Whether Value Creation Is Driven by Pricing Power or Capital Efficiency','865a6168-c6b1-4767-8370-172d4c47e73f',1,false,'draft','Dika Gustiana'),
('finance','sf-11-02','Economic Value Added as a Management Incentive System: EVA Construction, Capital Charge Design, and the Conditions Under Which EVA Compensation Actually Aligns Management With Shareholders','865a6168-c6b1-4767-8370-172d4c47e73f',2,false,'draft','Dika Gustiana'),
('finance','sf-11-03','Value Driver Trees and Strategic Operating Decisions: How to Connect Revenue Growth, Operating Margin, Capital Intensity, and Cost of Capital Into a Single Coherent Value Map for the Board','865a6168-c6b1-4767-8370-172d4c47e73f',3,false,'draft','Dika Gustiana'),
('finance','sf-11-04','Intrinsic Value vs. Market Value: Why They Diverge, How to Identify When the Gap Is Large Enough to Act On, and What the CFO Can Do to Close It','865a6168-c6b1-4767-8370-172d4c47e73f',4,false,'draft','Dika Gustiana'),

-- Module 12: ESG (3 essays)
('finance','sf-12-01','Green Bond and Sustainability-Linked Bond Mechanics: How Instrument Design, Use-of-Proceeds Requirements, and KPI Linkage Affect Pricing Relative to Vanilla Debt','08eba9f2-ad45-41d8-b017-bb4814548329',1,false,'draft','Dika Gustiana'),
('finance','sf-12-02','Climate-Adjusted Cost of Capital: The Theoretical Framework for Incorporating Physical Risk and Transition Risk Into Discount Rates, and Why Current Market Practice Underestimates Both','08eba9f2-ad45-41d8-b017-bb4814548329',2,false,'draft','Dika Gustiana'),
('finance','sf-12-03','TCFD Disclosure and the Board''s Financial Obligations: How Climate Risk Scenario Analysis Translates Into Balance Sheet Stress, Capex Reallocation, and Stranded Asset Provisions','08eba9f2-ad45-41d8-b017-bb4814548329',3,false,'draft','Dika Gustiana'),

-- Module 13: Political Economy (3 essays)
('finance','sf-13-01','Legal System Quality and the Cost of Capital: How Investor Protection, Contract Enforcement, and Property Rights Are Priced Into Required Returns in Emerging Markets','eac7c2c2-edaa-4774-bfae-a2d911903cc5',1,false,'draft','Dika Gustiana'),
('finance','sf-13-02','State-Owned Enterprise Governance and Capital Allocation Distortions: How Political Objectives, Implicit Guarantees, and Soft Budget Constraints Distort Investment Decisions in SOE-Adjacent Industries','eac7c2c2-edaa-4774-bfae-a2d911903cc5',2,false,'draft','Dika Gustiana'),
('finance','sf-13-03','Conglomerate Finance in Indonesian Business Groups: How Cross-Subsidiary Guarantee Structures, Internal Capital Markets, and Group-Level Treasury Create Risk Exposures That External Investors Consistently Misprice','eac7c2c2-edaa-4774-bfae-a2d911903cc5',3,false,'draft','Dika Gustiana');


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260301073420_35bdab28-525d-460c-bdf2-da10cbf7562d.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

INSERT INTO essays (section, slug, title, module_id, finance_order, published, status, author) VALUES
-- Module 01: Budget Architecture (4 essays)
('finance','pf-01-01','Zero-Based vs. Incremental Budgeting: Why the Choice Is Not About Methodology but About What Management Culture the Budget Process Is Designed to Produce','d4eb3540-7387-4d10-990d-bffff7575aad',1,false,'draft','Dika Gustiana'),
('finance','pf-01-02','Three-Statement Budget Integration: How Plug Variables, Circular References, and Cash Sweep Mechanics Work in an Institutionally Robust Integrated Financial Model','d4eb3540-7387-4d10-990d-bffff7575aad',2,false,'draft','Dika Gustiana'),
('finance','pf-01-03','Budget Governance and the CFO''s Role in Preventing Budget Gaming: Sandbagging, Padding, and the Information Asymmetry Between Business Units and the Center','d4eb3540-7387-4d10-990d-bffff7575aad',3,false,'draft','Dika Gustiana'),
('finance','pf-01-04','Connecting Budget Architecture to Strategic Capital Allocation: How the Annual Budget Must Be Derived From the Capital Allocation Framework, Not Constructed Independently of It','d4eb3540-7387-4d10-990d-bffff7575aad',4,false,'draft','Dika Gustiana'),

-- Module 02: Rolling Forecast (3 essays)
('finance','pf-02-01','Rolling Forecast vs. Annual Budget: Why Separating the Forecast Function From the Target-Setting Function Eliminates Forecast Bias Without Eliminating Accountability','b465ca5d-288c-4545-88ac-79c25a9fcc87',1,false,'draft','Dika Gustiana'),
('finance','pf-02-02','Reforecast Cadence Design: How to Choose Between Monthly, Quarterly, and Event-Triggered Reforecasting Based on Business Cycle Volatility and Decision-Making Speed','b465ca5d-288c-4545-88ac-79c25a9fcc87',2,false,'draft','Dika Gustiana'),
('finance','pf-02-03','Building a Forecast Culture: How CFOs Eliminate Anchoring Bias, Recency Bias, and Sandbagging From the Forecast Process Without Destroying the Forecasters'' Willingness to Commit','b465ca5d-288c-4545-88ac-79c25a9fcc87',3,false,'draft','Dika Gustiana'),

-- Module 03: Scenario Planning (4 essays)
('finance','pf-03-01','Macro Scenario Construction for CFOs: How to Build Economically Consistent Base, Upside, and Downside Scenarios That Are Useful for Decision-Making Rather Than Just Risk Disclosure','0c1216a9-8168-436f-9307-266e34350e64',1,false,'draft','Dika Gustiana'),
('finance','pf-03-02','Reverse Stress Testing: Starting From the Breaking Point — How to Identify the Scenario in Which the Business Model Fails and Work Backward to Understand Its Proximity','0c1216a9-8168-436f-9307-266e34350e64',2,false,'draft','Dika Gustiana'),
('finance','pf-03-03','Covenant Stress Testing and Headroom Management: How to Model Financial Covenant Compliance Under Adverse Scenarios and Determine the Liquidity Buffer Required to Avoid Breach','0c1216a9-8168-436f-9307-266e34350e64',3,false,'draft','Dika Gustiana'),
('finance','pf-03-04','Communicating Scenarios to Boards and Lenders: How to Present Uncertainty Without Creating Panic, and How to Use Scenarios to Drive Capital Allocation Decisions Rather Than Justify Inaction','0c1216a9-8168-436f-9307-266e34350e64',4,false,'draft','Dika Gustiana'),

-- Module 04: Treasury Architecture (3 essays)
('finance','pf-04-01','Cash Pooling Structures for Multinational Groups: Notional vs. Physical Pooling, In-House Banking, and the Legal, Tax, and Regulatory Constraints That Determine Which Structure Is Feasible','487f0b25-ee64-4613-8e1b-25e1e690ea4a',1,false,'draft','Dika Gustiana'),
('finance','pf-04-02','Short-Term Funding Markets and Corporate Liquidity Infrastructure: Commercial Paper, Money Market Facilities, and How Treasury Constructs the Funding Stack That Buffers Against Operational Cash Volatility','487f0b25-ee64-4613-8e1b-25e1e690ea4a',2,false,'draft','Dika Gustiana'),
('finance','pf-04-03','Counterparty Risk in Treasury Operations: How to Design Bank Relationship Limits, Collateral Requirements, and Settlement Protocols That Prevent Treasury From Becoming a Source of Concentration Risk','487f0b25-ee64-4613-8e1b-25e1e690ea4a',3,false,'draft','Dika Gustiana'),

-- Module 05: Cash Runway (4 essays)
('finance','pf-05-01','The 13-Week Cash Flow Model: Construction, Driver Assumptions, and How Weekly Liquidity Visibility Changes the Quality of Board-Level Decisions in Stressed Environments','9b929581-9970-4a4e-a071-6403eb4ba7b3',1,false,'draft','Dika Gustiana'),
('finance','pf-05-02','Minimum Cash Balance Policy: How to Determine the Structural Liquidity Floor Below Which Operating Risk Materializes, and How That Floor Changes Across Business Cycle Phases','9b929581-9970-4a4e-a071-6403eb4ba7b3',2,false,'draft','Dika Gustiana'),
('finance','pf-05-03','Early Warning Indicators for Liquidity Deterioration: The Financial Ratios, Operating Metrics, and Covenant Headroom Thresholds That Precede Distress by Six to Twelve Months','9b929581-9970-4a4e-a071-6403eb4ba7b3',3,false,'draft','Dika Gustiana'),
('finance','pf-05-04','Cash Crisis Protocol: The Decision Tree from First Liquidity Warning to Emergency Capital Raise, and How CFOs Sequence Actions to Preserve Maximum Stakeholder Value','9b929581-9970-4a4e-a071-6403eb4ba7b3',4,false,'draft','Dika Gustiana'),

-- Module 06: Working Capital (4 essays)
('finance','pf-06-01','Receivables Management and Working Capital Financing: Invoice Factoring, Receivables Securitization, Dynamic Discounting, and How Each Trades Yield Against Balance Sheet Risk','9a07dcdc-4481-4382-b5e3-22640d8684f8',1,false,'draft','Dika Gustiana'),
('finance','pf-06-02','Payables Extension as a Financing Strategy: Supply Chain Finance, Reverse Factoring, and the Ethical and Reputational Constraints That Limit How Far Payables Stretching Can Go','9a07dcdc-4481-4382-b5e3-22640d8684f8',2,false,'draft','Dika Gustiana'),
('finance','pf-06-03','Inventory Optimization and Cash Conversion: How Demand Variability, Lead Time Reduction, and Safety Stock Calculations Translate Into Working Capital Release and Free Cash Flow Generation','9a07dcdc-4481-4382-b5e3-22640d8684f8',3,false,'draft','Dika Gustiana'),
('finance','pf-06-04','Working Capital in M&A Due Diligence: How Normalized Working Capital Peg Calculations, Seasonality Adjustments, and Working Capital Quality Analysis Determine the True Cash Price of an Acquisition','9a07dcdc-4481-4382-b5e3-22640d8684f8',4,false,'draft','Dika Gustiana'),

-- Module 07: Capital Needs (3 essays)
('finance','pf-07-01','Modeling Capital Requirements From Growth Assumptions: How to Build a Bottoms-Up Funding Needs Model That Connects Revenue Growth, Operating Investment, and Working Capital Absorption Into a Funding Requirement','7093b104-bc76-4b29-8e78-ed963f92debf',1,false,'draft','Dika Gustiana'),
('finance','pf-07-02','Equity Dilution Modeling: How to Calculate Pre-Money Valuation, Dilution Impact, Ownership Waterfall, and Anti-Dilution Mechanics for Funding Round Negotiations','7093b104-bc76-4b29-8e78-ed963f92debf',2,false,'draft','Dika Gustiana'),
('finance','pf-07-03','The Investor-Ready Financial Package: How CFOs Structure Financial Projections, Sensitivity Analysis, and Covenant Headroom Documentation to Reduce Information Asymmetry With Lenders and Investors','7093b104-bc76-4b29-8e78-ed963f92debf',3,false,'draft','Dika Gustiana');


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260301073540_8d5c4502-0beb-4ac3-b320-b24e9757a6f0.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

INSERT INTO essays (section, slug, title, module_id, finance_order, published, status, author) VALUES
-- QM1: Linear Algebra (2)
('finance','fa-01-01','Matrix Operations as Financial Infrastructure: How Covariance Matrices, Factor Loading Matrices, and OLS in Matrix Form Underlie Every Multi-Asset Risk and Regression Calculation in Finance','2c7e32b1-6cf0-479c-888a-71e1b9368f89',1,false,'draft','Dika Gustiana'),
('finance','fa-01-02','Eigenvalue Decomposition in Portfolio Analysis: How Principal Component Analysis Identifies the Dominant Sources of Portfolio Variance That Simple Correlation Analysis Misses','2c7e32b1-6cf0-479c-888a-71e1b9368f89',2,false,'draft','Dika Gustiana'),
-- QM2: Calculus (2)
('finance','fa-02-01','Optimization as Capital Decision Logic: How First-Order Conditions, Lagrange Multipliers, and the KKT Conditions Formalize the CFO''s Resource Allocation Problem','42f1fdfc-987e-4b2e-9413-d96488258461',1,false,'draft','Dika Gustiana'),
('finance','fa-02-02','Convexity in Financial Decision Problems: Why Convex Objective Functions Are Desirable, How Concavity Produces Risk Aversion, and What Both Imply for Capital Allocation Under Uncertainty','42f1fdfc-987e-4b2e-9413-d96488258461',2,false,'draft','Dika Gustiana'),
-- QM3: Probability (3)
('finance','fa-03-01','Probability Distributions in Finance: How Normal, Lognormal, and Fat-Tailed Distributions Model Different Financial Phenomena, and Why Choosing the Wrong Distribution Produces Systematically Wrong Risk Estimates','b3dd2f9c-c6e0-4cbc-adb3-0cfc4d0d929e',1,false,'draft','Dika Gustiana'),
('finance','fa-03-02','Regression Analysis for Financial Inference: OLS Assumptions, Diagnostic Testing, and How Violations of Gauss-Markov Conditions Produce Unreliable Beta, Cost of Capital, and Driver Estimates','b3dd2f9c-c6e0-4cbc-adb3-0cfc4d0d929e',2,false,'draft','Dika Gustiana'),
('finance','fa-03-03','Stochastic Processes and Option Pricing Foundations: Brownian Motion, Geometric Brownian Motion, and the Mathematical Bridge from Asset Price Dynamics to the Black-Scholes Formula','b3dd2f9c-c6e0-4cbc-adb3-0cfc4d0d929e',3,false,'draft','Dika Gustiana'),
-- 04: Ratio Architecture (3)
('finance','fa-04-01','DuPont as a Strategic Management System: How Decomposing ROE Into Profit Margin, Asset Turnover, and Financial Leverage Connects Accounting Output to Operating Strategy','5f8fe1b2-ea95-401b-b2b7-eb20be558044',1,false,'draft','Dika Gustiana'),
('finance','fa-04-02','Ratio Benchmarking Methodology: How to Select Comparable Firms, Adjust for Accounting Differences, and Interpret Cross-Sectional Ratio Dispersion Without False Precision','5f8fe1b2-ea95-401b-b2b7-eb20be558044',2,false,'draft','Dika Gustiana'),
('finance','fa-04-03','Detecting Financial Deterioration Before Default: The Sequence of Ratio Degradation — From Profitability to Coverage to Liquidity to Solvency — and the Time Lags Between Each','5f8fe1b2-ea95-401b-b2b7-eb20be558044',3,false,'draft','Dika Gustiana'),
-- 05: Unit Economics (3)
('finance','fa-05-01','Contribution Margin Architecture Across Business Models: How Unit Economics Differ Structurally Between Asset-Heavy Industrial Firms, Platform Businesses, and Subscription Models','c6218629-5e77-4117-b45c-10e7ac8f9668',1,false,'draft','Dika Gustiana'),
('finance','fa-05-02','Customer Lifetime Value and Customer Acquisition Cost: The Unit Economic Foundation for Growth Investment Decisions, and Why LTV/CAC Ratios Without Cohort-Level Data Are Almost Always Wrong','c6218629-5e77-4117-b45c-10e7ac8f9668',2,false,'draft','Dika Gustiana'),
('finance','fa-05-03','Operating Leverage Quantification: How Fixed vs. Variable Cost Structure Translates Into Earnings Volatility, and Why High Operating Leverage Changes the Optimal Capital Structure','c6218629-5e77-4117-b45c-10e7ac8f9668',3,false,'draft','Dika Gustiana'),
-- 06: Variance Decomposition (3)
('finance','fa-06-01','Price-Volume-Mix Variance Decomposition: The Mathematical Structure of Three-Way Attribution and Why the Cross-Term Assignment Convention Has Managerial Implications','5bd0c32f-ff13-4776-9b3a-be346a48e958',1,false,'draft','Dika Gustiana'),
('finance','fa-06-02','Bridge Analysis Construction for Board Reporting: How to Build a Waterfall Chart That Moves From Prior Period to Current Period Performance With Each Bridge Column Representing a Single Clean Cause','5bd0c32f-ff13-4776-9b3a-be346a48e958',2,false,'draft','Dika Gustiana'),
('finance','fa-06-03','Root Cause Isolation vs. Symptom Identification: How to Distinguish First-Order Variance Drivers From Second-Order Effects, and Why Most Variance Commentaries Stop Too Early','5bd0c32f-ff13-4776-9b3a-be346a48e958',3,false,'draft','Dika Gustiana'),
-- 07: Driver-Based Forecasting (3)
('finance','fa-07-01','Driver Tree Construction: How to Map a Business Model''s Value Creation Logic Into a Hierarchical Set of Quantifiable Drivers That Connect KPIs to Financial Line Items','682d2c62-4c0f-457f-ba6e-c3b2b4c042c9',1,false,'draft','Dika Gustiana'),
('finance','fa-07-02','Driver Sensitivity Ranking: How Partial Derivative Analysis Identifies the Two or Three Drivers That Explain 80% of Forecast Variance, and Why Everything Else Is Noise','682d2c62-4c0f-457f-ba6e-c3b2b4c042c9',2,false,'draft','Dika Gustiana'),
('finance','fa-07-03','Updating Forecasts From Driver Signals: How to Build a Forecast Update Protocol That Moves From Operational Leading Indicators to Financial Reforecast Without Waiting for Month-End Close','682d2c62-4c0f-457f-ba6e-c3b2b4c042c9',3,false,'draft','Dika Gustiana'),
-- 08: Sensitivity Analysis (3)
('finance','fa-08-01','Tornado Chart Construction and Interpretation: How One-Way Sensitivity Analysis Ranks Assumption Risk and Why the Visual Presentation of Sensitivity Changes What Decisions Get Made','feb4561a-d7e7-4ab5-8d26-85c836d91ca1',1,false,'draft','Dika Gustiana'),
('finance','fa-08-02','Monte Carlo Simulation for Capital Decisions: How to Define Probability Distributions for Key Assumptions, Run Correlated Simulations, and Interpret the Output Distribution Without Overstating Precision','feb4561a-d7e7-4ab5-8d26-85c836d91ca1',2,false,'draft','Dika Gustiana'),
('finance','fa-08-03','Decision Tree Analysis Under Sequential Uncertainty: How to Structure Staged Investment Decisions, Assign Probabilities to Branch Nodes, and Calculate Expected Value Including the Option to Stop','feb4561a-d7e7-4ab5-8d26-85c836d91ca1',3,false,'draft','Dika Gustiana'),
-- 09: Performance Dashboards (3)
('finance','fa-09-01','KPI Selection as a Governance Decision: How to Choose the Minimum Set of Metrics That Gives the Board Sufficient Information to Monitor Strategy Without Creating Reporting Theater','23b43399-59ae-459f-a082-0f5f948717fe',1,false,'draft','Dika Gustiana'),
('finance','fa-09-02','Financial Reporting for Different Audiences: How the Same Underlying Financial Data Must Be Structured Differently for the Board, the CFO''s Management Pack, the Lender Compliance Report, and the Investor Presentation','23b43399-59ae-459f-a082-0f5f948717fe',2,false,'draft','Dika Gustiana'),
('finance','fa-09-03','Leading vs. Lagging Indicators in Performance Architecture: Why Dashboards Anchored to Lagging Accounting Metrics Systematically Fail to Alert Management Early Enough to Change Outcomes','23b43399-59ae-459f-a082-0f5f948717fe',3,false,'draft','Dika Gustiana');


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260301075250_d4ef036a-561b-4132-a3db-325697104f6f.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260301115326_db53da9f-61ad-4e40-82d0-f4b6c61d720c.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS is_selected boolean NOT NULL DEFAULT false;

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- 20260310000954_7b034dc7-4304-49b3-8c05-e4ebc41f0e90.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
CREATE UNIQUE INDEX IF NOT EXISTS essays_slug_unique ON essays (slug);