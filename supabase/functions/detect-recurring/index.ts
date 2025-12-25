import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  merchant: string | null;
  date: string;
  transaction_type: string;
  category_id: string | null;
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Detecting recurring transactions for user:', user.id);

    // Fetch all transactions for the user
    const { data: transactions, error: txnError } = await supabase
      .from('finance_transactions')
      .select('*, finance_categories(name)')
      .eq('user_id', user.id)
      .eq('transaction_type', 'expense')
      .order('date', { ascending: false });

    if (txnError) {
      throw txnError;
    }

    if (!transactions || transactions.length < 3) {
      return new Response(
        JSON.stringify({ 
          recurring: [],
          message: 'Not enough transactions to detect patterns. Add more transactions first.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group transactions by merchant/description similarity
    const groups: Map<string, Transaction[]> = new Map();
    
    for (const txn of transactions) {
      const key = (txn.merchant || txn.description || 'Unknown').toLowerCase().trim();
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(txn);
    }

    // Analyze patterns
    const recurringPatterns: RecurringPattern[] = [];

    for (const [key, txns] of groups) {
      if (txns.length < 2) continue;

      // Sort by date
      txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate intervals between transactions
      const intervals: number[] = [];
      for (let i = 1; i < txns.length; i++) {
        const daysDiff = Math.abs(
          (new Date(txns[i].date).getTime() - new Date(txns[i-1].date).getTime()) / (1000 * 60 * 60 * 24)
        );
        intervals.push(daysDiff);
      }

      if (intervals.length === 0) continue;

      // Calculate average interval
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // Check if intervals are somewhat consistent (standard deviation < 30% of mean)
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const isRegular = stdDev < avgInterval * 0.5; // Allow 50% variance

      if (!isRegular && txns.length < 4) continue;

      // Determine frequency
      let frequency = 'irregular';
      if (avgInterval >= 25 && avgInterval <= 35) frequency = 'monthly';
      else if (avgInterval >= 12 && avgInterval <= 16) frequency = 'bi-weekly';
      else if (avgInterval >= 6 && avgInterval <= 8) frequency = 'weekly';
      else if (avgInterval >= 85 && avgInterval <= 95) frequency = 'quarterly';
      else if (avgInterval >= 355 && avgInterval <= 375) frequency = 'yearly';
      else if (avgInterval >= 1 && avgInterval <= 3) frequency = 'daily';

      // Calculate amounts
      const amounts = txns.map(t => Number(t.amount));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const totalSpent = amounts.reduce((a, b) => a + b, 0);

      // Calculate next expected date
      const lastDate = new Date(txns[txns.length - 1].date);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));

      recurringPatterns.push({
        merchant: txns[0].merchant || txns[0].description || 'Unknown',
        description: txns[0].description || '',
        average_amount: Math.round(avgAmount),
        frequency,
        last_date: txns[txns.length - 1].date,
        occurrence_count: txns.length,
        next_expected_date: nextDate.toISOString().split('T')[0],
        category: (txns[0] as any).finance_categories?.name || 'Uncategorized',
        total_spent: Math.round(totalSpent),
      });
    }

    // Sort by occurrence count
    recurringPatterns.sort((a, b) => b.occurrence_count - a.occurrence_count);

    console.log(`Found ${recurringPatterns.length} recurring patterns`);

    return new Response(
      JSON.stringify({ 
        recurring: recurringPatterns.slice(0, 20), // Top 20 patterns
        total_patterns: recurringPatterns.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error detecting recurring transactions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});