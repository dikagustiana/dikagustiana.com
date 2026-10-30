/**
 * The homepage glimpse's pins: the three essays that stand still in the
 * glimpse's left zone, beside the running row (essays.featured_rank, migration
 * 20261030100000_essay_featured_rank). Slot 1 is the leftmost column.
 *
 * Each slot is a searchable list of published essays (title, section, date)
 * and a Clear button; an essay already in one slot cannot be chosen for
 * another. The up and down buttons swap a slot with its neighbour. Nothing is
 * written until Save, which writes all three slots in one transaction
 * (set_featured_essays), so no two essays ever hold one slot. An empty slot
 * shows the newest published essay on the homepage, and the preview shows it
 * so. The panel is #homepage-glimpse, which the Glimpse's "Edit pins" link
 * opens.
 *
 * Until the migration is on production the panel is read-only and says why,
 * and the homepage pins the three newest essays.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GlimpseColumn } from '@/components/home/Glimpse';
import { useToast } from '@/hooks/use-toast';
import { glimpseZones, PINNED_SLOTS, type SelectedEssay } from '@/hooks/queries/useSelectedEssays';
import { useGlimpsePins, useSaveGlimpsePins } from '@/hooks/queries/useUnifiedContent';
import { formatDate } from '@/lib/formatDate';
import { sectionLabel } from '@/lib/sectionLabels';
import '@/components/home/glimpse.css';

const HOMEPAGE_GLIMPSE_ID = 'homepage-glimpse';

const essayDate = (essay: SelectedEssay) => formatDate(essay.date ?? essay.created_at);

/** One slot's picker: a button that opens a searchable list of published essays. */
function EssayPicker({
  slot,
  value,
  essays,
  taken,
  disabled,
  onPick,
}: {
  slot: number;
  value: SelectedEssay | undefined;
  essays: SelectedEssay[];
  /** Ids held by the other slots: listed, but not choosable. */
  taken: Set<string>;
  disabled: boolean;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return essays;
    return essays.filter((e) => `${e.title} ${sectionLabel(e.section)}`.toLowerCase().includes(q));
  }, [essays, query]);

  const pick = (id: string) => {
    onPick(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`Slot ${slot}: ${value ? value.title : 'newest published essay'}`}
          className="h-auto min-h-9 w-full min-w-0 justify-between py-1.5 text-left font-normal"
          disabled={disabled}
          data-glimpse-slot={slot}
        >
          {value ? (
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{value.title}</span>
              <span className="block text-xs text-muted-foreground">
                {sectionLabel(value.section)} · {essayDate(value)}
              </span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Empty: the newest published essay</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(32rem,calc(100vw-2rem))] p-2" align="start">
        <Input
          autoFocus
          placeholder="Search published essays…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const first = matches.find((m) => !taken.has(m.id));
            if (first) pick(first.id);
          }}
          aria-label={`Search essays for slot ${slot}`}
          className="mb-2"
        />
        <ul className="max-h-72 overflow-y-auto" aria-label={`Essays for slot ${slot}`}>
          {matches.length === 0 && <li className="px-2 py-3 text-sm text-muted-foreground">No published essay matches.</li>}
          {matches.map((essay) => {
            const used = taken.has(essay.id);
            const chosen = value?.id === essay.id;
            return (
              <li key={essay.id}>
                <button
                  type="button"
                  disabled={used}
                  onClick={() => pick(essay.id)}
                  className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  data-glimpse-option={essay.id}
                >
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${chosen ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{essay.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {sectionLabel(essay.section)} · {essayDate(essay)}
                      {used && ' · in another slot'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function HomepageGlimpse() {
  const { data, isLoading, error } = useGlimpsePins();
  const save = useSaveGlimpsePins();
  const { toast } = useToast();
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(PINNED_SLOTS).fill(null));

  useEffect(() => {
    if (data) setSlots(data.slots);
  }, [data]);

  // Opened from the homepage's "Edit pins" link: bring the panel into view once it is there.
  useEffect(() => {
    if (window.location.hash !== `#${HOMEPAGE_GLIMPSE_ID}`) return;
    document.getElementById(HOMEPAGE_GLIMPSE_ID)?.scrollIntoView?.({ block: 'start' });
  }, [data]);

  const essays = useMemo(() => data?.essays ?? [], [data]);
  const byId = useMemo(() => new Map(essays.map((e) => [e.id, e])), [essays]);
  const locked = !data || data.missingColumn || save.isPending;
  const dirty = !!data && slots.some((id, i) => id !== data.slots[i]);

  // What the homepage will show once saved: the chosen slots, and the newest
  // published essays in the empty ones.
  const preview = useMemo(() => {
    const draft = essays.map((e) => {
      const slot = slots.indexOf(e.id);
      return { ...e, featured_rank: slot < 0 ? null : slot + 1 };
    });
    return glimpseZones(draft).pinned;
  }, [essays, slots]);

  const setSlot = (i: number, id: string | null) => setSlots((s) => s.map((v, j) => (j === i ? id : v)));
  const swap = (i: number, j: number) =>
    setSlots((s) => {
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const onSave = () => {
    save.mutate(slots, {
      onSuccess: () => toast({ title: 'Pins saved', description: 'The homepage glimpse shows them now.' }),
      onError: (e) =>
        toast({ title: 'Pins not saved', description: e instanceof Error ? e.message : 'The previous pins are kept.', variant: 'destructive' }),
    });
  };

  return (
    <Card className="mb-8 scroll-mt-24" id={HOMEPAGE_GLIMPSE_ID}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Homepage Glimpse</CardTitle>
        <CardDescription>
          The three essays pinned beside the running row, left to right. An empty slot shows the newest published essay; pinned essays are left out of the row.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">The published essays could not be loaded.</p>}
        {data?.missingColumn && (
          <p className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700">
            The pins cannot be saved until migration 20261030100000_essay_featured_rank is applied. Until then the homepage pins the three newest essays.
          </p>
        )}
        {data && (
          <>
            <ol className="mb-4 space-y-2" aria-label="Pinned slots">
              {slots.map((id, i) => {
                const taken = new Set(slots.filter((other, j): other is string => j !== i && !!other));
                const value = id ? byId.get(id) : undefined;
                return (
                  <li key={i} className="flex items-center gap-2" data-glimpse-slot-row={i + 1}>
                    <span className="w-14 shrink-0 text-sm font-medium">Slot {i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <EssayPicker slot={i + 1} value={value} essays={essays} taken={taken} disabled={locked} onPick={(pick) => setSlot(i, pick)} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Move slot ${i + 1} up`} disabled={locked || i === 0} onClick={() => swap(i, i - 1)}>
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Move slot ${i + 1} down`} disabled={locked || i === slots.length - 1} onClick={() => swap(i, i + 1)}>
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button variant="outline" size="sm" className="shrink-0" aria-label={`Clear slot ${i + 1}`} disabled={locked || !id} onClick={() => setSlot(i, null)}>
                      <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Clear
                    </Button>
                  </li>
                );
              })}
            </ol>

            <div className="mb-4 flex gap-2">
              <Button size="sm" onClick={onSave} disabled={locked || !dirty}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSlots(data.slots)} disabled={save.isPending || !dirty}>
                Reset
              </Button>
            </div>

            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
            <ul className="grid grid-cols-3 gap-6 rounded-md border border-border p-4" aria-label="Preview of the pinned essays" data-glimpse-preview>
              {preview.map((essay, i) => (
                <GlimpseColumn key={essay.id} essay={essay} className={slots[i] === essay.id ? 'min-w-0' : 'min-w-0 opacity-60'} />
              ))}
              {preview.length === 0 && <li className="col-span-3 text-sm text-muted-foreground">Nothing is published yet.</li>}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Faded: an empty slot, filled with the newest published essay.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
