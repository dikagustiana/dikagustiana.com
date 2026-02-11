/**
 * Shared TipTap extension configuration.
 *
 * Used by:
 *  - UnifiedEditor (interactive editing)
 *  - serialize.ts  (JSON → HTML conversion)
 *
 * This is the single source of truth for which node types
 * the editor supports. Adding a node here enables it everywhere.
 */

import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { FigureExtension } from '@/components/editorial/FigureExtension';

/** Extensions for the interactive editor (includes placeholder UX). */
export function getEditorExtensions(placeholder = 'Start writing...') {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline cursor-pointer hover:text-primary/80',
      },
    }),
    FigureExtension,
  ];
}
