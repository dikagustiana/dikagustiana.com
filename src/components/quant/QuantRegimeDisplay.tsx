import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Gauge
} from 'lucide-react';

interface RegimeData {
  symbol: string;
  regime_date: string;
  regime_label: string;
  probability: number;
  volatility_state: string;
  trend_state: string;
  regime_probabilities: Record<string, number>;
}

export function QuantRegimeDisplay() {
  const [regimes, setRegimes] = useState<RegimeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegimes();
  }, []);

  const fetchRegimes = async () => {
    try {
      const { data, error } = await supabase
        .from('quant_regimes')
        .select('*')
        .order('regime_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Get unique symbols with latest regime
      const uniqueRegimes = new Map<string, RegimeData>();
      (data || []).forEach(r => {
        if (!uniqueRegimes.has(r.symbol)) {
          uniqueRegimes.set(r.symbol, r as RegimeData);
        }
      });
      
      setRegimes(Array.from(uniqueRegimes.values()));
    } catch (error) {
      console.error('Error fetching regimes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRegimeColor = (label: string) => {
    switch (label) {
      case 'low_vol_trending':
        return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'high_vol_mean_reverting':
        return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
      case 'neutral_choppy':
        return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRegimeIcon = (label: string) => {
    switch (label) {
      case 'low_vol_trending':
        return <TrendingUp className="h-4 w-4" />;
      case 'high_vol_mean_reverting':
        return <Activity className="h-4 w-4" />;
      default:
        return <Gauge className="h-4 w-4" />;
    }
  };

  const formatRegimeLabel = (label: string) => {
    return label.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Activity className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Regimes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
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
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Market Regimes
        </CardTitle>
        <CardDescription>
          Current regime state for each asset based on volatility and trend analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {regimes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No regime data available</p>
            <p className="text-sm">Run the pipeline to detect market regimes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {regimes.map((regime) => (
              <div
                key={regime.symbol}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg">{regime.symbol}</span>
                  <Badge className={getRegimeColor(regime.regime_label)}>
                    {getRegimeIcon(regime.regime_label)}
                    <span className="ml-1">{formatRegimeLabel(regime.regime_label)}</span>
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(regime.trend_state)}
                    <span className="capitalize">{regime.trend_state}</span>
                  </div>
                  <div>
                    Vol: <span className="capitalize">{regime.volatility_state}</span>
                  </div>
                  <div>
                    Prob: {(regime.probability * 100).toFixed(0)}%
                  </div>
                </div>
                
                {/* Probability bars */}
                <div className="mt-3 space-y-1">
                  {regime.regime_probabilities && Object.entries(regime.regime_probabilities).map(([label, prob]) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <span className="w-24 truncate text-muted-foreground">
                        {formatRegimeLabel(label)}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${label === regime.regime_label ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                          style={{ width: `${(prob as number) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">
                        {((prob as number) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
