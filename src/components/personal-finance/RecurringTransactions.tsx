import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/personalFinanceUtils';
import { 
  RefreshCw, 
  Calendar, 
  Loader2,
  AlertCircle,
  Clock
} from 'lucide-react';

interface RecurringPattern {
  merchant: string;
  description: string;
  average_amount: number;
  frequency: string;
  last_date: string;
  occurrence_count: number;
  next_expected_date: string;
  category: string;
  total_spent: number;
}

export function RecurringTransactions() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const detectRecurring = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-recurring');

      if (error) throw error;

      if (data.message) {
        toast({
          title: 'Not enough data',
          description: data.message,
        });
        setPatterns([]);
        return;
      }

      setPatterns(data.recurring || []);
      setHasLoaded(true);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error detecting recurring:', error);
      }
      toast({
        title: 'Error',
        description: 'Failed to detect recurring transactions.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    detectRecurring();
  }, []);

  const getFrequencyBadge = (frequency: string) => {
    const colors: Record<string, string> = {
      daily: 'bg-red-100 text-red-800',
      weekly: 'bg-orange-100 text-orange-800',
      'bi-weekly': 'bg-yellow-100 text-yellow-800',
      monthly: 'bg-blue-100 text-blue-800',
      quarterly: 'bg-purple-100 text-purple-800',
      yearly: 'bg-green-100 text-green-800',
      irregular: 'bg-gray-100 text-gray-800',
    };
    return colors[frequency] || colors.irregular;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const isUpcoming = (nextDate: string) => {
    const next = new Date(nextDate);
    const now = new Date();
    const diffDays = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  // Calculate total monthly recurring expense
  const monthlyTotal = patterns.reduce((sum, p) => {
    let monthly = p.average_amount;
    switch (p.frequency) {
      case 'daily': monthly = p.average_amount * 30; break;
      case 'weekly': monthly = p.average_amount * 4; break;
      case 'bi-weekly': monthly = p.average_amount * 2; break;
      case 'quarterly': monthly = p.average_amount / 3; break;
      case 'yearly': monthly = p.average_amount / 12; break;
    }
    return sum + monthly;
  }, 0);

  if (loading && !hasLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (patterns.length === 0 && hasLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Recurring Transactions
          </CardTitle>
          <CardDescription>
            Automatically detected subscriptions and regular payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center mb-4">
            No recurring patterns detected yet. Add more transactions to see patterns emerge.
          </p>
          <Button variant="outline" onClick={detectRecurring} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Recurring Transactions
              </CardTitle>
              <CardDescription>
                Detected {patterns.length} recurring payment patterns
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={detectRecurring} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <div className="text-sm text-muted-foreground">Estimated Monthly Recurring</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(monthlyTotal)}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {patterns.map((pattern, index) => (
          <Card key={index} className={isUpcoming(pattern.next_expected_date) ? 'border-yellow-500/50' : ''}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{pattern.merchant}</span>
                    <Badge className={getFrequencyBadge(pattern.frequency)} variant="secondary">
                      {pattern.frequency}
                    </Badge>
                    {isUpcoming(pattern.next_expected_date) && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Due soon
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {pattern.category}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {pattern.occurrence_count} times
                    </span>
                    <span>
                      Last: {formatDate(pattern.last_date)}
                    </span>
                    <span>
                      Next: {formatDate(pattern.next_expected_date)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-red-600">
                    {formatCurrency(pattern.average_amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total: {formatCurrency(pattern.total_spent)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}