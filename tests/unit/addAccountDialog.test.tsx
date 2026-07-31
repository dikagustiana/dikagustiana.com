import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// vi.mock is hoisted — shared mocks via vi.hoisted.
const { insertMock, toastFn } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  toastFn: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ insert: insertMock }) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-123' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastFn }) }));

import { AddAccountDialog } from '@/components/personal-finance/AddAccountDialog';

beforeEach(() => {
  insertMock.mockReset();
  toastFn.mockReset();
});

describe('AddAccountDialog (Personal Finance create)', () => {
  it('disables submit until an account name is entered', async () => {
    render(<AddAccountDialog open onOpenChange={() => {}} onSuccess={() => {}} />);
    const submit = screen.getByRole('button', { name: /Add Account/ });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Account Name/), 'Main Savings');
    expect(submit).toBeEnabled();
  });

  it('submits a schema-shaped insert and reports success', async () => {
    insertMock.mockResolvedValue({ error: null });
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    render(<AddAccountDialog open onOpenChange={onOpenChange} onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/Account Name/), 'Main Savings');
    await userEvent.click(screen.getByRole('button', { name: /Add Account/ }));

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-123',
      name: 'Main Savings',
      account_type: 'checking',
      balance: 0, // empty balance -> parseFloat('')||0
      currency: 'IDR',
      institution: null, // '' -> null
      notes: null,
    });
    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' })),
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a destructive toast when the insert fails', async () => {
    insertMock.mockResolvedValue({ error: { message: 'rls denied' } });
    render(<AddAccountDialog open onOpenChange={() => {}} onSuccess={() => {}} />);

    await userEvent.type(screen.getByLabelText(/Account Name/), 'X');
    await userEvent.click(screen.getByRole('button', { name: /Add Account/ }));

    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error', variant: 'destructive' }),
      ),
    );
  });
});
