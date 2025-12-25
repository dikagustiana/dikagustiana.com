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