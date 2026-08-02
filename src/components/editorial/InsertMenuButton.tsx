/**
 * The `+` in the left gutter — the second entry point to the insert menu.
 *
 * It renders the SAME items as the slash command, from `insertMenu.ts`. The
 * two paths differ only in what they clean up afterwards: `/` deletes the
 * query text it was triggered by, `+` has nothing to delete.
 *
 * It tracks the caret's current block so the button sits beside the line the
 * writer is on, which is what makes it feel like part of the document rather
 * than a floating control.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildInsertItems, type InsertMenuOptions } from '@/lib/tiptap/insertMenu';
import { cn } from '@/lib/utils';

interface InsertMenuButtonProps extends InsertMenuOptions {
  editor: Editor | null;
  /** The scrolling container the gutter is positioned within. */
  containerRef: React.RefObject<HTMLElement>;
}

export function InsertMenuButton({ editor, containerRef, ...options }: InsertMenuButtonProps) {
  const [top, setTop] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const frame = useRef(0);

  const items = buildInsertItems(options);

  // Follow the caret's block. Reading coordsAtPos is a layout read, so it is
  // throttled to one per painted frame like every other scroll-linked read.
  const reposition = useCallback(() => {
    if (!editor || !containerRef.current) return;
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const container = containerRef.current;
      if (!editor || !container) return;
      try {
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);
        const box = container.getBoundingClientRect();
        setTop(coords.top - box.top + container.scrollTop);
      } catch {
        // coordsAtPos throws while the view is being torn down.
        setTop(null);
      }
    });
  }, [editor, containerRef]);

  useEffect(() => {
    if (!editor) return;
    reposition();
    editor.on('selectionUpdate', reposition);
    editor.on('transaction', reposition);
    editor.on('focus', reposition);
    return () => {
      editor.off('selectionUpdate', reposition);
      editor.off('transaction', reposition);
      editor.off('focus', reposition);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [editor, reposition]);

  if (!editor || top === null) return null;

  return (
    <div
      // In the gutter, not on top of the writing. At `left-0` the button sat
      // over the first ~28px of the current line and swallowed clicks meant
      // for the text — the caret would not go where it was put. The canvas
      // reserves the space this pulls into (WriterEditor: pl-10 / sm:pl-16).
      className="pointer-events-none absolute -left-8 z-10 -translate-y-1"
      style={{ top }}
      aria-hidden={false}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Insert block"
            title="Insert block"
            className={cn(
              'pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full',
              'border border-border bg-background text-muted-foreground',
              'transition-colors hover:border-foreground/30 hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              // Quiet until wanted: visible on hover/focus of the canvas, and
              // whenever the menu is open.
              open ? 'opacity-100' : 'opacity-0 group-hover/canvas:opacity-100 focus:opacity-100',
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" sideOffset={6} className="w-64">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.id}
                className="gap-3 py-2"
                onSelect={e => {
                  e.preventDefault();
                  setOpen(false);
                  // null range: nothing to delete, unlike the slash path.
                  item.run(editor, null);
                }}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm leading-tight">{item.title}</span>
                  <span className="text-xs leading-tight text-muted-foreground">{item.hint}</span>
                </span>
                {item.isNew && (
                  <span className="ml-auto rounded-full bg-accent-editorial px-1.5 py-px text-[10px] font-semibold uppercase text-white">
                    New
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
