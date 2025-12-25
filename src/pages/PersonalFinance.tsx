import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  CreditCard,
  PiggyBank,
  Building2,
  Car,
  Home,
  Bitcoin,
  MoreHorizontal,
  ArrowLeftRight,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AddAccountDialog } from '@/components/finance/AddAccountDialog';
import { AddTransactionDialog } from '@/components/finance/AddTransactionDialog';
import { formatCurrency } from '@/lib/financeUtils';

interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
  currency: string;
  institution: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  merchant: string | null;
  date: string;
  transaction_type: string;
  category_id: string | null;
  account_id: string;
}

const accountTypeIcons: Record<string, React.ReactNode> = {
  checking: <Building2 className="h-5 w-5" />,
  savings: <PiggyBank className="h-5 w-5" />,
  credit_card: <CreditCard className="h-5 w-5" />,
  investment: <TrendingUp className="h-5 w-5" />,
  loan: <ArrowDownRight className="h-5 w-5" />,
  property: <Home className="h-5 w-5" />,
  vehicle: <Car className="h-5 w-5" />,
  crypto: <Bitcoin className="h-5 w-5" />,
  other: <MoreHorizontal className="h-5 w-5" />,
};

export default function PersonalFinance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        supabase
          .from('finance_accounts')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('finance_transactions')
          .select('*')
          .order('date', { ascending: false })
          .limit(10)
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      setAccounts(accountsRes.data || []);
      setTransactions(transactionsRes.data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching data:', error);
      }
      toast({
        title: 'Error',
        description: 'Failed to load financial data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalAssets = accounts
    .filter(a => !['credit_card', 'loan'].includes(a.account_type))
    .reduce((sum, a) => sum + Number(a.balance), 0);
  
  const totalLiabilities = accounts
    .filter(a => ['credit_card', 'loan'].includes(a.account_type))
    .reduce((sum, a) => sum + Math.abs(Number(a.balance)), 0);
  
  const netWorth = totalAssets - totalLiabilities;

  // Calculate monthly income/expense from recent transactions
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(thisMonth));
  const monthlyIncome = monthlyTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const monthlyExpense = monthlyTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="bg-muted/30 border-b border-border py-3">
        <div className="container">
          <Breadcrumb 
            items={[
              { label: 'Home', path: '/' },
              { label: "Dika's Tools", path: '/dikas-tools' },
              { label: 'Personal Finance' }
            ]}
          />
        </div>
      </div>

      <main className="flex-1 container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
              Personal Finance
            </h1>
            <p className="text-muted-foreground">
              Track your assets, cash flow, and personal balance sheet.
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddTransaction(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net Worth</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {formatCurrency(netWorth)}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Assets</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2 text-green-600">
                <TrendingUp className="h-5 w-5" />
                {formatCurrency(totalAssets)}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Liabilities</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2 text-red-600">
                <TrendingDown className="h-5 w-5" />
                {formatCurrency(totalLiabilities)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly Cash Flow</CardDescription>
              <CardTitle className={`text-2xl flex items-center gap-2 ${monthlyIncome - monthlyExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <ArrowLeftRight className="h-5 w-5" />
                {formatCurrency(monthlyIncome - monthlyExpense)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Accounts</h2>
              <Button size="sm" onClick={() => setShowAddAccount(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : accounts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Add your first account to start tracking your finances.
                  </p>
                  <Button onClick={() => setShowAddAccount(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Account
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((account) => (
                  <Link key={account.id} to={`/personal-finance/accounts/${account.id}`}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {accountTypeIcons[account.account_type] || <Wallet className="h-5 w-5" />}
                            <span className="text-sm capitalize">{account.account_type.replace('_', ' ')}</span>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-lg">{account.name}</CardTitle>
                        {account.institution && (
                          <CardDescription>{account.institution}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${
                          ['credit_card', 'loan'].includes(account.account_type) 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {formatCurrency(Number(account.balance), account.currency)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Recent Transactions</h2>
              <Link to="/personal-finance/transactions">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : transactions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Add your first transaction to start tracking your spending.
                  </p>
                  <Button onClick={() => setShowAddTransaction(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Transaction
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            transaction.transaction_type === 'income' 
                              ? 'bg-green-100 text-green-600' 
                              : transaction.transaction_type === 'expense'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {transaction.transaction_type === 'income' ? (
                              <ArrowDownRight className="h-4 w-4" />
                            ) : transaction.transaction_type === 'expense' ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowLeftRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {transaction.description || transaction.merchant || 'Transaction'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className={`font-semibold ${
                          transaction.transaction_type === 'income' 
                            ? 'text-green-600' 
                            : transaction.transaction_type === 'expense'
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}>
                          {transaction.transaction_type === 'income' ? '+' : '-'}
                          {formatCurrency(Number(transaction.amount))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Credits Section */}
        <Card className="mt-12 bg-muted/30">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              This personal finance tool is powered by the{' '}
              <a 
                href="https://github.com/we-promise/sure" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Sure open-source project
              </a>
              . Built with ❤️ as part of Dika's Tools. Not affiliated with Maybe Finance Inc.
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />

      <AddAccountDialog 
        open={showAddAccount} 
        onOpenChange={setShowAddAccount}
        onSuccess={fetchData}
      />
      
      <AddTransactionDialog
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        accounts={accounts}
        onSuccess={fetchData}
      />
    </div>
  );
}