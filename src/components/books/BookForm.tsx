/**
 * Adding or editing a book (PRD D4–D6; 03-DESIGN §6). Title, slug (from the title until edited), author,
 * year, shelf, cover, access, the file and its licence note for a free book or the purchase URL for a paid
 * one, the synopsis, published. Save stays disabled until the rules pass (bookErrors, the same rules the
 * database checks); each rule's message sits under its field once the field has been touched or a save
 * tried. A saved book says so in a toast. Remove soft-deletes it: readers stop seeing it, the row and its
 * files stay.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { JSONContent } from '@tiptap/core';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  COVER_TYPES,
  bookErrors,
  publicUrl,
  slugify,
  useDeleteBook,
  useSaveBook,
  type Book,
  type BookDraft,
  type BookErrors,
  type Shelf,
} from '@/hooks/queries/useBooks';
import { SynopsisEditor } from './SynopsisEditor';

interface BookFormProps {
  open: boolean;
  /** The book to edit, or null to add one. */
  book: Book | null;
  shelves: Shelf[];
  /** The shelf a new book starts on. */
  defaultShelfId: string | null;
  /** Every other book's slug, so a clash shows before the database refuses it. */
  takenSlugs: string[];
  /** Where a new book goes in its shelf: after the last. */
  nextSortOrder: (shelfId: string) => number;
  onClose: () => void;
}

const draftOf = (book: Book | null, shelfId: string | null): BookDraft => ({
  id: book?.id,
  title: book?.title ?? '',
  slug: book?.slug ?? '',
  author: book?.author ?? '',
  year: book?.year ? String(book.year) : '',
  shelf_id: book?.shelf_id ?? shelfId ?? '',
  access: book?.access ?? 'free',
  license_note: book?.license_note ?? '',
  purchase_url: book?.purchase_url ?? '',
  published: book?.published ?? false,
  file: null,
  filepath: book?.filepath ?? null,
  cover: null,
  cover_path: book?.cover_path ?? null,
  synopsis_json: (book?.synopsis_json as BookDraft['synopsis_json']) ?? null,
  synopsis_html: book?.synopsis_html ?? null,
});

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function BookForm({ open, book, shelves, defaultShelfId, takenSlugs, nextSortOrder, onClose }: BookFormProps) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const [d, setD] = useState<BookDraft>(() => draftOf(book, defaultShelfId));
  const [slugEdited, setSlugEdited] = useState(!!book);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [tried, setTried] = useState(false);
  const save = useSaveBook();
  const remove = useDeleteBook();
  const { toast } = useToast();
  const coverPreview = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // A new dialog starts from the book it is given.
  useEffect(() => {
    if (!open) return;
    setD(draftOf(book, defaultShelfId));
    setSlugEdited(!!book);
    setTouched(new Set());
    setTried(false);
    setPreview(null);
  }, [open, book, defaultShelfId]);

  useEffect(
    () => () => {
      if (coverPreview.current) URL.revokeObjectURL(coverPreview.current);
    },
    [],
  );

  const errors: BookErrors = useMemo(() => bookErrors(d, takenSlugs), [d, takenSlugs]);
  const valid = Object.keys(errors).length === 0;
  const shown = (k: keyof BookErrors) => (tried || touched.has(k) ? errors[k] : undefined);
  const touch = (k: string) => setTouched((t) => new Set(t).add(k));
  const set = <K extends keyof BookDraft>(k: K, v: BookDraft[K]) => setD((was) => ({ ...was, [k]: v }));

  const onTitle = (title: string) => setD((was) => ({ ...was, title, slug: slugEdited ? was.slug : slugify(title) }));

  const onCover = (file: File | null) => {
    if (coverPreview.current) URL.revokeObjectURL(coverPreview.current);
    coverPreview.current = file ? URL.createObjectURL(file) : null;
    setPreview(coverPreview.current);
    set('cover', file);
    touch('cover');
  };

  const submit = () => {
    setTried(true);
    if (!valid) return;
    const shelf = shelves.find((s) => s.id === d.shelf_id);
    const keepOrder = book && book.shelf_id === d.shelf_id;
    save.mutate(
      { draft: d, shelfSlug: shelf?.slug ?? 'books', sortOrder: keepOrder ? book.sort_order : nextSortOrder(d.shelf_id) },
      {
        onSuccess: () => {
          toast({ title: 'Book saved' });
          onClose();
        },
        onError: (e) => toast({ title: 'Book not saved', description: e instanceof Error ? e.message : String(e), variant: 'destructive' }),
      },
    );
  };

  const onRemove = () => {
    if (!book) return;
    if (!window.confirm(`Remove "${book.title ?? book.slug}" from the shelves? Readers will no longer see it.`)) return;
    remove.mutate(book, {
      onSuccess: () => {
        toast({ title: 'Book removed' });
        onClose();
      },
      onError: (e) => toast({ title: 'Book not removed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' }),
    });
  };

  const cover = preview ?? publicUrl(d.cover_path);
  const busy = save.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogTitle>{book ? 'Edit book' : 'Add a book'}</DialogTitle>
        <DialogDescription>A free book is a file readers download; a paid book links to where it is sold.</DialogDescription>
        <form
          className="space-y-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={id('title')} label="Title" error={shown('title')}>
              <Input id={id('title')} value={d.title} onChange={(e) => onTitle(e.target.value)} onBlur={() => touch('title')} aria-invalid={!!shown('title')} required />
            </Field>
            <Field id={id('slug')} label="Slug" error={shown('slug')} hint="The book's address: /books-academia/…">
              <Input
                id={id('slug')}
                value={d.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  set('slug', e.target.value.toLowerCase());
                }}
                onBlur={() => touch('slug')}
                aria-invalid={!!shown('slug')}
              />
            </Field>
            <Field id={id('author')} label="Author">
              <Input id={id('author')} value={d.author} onChange={(e) => set('author', e.target.value)} />
            </Field>
            <Field id={id('year')} label="Year" error={shown('year')}>
              <Input id={id('year')} inputMode="numeric" value={d.year} onChange={(e) => set('year', e.target.value)} onBlur={() => touch('year')} aria-invalid={!!shown('year')} />
            </Field>
          </div>

          <Field id={id('shelf')} label="Shelf" error={shown('shelf_id')}>
            <Select
              value={d.shelf_id || undefined}
              onValueChange={(v) => {
                set('shelf_id', v);
                touch('shelf_id');
              }}
            >
              <SelectTrigger id={id('shelf')} aria-invalid={!!shown('shelf_id')}>
                <SelectValue placeholder="Choose a shelf" />
              </SelectTrigger>
              <SelectContent>
                {shelves.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id={id('cover')} label="Cover" error={shown('cover')} hint="JPG, PNG or WebP, at most 2 MB. Optional.">
            <div className="flex items-center gap-4">
              <div className="aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-sm border border-border bg-secondary">
                {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
              </div>
              <Input id={id('cover')} type="file" accept={COVER_TYPES.join(',')} onChange={(e) => onCover(e.target.files?.[0] ?? null)} />
            </div>
          </Field>

          <div className="space-y-1.5">
            <Label id={id('access-label')}>Access</Label>
            <RadioGroup value={d.access} onValueChange={(v) => set('access', v as BookDraft['access'])} aria-labelledby={id('access-label')} className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="free" id={id('free')} />
                <Label htmlFor={id('free')} className="font-normal">
                  Free (download)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="paid" id={id('paid')} />
                <Label htmlFor={id('paid')} className="font-normal">
                  Paid (buy link)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {d.access === 'free' ? (
            <div className="grid gap-4">
              <Field id={id('file')} label="File" error={shown('file')} hint={d.filepath && !d.file ? `Stored: ${d.filepath.split('/').pop()}. Choose a file to replace it.` : 'PDF or EPUB, at most 50 MB.'}>
                <Input
                  id={id('file')}
                  type="file"
                  accept=".pdf,.epub,application/pdf,application/epub+zip"
                  onChange={(e) => {
                    set('file', e.target.files?.[0] ?? null);
                    touch('file');
                  }}
                  aria-invalid={!!shown('file')}
                />
              </Field>
              <Field id={id('license')} label="License note" error={shown('license_note')} hint="Why this book can be redistributed, e.g. CC BY 4.0">
                <Input id={id('license')} value={d.license_note} onChange={(e) => set('license_note', e.target.value)} onBlur={() => touch('license_note')} aria-invalid={!!shown('license_note')} />
              </Field>
            </div>
          ) : (
            <Field id={id('url')} label="Purchase URL" error={shown('purchase_url')} hint="Must start with https://">
              <Input id={id('url')} type="url" value={d.purchase_url} onChange={(e) => set('purchase_url', e.target.value)} onBlur={() => touch('purchase_url')} aria-invalid={!!shown('purchase_url')} placeholder="https://" />
            </Field>
          )}

          <div className="space-y-1.5">
            <Label id={id('synopsis')}>Synopsis</Label>
            <SynopsisEditor
              key={`${open}-${book?.id ?? 'new'}`}
              initial={(book?.synopsis_json as JSONContent | null) ?? null}
              labelledBy={id('synopsis')}
              onChange={(doc, html) => setD((was) => ({ ...was, synopsis_json: doc as BookDraft['synopsis_json'], synopsis_html: html }))}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch id={id('published')} checked={d.published} onCheckedChange={(v) => set('published', v)} />
            <Label htmlFor={id('published')} className="font-normal">
              Published (readers can see it)
            </Label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            {book ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={onRemove} disabled={busy}>
                Remove book
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={!valid || busy}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
