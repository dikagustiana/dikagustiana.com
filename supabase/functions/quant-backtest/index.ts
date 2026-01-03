import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Trade {
  date: string;
  symbol: string;
  direction: 'long' | 'short';
  signalType: string;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  pnl: number;
  return: number;
}

interface DailyEquity {
  date: string;
  equity: number;
  drawdown: number;
}

interface BacktestConfig {
  startingCapital: number;
  maxPositionSize: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  transactionCostBps: number;
  slippageBps: number;
  useHalfKelly: boolean;
}

// Calculate log returns
function calculateLogReturns(prices: number[]): number[] {
  const returns: number[] = [0];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    } else {
      returns.push(0);
    }
  }
  return returns;
}

// Calculate rolling volatility
function calculateRollingVol(returns: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < returns.length; i++) {
    if (i < window - 1) {
      result.push(0.2);
      continue;
    }
    const slice = returns.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / window;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window;
    result.push(Math.sqrt(variance) * Math.sqrt(252));
  }
  return result;
}

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): number[] {
  const result: number[] = [50];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(50);
      continue;
    }
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }
  return result;
}

// Calculate Z-score
function calculateZScore(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(0);
      continue;
    }
    const slice = values.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / window;
    const std = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window);
    if (std === 0) result.push(0);
    else result.push((values[i] - mean) / std);
  }
  return result;
}

// Calculate momentum
function calculateMomentum(prices: number[], period: number = 10): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(0);
      continue;
    }
    result.push((prices[i] - prices[i - period]) / prices[i - period]);
  }
  return result;
}

// Generate signal for a single bar
function generateSignal(
  priceZScore: number,
  rsi: number,
  momentum: number,
  volatility: number
): { direction: 'long' | 'short' | 'neutral'; strength: number; type: string } {
  // Mean reversion
  if (priceZScore < -2 && rsi < 30) {
    return { direction: 'long', strength: 0.8, type: 'mean_reversion' };
  }
  if (priceZScore > 2 && rsi > 70) {
    return { direction: 'short', strength: 0.8, type: 'mean_reversion' };
  }
  
  // Trend following (only in low vol)
  if (volatility < 0.3) {
    if (momentum > 0.1) {
      return { direction: 'long', strength: 0.6, type: 'trend' };
    }
    if (momentum < -0.1) {
      return { direction: 'short', strength: 0.6, type: 'trend' };
    }
  }
  
  return { direction: 'neutral', strength: 0, type: 'none' };
}

// Run walk-forward backtest
function runBacktest(
  prices: number[],
  dates: string[],
  config: BacktestConfig,
  trainingWindow: number
): { trades: Trade[]; equity: DailyEquity[]; metrics: Record<string, number> } {
  const trades: Trade[] = [];
  const equity: DailyEquity[] = [];
  
  let capital = config.startingCapital;
  let peakCapital = capital;
  let position: { direction: 'long' | 'short'; entryPrice: number; size: number; type: string; date: string } | null = null;
  
  // Calculate features for entire series
  const logReturns = calculateLogReturns(prices);
  const volatility = calculateRollingVol(logReturns, 20);
  const rsi = calculateRSI(prices, 14);
  const priceZScore = calculateZScore(prices, 20);
  const momentum = calculateMomentum(prices, 10);
  
  // Walk forward from training window
  for (let i = trainingWindow; i < prices.length; i++) {
    const date = dates[i];
    const price = prices[i];
    
    // Check exit conditions for existing position
    if (position) {
      const exitReturn = position.direction === 'long' 
        ? (price - position.entryPrice) / position.entryPrice
        : (position.entryPrice - price) / position.entryPrice;
      
      let shouldExit = false;
      
      // Stop loss
      if (exitReturn < -config.stopLossPercent / 100) {
        shouldExit = true;
      }
      // Take profit
      if (exitReturn > config.takeProfitPercent / 100) {
        shouldExit = true;
      }
      
      if (shouldExit) {
        // Apply transaction costs and slippage
        const costs = (config.transactionCostBps + config.slippageBps) / 10000;
        const pnl = position.size * exitReturn * (1 - costs);
        
        trades.push({
          date: position.date,
          symbol: 'BACKTEST',
          direction: position.direction,
          signalType: position.type,
          entryPrice: position.entryPrice,
          exitPrice: price,
          positionSize: position.size,
          pnl,
          return: exitReturn
        });
        
        capital += pnl;
        position = null;
      }
    }
    
    // Generate new signal
    const signal = generateSignal(
      priceZScore[i],
      rsi[i],
      momentum[i],
      volatility[i]
    );
    
    // Enter new position if no current position
    if (!position && signal.direction !== 'neutral') {
      // Calculate position size
      let posSize = capital * config.maxPositionSize / 100;
      
      if (config.useHalfKelly) {
        // Simplified Kelly sizing
        const expectedReturn = signal.strength * 0.02;
        const kelly = Math.max(0, Math.min(0.25, expectedReturn / (volatility[i] || 0.2)));
        posSize = Math.min(posSize, capital * kelly * 0.5);
      }
      
      // Apply transaction costs
      const costs = (config.transactionCostBps + config.slippageBps) / 10000;
      posSize = posSize * (1 - costs);
      
      if (posSize > capital * 0.01) { // Minimum 1% of capital
        position = {
          direction: signal.direction,
          entryPrice: price,
          size: posSize,
          type: signal.type,
          date
        };
      }
    }
    
    // Track equity
    const currentEquity = capital + (position 
      ? position.size * (position.direction === 'long' 
          ? (price - position.entryPrice) / position.entryPrice 
          : (position.entryPrice - price) / position.entryPrice)
      : 0);
    
    peakCapital = Math.max(peakCapital, currentEquity);
    const drawdown = (peakCapital - currentEquity) / peakCapital;
    
    equity.push({ date, equity: currentEquity, drawdown });
  }
  
  // Close any remaining position at end
  if (position) {
    const lastPrice = prices[prices.length - 1];
    const exitReturn = position.direction === 'long'
      ? (lastPrice - position.entryPrice) / position.entryPrice
      : (position.entryPrice - lastPrice) / position.entryPrice;
    
    const pnl = position.size * exitReturn;
    capital += pnl;
    
    trades.push({
      date: position.date,
      symbol: 'BACKTEST',
      direction: position.direction,
      signalType: position.type,
      entryPrice: position.entryPrice,
      exitPrice: lastPrice,
      positionSize: position.size,
      pnl,
      return: exitReturn
    });
  }
  
  // Calculate metrics
  const totalReturn = (capital - config.startingCapital) / config.startingCapital;
  const years = (equity.length || 1) / 252;
  const cagr = Math.pow(1 + totalReturn, 1 / years) - 1;
  
  const returns = trades.map(t => t.return);
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdReturn = returns.length > 0 
    ? Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length)
    : 1;
  const sharpe = stdReturn > 0 ? (meanReturn * 252) / (stdReturn * Math.sqrt(252)) : 0;
  
  const maxDrawdown = Math.max(...equity.map(e => e.drawdown));
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
  
  const grossProfit = winningTrades.reduce((a, b) => a + b.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((a, b) => a + b.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
  
  return {
    trades,
    equity,
    metrics: {
      cagr: cagr * 100,
      sharpe_ratio: sharpe,
      max_drawdown: maxDrawdown * 100,
      win_rate: winRate * 100,
      profit_factor: profitFactor,
      total_trades: trades.length,
      avg_trade_return: meanReturn * 100
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body = await req.json();
    const { 
      backtest_id,
      symbols,
      start_date,
      end_date,
      config = {}
    } = body;
    
    const backtestConfig: BacktestConfig = {
      startingCapital: config.starting_capital || 100000000, // 100M IDR
      maxPositionSize: config.max_position_size || 10, // 10% max
      stopLossPercent: config.stop_loss_percent || 5,
      takeProfitPercent: config.take_profit_percent || 10,
      transactionCostBps: config.transaction_cost_bps || 15, // 0.15%
      slippageBps: config.slippage_bps || 10, // 0.1%
      useHalfKelly: config.use_half_kelly !== false
    };
    
    const trainingWindow = config.training_window || 252; // 1 year
    
    // Get stock data
    const symbolList = symbols || ['BBRI', 'BBCA', 'BMRI', 'TLKM'];
    
    const { data: stocks } = await supabase
      .from('remora_stocks')
      .select('id, symbol')
      .in('symbol', symbolList);
    
    if (!stocks || stocks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No stocks found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const allTrades: Trade[] = [];
    const allEquity: DailyEquity[] = [];
    const symbolResults: Record<string, any> = {};
    
    for (const stock of stocks) {
      // Fetch OHLCV data
      let query = supabase
        .from('remora_ohlcv_daily')
        .select('date, close_price')
        .eq('stock_id', stock.id)
        .eq('is_valid', true)
        .order('date', { ascending: true });
      
      if (start_date) query = query.gte('date', start_date);
      if (end_date) query = query.lte('date', end_date);
      
      const { data: ohlcv, error } = await query;
      
      if (error || !ohlcv || ohlcv.length < trainingWindow + 50) {
        symbolResults[stock.symbol] = { error: 'Insufficient data' };
        continue;
      }
      
      const prices = ohlcv.map(r => r.close_price);
      const dates = ohlcv.map(r => r.date);
      
      // Run backtest
      const result = runBacktest(prices, dates, backtestConfig, trainingWindow);
      
      // Tag trades with symbol
      result.trades.forEach(t => t.symbol = stock.symbol);
      
      allTrades.push(...result.trades);
      symbolResults[stock.symbol] = result.metrics;
    }
    
    // Aggregate equity curves (simplified - just use last stock's curve for now)
    // In production, would properly combine across symbols
    
    // Calculate aggregate metrics
    const totalReturn = allTrades.reduce((a, b) => a + b.pnl, 0) / backtestConfig.startingCapital;
    const avgReturn = allTrades.length > 0 ? allTrades.reduce((a, b) => a + b.return, 0) / allTrades.length : 0;
    
    const aggregateMetrics = {
      total_return: totalReturn * 100,
      total_trades: allTrades.length,
      avg_trade_return: avgReturn * 100,
      symbols_tested: stocks.length
    };
    
    // Store results if backtest_id provided
    if (backtest_id) {
      await supabase.from('quant_backtest_results').upsert({
        backtest_id,
        cagr: aggregateMetrics.total_return,
        total_trades: allTrades.length,
        avg_trade_return: avgReturn * 100,
        trade_log: allTrades.slice(0, 1000), // Limit to 1000 trades
        regime_metrics: symbolResults
      }, { onConflict: 'backtest_id' });
      
      // Update backtest status
      await supabase.from('quant_backtests')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', backtest_id);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        metrics: aggregateMetrics,
        symbol_results: symbolResults,
        sample_trades: allTrades.slice(-20),
        execution_time_ms: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Backtest error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
