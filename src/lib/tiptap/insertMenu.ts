/**
 * The insert menu's item list — the single source for BOTH entry points.
 *
 * The `+` in the gutter and `/` at the start of a line open the same menu.
 * They share this list rather than each carrying their own, because two lists
 * drift: an item added to one and forgotten in the other is invisible from
 * half the product and nothing errors.
 *
 * INSERTIONS ONLY. Formatting — headings, lists, quote — lives in the bubble
 * menu on selection. The old slash menu mixed both jobs, which is why "Heading
 * 2" appeared in a menu whose other items added blocks.
 */

import type { Editor, Range } from '@tiptap/core';
import {
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
  Code2,
  Link2,
  type LucideIcon,
} from 'lucide-react';

export interface InsertMenuItem {
  /** Stable id, used to assert the two entry points agree. */
  id: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  keywords: string[];
  /**
   * `range` is the `/query` text to remove when invoked from the slash menu.
   * The gutter `+` passes null — there is nothing to delete.
   */
  run: (editor: Editor, range: Range | null) => void;
}

export interface InsertMenuOptions {
  /** Opens the figure dialog (upload / URL / alt text / caption). */
  onInsertFigure?: () => void;
  /** Opens the link-card dialog. */
  onInsertLinkCard?: () => void;
}

/** Clear the `/query` text before acting, so the command never leaves it behind. */
function chainAt(editor: Editor, range: Range | null) {
  const chain = editor.chain().focus();
  return range ? chain.deleteRange(range) : chain;
}

export function buildInsertItems(options: InsertMenuOptions = {}): InsertMenuItem[] {
  const items: InsertMenuItem[] = [];

  if (options.onInsertFigure) {
    items.push({
      id: 'image',
      title: 'Image',
      hint: 'Upload or link, with an optional caption',
      icon: ImageIcon,
      // "Figure" is what the node is called; "Image" is what the writer wants.
      // One item, named for the intent — there is only one image-ish node in
      // the schema, and a figure is an image plus an optional caption.
      keywords: ['image', 'figure', 'photo', 'picture', 'graph', 'chart', 'img'],
      run: (editor, range) => {
        chainAt(editor, range).run();
        options.onInsertFigure?.();
      },
    });
  }

  if (options.onInsertLinkCard) {
    items.push({
      id: 'link-card',
      title: 'Link preview',
      hint: 'A card linking to a page',
      icon: Link2,
      keywords: ['link', 'embed', 'preview', 'card', 'url', 'bookmark'],
      run: (editor, range) => {
        chainAt(editor, range).run();
        options.onInsertLinkCard?.();
      },
    });
  }

  items.push(
    {
      id: 'table',
      title: 'Table',
      hint: '3 × 3 with a header row',
      icon: TableIcon,
      keywords: ['table', 'grid', 'rows', 'columns'],
      run: (editor, range) =>
        chainAt(editor, range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      id: 'code-block',
      title: 'Code block',
      hint: 'Monospaced, for formulas and snippets',
      icon: Code2,
      keywords: ['code', 'pre', 'snippet', 'formula', 'mono'],
      run: (editor, range) => chainAt(editor, range).toggleCodeBlock().run(),
    },
    {
      id: 'divider',
      title: 'Divider',
      hint: 'A horizontal rule',
      icon: Minus,
      keywords: ['divider', 'rule', 'hr', 'separator', 'break'],
      run: (editor, range) => chainAt(editor, range).setHorizontalRule().run(),
    },
  );

  return items;
}

/** Case-insensitive filter over title and keyword prefixes. */
export function filterInsertItems(items: InsertMenuItem[], query: string): InsertMenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    item =>
      item.title.toLowerCase().includes(q) || item.keywords.some(k => k.startsWith(q)),
  );
}
