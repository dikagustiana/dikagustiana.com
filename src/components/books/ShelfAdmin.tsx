/**
 * The shelves panel of /admin/books (PRD D6; 03-DESIGN §6): add, rename, reorder and delete shelves, and
 * choose the shelf whose books the other panel lists. Reordering is the homepage order's up/down pattern
 * (src/components/admin/HomepageOrder.tsx): the whole order is written at once and shown at once, and if the
 * write fails the previous order comes back. A shelf that holds a book cannot be deleted (the database
 * refuses it too, ON DELETE RESTRICT); the button says why.
 */
import { useEffect, useId, useState } from 'react';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { SLUG_SHAPE, slugify, useDeleteShelf, useReorderShelves, useSaveShelf, type ShelfWithBooks } from '@/hooks/queries/useBooks';
import { cn } from '@/lib/utils';

interface ShelfAdminProps {
  shelves: ShelfWithBooks[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export function ShelfAdmin({ shelves, selected, onSelect }: ShelfAdminProps) {
  const [rows, setRows] = useState(shelves);
  const [editing, setEditing] = useState<ShelfWithBooks | 'new' | null>(null);
  const reorder = useReorderShelves();
  const remove = useDeleteShelf();
  const { toast } = useToast();

  useEffect(() => setRows(shelves), [shelves]);

  const move = (from: number, to: number) => {
    if (reorder.isPending || to < 0 || to >= rows.length) return;
    const previous = rows;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setRows(next);
    reorder.mutate(
      next.map((s) => s.id),
      {
        onError: () => {
          setRows(previous);
          toast({ title: 'Order not saved', description: 'The previous order is kept.', variant: 'destructive' });
        },
      },
    );
  };

  const onDelete = (s: ShelfWithBooks) => {
    if (!window.confirm(`Delete the shelf "${s.name}"?`)) return;
    remove.mutate(s, {
      onSuccess: () => toast({ title: 'Shelf deleted' }),
      onError: (e) => toast({ title: 'Shelf not deleted', description: e instanceof Error ? e.message : String(e), variant: 'destructive' }),
    });
  };

  return (
    <section aria-labelledby="shelves-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="shelves-heading" className="text-lg font-semibold">
          Shelves
        </h2>
        <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Add shelf
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shelves yet. Add one, then add its books.</p>
      ) : (
        <TooltipProvider>
          <ol className="divide-y divide-border rounded-md border border-border">
            {rows.map((s, i) => {
              const n = s.books.length;
              return (
                <li key={s.id} className={cn('flex items-center gap-1 px-2 py-1.5', selected === s.id && 'bg-secondary')}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move "${s.name}" up`} title="Up" disabled={reorder.isPending || i === 0} onClick={() => move(i, i - 1)}>
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move "${s.name}" down`} title="Down" disabled={reorder.isPending || i === rows.length - 1} onClick={() => move(i, i + 1)}>
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <button type="button" onClick={() => onSelect(s.id)} aria-current={selected === s.id ? 'true' : undefined} className="min-w-0 flex-1 truncate px-1 text-left text-sm font-medium hover:text-accent">
                    {s.name}
                  </button>
                  <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">{n}</span>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                    Edit
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* A disabled button gets no pointer events; the span carries the tooltip. */}
                      <span tabIndex={n > 0 ? 0 : -1}>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={n > 0 || remove.isPending} onClick={() => onDelete(s)} aria-label={`Delete the shelf "${s.name}"`}>
                          Delete
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {n > 0 && <TooltipContent>Move or remove its {n === 1 ? 'book' : `${n} books`} first.</TooltipContent>}
                  </Tooltip>
                </li>
              );
            })}
          </ol>
        </TooltipProvider>
      )}
      <ShelfDialog shelf={editing} taken={rows.filter((s) => editing === 'new' || s.id !== (editing as ShelfWithBooks | null)?.id).map((s) => s.slug)} nextOrder={rows.length} onClose={() => setEditing(null)} />
    </section>
  );
}

function ShelfDialog({ shelf, taken, nextOrder, onClose }: { shelf: ShelfWithBooks | 'new' | null; taken: string[]; nextOrder: number; onClose: () => void }) {
  const uid = useId();
  const existing = shelf && shelf !== 'new' ? shelf : null;
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const save = useSaveShelf();
  const { toast } = useToast();

  useEffect(() => {
    if (!shelf) return;
    setName(existing?.name ?? '');
    setSlug(existing?.slug ?? '');
    setSlugEdited(!!existing);
  }, [shelf, existing]);

  const slugError = !slug ? 'A slug is needed.' : !SLUG_SHAPE.test(slug) ? 'Lower-case letters, digits and single hyphens only.' : taken.includes(slug) ? 'Another shelf has this slug.' : null;
  const valid = !!name.trim() && !slugError;

  const submit = () => {
    if (!valid) return;
    save.mutate(
      { id: existing?.id, name, slug, sort_order: nextOrder },
      {
        onSuccess: () => {
          toast({ title: 'Shelf saved' });
          onClose();
        },
        onError: (e) => toast({ title: 'Shelf not saved', description: e instanceof Error ? e.message : String(e), variant: 'destructive' }),
      },
    );
  };

  return (
    <Dialog open={!!shelf} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>{existing ? 'Rename shelf' : 'Add a shelf'}</DialogTitle>
        <DialogDescription>The slug is the shelf's address: /books-academia?shelf=…</DialogDescription>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-name`}>Name</Label>
            <Input
              id={`${uid}-name`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-slug`}>Slug</Label>
            <Input
              id={`${uid}-slug`}
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value.toLowerCase());
              }}
              aria-invalid={!!(slug && slugError)}
            />
            {slug && slugError && <p className="text-xs text-destructive">{slugError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
