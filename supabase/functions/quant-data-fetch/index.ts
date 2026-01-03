import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YahooQuote {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Validate OHLCV data quality
function validateOHLCV(data: YahooQuote[]): DataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // Hard checks
    if (row.volume === 0) {
      warnings.push(`Zero volume on ${row.date}`);
    }
    
    if (row.high < row.low) {
      errors.push(`High < Low on ${row.date}`);
    }
    
    if (row.open < row.low || row.open > row.high) {
      errors.push(`Open outside H/L range on ${row.date}`);
    }
    
    if (row.close < row.low || row.close > row.high) {
      errors.push(`Close outside H/L range on ${row.date}`);
    }
    
    // Check for extreme price jumps (> 50% in a day)
    if (i > 0) {
      const prevClose = data[i - 1].adjClose;
      const change = Math.abs((row.adjClose - prevClose) / prevClose);
      if (change > 0.5) {
        warnings.push(`Extreme price change (${(change * 100).toFixed(1)}%) on ${row.date}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Fetch data from Yahoo Finance
async function fetchYahooData(symbol: string, startDate: Date, endDate: Date): Promise<YahooQuote[]> {
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000);
  
  // For IDX stocks, append .JK suffix
  const yahooSymbol = symbol.endsWith('.JK') ? symbol : `${symbol}.JK`;
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${period2}&interval=1d&events=div%7Csplit`;
  
  console.log(`Fetching Yahoo data for ${yahooSymbol}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.chart?.result?.[0]) {
    throw new Error(`No data returned for ${symbol}`);
  }
  
  const result = data.chart.result[0];
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const adjClose = result.indicators?.adjclose?.[0]?.adjclose || quote.close;
  
  const quotes: YahooQuote[] = [];
  
  for (let i = 0; i < timestamps.length; i++) {
    if (quote.open[i] !== null && quote.close[i] !== null) {
      quotes.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        adjClose: adjClose?.[i] || quote.close[i],
        volume: quote.volume[i] || 0
      });
    }
  }
  
  return quotes;
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
    
    const { symbols, days = 365 } = await req.json();
    
    // Get symbols to fetch - either provided or all active stocks
    let stocksToFetch: { id: string; symbol: string }[] = [];
    
    if (symbols && symbols.length > 0) {
      const { data: stocks } = await supabase
        .from('remora_stocks')
        .select('id, symbol')
        .in('symbol', symbols)
        .eq('is_active', true);
      stocksToFetch = stocks || [];
    } else {
      const { data: stocks } = await supabase
        .from('remora_stocks')
        .select('id, symbol')
        .eq('is_active', true);
      stocksToFetch = stocks || [];
    }
    
    if (stocksToFetch.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No stocks to fetch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const results: { symbol: string; success: boolean; records?: number; error?: string }[] = [];
    let totalRecords = 0;
    
    for (const stock of stocksToFetch) {
      try {
        console.log(`Processing ${stock.symbol}...`);
        
        // Fetch from Yahoo Finance
        const quotes = await fetchYahooData(stock.symbol, startDate, endDate);
        
        if (quotes.length === 0) {
          results.push({ symbol: stock.symbol, success: false, error: 'No data returned' });
          continue;
        }
        
        // Validate data
        const validation = validateOHLCV(quotes);
        
        if (!validation.isValid) {
          // Log data quality issues
          for (const error of validation.errors) {
            await supabase.from('quant_data_quality').insert({
              stock_id: stock.id,
              check_date: new Date().toISOString().split('T')[0],
              check_type: 'validation_error',
              severity: 'error',
              details: { message: error }
            });
          }
          
          results.push({ 
            symbol: stock.symbol, 
            success: false, 
            error: `Validation failed: ${validation.errors.join(', ')}` 
          });
          continue;
        }
        
        // Log warnings
        for (const warning of validation.warnings) {
          await supabase.from('quant_data_quality').insert({
            stock_id: stock.id,
            check_date: new Date().toISOString().split('T')[0],
            check_type: 'validation_warning',
            severity: 'warning',
            details: { message: warning }
          });
        }
        
        // Upsert OHLCV data
        const ohlcvRecords = quotes.map(q => ({
          stock_id: stock.id,
          date: q.date,
          open_price: q.open,
          high_price: q.high,
          low_price: q.low,
          close_price: q.adjClose, // Use adjusted close
          volume: q.volume,
          data_source: 'yahoo_finance',
          is_valid: true
        }));
        
        const { error: upsertError } = await supabase
          .from('remora_ohlcv_daily')
          .upsert(ohlcvRecords, { onConflict: 'stock_id,date' });
        
        if (upsertError) {
          throw upsertError;
        }
        
        totalRecords += quotes.length;
        results.push({ symbol: stock.symbol, success: true, records: quotes.length });
        
        // Rate limit - wait 500ms between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error fetching ${stock.symbol}:`, error);
        results.push({ 
          symbol: stock.symbol, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    // Update data freshness
    await supabase.from('remora_data_freshness').upsert({
      dataset_type: 'ohlcv_yahoo',
      last_update: new Date().toISOString(),
      record_count: totalRecords,
      source_name: 'Yahoo Finance',
      expected_update_frequency: 'daily',
      is_stale: false
    }, { onConflict: 'dataset_type' });
    
    // Update system health
    const successCount = results.filter(r => r.success).length;
    await supabase.from('remora_system_health').upsert({
      module_name: 'quant_data_fetch',
      status: successCount === results.length ? 'healthy' : 'degraded',
      last_run_at: new Date().toISOString(),
      last_success_at: successCount > 0 ? new Date().toISOString() : null,
      execution_time_ms: Date.now() - startTime,
      metadata: { 
        total_symbols: results.length,
        success_count: successCount,
        total_records: totalRecords
      }
    }, { onConflict: 'module_name' });
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: results.length - successCount,
          totalRecords
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Data fetch error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
