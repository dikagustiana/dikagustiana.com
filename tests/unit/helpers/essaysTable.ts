/**
 * The essays table as PostgREST answers the chains the homepage builds:
 * `eq` and `in` filters, `order` (with `nullsFirst`, defaulting the way
 * PostgREST does: ascending puts NULL last, descending first) and `limit`,
 * applied when the query is awaited. With `rankColumn: false` a query that
 * names `selected_rank` fails with 42703, as production did before migration
 * 20261009140000_essay_selected_rank. Plug it into a mocked `supabase.from`.
 */
export interface EssayRow {
  id: string;
  is_selected: boolean;
  published: boolean;
  selected_rank: number | null;
  created_at: string;
  [column: string]: unknown;
}

export interface Call {
  method: string;
  args: unknown[];
}

export const MISSING_RANK = { code: '42703', message: 'column essays.selected_rank does not exist' };

export function essaysTable(rows: EssayRow[], { rankColumn = true }: { rankColumn?: boolean } = {}) {
  const chains: Call[][] = [];

  const answer = (calls: Call[]) => {
    const orders = calls.filter((c) => c.method === 'order');
    if (!rankColumn && orders.some((c) => c.args[0] === 'selected_rank')) return { data: null, error: MISSING_RANK };

    const matched = rows.filter((row) =>
      calls.every(({ method, args: [column, value] }) => {
        if (method === 'eq') return row[column as string] === value;
        if (method === 'in') return (value as unknown[]).includes(row[column as string]);
        return true;
      }),
    );
    const sorted = [...matched].sort((a, b) => {
      for (const { args } of orders) {
        const [column, opts = {}] = args as [string, { ascending?: boolean; nullsFirst?: boolean }?];
        const ascending = opts.ascending ?? true;
        const nullsFirst = opts.nullsFirst ?? !ascending;
        const x = a[column] as string | number | null;
        const y = b[column] as string | number | null;
        if (x === y) continue;
        if (x === null) return nullsFirst ? -1 : 1;
        if (y === null) return nullsFirst ? 1 : -1;
        return (x < y ? -1 : 1) * (ascending ? 1 : -1);
      }
      return 0;
    });
    const limit = calls.find((c) => c.method === 'limit')?.args[0] as number | undefined;
    return { data: limit === undefined ? sorted : sorted.slice(0, limit), error: null };
  };

  const from = () => {
    const calls: Call[] = [];
    chains.push(calls);
    const builder: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'order', 'limit']) {
      builder[m] = (...args: unknown[]) => {
        calls.push({ method: m, args });
        return builder;
      };
    }
    builder.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve().then(() => answer(calls)).then(res, rej);
    return builder;
  };

  return { from, chains };
}

/** One essay row; `day` orders creation, later is newer. */
export function essayRow(n: number, over: Partial<EssayRow> & { day?: number } = {}): EssayRow {
  const { day = n, ...rest } = over;
  return {
    id: `e${n}`,
    slug: `essay-${n}`,
    title: `Essay ${n}`,
    snippet: `Deck ${n}.`,
    section: 'next-big-thing',
    phase: null,
    author: null,
    read_time: null,
    date: null,
    created_at: new Date(Date.UTC(2026, 0, 1 + day)).toISOString(),
    finance_section: null,
    fsli_slug: null,
    topic: null,
    finance_modules: null,
    is_selected: false,
    published: true,
    selected_rank: null,
    ...rest,
  };
}
