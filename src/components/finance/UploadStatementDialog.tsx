import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2, Check, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/financeUtils';

interface ParsedTransaction {
  date: string;
  description: string;
  merchant: string | null;
  amount: number;
  transaction_type: 'income' | 'expense';
  category: string;
}

interface ParsedAccount {
  name: string | null;
  account_number: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  currency: string;
}

interface ParsedData {
  account: ParsedAccount;
  transactions: ParsedTransaction[];
}

interface UploadStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const banks = [
  { value: 'bca', label: 'Bank Central Asia (BCA)' },
  { value: 'mandiri', label: 'Bank Mandiri' },
  { value: 'bni', label: 'Bank Negara Indonesia (BNI)' },
  { value: 'bri', label: 'Bank Rakyat Indonesia (BRI)' },
  { value: 'cimb', label: 'CIMB Niaga' },
  { value: 'danamon', label: 'Bank Danamon' },
  { value: 'ocbc', label: 'OCBC NISP' },
  { value: 'permata', label: 'Bank Permata' },
  { value: 'other', label: 'Other Bank' },
];

export function UploadStatementDialog({ open, onOpenChange, onSuccess }: UploadStatementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'parsing' | 'review' | 'saving'>('upload');
  const [bankName, setBankName] = useState('');
  const [statementText, setStatementText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const resetDialog = useCallback(() => {
    setStep('upload');
    setBankName('');
    setStatementText('');
    setParsedData(null);
    setSelectedTransactions(new Set());
    setProgress(0);
    setError(null);
  }, []);

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, only accept text files (CSV, TXT)
    // PDF parsing would require a more complex solution
    if (file.type === 'text/csv' || file.type === 'text/plain' || file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      const text = await file.text();
      setStatementText(text);
    } else {
      toast({
        title: 'Unsupported file type',
        description: 'Please upload a CSV or TXT file. For PDF statements, copy and paste the text content below.',
        variant: 'destructive',
      });
    }
  };

  const parseStatement = async () => {
    if (!statementText.trim()) {
      toast({
        title: 'No content',
        description: 'Please paste your bank statement text or upload a file.',
        variant: 'destructive',
      });
      return;
    }

    setStep('parsing');
    setProgress(20);
    setError(null);

    try {
      setProgress(40);
      
      const response = await supabase.functions.invoke('parse-bank-statement', {
        body: { 
          statementText: statementText.slice(0, 50000), // Limit text size
          bankName: banks.find(b => b.value === bankName)?.label || bankName 
        },
      });

      setProgress(80);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to parse statement');
      }

      const data = response.data as ParsedData;
      
      if (!data.transactions || data.transactions.length === 0) {
        throw new Error('No transactions found in the statement');
      }

      setParsedData(data);
      // Select all transactions by default
      setSelectedTransactions(new Set(data.transactions.map((_, i) => i)));
      setProgress(100);
      setStep('review');

    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Parse error:', err);
      }
      setError(err instanceof Error ? err.message : 'Failed to parse statement');
      setStep('upload');
    }
  };

  const saveTransactions = async () => {
    if (!user || !parsedData) return;

    setStep('saving');
    setProgress(0);

    try {
      // First, create or find the account
      let accountId: string;
      const accountName = parsedData.account.name || `${banks.find(b => b.value === bankName)?.label || 'Bank'} Account`;
      
      // Check if account exists
      const { data: existingAccounts } = await supabase
        .from('finance_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', accountName)
        .limit(1);

      if (existingAccounts && existingAccounts.length > 0) {
        accountId = existingAccounts[0].id;
      } else {
        // Create new account
        const { data: newAccount, error: accountError } = await supabase
          .from('finance_accounts')
          .insert({
            user_id: user.id,
            name: accountName,
            account_type: 'checking',
            balance: parsedData.account.closing_balance || 0,
            currency: parsedData.account.currency || 'IDR',
            institution: banks.find(b => b.value === bankName)?.label,
            account_number: parsedData.account.account_number,
          } as any)
          .select('id')
          .single();

        if (accountError) throw accountError;
        accountId = newAccount.id;
      }

      setProgress(30);

      // Get categories for mapping
      const { data: categories } = await supabase
        .from('finance_categories')
        .select('id, name');

      const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);

      setProgress(50);

      // Insert selected transactions
      const selectedTxns = parsedData.transactions.filter((_, i) => selectedTransactions.has(i));
      const transactionsToInsert = selectedTxns.map(t => ({
        user_id: user.id,
        account_id: accountId,
        transaction_type: t.transaction_type,
        amount: Math.abs(t.amount),
        description: t.description,
        merchant: t.merchant,
        date: t.date,
        category_id: categoryMap.get(t.category) || null,
      }));

      const { error: txnError } = await supabase
        .from('finance_transactions')
        .insert(transactionsToInsert as any);

      if (txnError) throw txnError;

      setProgress(100);

      toast({
        title: 'Import successful',
        description: `Imported ${selectedTxns.length} transactions.`,
      });

      handleClose();
      onSuccess();

    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Save error:', err);
      }
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Failed to save transactions',
        variant: 'destructive',
      });
      setStep('review');
    }
  };

  const toggleTransaction = (index: number) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTransactions(newSelected);
  };

  const toggleAll = () => {
    if (selectedTransactions.size === parsedData?.transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(parsedData?.transactions.map((_, i) => i) || []));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Upload Bank Statement'}
            {step === 'parsing' && 'Parsing Statement...'}
            {step === 'review' && 'Review Transactions'}
            {step === 'saving' && 'Saving Transactions...'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload or paste your bank statement to automatically import transactions.'}
            {step === 'parsing' && 'AI is analyzing your statement to extract transactions.'}
            {step === 'review' && `Found ${parsedData?.transactions.length || 0} transactions. Select which ones to import.`}
            {step === 'saving' && 'Saving your transactions to the database.'}
          </DialogDescription>
        </DialogHeader>

        {(step === 'parsing' || step === 'saving') && (
          <div className="py-8 space-y-4">
            <Progress value={progress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">
              {step === 'parsing' ? 'Analyzing statement with AI...' : 'Saving transactions...'}
            </p>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Bank</Label>
              <Select value={bankName} onValueChange={setBankName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.value} value={bank.value}>
                      {bank.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Upload File (CSV/TXT)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="statement-file"
                />
                <label htmlFor="statement-file" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CSV or TXT files
                  </p>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Or paste statement text</Label>
              <Textarea
                value={statementText}
                onChange={(e) => setStatementText(e.target.value)}
                placeholder="Copy and paste your bank statement text here..."
                rows={8}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={parseStatement} disabled={!statementText.trim()}>
                <FileText className="h-4 w-4 mr-2" />
                Parse Statement
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && parsedData && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Account Summary */}
            {parsedData.account && (
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">Account Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {parsedData.account.name && (
                    <div><span className="text-muted-foreground">Name:</span> {parsedData.account.name}</div>
                  )}
                  {parsedData.account.currency && (
                    <div><span className="text-muted-foreground">Currency:</span> {parsedData.account.currency}</div>
                  )}
                  {parsedData.account.opening_balance != null && (
                    <div><span className="text-muted-foreground">Opening:</span> {formatCurrency(parsedData.account.opening_balance, parsedData.account.currency)}</div>
                  )}
                  {parsedData.account.closing_balance != null && (
                    <div><span className="text-muted-foreground">Closing:</span> {formatCurrency(parsedData.account.closing_balance, parsedData.account.currency)}</div>
                  )}
                </div>
              </div>
            )}

            {/* Transaction List */}
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedTransactions.size === parsedData.transactions.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedTransactions.size} of {parsedData.transactions.length} selected
              </span>
            </div>

            <div className="flex-1 overflow-y-auto border rounded-lg">
              {parsedData.transactions.map((txn, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                    selectedTransactions.has(index) ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => toggleTransaction(index)}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                    selectedTransactions.has(index) ? 'bg-primary border-primary' : 'border-muted-foreground'
                  }`}>
                    {selectedTransactions.has(index) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{txn.description}</span>
                      <span className={`font-semibold ${
                        txn.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.transaction_type === 'income' ? '+' : '-'}
                        {formatCurrency(txn.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{txn.date}</span>
                      <span>•</span>
                      <span>{txn.category}</span>
                      {txn.merchant && (
                        <>
                          <span>•</span>
                          <span>{txn.merchant}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={saveTransactions} disabled={selectedTransactions.size === 0}>
                Import {selectedTransactions.size} Transactions
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}