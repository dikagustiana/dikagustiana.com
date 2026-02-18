export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  return formatter.format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    checking: 'Checking Account',
    savings: 'Savings Account',
    credit_card: 'Credit Card',
    investment: 'Investment',
    loan: 'Loan',
    property: 'Property',
    vehicle: 'Vehicle',
    crypto: 'Cryptocurrency',
    other: 'Other',
  };
  return labels[type] || type;
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer',
  };
  return labels[type] || type;
}