import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Calculator, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface PositionData {
  id: string;
  stock_id: string;
  calculation_date: string;
  kelly_fraction: number;
  half_kelly_size: number;
  max_position_pct: number;
  var_1d: number;
  liquidity_score: number;
  execution_feasibility: string;
  stock?: {
    symbol: string;
    name: string;
  };
}

export function QuantRiskPanel() {
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('quant_positions')
        .select(`
          *,
          stock:remora_stocks(symbol, name)
        `)
        .order('calculation_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Get unique stocks with latest position
      const uniquePositions = new Map<string, PositionData>();
      (data || []).forEach(p => {
        if (!uniquePositions.has(p.stock_id)) {
          uniquePositions.set(p.stock_id, p as PositionData);
        }
      });
      
      setPositions(Array.from(uniquePositions.values()));
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFeasibilityBadge = (feasibility: string) => {
    switch (feasibility) {
      case 'good':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Good</Badge>;
      case 'moderate':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Moderate</Badge>;
      case 'poor':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Poor</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk & Position Sizing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
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
          <Shield className="h-5 w-5" />
          Risk & Position Sizing
        </CardTitle>
        <CardDescription>
          Half-Kelly position sizing with execution feasibility checks
        </CardDescription>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No position data available</p>
            <p className="text-sm">Run the signal pipeline to calculate positions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((pos) => (
              <div
                key={pos.id}
                className="p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{pos.stock?.symbol}</span>
                    {getFeasibilityBadge(pos.execution_feasibility)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">1-Day VaR</p>
                    <p className="font-mono">{formatCurrency(pos.var_1d || 0)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Full Kelly</p>
                    <p className="font-mono font-medium">
                      {((pos.kelly_fraction || 0) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Half Kelly (Rec.)</p>
                    <p className="font-mono font-medium text-primary">
                      {((pos.half_kelly_size || 0) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max Position</p>
                    <p className="font-mono font-medium">
                      {((pos.max_position_pct || 0) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Liquidity Score</span>
                    <span>{((pos.liquidity_score || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(pos.liquidity_score || 0) * 100} className="h-2" />
                </div>
              </div>
            ))}
            
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-primary">Risk Controls Active</p>
                  <p>Position sizes are capped at 25% of capital. Positions with poor execution feasibility are flagged but not blocked. Always verify liquidity before trading.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
