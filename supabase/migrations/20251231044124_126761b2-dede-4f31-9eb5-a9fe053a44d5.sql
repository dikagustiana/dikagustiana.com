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