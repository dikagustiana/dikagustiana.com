import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, bankName } = await req.json();
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'PDF data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing PDF for bank:', bankName);

    // Use Gemini's vision capability to extract text from PDF
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
            content: `You are a bank statement parser. Extract ALL transactions from the provided bank statement PDF/image.

For each transaction, identify:
1. date - The transaction date (format: YYYY-MM-DD)
2. description - The transaction description/narration
3. merchant - The merchant or payee name (extract from description if possible)
4. amount - The transaction amount (positive number)
5. transaction_type - Either "income" (credit/deposit) or "expense" (debit/withdrawal)
6. category - Categorize into one of these: Food & Dining, Transportation, Shopping, Bills & Utilities, Entertainment, Health & Fitness, Education, Housing, Insurance, Personal Care, Travel, Gifts & Donations, Salary, Freelance, Investment Returns, Transfer, Other

Also extract account information if visible:
- account_name - The account holder name or account description
- account_number - Last 4 digits of account number if visible
- opening_balance - Opening balance for the period
- closing_balance - Closing balance for the period
- currency - Currency code (default IDR if Indonesian bank)

Respond ONLY with valid JSON in this exact format:
{
  "account": {
    "name": "Account Name",
    "account_number": "1234",
    "opening_balance": 1000000,
    "closing_balance": 1500000,
    "currency": "IDR"
  },
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "Transfer from John Doe",
      "merchant": "John Doe",
      "amount": 500000,
      "transaction_type": "income",
      "category": "Transfer"
    }
  ]
}

Parse ALL transactions you can find. If you cannot determine a field, use null. Be thorough - extract every single transaction visible in the statement.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Parse this bank statement${bankName ? ` from ${bankName}` : ''}. Extract all transactions.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
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

    console.log('AI response received, parsing JSON...');

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Parse the JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse transaction data from AI response');
    }

    console.log(`Successfully parsed ${parsedData.transactions?.length || 0} transactions`);

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-pdf-statement:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});