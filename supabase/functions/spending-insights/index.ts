import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
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

    console.log('Generating spending insights for user:', user.id);

    // Fetch transactions from the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: transactions, error: txnError } = await supabase
      .from('finance_transactions')
      .select('*, finance_categories(name)')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (txnError) {
      throw txnError;
    }

    // Fetch accounts
    const { data: accounts, error: accError } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accError) {
      throw accError;
    }

    if (!transactions || transactions.length < 5) {
      return new Response(
        JSON.stringify({ 
          insights: null,
          message: 'Not enough transactions to generate insights. Add more transactions first.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate statistics
    const expenses = transactions.filter(t => t.transaction_type === 'expense');
    const income = transactions.filter(t => t.transaction_type === 'income');

    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
    const netCashFlow = totalIncome - totalExpenses;

    // Group expenses by category
    const categorySpending: Record<string, number> = {};
    for (const t of expenses) {
      const category = (t as any).finance_categories?.name || 'Other';
      categorySpending[category] = (categorySpending[category] || 0) + Number(t.amount);
    }

    // Sort categories by spending
    const topCategories = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Calculate monthly averages
    const monthlyData: Record<string, { income: number; expense: number }> = {};
    for (const t of transactions) {
      const month = t.date.slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0 };
      }
      if (t.transaction_type === 'income') {
        monthlyData[month].income += Number(t.amount);
      } else if (t.transaction_type === 'expense') {
        monthlyData[month].expense += Number(t.amount);
      }
    }

    const months = Object.keys(monthlyData).sort();
    const avgMonthlyExpense = totalExpenses / Math.max(months.length, 1);
    const avgMonthlyIncome = totalIncome / Math.max(months.length, 1);

    // Calculate net worth
    const totalAssets = accounts
      .filter(a => !['credit_card', 'loan'].includes(a.account_type))
      .reduce((sum, a) => sum + Number(a.balance), 0);
    const totalLiabilities = accounts
      .filter(a => ['credit_card', 'loan'].includes(a.account_type))
      .reduce((sum, a) => sum + Math.abs(Number(a.balance)), 0);
    const netWorth = totalAssets - totalLiabilities;

    // Prepare summary for AI
    const summary = {
      period: `${months[0] || 'N/A'} to ${months[months.length - 1] || 'N/A'}`,
      totalIncome,
      totalExpenses,
      netCashFlow,
      avgMonthlyIncome,
      avgMonthlyExpense,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0,
      topCategories: topCategories.map(([cat, amount]) => ({ category: cat, amount })),
      transactionCount: transactions.length,
      netWorth,
      totalAssets,
      totalLiabilities,
      monthlyTrend: months.map(m => ({
        month: m,
        income: monthlyData[m].income,
        expense: monthlyData[m].expense,
        net: monthlyData[m].income - monthlyData[m].expense
      }))
    };

    console.log('Generating AI insights...');

    // Generate AI insights
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a friendly personal finance advisor analyzing spending data. Provide actionable, personalized insights in a conversational tone. Use Indonesian Rupiah (IDR) for currency formatting.

Your response MUST be valid JSON with this structure:
{
  "summary": "A 2-3 sentence overview of their financial health",
  "highlights": [
    { "type": "positive" | "warning" | "neutral", "title": "Short title", "description": "Brief explanation" }
  ],
  "recommendations": [
    { "priority": "high" | "medium" | "low", "action": "Specific actionable advice", "potential_savings": number or null }
  ],
  "category_insights": [
    { "category": "Category name", "observation": "What you noticed", "suggestion": "How to improve" }
  ],
  "monthly_trend_analysis": "Analysis of their month-over-month patterns",
  "savings_goal_suggestion": { "monthly_target": number, "rationale": "Why this target" }
}

Be specific, use actual numbers from the data, and give practical advice.`
          },
          {
            role: "user",
            content: `Analyze this financial data and provide insights:\n\n${JSON.stringify(summary, null, 2)}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON response
    let insights;
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      insights = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI insights:', content);
      // Return raw content as summary if parsing fails
      insights = {
        summary: content,
        highlights: [],
        recommendations: [],
        category_insights: [],
        monthly_trend_analysis: "",
        savings_goal_suggestion: null
      };
    }

    console.log('Insights generated successfully');

    return new Response(
      JSON.stringify({ 
        insights,
        statistics: summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});