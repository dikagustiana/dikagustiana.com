import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ModuleHealth {
  name: string;
  status: string;
  lastRun: string | null;
  lastSuccess: string | null;
  executionTimeMs: number | null;
  errorCount: number;
  lastError: string | null;
}

interface DataFreshness {
  dataset: string;
  lastUpdate: string | null;
  isStale: boolean;
  stalesnessThresholdMinutes: number;
  source: string | null;
  recordCount: number | null;
}

interface HealthReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  modules: ModuleHealth[];
  dataFreshness: DataFreshness[];
  statistics: {
    activeStocks: number;
    todaysSignals: number;
    latestOHLCVDate: string | null;
  };
  warnings: string[];
}

export function RemoraHealthStatus() {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('remora-health');
      if (fnError) throw fnError;
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="default" className="bg-yellow-500">Degraded</Badge>;
      case 'failed':
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'Never';
    const date = new Date(ts);
    return date.toLocaleString('id-ID', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    });
  };

  if (loading && !health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Health Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Health Check Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchHealth} variant="outline" size="sm" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              System Health
              {getStatusBadge(health?.overallStatus || 'unknown')}
            </CardTitle>
            <Button onClick={fetchHealth} variant="ghost" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Last checked: {formatTimestamp(health?.timestamp || null)}
          </p>
          
          {health?.warnings && health.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-sm font-medium text-yellow-600 mb-2">Warnings:</p>
              <ul className="text-sm space-y-1">
                {health.warnings.map((w, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Freshness */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Data Freshness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {health?.dataFreshness?.map((df) => (
              <div key={df.dataset} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {df.isStale ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className="font-medium capitalize">{df.dataset.replace(/_/g, ' ')}</span>
                </div>
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">
                    {formatTimestamp(df.lastUpdate)}
                  </p>
                  {df.recordCount && (
                    <p className="text-xs text-muted-foreground">{df.recordCount.toLocaleString()} records</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Module Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {health?.modules?.map((m) => (
              <div key={m.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {getStatusIcon(m.status)}
                  <span className="font-medium capitalize">{m.name.replace(/_/g, ' ')}</span>
                </div>
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">
                    Last run: {formatTimestamp(m.lastRun)}
                  </p>
                  {m.executionTimeMs && (
                    <p className="text-xs text-muted-foreground">{m.executionTimeMs}ms</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{health?.statistics?.activeStocks || 0}</p>
              <p className="text-xs text-muted-foreground">Active Stocks</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{health?.statistics?.todaysSignals || 0}</p>
              <p className="text-xs text-muted-foreground">Today's Signals</p>
            </div>
            <div>
              <p className="text-sm font-medium">{health?.statistics?.latestOHLCVDate || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Latest Data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
