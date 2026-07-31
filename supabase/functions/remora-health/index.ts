import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('[Remora Health] Running system health check');

    // Get all module health status
    const { data: modules, error: modulesError } = await supabase
      .from('remora_system_health')
      .select('*')
      .order('module_name');

    if (modulesError) throw modulesError;

    // Get data freshness status
    const { data: freshness, error: freshnessError } = await supabase
      .from('remora_data_freshness')
      .select('*')
      .order('dataset_type');

    if (freshnessError) throw freshnessError;

    // Check and update staleness for each dataset
    const now = new Date();
    const freshnessUpdates: any[] = [];

    for (const dataset of freshness || []) {
      if (dataset.last_update) {
        const lastUpdate = new Date(dataset.last_update);
        const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
        const isStale = minutesSinceUpdate > dataset.staleness_threshold_minutes;

        if (isStale !== dataset.is_stale) {
          freshnessUpdates.push({
            id: dataset.id,
            is_stale: isStale,
            updated_at: now.toISOString()
          });
        }
      }
    }

    // Update stale flags
    for (const update of freshnessUpdates) {
      await supabase
        .from('remora_data_freshness')
        .update({ is_stale: update.is_stale, updated_at: update.updated_at })
        .eq('id', update.id);
    }

    // Get recent ingestion logs
    const { data: recentLogs } = await supabase
      .from('remora_ingestion_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    // Calculate overall system status
    const failedModules = modules?.filter(m => m.status === 'failed') || [];
    const staleDatasets = freshness?.filter(f => f.is_stale) || [];

    let overallStatus: 'healthy' | 'degraded' | 'critical';
    if (failedModules.length > 0) {
      overallStatus = 'critical';
    } else if (staleDatasets.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    // Get data statistics
    const { count: stockCount } = await supabase
      .from('remora_stocks')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: signalCount } = await supabase
      .from('remora_signals')
      .select('*', { count: 'exact', head: true })
      .eq('signal_date', new Date().toISOString().split('T')[0]);

    const { data: latestOHLCV } = await supabase
      .from('remora_ohlcv_daily')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const healthReport = {
      timestamp: now.toISOString(),
      overallStatus,
      modules: modules?.map(m => ({
        name: m.module_name,
        status: m.status,
        lastRun: m.last_run_at,
        lastSuccess: m.last_success_at,
        executionTimeMs: m.execution_time_ms,
        errorCount: m.error_count,
        lastError: m.last_error
      })),
      dataFreshness: freshness?.map(f => ({
        dataset: f.dataset_type,
        lastUpdate: f.last_update,
        isStale: f.is_stale,
        stalesnessThresholdMinutes: f.staleness_threshold_minutes,
        source: f.source_name,
        recordCount: f.record_count
      })),
      statistics: {
        activeStocks: stockCount,
        todaysSignals: signalCount,
        latestOHLCVDate: latestOHLCV?.date
      },
      recentIngestions: recentLogs?.map(l => ({
        type: l.dataset_type,
        status: l.status,
        startedAt: l.started_at,
        completedAt: l.completed_at,
        recordsProcessed: l.records_processed,
        recordsValid: l.records_valid,
        error: l.error_message
      })),
      warnings: [
        ...staleDatasets.map(d => `Stale data: ${d.dataset_type} (last update: ${d.last_update})`),
        ...failedModules.map(m => `Failed module: ${m.module_name} - ${m.last_error}`)
      ]
    };

    console.log(`[Remora Health] Status: ${overallStatus}, Warnings: ${healthReport.warnings.length}`);

    return new Response(JSON.stringify(healthReport), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Remora Health] Error:', error);

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      overallStatus: 'critical',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
