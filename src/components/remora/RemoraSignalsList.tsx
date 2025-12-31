import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Signal {
  id: string;
  stock_id: string;
  signal_date: string;
  signal_type: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  confidence: 'high' | 'medium' | 'low';
  price_at_signal: number;
  target_price: number | null;
  stop_loss: number | null;
  reasoning: any;
  input_data_timestamp: string;
  is_stale: boolean;
  stock?: {
    symbol: string;
    name: string;
  };
}

export function RemoraSignalsList() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('remora_signals')
        .select(`
          *,
          stock:remora_stocks(symbol, name)
        `)
        .gte('signal_date', today)
        .order('strength', { ascending: false });

      if (error) throw error;
      setSignals((data as Signal[]) || []);
    } catch (err) {
      toast.error('Failed to fetch signals');
    } finally {
      setLoading(false);
    }
  };

  const generateSignals = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('remora-signals', {
        body: {}
      });
      
      if (error) throw error;
      
      toast.success(`Generated ${data.signalsGenerated} signals`);
      if (data.dataStale) {
        toast.warning('Data is stale - confidence reduced');
      }
      fetchSignals();
    } catch (err) {
      toast.error('Failed to generate signals');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getConfidenceBadge = (confidence: string, isStale: boolean) => {
    if (isStale) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Stale
        </Badge>
      );
    }
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{confidence}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Trading Signals
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={fetchSignals} variant="ghost" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={generateSignals} size="sm" disabled={generating}>
              {generating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Generate Signals
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No signals generated yet.</p>
            <p className="text-sm mt-2">Add stocks and OHLCV data, then generate signals.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Stop Loss</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map((signal) => (
                  <TableRow key={signal.id} className={signal.is_stale ? 'opacity-60' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{signal.stock?.symbol}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {signal.stock?.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDirectionIcon(signal.direction)}
                        <span className="capitalize">{signal.direction}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              signal.direction === 'bullish' ? 'bg-green-500' :
                              signal.direction === 'bearish' ? 'bg-red-500' : 'bg-muted-foreground'
                            }`}
                            style={{ width: `${signal.strength}%` }}
                          />
                        </div>
                        <span className="text-sm">{signal.strength.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getConfidenceBadge(signal.confidence, signal.is_stale)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(signal.price_at_signal)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {signal.target_price ? formatCurrency(signal.target_price) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {signal.stop_loss ? formatCurrency(signal.stop_loss) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
