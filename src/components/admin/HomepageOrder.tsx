/**
 * The homepage glimpse's running order. Starring (the ★ in the list below)
 * decides WHO is featured; this panel decides in WHAT ORDER. Position 1 is
 * the first card a reader sees. Drafts can be placed ahead of going live:
 * they hold their slot and appear the moment they are published.
 */
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUp, Star } from 'lucide-react';
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

  const commit = async (next: SelectedOrderRow[]) => {
    const previous = rows;
    setRows(next);
    try {
      await save.mutateAsync(next.map((r) => r.id));
    } catch {
      setRows(previous);
      toast({ title: 'Order not saved', description: 'The previous order is kept.', variant: 'destructive' });
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length || from === to) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void commit(next);
  };

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Homepage order</CardTitle>
        <CardDescription>
          Star an essay in the list below to feature it; set its place here. Position 1 is the first card on the homepage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">The featured list could not be loaded.</p>}
        {data?.missingColumn && (
          <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            Ordering needs migration 20261009120000_essay_selected_rank. Until it is applied the homepage shows newest first.
          </p>
        )}
        {!isLoading && !error && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing is starred yet. Use <Star className="inline h-3.5 w-3.5" /> in the list below.
          </p>
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
                        draft · hidden until published
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Move to front"
                    aria-label={`Move "${row.title}" to the front`}
                    disabled={i === 0 || save.isPending || data?.missingColumn}
                    onClick={() => move(i, 0)}
                  >
                    <ChevronsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Move up"
                    aria-label={`Move "${row.title}" up`}
                    disabled={i === 0 || save.isPending || data?.missingColumn}
                    onClick={() => move(i, i - 1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Move down"
                    aria-label={`Move "${row.title}" down`}
                    disabled={i === rows.length - 1 || save.isPending || data?.missingColumn}
                    onClick={() => move(i, i + 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
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
