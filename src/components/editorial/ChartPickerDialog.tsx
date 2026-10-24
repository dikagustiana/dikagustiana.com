/**
 * ChartPickerDialog — chooses a Transition Tracker chart to embed in an essay.
 *
 * Lists every chart in ds_chart (admin-only under RLS), published or not; an
 * unpublished one can be embedded, and stays hidden from readers until it is
 * published (PRD: "Embed ke slug yang belum publish tampil sebagai
 * placeholder di admin dan disembunyikan di publik").
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ChartOption {
  slug: string;
  title: string;
  subtitle: string | null;
  chain_link: string;
  published: boolean;
}

export function ChartPickerDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (slug: string) => void;
}) {
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['transition', 'picker'],
    enabled: open,
    queryFn: async (): Promise<ChartOption[]> => {
      const { data, error } = await supabase
        .from('ds_chart' as never)
        .select('slug, title, subtitle, chain_link, published')
        .order('chain_link')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as unknown as ChartOption[];
    },
  });
  const needle = q.trim().toLowerCase();
  const list = (data ?? []).filter(
    (c) => !needle || `${c.slug} ${c.title} ${c.subtitle ?? ''} ${c.chain_link}`.toLowerCase().includes(needle),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Insert a tracker chart</DialogTitle>
          <DialogDescription>
            The essay stores the chart’s name only; readers see its latest sourced values.
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="Search charts" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search charts" />
        <div className="max-h-80 overflow-auto">
          {isLoading ? (
            <p className="p-2 text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="p-2 text-sm text-destructive">The charts could not be loaded.</p>
          ) : list.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No chart matches.</p>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    className="w-full px-2 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      onInsert(c.slug);
                      onOpenChange(false);
                    }}
                  >
                    <span className="block text-sm font-medium text-foreground">{c.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.chain_link} · <span className="font-mono">{c.slug}</span>
                      {c.published ? '' : ' · not published: hidden from readers'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
