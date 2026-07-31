import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeQueryResult } from './helpers/renderWithProviders';

// ---- mock the supabase client + toast BEFORE importing the component --------
// vi.mock is hoisted, so shared mocks must be created via vi.hoisted.
const { fromMock, invokeMock, toast } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  invokeMock: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));
vi.mock('sonner', () => ({ toast }));

import { RemoraSignalsList } from '@/components/remora/RemoraSignalsList';

// A row shaped exactly like the remora_signals schema (+ embedded stock).
const signalRow = {
  id: 'sig-1',
  stock_id: 'stk-1',
  signal_date: '2099-01-01',
  signal_type: 'momentum',
  direction: 'bullish' as const,
  strength: 82.4,
  confidence: 'high' as const,
  price_at_signal: 1500,
  target_price: 1800,
  stop_loss: 1400,
  reasoning: { note: 'breakout' },
  input_data_timestamp: '2099-01-01T00:00:00Z',
  is_stale: false,
  stock: { symbol: 'BBCA', name: 'Bank Central Asia' },
};

beforeEach(() => {
  fromMock.mockReset();
  invokeMock.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  toast.warning.mockReset();
});

describe('RemoraSignalsList', () => {
  it('shows the empty state when no signals are returned', async () => {
    fromMock.mockReturnValue(makeQueryResult([]));
    render(<RemoraSignalsList />);
    expect(await screen.findByText(/No signals generated yet/)).toBeInTheDocument();
    expect(fromMock).toHaveBeenCalledWith('remora_signals');
  });

  it('renders a signal row with correctly formatted, schema-shaped data', async () => {
    fromMock.mockReturnValue(makeQueryResult([signalRow]));
    render(<RemoraSignalsList />);

    expect(await screen.findByText('BBCA')).toBeInTheDocument();
    expect(screen.getByText('Bank Central Asia')).toBeInTheDocument();
    expect(screen.getByText('bullish')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument(); // strength.toFixed(0)
  });

  it('renders a dash when target/stop are null', async () => {
    fromMock.mockReturnValue(makeQueryResult([{ ...signalRow, target_price: null, stop_loss: null }]));
    render(<RemoraSignalsList />);
    await screen.findByText('BBCA');
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });

  it('Generate Signals invokes the edge function and toasts the result', async () => {
    fromMock.mockReturnValue(makeQueryResult([]));
    invokeMock.mockResolvedValue({ data: { signalsGenerated: 3, dataStale: false }, error: null });

    render(<RemoraSignalsList />);
    await screen.findByText(/No signals generated yet/);

    await userEvent.click(screen.getByRole('button', { name: /Generate Signals/ }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith('remora-signals', { body: {} }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Generated 3 signals'));
  });

  it('surfaces a fetch error via toast', async () => {
    fromMock.mockReturnValue(makeQueryResult(null, { message: 'boom' }));
    render(<RemoraSignalsList />);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to fetch signals'));
  });
});
