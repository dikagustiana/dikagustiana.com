import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/states/EmptyState';
import { ErrorState } from '@/components/states/ErrorState';
import { LoadingState } from '@/components/states/LoadingState';
import { renderWithRouter } from './helpers/renderWithProviders';

describe('EmptyState', () => {
  it('renders default copy', () => {
    renderWithRouter(<EmptyState />);
    expect(screen.getByText('No content yet')).toBeInTheDocument();
  });

  it('renders a link action when actionPath is given', () => {
    renderWithRouter(<EmptyState actionLabel="Add one" actionPath="/new" />);
    const link = screen.getByRole('link', { name: /Add one/ });
    expect(link).toHaveAttribute('href', '/new');
  });

  it('calls onAction when the button action is clicked', async () => {
    const onAction = vi.fn();
    renderWithRouter(<EmptyState actionLabel="Do it" onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /Do it/ }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('shows no action when only a label is provided', () => {
    renderWithRouter(<EmptyState actionLabel="orphan" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('ErrorState', () => {
  it('renders default error copy', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('hides the retry button when no handler is given', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button', { name: /Try again/ })).toBeNull();
  });

  it('fires onRetry when clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} message="Boom" />);
    expect(screen.getByText('Boom')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('LoadingState', () => {
  it('renders skeleton content without crashing', () => {
    const { container } = render(<LoadingState />);
    expect(container.firstChild).toBeTruthy();
  });
});
