/**
 * /admin/books (site cleanup 2026-10, PRD D6; 03-DESIGN §6), behind RequireAdmin: the shelves on one side,
 * the chosen shelf's books on the other (stacked on a narrow screen, side by side from lg). Books are added,
 * edited, reordered within their shelf, moved to another shelf (the form's Shelf field), published,
 * unpublished and removed (soft) here. RLS is what stops anyone else: every write is admin-only.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccessBadge } from '@/components/books/BookCard';
import { BookForm } from '@/components/books/BookForm';
import { ShelfAdmin } from '@/components/books/ShelfAdmin';
import { useToast } from '@/hooks/use-toast';
import { useAdminShelves, useReorderBooks, type Book } from '@/hooks/queries/useBooks';

export default function AdminBooks() {
  const { data: shelves, isLoading, error, refetch } = useAdminShelves();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Book | 'new' | null>(null);
  const reorder = useReorderBooks();
  const { toast } = useToast();

  useEffect(() => {
    if (!shelves?.length) return;
    if (!selected || !shelves.some((s) => s.id === selected)) setSelected(shelves[0].id);
  }, [shelves, selected]);

  const shelf = shelves?.find((s) => s.id === selected) ?? null;
  const [rows, setRows] = useState<Book[]>([]);
  useEffect(() => setRows(shelf?.books ?? []), [shelf]);

  const allBooks = useMemo(() => shelves?.flatMap((s) => s.books) ?? [], [shelves]);
  const editingBook = editing && editing !== 'new' ? editing : null;
  const takenSlugs = useMemo(() => allBooks.filter((b) => b.id !== editingBook?.id).map((b) => b.slug), [allBooks, editingBook]);
  const nextSortOrder = (shelfId: string) => {
    const books = shelves?.find((s) => s.id === shelfId)?.books ?? [];
    return books.length ? Math.max(...books.map((b) => b.sort_order)) + 1 : 0;
  };

  const move = (from: number, to: number) => {
    if (reorder.isPending || to < 0 || to >= rows.length) return;
    const previous = rows;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setRows(next);
    reorder.mutate(
      next.map((b) => b.id),
      {
        onError: () => {
          setRows(previous);
          toast({ title: 'Order not saved', description: 'The previous order is kept.', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <PageLayout
      variant="dashboard"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Admin', path: '/admin/dashboard' },
        { label: 'Books' },
      ]}
    >
      <SEO title="Books — Admin" description="Manage the shelves and books." />
      <div className="container py-8">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">Books</h1>
          <Link to="/books-academia" className="text-sm text-accent hover:underline">
            See the Books page →
          </Link>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState title="Couldn't load the shelves" message={error instanceof Error ? error.message : 'The shelves could not be fetched just now.'} onRetry={() => refetch()} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <ShelfAdmin shelves={shelves ?? []} selected={selected} onSelect={setSelected} />

            <section aria-labelledby="books-heading">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id="books-heading" className="min-w-0 truncate text-lg font-semibold">
                  {shelf ? `Books in: ${shelf.name}` : 'Books'}
                </h2>
                <Button size="sm" onClick={() => setEditing('new')} disabled={!shelves?.length}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                  Add book
                </Button>
              </div>
              {!shelves?.length ? (
                <p className="text-sm text-muted-foreground">Add a shelf first; every book sits on one.</p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No books on this shelf yet.</p>
              ) : (
                <ol className="divide-y divide-border rounded-md border border-border">
                  {rows.map((b, i) => (
                    <li key={b.id} className="flex items-center gap-1 px-2 py-1.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move "${b.title ?? b.slug}" up`} title="Up" disabled={reorder.isPending || i === 0} onClick={() => move(i, i - 1)}>
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move "${b.title ?? b.slug}" down`} title="Down" disabled={reorder.isPending || i === rows.length - 1} onClick={() => move(i, i + 1)}>
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium">{b.title ?? b.slug}</span>
                      <AccessBadge access={b.access} />
                      <Badge variant={b.published ? 'secondary' : 'outline'} className="mx-1 text-[11px]">
                        {b.published ? 'Published' : 'Draft'}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(b)}>
                        Edit
                      </Button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </div>

      <BookForm
        open={!!editing}
        book={editingBook}
        shelves={shelves ?? []}
        defaultShelfId={selected}
        takenSlugs={takenSlugs}
        nextSortOrder={nextSortOrder}
        onClose={() => setEditing(null)}
      />
    </PageLayout>
  );
}
