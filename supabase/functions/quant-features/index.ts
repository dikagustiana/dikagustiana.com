import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OHLCVRow {
  date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
}

// Calculate log returns
function calculateLogReturns(prices: number[]): number[] {
  const returns: number[] = [0]; // First return is 0
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    } else {
      returns.push(0);
    }
  }
  return returns;
}

// Calculate rolling standard deviation (volatility)
function calculateRollingVol(returns: number[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < returns.length; i++) {
    if (i < window - 1) {
      result.push(null);
      continue;
    }
    
    const slice = returns.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / window;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window;
    result.push(Math.sqrt(variance) * Math.sqrt(252)); // Annualized
  }
  
  return result;
}

// Calculate Z-score
function calculateZScore(values: number[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(null);
      continue;
    }
    
    const slice = values.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / window;
    const std = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window);
    
    if (std === 0) {
      result.push(0);
    } else {
      result.push((values[i] - mean) / std);
    }
  }
  
  return result;
}

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  // First value is null
  result.push(null);
  
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(null);
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

// Calculate SMA
function calculateSMA(values: number[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(null);
      continue;
    }
    
    const slice = values.slice(i - window + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / window);
  }
  
  return result;
}

// Calculate SMA crossover signal
function calculateSMACrossSignal(prices: number[], shortWindow: number = 10, longWindow: number = 20): (number | null)[] {
  const shortSMA = calculateSMA(prices, shortWindow);
  const longSMA = calculateSMA(prices, longWindow);
  const result: (number | null)[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (shortSMA[i] === null || longSMA[i] === null) {
      result.push(null);
      continue;
    }
    
    // 1 if short > long (bullish), -1 if short < long (bearish)
    result.push(shortSMA[i]! > longSMA[i]! ? 1 : -1);
  }
  
  return result;
}

// Calculate momentum
function calculateMomentum(prices: number[], period: number = 10): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(null);
      continue;
    }
    
    result.push((prices[i] - prices[i - period]) / prices[i - period]);
  }
  
  return result;
}

// Generate mean reversion signal
function calculateMeanReversionSignal(priceZScores: (number | null)[]): (number | null)[] {
  return priceZScores.map(z => {
    if (z === null) return null;
    // Strong signal when price is 2+ std devs from mean
    if (z < -2) return 1;  // Buy signal
    if (z > 2) return -1;  // Sell signal
    if (z < -1) return 0.5;
    if (z > 1) return -0.5;
    return 0;
  });
}

// Generate trend signal
function calculateTrendSignal(momentum: (number | null)[], smaSignal: (number | null)[]): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < momentum.length; i++) {
    if (momentum[i] === null || smaSignal[i] === null) {
      result.push(null);
      continue;
    }
    
    // Combine momentum and SMA signal
    const momScore = momentum[i]! > 0.05 ? 1 : momentum[i]! < -0.05 ? -1 : 0;
    const combined = (momScore + smaSignal[i]!) / 2;
    result.push(combined);
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Admin-only authentication check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  try {
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const userId = claimsData.claims.sub;
    const adminCheck = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: roleRow } = await adminCheck
      .from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (_e) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { stock_ids } = await req.json().catch(() => ({}));
    
    // Get stocks to process
    let stocksQuery = supabase
      .from('remora_stocks')
      .select('id, symbol')
      .eq('is_active', true);
    
    if (stock_ids && stock_ids.length > 0) {
      stocksQuery = stocksQuery.in('id', stock_ids);
    }
    
    const { data: stocks, error: stocksError } = await stocksQuery;
    
    if (stocksError) throw stocksError;
    if (!stocks || stocks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No stocks to process' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let totalFeatures = 0;
    const results: { symbol: string; success: boolean; features?: number; error?: string }[] = [];
    
    for (const stock of stocks) {
      try {
        // Fetch OHLCV data
        const { data: ohlcv, error: ohlcvError } = await supabase
          .from('remora_ohlcv_daily')
          .select('date, open_price, high_price, low_price, close_price, volume')
          .eq('stock_id', stock.id)
          .eq('is_valid', true)
          .order('date', { ascending: true })
          .limit(500);
        
        if (ohlcvError) throw ohlcvError;
        if (!ohlcv || ohlcv.length < 30) {
          results.push({ symbol: stock.symbol, success: false, error: 'Insufficient data' });
          continue;
        }
        
        const prices = ohlcv.map(r => r.close_price);
        const volumes = ohlcv.map(r => r.volume);
        const dates = ohlcv.map(r => r.date);
        
        // Calculate all features
        const logReturns = calculateLogReturns(prices);
        const vol5d = calculateRollingVol(logReturns, 5);
        const vol20d = calculateRollingVol(logReturns, 20);
        const volumeZScore = calculateZScore(volumes, 20);
        const priceZScore = calculateZScore(prices, 20);
        const rsi = calculateRSI(prices, 14);
        const smaCross = calculateSMACrossSignal(prices, 10, 20);
        const momentum = calculateMomentum(prices, 10);
        const meanRevSignal = calculateMeanReversionSignal(priceZScore);
        const trendSignal = calculateTrendSignal(momentum, smaCross);
        
        // Build feature records (only for dates with complete features)
        const featureRecords = [];
        
        for (let i = 20; i < dates.length; i++) {
          featureRecords.push({
            stock_id: stock.id,
            feature_date: dates[i],
            log_return: logReturns[i],
            rolling_vol_5d: vol5d[i],
            rolling_vol_20d: vol20d[i],
            volume_zscore: volumeZScore[i],
            price_zscore_20d: priceZScore[i],
            rsi_14: rsi[i],
            sma_cross_signal: smaCross[i],
            momentum_10d: momentum[i],
            mean_reversion_signal: meanRevSignal[i],
            trend_signal: trendSignal[i]
          });
        }
        
        if (featureRecords.length > 0) {
          const { error: upsertError } = await supabase
            .from('quant_features')
            .upsert(featureRecords, { onConflict: 'stock_id,feature_date' });
          
          if (upsertError) throw upsertError;
          
          totalFeatures += featureRecords.length;
          results.push({ symbol: stock.symbol, success: true, features: featureRecords.length });
        }
        
      } catch (error) {
        console.error(`Error processing ${stock.symbol}:`, error);
        results.push({ 
          symbol: stock.symbol, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    // Update system health
    const successCount = results.filter(r => r.success).length;
    await supabase.from('remora_system_health').upsert({
      module_name: 'quant_features',
      status: successCount === results.length ? 'healthy' : successCount > 0 ? 'degraded' : 'error',
      last_run_at: new Date().toISOString(),
      last_success_at: successCount > 0 ? new Date().toISOString() : null,
      execution_time_ms: Date.now() - startTime,
      metadata: { 
        stocks_processed: results.length,
        success_count: successCount,
        total_features: totalFeatures
      }
    }, { onConflict: 'module_name' });
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          totalFeatures
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Feature calculation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
