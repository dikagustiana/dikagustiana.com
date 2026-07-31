import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Clock
} from 'lucide-react';

interface ModuleHealth {
  module_name: string;
  status: string;
  last_run_at: string | null;
  last_success_at: string | null;
  execution_time_ms: number | null;
  error_count: number;
  metadata: any;
}

export function QuantSystemHealth() {
  const [modules, setModules] = useState<ModuleHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const { data, error } = await supabase
        .from('remora_system_health')
        .select('*')
        .order('module_name');
      
      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Degraded</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const formatModuleName = (name: string) => {
    return name
      .replace('quant_', '')
      .replace('remora_', '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const quantModules = modules.filter(m => m.module_name.startsWith('quant_'));
  const otherModules = modules.filter(m => !m.module_name.startsWith('quant_'));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Status of all Quant Engine modules
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHealth}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {quantModules.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Quant Engine</h4>
            <div className="space-y-2">
              {quantModules.map((module) => (
                <div
                  key={module.module_name}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(module.status)}
                    <div>
                      <p className="font-medium">{formatModuleName(module.module_name)}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(module.last_run_at)}</span>
                        {module.execution_time_ms && (
                          <span>• {(module.execution_time_ms / 1000).toFixed(1)}s</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(module.status)}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {otherModules.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Other Modules</h4>
            <div className="space-y-2">
              {otherModules.map((module) => (
                <div
                  key={module.module_name}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(module.status)}
                    <div>
                      <p className="font-medium">{formatModuleName(module.module_name)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(module.last_run_at)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(module.status)}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {modules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No module health data</p>
            <p className="text-sm">Modules will appear after first run</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
