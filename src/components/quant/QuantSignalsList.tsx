import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';

interface Signal {
  id: string;
  stock_id: string;
  signal_date: string;
  signal_type: string;
  direction: string;
  probability: number;
  expected_return: number | null;
  expected_vol: number | null;
  raw_score: number;
  is_active: boolean;
  stock?: {
    symbol: string;
    name: string;
  };
}

export function QuantSignalsList() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchSignals();
  }, []);

  const fetchSignals = async () => {
    try {
      const { data, error } = await supabase
        .from('quant_signals')
        .select(`
          *,
          stock:remora_stocks(symbol, name)
        `)
        .eq('is_active', true)
        .order('signal_date', { ascending: false })
        .order('probability', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setSignals(data || []);
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  };

  const runFullPipeline = async () => {
    setGenerating(true);
    
    try {
      toast.info('Running feature calculation...');
      const { error: featError } = await supabase.functions.invoke('quant-features', {
        body: {}
      });
      if (featError) throw featError;
      
      toast.info('Running regime detection...');
      const { error: regError } = await supabase.functions.invoke('quant-regime', {
        body: {}
      });
      if (regError) throw regError;
      
      toast.info('Generating signals...');
      const { data, error: sigError } = await supabase.functions.invoke('quant-signals', {
        body: {}
      });
      if (sigError) throw sigError;
      
      toast.success(`Generated ${data?.summary?.totalSignals || 0} signals`);
      fetchSignals();
    } catch (error) {
      console.error('Pipeline error:', error);
      toast.error('Pipeline failed');
    } finally {
      setGenerating(false);
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'long':
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case 'short':
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDirectionBadge = (direction: string) => {
    switch (direction) {
      case 'long':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Long</Badge>;
      case 'short':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Short</Badge>;
      default:
        return <Badge variant="outline">Neutral</Badge>;
    }
  };

  const getSignalTypeBadge = (type: string) => {
    switch (type) {
      case 'mean_reversion':
        return <Badge variant="outline" className="text-xs">Mean Rev</Badge>;
      case 'trend':
        return <Badge variant="outline" className="text-xs">Trend</Badge>;
      case 'stat_arb':
        return <Badge variant="outline" className="text-xs">Stat Arb</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.7) return 'text-green-600 font-semibold';
    if (prob >= 0.5) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trading Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
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
              <Zap className="h-5 w-5" />
              Trading Signals
            </CardTitle>
            <CardDescription>
              Probabilistic signals from regime-aware analysis
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchSignals}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={runFullPipeline} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Run Pipeline
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {signals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active signals</p>
            <p className="text-sm">Run the pipeline to generate trading signals</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Probability</TableHead>
                  <TableHead className="text-right">Exp. Return</TableHead>
                  <TableHead className="text-right">Signal Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map((signal) => (
                  <TableRow key={signal.id}>
                    <TableCell className="font-mono font-bold">
                      {signal.stock?.symbol || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDirectionIcon(signal.direction)}
                        {getDirectionBadge(signal.direction)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSignalTypeBadge(signal.signal_type)}
                    </TableCell>
                    <TableCell className={`text-right ${getProbabilityColor(signal.probability)}`}>
                      {(signal.probability * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {signal.expected_return !== null ? (
                        <span className={signal.expected_return >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {signal.expected_return >= 0 ? '+' : ''}{(signal.expected_return * 100).toFixed(2)}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {signal.raw_score.toFixed(3)}
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
