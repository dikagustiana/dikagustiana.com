import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/personalFinanceUtils';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Loader2,
  Target,
  PiggyBank
} from 'lucide-react';

interface Highlight {
  type: 'positive' | 'warning' | 'neutral';
  title: string;
  description: string;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  potential_savings: number | null;
}

interface CategoryInsight {
  category: string;
  observation: string;
  suggestion: string;
}

interface SavingsGoal {
  monthly_target: number;
  rationale: string;
}

interface Insights {
  summary: string;
  highlights: Highlight[];
  recommendations: Recommendation[];
  category_insights: CategoryInsight[];
  monthly_trend_analysis: string;
  savings_goal_suggestion: SavingsGoal | null;
}

interface Statistics {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  savingsRate: number | string;
  netWorth: number;
}

export function SpendingInsights() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('spending-insights');

      if (error) throw error;

      if (data.message) {
        toast({
          title: 'Not enough data',
          description: data.message,
        });
        return;
      }

      setInsights(data.insights);
      setStatistics(data.statistics);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error generating insights:', error);
      }
      toast({
        title: 'Error',
        description: 'Failed to generate insights. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case 'positive': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Spending Insights
          </CardTitle>
          <CardDescription>
            Get personalized insights and recommendations based on your spending patterns.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center mb-4">
            Analyze your transactions to get AI-powered insights and savings recommendations.
          </p>
          <Button onClick={generateInsights} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Spending Insights
          </CardTitle>
          <CardDescription>{statistics?.period}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg mb-4">{insights.summary}</p>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generateInsights} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total Income</div>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(statistics.totalIncome)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Total Expenses</div>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(statistics.totalExpenses)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Net Cash Flow</div>
              <div className={`text-xl font-bold ${statistics.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(statistics.netCashFlow)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Savings Rate</div>
              <div className="text-xl font-bold text-primary">
                {statistics.savingsRate}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Highlights */}
      {insights.highlights && insights.highlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Highlights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.highlights.map((highlight, index) => (
              <div 
                key={index} 
                className={`flex gap-3 p-3 rounded-lg ${
                  highlight.type === 'positive' ? 'bg-green-50 dark:bg-green-950/20' :
                  highlight.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
                  'bg-blue-50 dark:bg-blue-950/20'
                }`}
              >
                {getHighlightIcon(highlight.type)}
                <div>
                  <div className="font-medium">{highlight.title}</div>
                  <div className="text-sm text-muted-foreground">{highlight.description}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Savings Goal */}
      {insights.savings_goal_suggestion && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Suggested Savings Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-3">
              <PiggyBank className="h-10 w-10 text-primary" />
              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(insights.savings_goal_suggestion.monthly_target)}
                </div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {insights.savings_goal_suggestion.rationale}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Badge variant={getPriorityColor(rec.priority) as any} className="mt-0.5">
                  {rec.priority}
                </Badge>
                <div className="flex-1">
                  <div className="text-sm">{rec.action}</div>
                  {rec.potential_savings && (
                    <div className="text-xs text-green-600 mt-1">
                      Potential savings: {formatCurrency(rec.potential_savings)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Category Insights */}
      {insights.category_insights && insights.category_insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.category_insights.map((cat, index) => (
              <div key={index} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="font-medium">{cat.category}</div>
                <div className="text-sm text-muted-foreground mt-1">{cat.observation}</div>
                <div className="text-sm text-primary mt-1">💡 {cat.suggestion}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend */}
      {insights.monthly_trend_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{insights.monthly_trend_analysis}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}