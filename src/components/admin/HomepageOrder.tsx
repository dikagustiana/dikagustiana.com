/**
 * The homepage order: the starred essays, in the order the glimpse shows
 * them. Every published essay is on the homepage; the star in the content
 * list decides WHO leads it (essays.is_selected), this panel decides in
 * what order (essays.selected_rank), and the unstarred follow newest first.
 * Position 1 is the first column a reader sees. Drafts are listed too, so
 * a piece can be placed before it goes live: it holds its slot and appears
 * the moment it is published.
 *
 * A row is moved by dragging it (docs/prd/2026-10-fia-fixes item 11): with
 * the pointer by its handle, or from the keyboard (focus the handle, Space to
 * lift, the arrow keys to move, Space to drop, Escape to cancel). "To the
 * front" stays as one click. The panel is #homepage-order, which the
 * Glimpse's "Edit order" link opens.
 *
 * Every move writes the whole order at once and shows it at once; if the
 * write fails the previous order comes back. Until the selected_rank
 * migration is on production the list is read-only and says why, and the
 * homepage shows newest first.
 */
import { useEffect, useState } from 'react';
import { ChevronsUp, GripVertical } from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSaveSelectedOrder, useSelectedOrder, type SelectedOrderRow } from '@/hooks/queries/useUnifiedContent';
import { sectionLabel } from '@/lib/sectionLabels';

const HOMEPAGE_ORDER_ID = 'homepage-order';

function Row({ row, index, locked, onFront }: { row: SelectedOrderRow; index: number; locked: boolean; onFront: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled: locked });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 bg-background px-3 py-2 ${isDragging ? 'relative z-10 shadow-md' : ''}`}
      data-order-row={row.id}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Drag "${row.title}", position ${index + 1}`}
        disabled={locked}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
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
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="To the front" aria-label={`Move "${row.title}" to the front`} disabled={locked || index === 0} onClick={onFront}>
        <ChevronsUp className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  );
}

export function HomepageOrder() {
  const { data, isLoading, error } = useSelectedOrder();
  const save = useSaveSelectedOrder();
  const { toast } = useToast();
  const [rows, setRows] = useState<SelectedOrderRow[]>([]);

  useEffect(() => {
    if (data) setRows(data.rows);
  }, [data]);

  const locked = !!data?.missingColumn || save.isPending;
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Opened from the homepage's "Edit order" link: bring the panel into view once it is there.
  useEffect(() => {
    if (window.location.hash !== `#${HOMEPAGE_ORDER_ID}`) return;
    document.getElementById(HOMEPAGE_ORDER_ID)?.scrollIntoView?.({ block: 'start' });
  }, [data]);

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

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(rows.findIndex((r) => r.id === active.id), rows.findIndex((r) => r.id === over.id));
  };

  return (
    <Card className="mb-8 scroll-mt-24" id={HOMEPAGE_ORDER_ID}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Homepage order</CardTitle>
        <CardDescription>Starred essays, in the order the homepage shows them. Drag a row to move it; the rest follow newest first.</CardDescription>
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <ol className="divide-y divide-border rounded-md border border-border" aria-label="Homepage order: drag a row, or focus its handle and press Space, then the arrow keys">
                {rows.map((row, i) => (
                  <Row key={row.id} row={row} index={i} locked={locked} onFront={() => move(i, 0)} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
