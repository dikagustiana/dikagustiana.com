import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string | null;
  market_cap: number | null;
  last_updated: string;
  is_active: boolean;
  latestPrice?: number;
  priceChange?: number;
}

export function RemoraStocksList() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const { data: stocksData, error } = await supabase
        .from('remora_stocks')
        .select('*')
        .eq('is_active', true)
        .order('symbol');

      if (error) throw error;

      // Fetch latest prices
      const stockIds = stocksData?.map(s => s.id) || [];
      if (stockIds.length > 0) {
        const { data: latestPrices } = await supabase
          .from('remora_ohlcv_daily')
          .select('stock_id, close_price, date')
          .in('stock_id', stockIds)
          .order('date', { ascending: false });

        // Get unique latest price per stock
        const priceMap = new Map<string, { price: number; prevPrice?: number }>();
        latestPrices?.forEach(p => {
          const existing = priceMap.get(p.stock_id);
          if (!existing) {
            priceMap.set(p.stock_id, { price: Number(p.close_price) });
          } else if (!existing.prevPrice) {
            priceMap.set(p.stock_id, { ...existing, prevPrice: Number(p.close_price) });
          }
        });

        const enrichedStocks = stocksData?.map(s => ({
          ...s,
          latestPrice: priceMap.get(s.id)?.price,
          priceChange: priceMap.get(s.id)?.price && priceMap.get(s.id)?.prevPrice
            ? ((priceMap.get(s.id)!.price - priceMap.get(s.id)!.prevPrice!) / priceMap.get(s.id)!.prevPrice!) * 100
            : undefined
        }));

        setStocks(enrichedStocks || []);
      } else {
        setStocks([]);
      }
    } catch (err) {
      console.error('Failed to fetch stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const filteredStocks = stocks.filter(s => 
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.sector && s.sector.toLowerCase().includes(search.toLowerCase()))
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatMarketCap = (value: number | null) => {
    if (!value) return '-';
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Stocks ({stocks.length})</CardTitle>
          <Button onClick={fetchStocks} variant="ghost" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredStocks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {stocks.length === 0 ? (
              <p>No stocks in database. Upload stock data to get started.</p>
            ) : (
              <p>No stocks match your search.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Market Cap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStocks.map((stock) => (
                  <TableRow key={stock.id}>
                    <TableCell className="font-medium">{stock.symbol}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{stock.name}</TableCell>
                    <TableCell>
                      {stock.sector ? (
                        <Badge variant="secondary" className="text-xs">
                          {stock.sector}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {stock.latestPrice ? formatCurrency(stock.latestPrice) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {stock.priceChange !== undefined ? (
                        <span className={`flex items-center justify-end gap-1 ${
                          stock.priceChange > 0 ? 'text-green-600' : 
                          stock.priceChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {stock.priceChange > 0 ? <TrendingUp className="h-3 w-3" /> : 
                           stock.priceChange < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                          {stock.priceChange > 0 ? '+' : ''}{stock.priceChange.toFixed(2)}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMarketCap(stock.market_cap)}
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
