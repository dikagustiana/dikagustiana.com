import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/** Render a component inside a router (needed by anything using <Link>). */
export function renderWithRouter(ui: ReactElement, route = '/') {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

/**
 * Build a chainable Supabase query-builder mock. Every builder method returns
 * the same thenable, and awaiting it resolves to { data, error }. This mirrors
 * how @supabase/supabase-js query builders behave (PostgREST builders are
 * thenable), so components that do `.from(t).select().eq().order()` work.
 */
export function makeQueryResult<T>(data: T, error: unknown = null) {
  const result = Promise.resolve({ data, error });
  const builder: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'gte', 'lte',
    'gt', 'lt', 'in', 'is', 'like', 'ilike', 'match', 'order', 'limit', 'range',
    'single', 'maybeSingle', 'filter', 'or', 'contains', 'overlaps',
  ];
  for (const m of methods) builder[m] = () => builder;
  // make the builder awaitable
  (builder as { then: unknown }).then = result.then.bind(result);
  (builder as { catch: unknown }).catch = result.catch.bind(result);
  (builder as { finally: unknown }).finally = result.finally.bind(result);
  return builder;
}
