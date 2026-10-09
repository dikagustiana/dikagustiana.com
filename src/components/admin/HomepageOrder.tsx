/**
 * The homepage order: the starred essays, in the order the glimpse shows
 * them. The star in the content list decides WHO is on the homepage
 * (essays.is_selected); this panel decides WHERE (essays.selected_rank).
 * Position 1 is the first column a reader sees. Drafts are listed too, so
 * a piece can be placed before it goes live: it holds its slot and appears
 * the moment it is published.
 *
 * Every move writes the whole order at once and shows it at once; if the
 * write fails the previous order comes back. Until the selected_rank
 * migration is on production the list is read-only and says why.
 */
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSaveSelectedOrder, useSelectedOrder, type SelectedOrderRow } from '@/hooks/queries/useUnifiedContent';
import { sectionLabel } from '@/lib/sectionLabels';

export function HomepageOrder() {
  const { data, isLoading, error } = useSelectedOrder();
  const save = useSaveSelectedOrder();
  const { toast } = useToast();
  const [rows, setRows] = useState<SelectedOrderRow[]>([]);

  useEffect(() => {
    if (data) setRows(data.rows);
  }, [data]);

  const locked = !!data?.missingColumn || save.isPending;

  const move = (from: number, to: number) => {
    if (locked || to < 0 || to >= rows.length || from === to) return;
    const previous = rows;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setRows(next);
    save.mutate(
      next.map((r) => r.id),
      {
        onError: () => {
          setRows(previous);
          toast({ title: 'Order not saved', description: 'The previous order is kept.', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Homepage order</CardTitle>
        <CardDescription>Starred essays, in the order the homepage shows them.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">The starred essays could not be loaded.</p>}
        {data?.missingColumn && (
          <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700">
            The order cannot be saved until migration 20261009140000_essay_selected_rank is applied. Until then the homepage shows newest first.
          </p>
        )}
        {!isLoading && !error && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing is starred yet.</p>
        )}
        {rows.length > 0 && (
          <ol className="divide-y divide-border rounded-md border border-border">
            {rows.map((row, i) => (
              <li key={row.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {sectionLabel(row.section)}
                    {!row.published && (
                      <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[10px]">
                        draft
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="To the front" aria-label={`Move "${row.title}" to the front`} disabled={locked || i === 0} onClick={() => move(i, 0)}>
                    <ChevronsUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Up" aria-label={`Move "${row.title}" up`} disabled={locked || i === 0} onClick={() => move(i, i - 1)}>
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Down" aria-label={`Move "${row.title}" down`} disabled={locked || i === rows.length - 1} onClick={() => move(i, i + 1)}>
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
