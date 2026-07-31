import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TechnicalIndicators {
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  volumeAvg20: number | null;
  priceChange5d: number | null;
  priceChange20d: number | null;
  volatility20d: number | null;
}

// Calculate Simple Moving Average
function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(0, period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 0; i < period; i++) {
    const change = prices[i] - prices[i + 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate volatility (standard deviation of returns)
function calculateVolatility(prices: number[], period: number = 20): number | null {
  if (prices.length < period + 1) return null;
  
  const returns: number[] = [];
  for (let i = 0; i < period; i++) {
    returns.push((prices[i] - prices[i + 1]) / prices[i + 1]);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

// Generate trading signal based on technical analysis
function generateSignal(
  symbol: string,
  currentPrice: number,
  indicators: TechnicalIndicators,
  dataTimestamp: string
): {
  signalType: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: any;
} {
  let bullishPoints = 0;
  let bearishPoints = 0;
  const reasons: string[] = [];
  let dataQuality = 0;
  const maxDataPoints = 5;

  // Check data availability for confidence
  if (indicators.sma20 !== null) dataQuality++;
  if (indicators.sma50 !== null) dataQuality++;
  if (indicators.rsi14 !== null) dataQuality++;
  if (indicators.volumeAvg20 !== null) dataQuality++;
  if (indicators.priceChange20d !== null) dataQuality++;

  // SMA Analysis
  if (indicators.sma20 !== null && indicators.sma50 !== null) {
    if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
      bullishPoints += 2;
      reasons.push('Price above rising SMAs (bullish trend)');
    } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
      bearishPoints += 2;
      reasons.push('Price below falling SMAs (bearish trend)');
    }
  }

  // RSI Analysis
  if (indicators.rsi14 !== null) {
    if (indicators.rsi14 < 30) {
      bullishPoints += 2;
      reasons.push(`RSI oversold at ${indicators.rsi14.toFixed(1)}`);
    } else if (indicators.rsi14 > 70) {
      bearishPoints += 2;
      reasons.push(`RSI overbought at ${indicators.rsi14.toFixed(1)}`);
    } else if (indicators.rsi14 > 50) {
      bullishPoints += 1;
      reasons.push('RSI above midline');
    } else {
      bearishPoints += 1;
      reasons.push('RSI below midline');
    }
  }

  // Momentum (5-day price change)
  if (indicators.priceChange5d !== null) {
    if (indicators.priceChange5d > 5) {
      bullishPoints += 1;
      reasons.push(`Strong 5-day momentum: +${indicators.priceChange5d.toFixed(1)}%`);
    } else if (indicators.priceChange5d < -5) {
      bearishPoints += 1;
      reasons.push(`Weak 5-day momentum: ${indicators.priceChange5d.toFixed(1)}%`);
    }
  }

  // Calculate overall signal
  const totalPoints = bullishPoints + bearishPoints;
  const netPoints = bullishPoints - bearishPoints;
  
  let direction: 'bullish' | 'bearish' | 'neutral';
  let strength: number;
  
  if (netPoints > 2) {
    direction = 'bullish';
    strength = Math.min(85, 50 + netPoints * 10);
  } else if (netPoints < -2) {
    direction = 'bearish';
    strength = Math.min(85, 50 + Math.abs(netPoints) * 10);
  } else {
    direction = 'neutral';
    strength = 50;
  }

  // Determine confidence based on data quality
  let confidence: 'high' | 'medium' | 'low';
  if (dataQuality >= 4) {
    confidence = 'high';
  } else if (dataQuality >= 2) {
    confidence = 'medium';
  } else {
    confidence = 'low';
    strength = Math.max(30, strength - 20); // Reduce strength for low confidence
  }

  return {
    signalType: 'technical_composite',
    direction,
    strength,
    confidence,
    reasoning: {
      bullishPoints,
      bearishPoints,
      reasons,
      indicators,
      dataQuality: `${dataQuality}/${maxDataPoints}`
    }
  };
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
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { symbols } = await req.json().catch(() => ({}));
    console.log('[Remora Signals] Generating signals for:', symbols || 'all stocks');

    // Check data freshness first
    const { data: freshness } = await supabase
      .from('remora_data_freshness')
      .select('*')
      .eq('dataset_type', 'daily_ohlcv')
      .single();

    const isDataStale = freshness?.is_stale || !freshness?.last_update;
    
    if (isDataStale) {
      console.warn('[Remora Signals] WARNING: Daily OHLCV data is stale');
    }

    // Get stocks to process
    let stockQuery = supabase
      .from('remora_stocks')
      .select('id, symbol, name')
      .eq('is_active', true);

    if (symbols && symbols.length > 0) {
      stockQuery = stockQuery.in('symbol', symbols);
    }

    const { data: stocks, error: stockError } = await stockQuery.limit(100);

    if (stockError) throw stockError;
    if (!stocks || stocks.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No stocks to process',
        signalsGenerated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const signalsGenerated: any[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (const stock of stocks) {
      // Get last 60 days of OHLCV data
      const { data: ohlcv } = await supabase
        .from('remora_ohlcv_daily')
        .select('*')
        .eq('stock_id', stock.id)
        .eq('is_valid', true)
        .order('date', { ascending: false })
        .limit(60);

      if (!ohlcv || ohlcv.length < 5) {
        console.log(`[Remora Signals] Insufficient data for ${stock.symbol}`);
        continue;
      }

      const prices = ohlcv.map(d => Number(d.close_price));
      const volumes = ohlcv.map(d => Number(d.volume));
      const currentPrice = prices[0];
      const dataTimestamp = ohlcv[0].ingested_at;

      // Calculate indicators
      const indicators: TechnicalIndicators = {
        sma20: calculateSMA(prices, 20),
        sma50: calculateSMA(prices, 50),
        rsi14: calculateRSI(prices, 14),
        volumeAvg20: calculateSMA(volumes, 20),
        priceChange5d: prices.length >= 5 ? ((prices[0] - prices[4]) / prices[4]) * 100 : null,
        priceChange20d: prices.length >= 20 ? ((prices[0] - prices[19]) / prices[19]) * 100 : null,
        volatility20d: calculateVolatility(prices, 20)
      };

      // Generate signal
      const signal = generateSignal(stock.symbol, currentPrice, indicators, dataTimestamp);

      // If data is stale, downgrade confidence
      if (isDataStale && signal.confidence === 'high') {
        signal.confidence = 'medium';
        signal.reasoning.dataWarning = 'Signal confidence reduced due to stale data';
      }

      // Calculate target and stop loss
      const volatilityFactor = indicators.volatility20d || 2;
      const targetPrice = signal.direction === 'bullish' 
        ? currentPrice * (1 + volatilityFactor / 100 * 2)
        : signal.direction === 'bearish' 
          ? currentPrice * (1 - volatilityFactor / 100 * 2)
          : currentPrice;
      const stopLoss = signal.direction === 'bullish'
        ? currentPrice * (1 - volatilityFactor / 100)
        : signal.direction === 'bearish'
          ? currentPrice * (1 + volatilityFactor / 100)
          : currentPrice;

      // Upsert signal
      const { error: signalError } = await supabase
        .from('remora_signals')
        .upsert({
          stock_id: stock.id,
          signal_date: today,
          signal_type: signal.signalType,
          direction: signal.direction,
          strength: signal.strength,
          confidence: signal.confidence,
          price_at_signal: currentPrice,
          target_price: targetPrice,
          stop_loss: stopLoss,
          reasoning: signal.reasoning,
          input_data_timestamp: dataTimestamp,
          is_stale: isDataStale
        }, { onConflict: 'stock_id,signal_date,signal_type' });

      if (!signalError) {
        signalsGenerated.push({
          symbol: stock.symbol,
          ...signal,
          price: currentPrice
        });
      }
    }

    const executionTime = Date.now() - startTime;

    // Update system health
    await supabase
      .from('remora_system_health')
      .update({
        status: 'healthy',
        last_run_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        execution_time_ms: executionTime,
        error_count: 0
      })
      .eq('module_name', 'signal_generation');

    console.log(`[Remora Signals] Generated ${signalsGenerated.length} signals in ${executionTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      signalsGenerated: signalsGenerated.length,
      signals: signalsGenerated,
      dataStale: isDataStale,
      executionTimeMs: executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Remora Signals] Error:', error);

    await supabase
      .from('remora_system_health')
      .update({
        status: 'failed',
        last_run_at: new Date().toISOString(),
        last_error: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('module_name', 'signal_generation');

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
