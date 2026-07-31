import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Database, FileText, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function RemoraDataIngestion() {
  const [loading, setLoading] = useState(false);
  const [stocksJson, setStocksJson] = useState('');
  const [ohlcvJson, setOhlcvJson] = useState('');

  const handleStocksUpload = async () => {
    if (!stocksJson.trim()) {
      toast.error('Please enter stocks data');
      return;
    }

    setLoading(true);
    try {
      const data = JSON.parse(stocksJson);
      const { data: result, error } = await supabase.functions.invoke('remora-ingest', {
        body: {
          type: 'stocks',
          data: Array.isArray(data) ? data : [data],
          source: 'manual_upload'
        }
      });

      if (error) throw error;

      toast.success(`Processed ${result.recordsValid}/${result.recordsProcessed} stocks`);
      if (result.recordsInvalid > 0) {
        toast.warning(`${result.recordsInvalid} records had issues`);
      }
      setStocksJson('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload stocks');
    } finally {
      setLoading(false);
    }
  };

  const handleOHLCVUpload = async () => {
    if (!ohlcvJson.trim()) {
      toast.error('Please enter OHLCV data');
      return;
    }

    setLoading(true);
    try {
      const data = JSON.parse(ohlcvJson);
      const { data: result, error } = await supabase.functions.invoke('remora-ingest', {
        body: {
          type: 'ohlcv',
          data: Array.isArray(data) ? data : [data],
          source: 'manual_upload'
        }
      });

      if (error) throw error;

      toast.success(`Processed ${result.recordsValid}/${result.recordsProcessed} OHLCV records`);
      if (result.recordsInvalid > 0) {
        toast.warning(`${result.recordsInvalid} records had validation issues`);
      }
      setOhlcvJson('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload OHLCV data');
    } finally {
      setLoading(false);
    }
  };

  const sampleStocks = JSON.stringify([
    {
      symbol: "BBCA",
      name: "Bank Central Asia Tbk",
      sector: "Financials",
      subsector: "Banks",
      totalShares: 24655010000,
      freeFloatShares: 10500000000
    },
    {
      symbol: "BBRI",
      name: "Bank Rakyat Indonesia Tbk",
      sector: "Financials",
      subsector: "Banks",
      totalShares: 151570000000,
      freeFloatShares: 56300000000
    }
  ], null, 2);

  const sampleOHLCV = JSON.stringify([
    {
      symbol: "BBCA",
      date: "2024-12-30",
      open: 10150,
      high: 10200,
      low: 10100,
      close: 10175,
      volume: 15234000,
      foreignBuy: 5000000,
      foreignSell: 4500000
    },
    {
      symbol: "BBRI",
      date: "2024-12-30",
      open: 5025,
      high: 5075,
      low: 5000,
      close: 5050,
      volume: 89456000,
      foreignBuy: 20000000,
      foreignSell: 18500000
    }
  ], null, 2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Ingestion
        </CardTitle>
        <CardDescription>
          Upload IDX market data for analysis. Data will be validated before storage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <p className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-yellow-700">
              Only upload verified IDX data. Invalid or stale data will affect signal quality.
            </span>
          </p>
        </div>

        <Tabs defaultValue="stocks">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stocks">Stock Master</TabsTrigger>
            <TabsTrigger value="ohlcv">OHLCV Data</TabsTrigger>
          </TabsList>

          <TabsContent value="stocks" className="space-y-4">
            <div>
              <Label htmlFor="stocks-json">Stocks JSON Data</Label>
              <Textarea
                id="stocks-json"
                placeholder={sampleStocks}
                value={stocksJson}
                onChange={(e) => setStocksJson(e.target.value)}
                className="font-mono text-xs h-48"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required: symbol, name. Optional: sector, subsector, totalShares, freeFloatShares
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setStocksJson(sampleStocks)} 
                variant="outline" 
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Load Sample
              </Button>
              <Button onClick={handleStocksUpload} disabled={loading || !stocksJson.trim()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Stocks
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="ohlcv" className="space-y-4">
            <div>
              <Label htmlFor="ohlcv-json">OHLCV JSON Data</Label>
              <Textarea
                id="ohlcv-json"
                placeholder={sampleOHLCV}
                value={ohlcvJson}
                onChange={(e) => setOhlcvJson(e.target.value)}
                className="font-mono text-xs h-48"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required: symbol, date, open, high, low, close, volume. Optional: foreignBuy, foreignSell
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setOhlcvJson(sampleOHLCV)} 
                variant="outline" 
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Load Sample
              </Button>
              <Button onClick={handleOHLCVUpload} disabled={loading || !ohlcvJson.trim()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload OHLCV
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
