import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2 
} from 'lucide-react';

interface FetchResult {
  symbol: string;
  success: boolean;
  records?: number;
  error?: string;
}

export function QuantDataEngine() {
  const [symbols, setSymbols] = useState('BBRI, BBCA, BMRI, TLKM, ASII');
  const [days, setDays] = useState(365);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FetchResult[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      const symbolList = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      
      const { data, error } = await supabase.functions.invoke('quant-data-fetch', {
        body: { symbols: symbolList, days }
      });
      
      if (error) throw error;
      
      setResults(data.results || []);
      
      const successCount = data.summary?.successful || 0;
      const totalRecords = data.summary?.totalRecords || 0;
      
      if (successCount === data.summary?.total) {
        toast.success(`Fetched ${totalRecords} records for ${successCount} symbols`);
      } else {
        toast.warning(`Partial success: ${successCount}/${data.summary?.total} symbols`);
      }
    } catch (error) {
      console.error('Data fetch error:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Data Engine
        </CardTitle>
        <CardDescription>
          Fetch OHLCV data from Yahoo Finance with automatic validation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Symbols (comma-separated)</label>
            <Input
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              placeholder="BBRI, BBCA, BMRI"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Historical Days</label>
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 365)}
              min={30}
              max={1000}
            />
          </div>
        </div>
        
        <Button onClick={fetchData} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching Data...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Fetch Yahoo Finance Data
            </>
          )}
        </Button>
        
        {results.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium text-sm">Fetch Results</h4>
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-mono text-sm">{result.symbol}</span>
                  </div>
                  {result.success ? (
                    <Badge variant="outline">{result.records} records</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      {result.error}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-primary">Data Validation Active</p>
              <p>All fetched data is validated for OHLC integrity, volume anomalies, and price jumps. Invalid data is rejected and logged.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
