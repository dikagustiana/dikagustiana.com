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