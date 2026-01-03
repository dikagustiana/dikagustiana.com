import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple 2-state regime detection based on volatility and trend
// This is a simplified implementation - production would use proper HMM
interface RegimeState {
  regimeId: number;
  label: string;
  probability: number;
  volatilityState: 'low' | 'medium' | 'high';
  trendState: 'bullish' | 'bearish' | 'neutral';
}

// Classify volatility into states
function classifyVolatility(vol: number, volHistory: number[]): 'low' | 'medium' | 'high' {
  if (volHistory.length < 10) return 'medium';
  
  const sortedVol = [...volHistory].sort((a, b) => a - b);
  const p33 = sortedVol[Math.floor(volHistory.length * 0.33)];
  const p66 = sortedVol[Math.floor(volHistory.length * 0.66)];
  
  if (vol <= p33) return 'low';
  if (vol >= p66) return 'high';
  return 'medium';
}

// Classify trend state
function classifyTrend(momentum: number, smaSignal: number): 'bullish' | 'bearish' | 'neutral' {
  const combined = momentum + (smaSignal * 0.05);
  
  if (combined > 0.02) return 'bullish';
  if (combined < -0.02) return 'bearish';
  return 'neutral';
}

// Calculate regime probabilities using a simple Bayesian approach
function calculateRegimeProbabilities(
  volatilityState: 'low' | 'medium' | 'high',
  trendState: 'bullish' | 'bearish' | 'neutral',
  rsi: number
): { regimes: RegimeState[]; dominantRegime: number } {
  // Define regime archetypes:
  // 0: Low Vol Trending (good for trend following)
  // 1: High Vol Mean Reverting (good for mean reversion)
  // 2: Neutral/Choppy (reduce exposure)
  
  let p0 = 0.33, p1 = 0.33, p2 = 0.34;
  
  // Adjust based on volatility
  if (volatilityState === 'low') {
    p0 += 0.2;
    p1 -= 0.1;
    p2 -= 0.1;
  } else if (volatilityState === 'high') {
    p0 -= 0.15;
    p1 += 0.25;
    p2 -= 0.1;
  }
  
  // Adjust based on trend
  if (trendState === 'bullish' || trendState === 'bearish') {
    p0 += 0.15;
    p2 -= 0.15;
  } else {
    p0 -= 0.1;
    p2 += 0.1;
  }
  
  // Adjust based on RSI extremes (mean reversion signals)
  if (rsi < 30 || rsi > 70) {
    p1 += 0.1;
    p0 -= 0.05;
    p2 -= 0.05;
  }
  
  // Normalize
  const total = p0 + p1 + p2;
  p0 /= total;
  p1 /= total;
  p2 /= total;
  
  const regimes: RegimeState[] = [
    {
      regimeId: 0,
      label: 'low_vol_trending',
      probability: p0,
      volatilityState,
      trendState
    },
    {
      regimeId: 1,
      label: 'high_vol_mean_reverting',
      probability: p1,
      volatilityState,
      trendState
    },
    {
      regimeId: 2,
      label: 'neutral_choppy',
      probability: p2,
      volatilityState,
      trendState
    }
  ];
  
  // Find dominant regime
  let dominantRegime = 0;
  let maxProb = p0;
  if (p1 > maxProb) { dominantRegime = 1; maxProb = p1; }
  if (p2 > maxProb) { dominantRegime = 2; }
  
  return { regimes, dominantRegime };
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
    
    const results: { symbol: string; success: boolean; regime?: string; error?: string }[] = [];
    
    for (const stock of stocks) {
      try {
        // Get latest features
        const { data: features, error: featuresError } = await supabase
          .from('quant_features')
          .select('*')
          .eq('stock_id', stock.id)
          .order('feature_date', { ascending: false })
          .limit(100);
        
        if (featuresError) throw featuresError;
        if (!features || features.length < 20) {
          results.push({ symbol: stock.symbol, success: false, error: 'Insufficient feature data' });
          continue;
        }
        
        const latest = features[0];
        const volHistory = features
          .filter(f => f.rolling_vol_20d !== null)
          .map(f => f.rolling_vol_20d);
        
        // Classify states
        const volatilityState = classifyVolatility(
          latest.rolling_vol_20d || 0.2,
          volHistory
        );
        
        const trendState = classifyTrend(
          latest.momentum_10d || 0,
          latest.sma_cross_signal || 0
        );
        
        // Calculate regime probabilities
        const { regimes, dominantRegime } = calculateRegimeProbabilities(
          volatilityState,
          trendState,
          latest.rsi_14 || 50
        );
        
        const dominantRegimeData = regimes[dominantRegime];
        
        // Upsert regime record
        const { error: upsertError } = await supabase
          .from('quant_regimes')
          .upsert({
            symbol: stock.symbol,
            regime_date: latest.feature_date,
            regime_id: dominantRegime,
            regime_label: dominantRegimeData.label,
            probability: dominantRegimeData.probability,
            regime_probabilities: regimes.reduce((acc, r) => {
              acc[r.label] = r.probability;
              return acc;
            }, {} as Record<string, number>),
            volatility_state: volatilityState,
            trend_state: trendState
          }, { onConflict: 'symbol,regime_date' });
        
        if (upsertError) throw upsertError;
        
        results.push({ 
          symbol: stock.symbol, 
          success: true, 
          regime: dominantRegimeData.label 
        });
        
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
      module_name: 'quant_regime',
      status: successCount === results.length ? 'healthy' : successCount > 0 ? 'degraded' : 'error',
      last_run_at: new Date().toISOString(),
      last_success_at: successCount > 0 ? new Date().toISOString() : null,
      execution_time_ms: Date.now() - startTime,
      metadata: { 
        stocks_processed: results.length,
        success_count: successCount
      }
    }, { onConflict: 'module_name' });
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          successful: successCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Regime detection error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
