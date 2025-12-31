import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OHLCVData {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value?: number;
  frequency?: number;
  foreignBuy?: number;
  foreignSell?: number;
}

interface StockData {
  symbol: string;
  name: string;
  sector?: string;
  subsector?: string;
  listingDate?: string;
  freeFloatShares?: number;
  totalShares?: number;
  marketCap?: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Validate OHLCV data
function validateOHLCV(data: OHLCVData): ValidationResult {
  const errors: string[] = [];

  // OHLC logical checks
  if (data.high < data.low) {
    errors.push(`High (${data.high}) < Low (${data.low})`);
  }
  if (data.close > data.high || data.close < data.low) {
    errors.push(`Close (${data.close}) outside High/Low range`);
  }
  if (data.open > data.high || data.open < data.low) {
    errors.push(`Open (${data.open}) outside High/Low range`);
  }
  
  // Volume check
  if (data.volume < 0) {
    errors.push(`Negative volume: ${data.volume}`);
  }
  
  // Price non-negative
  if (data.open < 0 || data.high < 0 || data.low < 0 || data.close < 0) {
    errors.push('Negative price detected');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { type, data, source } = await req.json();
    console.log(`[Remora Ingest] Starting ingestion for type: ${type}, source: ${source}`);

    // Create ingestion log
    const { data: logEntry, error: logError } = await supabase
      .from('remora_ingestion_logs')
      .insert({
        dataset_type: type,
        source_name: source || 'manual',
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      console.error('[Remora Ingest] Failed to create log entry:', logError);
    }

    let recordsProcessed = 0;
    let recordsValid = 0;
    let recordsInvalid = 0;

    if (type === 'stocks') {
      // Ingest stock master data
      const stocks = data as StockData[];
      
      for (const stock of stocks) {
        const { error } = await supabase
          .from('remora_stocks')
          .upsert({
            symbol: stock.symbol.toUpperCase(),
            name: stock.name,
            sector: stock.sector,
            subsector: stock.subsector,
            listing_date: stock.listingDate,
            free_float_shares: stock.freeFloatShares,
            total_shares: stock.totalShares,
            market_cap: stock.marketCap,
            data_source: source,
            last_updated: new Date().toISOString()
          }, { onConflict: 'symbol' });

        recordsProcessed++;
        if (error) {
          console.error(`[Remora Ingest] Failed to upsert stock ${stock.symbol}:`, error);
          recordsInvalid++;
        } else {
          recordsValid++;
        }
      }

      // Update data freshness
      await supabase
        .from('remora_data_freshness')
        .update({
          last_update: new Date().toISOString(),
          is_stale: false,
          record_count: recordsValid
        })
        .eq('dataset_type', 'stock_master');

    } else if (type === 'ohlcv') {
      // Ingest OHLCV data
      const ohlcvRecords = data as OHLCVData[];
      
      // First, get stock IDs
      const symbols = [...new Set(ohlcvRecords.map(r => r.symbol.toUpperCase()))];
      const { data: stocks } = await supabase
        .from('remora_stocks')
        .select('id, symbol')
        .in('symbol', symbols);

      const stockMap = new Map(stocks?.map(s => [s.symbol, s.id]) || []);

      for (const record of ohlcvRecords) {
        recordsProcessed++;
        const stockId = stockMap.get(record.symbol.toUpperCase());
        
        if (!stockId) {
          console.warn(`[Remora Ingest] Stock not found: ${record.symbol}`);
          recordsInvalid++;
          continue;
        }

        const validation = validateOHLCV(record);
        
        const { error } = await supabase
          .from('remora_ohlcv_daily')
          .upsert({
            stock_id: stockId,
            date: record.date,
            open_price: record.open,
            high_price: record.high,
            low_price: record.low,
            close_price: record.close,
            volume: record.volume,
            value: record.value,
            frequency: record.frequency,
            foreign_buy: record.foreignBuy,
            foreign_sell: record.foreignSell,
            data_source: source,
            is_valid: validation.isValid,
            validation_errors: validation.errors.length > 0 ? validation.errors : null
          }, { onConflict: 'stock_id,date' });

        if (error) {
          console.error(`[Remora Ingest] Failed to upsert OHLCV for ${record.symbol}:`, error);
          recordsInvalid++;
        } else if (validation.isValid) {
          recordsValid++;
        } else {
          recordsInvalid++;
        }
      }

      // Update data freshness
      await supabase
        .from('remora_data_freshness')
        .update({
          last_update: new Date().toISOString(),
          is_stale: false,
          record_count: recordsValid
        })
        .eq('dataset_type', 'daily_ohlcv');

    } else if (type === 'corporate_actions') {
      // Ingest corporate actions
      const actions = data as any[];
      
      const symbols = [...new Set(actions.map(a => a.symbol.toUpperCase()))];
      const { data: stocks } = await supabase
        .from('remora_stocks')
        .select('id, symbol')
        .in('symbol', symbols);

      const stockMap = new Map(stocks?.map(s => [s.symbol, s.id]) || []);

      for (const action of actions) {
        recordsProcessed++;
        const stockId = stockMap.get(action.symbol.toUpperCase());
        
        if (!stockId) {
          recordsInvalid++;
          continue;
        }

        const { error } = await supabase
          .from('remora_corporate_actions')
          .insert({
            stock_id: stockId,
            action_type: action.type,
            ex_date: action.exDate,
            record_date: action.recordDate,
            payment_date: action.paymentDate,
            ratio_old: action.ratioOld,
            ratio_new: action.ratioNew,
            dividend_amount: action.dividendAmount,
            notes: action.notes,
            data_source: source
          });

        if (error) {
          recordsInvalid++;
        } else {
          recordsValid++;
        }
      }

      // Update data freshness
      await supabase
        .from('remora_data_freshness')
        .update({
          last_update: new Date().toISOString(),
          is_stale: false,
          record_count: recordsValid
        })
        .eq('dataset_type', 'corporate_actions');
    }

    const executionTime = Date.now() - startTime;

    // Update ingestion log
    if (logEntry) {
      await supabase
        .from('remora_ingestion_logs')
        .update({
          status: recordsInvalid === recordsProcessed ? 'failed' : recordsInvalid > 0 ? 'partial' : 'success',
          completed_at: new Date().toISOString(),
          records_processed: recordsProcessed,
          records_valid: recordsValid,
          records_invalid: recordsInvalid
        })
        .eq('id', logEntry.id);
    }

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
      .eq('module_name', 'data_ingestion');

    console.log(`[Remora Ingest] Completed: ${recordsValid}/${recordsProcessed} valid records in ${executionTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      recordsProcessed,
      recordsValid,
      recordsInvalid,
      executionTimeMs: executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Remora Ingest] Error:', error);

    // Update system health on failure
    await supabase
      .from('remora_system_health')
      .update({
        status: 'failed',
        last_run_at: new Date().toISOString(),
        last_error: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('module_name', 'data_ingestion');

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
