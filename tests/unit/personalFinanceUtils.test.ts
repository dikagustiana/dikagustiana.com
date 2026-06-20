import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  getAccountTypeLabel,
  getTransactionTypeLabel,
} from '@/lib/personalFinanceUtils';

describe('formatCurrency', () => {
  it('formats a positive IDR amount with grouping and no fraction digits', () => {
    const out = formatCurrency(1000);
    expect(out).toContain('1.000');
    expect(out).toMatch(/Rp/);
    expect(out).not.toMatch(/[,.]00$/); // no fraction digits
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0');
  });

  it('formats negative amounts with a minus sign', () => {
    expect(formatCurrency(-2500)).toMatch(/-/);
    expect(formatCurrency(-2500)).toContain('2.500');
  });

  it('respects an explicit currency code', () => {
    const usd = formatCurrency(1234, 'USD');
    expect(usd).toContain('1.234');
  });
});

describe('getAccountTypeLabel', () => {
  it('maps known account types to friendly labels', () => {
    expect(getAccountTypeLabel('checking')).toBe('Checking Account');
    expect(getAccountTypeLabel('credit_card')).toBe('Credit Card');
    expect(getAccountTypeLabel('crypto')).toBe('Cryptocurrency');
  });
  it('falls back to the raw value for unknown types', () => {
    expect(getAccountTypeLabel('mystery')).toBe('mystery');
    expect(getAccountTypeLabel('')).toBe('');
  });
});

describe('getTransactionTypeLabel', () => {
  it('maps known transaction types', () => {
    expect(getTransactionTypeLabel('income')).toBe('Income');
    expect(getTransactionTypeLabel('expense')).toBe('Expense');
    expect(getTransactionTypeLabel('transfer')).toBe('Transfer');
  });
  it('falls back to the raw value for unknown types', () => {
    expect(getTransactionTypeLabel('refund')).toBe('refund');
  });
});

describe('personalFinanceUtils.formatDate', () => {
  it('formats a valid ISO date in id-ID locale', () => {
    const out = formatDate('2024-06-15');
    expect(out).toContain('2024');
  });
  it('returns "Invalid Date" for an unparseable string (documents current behaviour)', () => {
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });
});
