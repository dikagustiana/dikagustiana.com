import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Play, 
  Loader2, 
  TrendingUp, 
  BarChart3,
  Activity,
  AlertTriangle
} from 'lucide-react';

interface BacktestResult {
  metrics: {
    total_return: number;
    total_trades: number;
    avg_trade_return: number;
    symbols_tested: number;
  };
  symbol_results: Record<string, any>;
  sample_trades: Array<{
    date: string;
    symbol: string;
    direction: string;
    signalType: string;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    return: number;
  }>;
  execution_time_ms: number;
}

export function QuantBacktestPanel() {
  const [symbols, setSymbols] = useState('BBRI, BBCA, BMRI, TLKM');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [startingCapital, setStartingCapital] = useState(100000000);
  const [maxPosition, setMaxPosition] = useState(10);
  const [stopLoss, setStopLoss] = useState(5);
  const [takeProfit, setTakeProfit] = useState(10);
  const [useHalfKelly, setUseHalfKelly] = useState(true);
  
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const runBacktest = async () => {
    setRunning(true);
    setResult(null);
    
    try {
      const symbolList = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      
      const { data, error } = await supabase.functions.invoke('quant-backtest', {
        body: {
          symbols: symbolList,
          start_date: startDate,
          end_date: endDate,
          config: {
            starting_capital: startingCapital,
            max_position_size: maxPosition,
            stop_loss_percent: stopLoss,
            take_profit_percent: takeProfit,
            use_half_kelly: useHalfKelly
          }
        }
      });
      
      if (error) throw error;
      
      setResult(data);
      toast.success(`Backtest completed in ${(data.execution_time_ms / 1000).toFixed(1)}s`);
    } catch (error) {
      console.error('Backtest error:', error);
      toast.error('Backtest failed');
    } finally {
      setRunning(false);
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
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Walk-Forward Backtest
        </CardTitle>
        <CardDescription>
          Test strategies with proper out-of-sample validation. No look-ahead bias.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="results" disabled={!result}>Results</TabsTrigger>
            <TabsTrigger value="trades" disabled={!result}>Trade Log</TabsTrigger>
          </TabsList>
          
          <TabsContent value="config" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Symbols (comma-separated)</Label>
                <Input
                  value={symbols}
                  onChange={(e) => setSymbols(e.target.value)}
                  placeholder="BBRI, BBCA, BMRI"
                />
              </div>
              <div className="space-y-2">
                <Label>Starting Capital (IDR)</Label>
                <Input
                  type="number"
                  value={startingCapital}
                  onChange={(e) => setStartingCapital(parseInt(e.target.value) || 100000000)}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Position Size (%)</Label>
                <Input
                  type="number"
                  value={maxPosition}
                  onChange={(e) => setMaxPosition(parseInt(e.target.value) || 10)}
                  min={1}
                  max={50}
                />
              </div>
              <div className="space-y-2">
                <Label>Stop Loss (%)</Label>
                <Input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseInt(e.target.value) || 5)}
                  min={1}
                  max={20}
                />
              </div>
              <div className="space-y-2">
                <Label>Take Profit (%)</Label>
                <Input
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(parseInt(e.target.value) || 10)}
                  min={1}
                  max={50}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <Label>Use Half-Kelly Sizing</Label>
                  <p className="text-xs text-muted-foreground">Conservative position sizing</p>
                </div>
                <Switch
                  checked={useHalfKelly}
                  onCheckedChange={setUseHalfKelly}
                />
              </div>
            </div>
            
            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-xs text-yellow-700">
                  <p className="font-medium">Walk-Forward Methodology</p>
                  <p>Uses 252-day training window, rolling forward daily. Transaction costs (15 bps) and slippage (10 bps) applied. No in-sample optimization.</p>
                </div>
              </div>
            </div>
            
            <Button onClick={runBacktest} disabled={running} className="w-full">
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Backtest...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Backtest
                </>
              )}
            </Button>
          </TabsContent>
          
          <TabsContent value="results">
            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Total Return</p>
                    <p className={`text-2xl font-bold ${result.metrics.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.metrics.total_return >= 0 ? '+' : ''}{result.metrics.total_return.toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Total Trades</p>
                    <p className="text-2xl font-bold">{result.metrics.total_trades}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Avg Trade Return</p>
                    <p className={`text-2xl font-bold ${result.metrics.avg_trade_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.metrics.avg_trade_return >= 0 ? '+' : ''}{result.metrics.avg_trade_return.toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Symbols Tested</p>
                    <p className="text-2xl font-bold">{result.metrics.symbols_tested}</p>
                  </div>
                </div>
                
                {/* Per-symbol results */}
                <div>
                  <h4 className="font-medium mb-2">Results by Symbol</h4>
                  <div className="space-y-2">
                    {Object.entries(result.symbol_results).map(([symbol, metrics]) => (
                      <div key={symbol} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-mono font-bold">{symbol}</span>
                        {typeof metrics === 'object' && !('error' in metrics) ? (
                          <div className="flex items-center gap-4 text-sm">
                            <span>Sharpe: {(metrics.sharpe_ratio || 0).toFixed(2)}</span>
                            <span>Win Rate: {(metrics.win_rate || 0).toFixed(1)}%</span>
                            <span>Trades: {metrics.total_trades || 0}</span>
                          </div>
                        ) : (
                          <Badge variant="destructive">
                            {typeof metrics === 'object' && 'error' in metrics ? metrics.error : 'Error'}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trades">
            {result && result.sample_trades && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                  Showing last {result.sample_trades.length} trades
                </p>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {result.sample_trades.map((trade, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg border ${trade.pnl >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold">{trade.symbol}</span>
                          <Badge variant={trade.direction === 'long' ? 'default' : 'destructive'}>
                            {trade.direction.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{trade.signalType}</Badge>
                        </div>
                        <span className={`font-bold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
                        <span>Date: {trade.date}</span>
                        <span>Entry: {formatCurrency(trade.entryPrice)}</span>
                        <span>Exit: {formatCurrency(trade.exitPrice)}</span>
                        <span>Return: {(trade.return * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
