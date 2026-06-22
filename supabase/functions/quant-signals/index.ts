import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignalOutput {
  signalType: string;
  direction: 'long' | 'short' | 'neutral';
  probability: number;
  expectedReturn: number;
  rawScore: number;
}

// Generate mean reversion signal
function generateMeanReversionSignal(
  priceZScore: number,
  rsi: number,
  regimeProbability: number
): SignalOutput {
  let rawScore = 0;
  
  // Price Z-score contribution
  if (priceZScore < -2) rawScore += 1;
  else if (priceZScore < -1.5) rawScore += 0.6;
  else if (priceZScore < -1) rawScore += 0.3;
  else if (priceZScore > 2) rawScore -= 1;
  else if (priceZScore > 1.5) rawScore -= 0.6;
  else if (priceZScore > 1) rawScore -= 0.3;
  
  // RSI contribution
  if (rsi < 30) rawScore += 0.5;
  else if (rsi < 40) rawScore += 0.2;
  else if (rsi > 70) rawScore -= 0.5;
  else if (rsi > 60) rawScore -= 0.2;
  
  // Weight by regime probability (mean reverting regime)
  const weightedScore = rawScore * (0.5 + regimeProbability * 0.5);
  
  // Convert to probability
  const probability = Math.min(0.95, Math.max(0.05, 0.5 + weightedScore * 0.2));
  
  // Determine direction
  let direction: 'long' | 'short' | 'neutral' = 'neutral';
  if (weightedScore > 0.3) direction = 'long';
  else if (weightedScore < -0.3) direction = 'short';
  
  // Expected return (simplified model)
  const expectedReturn = direction === 'neutral' ? 0 : 
    Math.abs(priceZScore) * 0.01 * (direction === 'long' ? 1 : -1);
  
  return {
    signalType: 'mean_reversion',
    direction,
    probability,
    expectedReturn,
    rawScore: weightedScore
  };
}

// Generate trend following signal
function generateTrendSignal(
  momentum: number,
  smaSignal: number,
  vol: number,
  regimeProbability: number
): SignalOutput {
  let rawScore = 0;
  
  // Momentum contribution
  if (momentum > 0.1) rawScore += 1;
  else if (momentum > 0.05) rawScore += 0.5;
  else if (momentum > 0) rawScore += 0.2;
  else if (momentum < -0.1) rawScore -= 1;
  else if (momentum < -0.05) rawScore -= 0.5;
  else if (momentum < 0) rawScore -= 0.2;
  
  // SMA signal contribution
  rawScore += smaSignal * 0.3;
  
  // Penalize high volatility for trend signals
  if (vol > 0.4) rawScore *= 0.7;
  else if (vol > 0.3) rawScore *= 0.85;
  
  // Weight by regime probability (trending regime)
  const weightedScore = rawScore * (0.5 + regimeProbability * 0.5);
  
  const probability = Math.min(0.95, Math.max(0.05, 0.5 + weightedScore * 0.15));
  
  let direction: 'long' | 'short' | 'neutral' = 'neutral';
  if (weightedScore > 0.25) direction = 'long';
  else if (weightedScore < -0.25) direction = 'short';
  
  const expectedReturn = direction === 'neutral' ? 0 :
    momentum * 0.5 * (direction === 'long' ? 1 : 1);
  
  return {
    signalType: 'trend',
    direction,
    probability,
    expectedReturn,
    rawScore: weightedScore
  };
}

// Calculate position sizing using half-Kelly
function calculatePositionSize(
  expectedReturn: number,
  probability: number,
  volatility: number,
  liquidityScore: number
): { kellyFraction: number; halfKelly: number; maxPosition: number } {
  // Kelly formula: f = (bp - q) / b
  // where b = odds, p = probability of winning, q = probability of losing
  
  const winProb = probability;
  const lossProb = 1 - probability;
  const avgWin = Math.abs(expectedReturn);
  const avgLoss = volatility * 0.5; // Assume stop-loss at 0.5 * vol
  
  let kellyFraction = 0;
  if (avgLoss > 0) {
    const b = avgWin / avgLoss;
    kellyFraction = (b * winProb - lossProb) / b;
    kellyFraction = Math.max(0, Math.min(0.25, kellyFraction)); // Cap at 25%
  }
  
  const halfKelly = kellyFraction * 0.5;
  
  // Apply liquidity constraint
  const maxPosition = Math.min(halfKelly, liquidityScore * 0.1);
  
  return { kellyFraction, halfKelly, maxPosition };
}

// Assess execution feasibility
function assessExecutionFeasibility(
  volume: number,
  avgVolume: number,
  volatility: number
): { score: number; feasibility: 'good' | 'moderate' | 'poor' } {
  let score = 1;
  
  // Volume check
  const volumeRatio = volume / (avgVolume || 1);
  if (volumeRatio < 0.5) score *= 0.5;
  else if (volumeRatio < 0.8) score *= 0.8;
  
  // Volatility impact on slippage
  if (volatility > 0.5) score *= 0.6;
  else if (volatility > 0.3) score *= 0.8;
  
  let feasibility: 'good' | 'moderate' | 'poor' = 'good';
  if (score < 0.5) feasibility = 'poor';
  else if (score < 0.75) feasibility = 'moderate';
  
  return { score, feasibility };
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
    
    const { symbols } = await req.json().catch(() => ({}));
    
    // Get stocks to process
    let stocksQuery = supabase
      .from('remora_stocks')
      .select('id, symbol')
      .eq('is_active', true);
    
    if (symbols && symbols.length > 0) {
      stocksQuery = stocksQuery.in('symbol', symbols);
    }
    
    const { data: stocks, error: stocksError } = await stocksQuery;
    
    if (stocksError) throw stocksError;
    if (!stocks || stocks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No stocks to process' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const results: { symbol: string; success: boolean; signals?: number; error?: string }[] = [];
    let totalSignals = 0;
    
    for (const stock of stocks) {
      try {
        // Get latest features
        const { data: features } = await supabase
          .from('quant_features')
          .select('*')
          .eq('stock_id', stock.id)
          .order('feature_date', { ascending: false })
          .limit(20);
        
        if (!features || features.length < 1) {
          results.push({ symbol: stock.symbol, success: false, error: 'No feature data' });
          continue;
        }
        
        const latest = features[0];
        
        // Get latest regime
        const { data: regimes } = await supabase
          .from('quant_regimes')
          .select('*')
          .eq('symbol', stock.symbol)
          .order('regime_date', { ascending: false })
          .limit(1);
        
        const regime = regimes?.[0];
        const regimeProbs = regime?.regime_probabilities || {
          low_vol_trending: 0.33,
          high_vol_mean_reverting: 0.33,
          neutral_choppy: 0.34
        };
        
        // Get volume data for liquidity assessment
        const { data: ohlcv } = await supabase
          .from('remora_ohlcv_daily')
          .select('volume, close_price')
          .eq('stock_id', stock.id)
          .order('date', { ascending: false })
          .limit(20);
        
        const latestVolume = ohlcv?.[0]?.volume || 0;
        const avgVolume = ohlcv ? ohlcv.reduce((a, b) => a + b.volume, 0) / ohlcv.length : 0;
        const latestPrice = ohlcv?.[0]?.close_price || 0;
        
        // Generate signals
        const signals: SignalOutput[] = [];
        
        // Mean reversion signal
        const mrSignal = generateMeanReversionSignal(
          latest.price_zscore_20d || 0,
          latest.rsi_14 || 50,
          regimeProbs.high_vol_mean_reverting || 0.33
        );
        if (mrSignal.direction !== 'neutral') {
          signals.push(mrSignal);
        }
        
        // Trend signal
        const trendSignal = generateTrendSignal(
          latest.momentum_10d || 0,
          latest.sma_cross_signal || 0,
          latest.rolling_vol_20d || 0.2,
          regimeProbs.low_vol_trending || 0.33
        );
        if (trendSignal.direction !== 'neutral') {
          signals.push(trendSignal);
        }
        
        // Calculate execution feasibility
        const execution = assessExecutionFeasibility(
          latestVolume,
          avgVolume,
          latest.rolling_vol_20d || 0.2
        );
        
        // Store signals
        const signalRecords = signals.map(sig => ({
          stock_id: stock.id,
          signal_date: latest.feature_date,
          signal_type: sig.signalType,
          direction: sig.direction,
          probability: sig.probability,
          expected_return: sig.expectedReturn,
          expected_vol: latest.rolling_vol_20d,
          regime_context: regimeProbs,
          raw_score: sig.rawScore,
          is_active: execution.feasibility !== 'poor',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));
        
        if (signalRecords.length > 0) {
          const { error: signalError } = await supabase
            .from('quant_signals')
            .upsert(signalRecords, { onConflict: 'stock_id,signal_date,signal_type' });
          
          if (signalError) throw signalError;
        }
        
        // Calculate and store position sizing
        for (const sig of signals) {
          const sizing = calculatePositionSize(
            sig.expectedReturn,
            sig.probability,
            latest.rolling_vol_20d || 0.2,
            execution.score
          );
          
          await supabase.from('quant_positions').upsert({
            stock_id: stock.id,
            calculation_date: latest.feature_date,
            kelly_fraction: sizing.kellyFraction,
            half_kelly_size: sizing.halfKelly,
            max_position_pct: sizing.maxPosition,
            var_1d: latestPrice * (latest.rolling_vol_20d || 0.2) / Math.sqrt(252),
            liquidity_score: execution.score,
            execution_feasibility: execution.feasibility
          }, { onConflict: 'stock_id,calculation_date' });
        }
        
        totalSignals += signalRecords.length;
        results.push({ symbol: stock.symbol, success: true, signals: signalRecords.length });
        
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
      module_name: 'quant_signals',
      status: successCount === results.length ? 'healthy' : successCount > 0 ? 'degraded' : 'error',
      last_run_at: new Date().toISOString(),
      last_success_at: successCount > 0 ? new Date().toISOString() : null,
      execution_time_ms: Date.now() - startTime,
      metadata: { 
        stocks_processed: results.length,
        success_count: successCount,
        total_signals: totalSignals
      }
    }, { onConflict: 'module_name' });
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          totalSignals
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Signal generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
