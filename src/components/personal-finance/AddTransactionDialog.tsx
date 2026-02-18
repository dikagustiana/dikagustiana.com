import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: number;
}

interface Category {
  id: string;
  name: string;
  category_type: string;
  icon: string | null;
  color: string | null;
}

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  onSuccess: () => void;
}

export function AddTransactionDialog({ open, onOpenChange, accounts, onSuccess }: AddTransactionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    account_id: '',
    transaction_type: 'expense',
    amount: '',
    description: '',
    merchant: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      // Set default account if available
      if (accounts.length > 0 && !formData.account_id) {
        setFormData(prev => ({ ...prev, account_id: accounts[0].id }));
      }
    }
  }, [open, accounts]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('finance_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching categories:', error);
      }
    }
  };

  const filteredCategories = categories.filter(
    c => c.category_type === formData.transaction_type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.account_id) return;

    setLoading(true);
    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid amount',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('finance_transactions').insert({
        user_id: user.id,
        account_id: formData.account_id,
        transaction_type: formData.transaction_type as 'income' | 'expense' | 'transfer',
        amount: amount,
        description: formData.description || null,
        merchant: formData.merchant || null,
        category_id: formData.category_id || null,
        date: formData.date,
        notes: formData.notes || null,
      });

      if (error) throw error;

      // Update account balance
      const account = accounts.find(a => a.id === formData.account_id);
      if (account) {
        const balanceChange = formData.transaction_type === 'income' 
          ? amount 
          : formData.transaction_type === 'expense' 
          ? -amount 
          : 0;

        const { error: updateError } = await supabase
          .from('finance_accounts')
          .update({ 
            balance: Number(account.balance || 0) + balanceChange 
          })
          .eq('id', formData.account_id);

        if (updateError) {
          if (import.meta.env.DEV) {
            console.error('Error updating balance:', updateError);
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Transaction added successfully',
      });

      setFormData({
        account_id: accounts.length > 0 ? accounts[0].id : '',
        transaction_type: 'expense',
        amount: '',
        description: '',
        merchant: '',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error adding transaction:', error);
      }
      toast({
        title: 'Error',
        description: 'Failed to add transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transaction_type">Type *</Label>
            <Select
              value={formData.transaction_type}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                transaction_type: value,
                category_id: '' // Reset category when type changes
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_id">Account *</Label>
            <Select
              value={formData.account_id}
              onValueChange={(value) => setFormData({ ...formData, account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What was this for?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant</Label>
            <Input
              id="merchant"
              value={formData.merchant}
              onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
              placeholder="e.g., Starbucks"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.account_id || !formData.amount}>
              {loading ? 'Adding...' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}