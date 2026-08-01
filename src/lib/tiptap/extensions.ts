/**
 * Shared TipTap extension configuration — the single source of truth for
 * which node types the editor supports.
 *
 * Every editing surface builds from this function. No component configures
 * its own extension list: two lists drift, and a node present in one and
 * absent in the other is silently dropped the moment content crosses between
 * them.
 *
 * ── The four-place contract ────────────────────────────────────────────────
 * A block type is only real when it is registered in all four of:
 *   1. this file                       — so the editor will accept it
 *   2. src/lib/tiptap/serialize.ts     — so JSON → HTML keeps it
 *   3. components/editorial/ArticleBody — so the published page renders it
 *   4. src/lib/sanitizeHtml.ts         — so the sanitizer does not strip it
 * Miss one and the block vanishes without an error. Adding a node here is
 * therefore the first of four edits, never the only one.
 */

import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { FigureExtension } from '@/components/editorial/FigureExtension';
import { ImageUpload, type ImageUploadOptions } from './imageUpload';
import { SlashCommand, type SlashCommandOptions } from './slashCommand';

/** Link styling, shared so the editor and the published page agree. */
const LINK_CLASS = 'text-primary underline cursor-pointer hover:text-primary/80';

export interface EditorExtensionOptions {
  placeholder?: string;
  /** Paste / drag-drop image upload. Omit to leave uploads disabled. */
  upload?: ImageUploadOptions;
  /** Slash-command menu wiring. Omit to leave the menu off. */
  slash?: SlashCommandOptions;
}

/**
 * Extensions for the interactive editor.
 *
 * `Link` is configured *inside* StarterKit rather than added alongside it.
 * StarterKit v3 bundles @tiptap/extension-link, so registering a standalone
 * copy produces a duplicate-extension warning and two competing schemas for
 * the same mark.
 */
export function getEditorExtensions(options: EditorExtensionOptions = {}) {
  const { placeholder = 'Start writing...', upload, slash } = options;

  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: {
        openOnClick: false,
        HTMLAttributes: { class: LINK_CLASS },
      },
    }),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),

    // Bare images: pasted markup, and legacy HTML bodies that contain <img>
    // with no surrounding <figure>. Without this node both are discarded.
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: { class: 'w-full h-auto rounded-md' },
    }),

    // Editorial figure: image plus caption, alt text and source attribution.
    FigureExtension,

    Table.configure({ resizable: true, allowTableNodeSelection: true }),
    TableRow,
    TableHeader,
    TableCell,

    ImageUpload.configure(upload ?? {}),
    SlashCommand.configure(slash ?? {}),
  ];
}

/**
 * Extensions for non-interactive use (JSON → HTML, tests, any consumer that
 * needs the schema but no editing affordances). Same node types, minus the
 * placeholder, upload and slash-menu UX.
 */
export function getSchemaExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: { openOnClick: false, HTMLAttributes: { class: LINK_CLASS } },
    }),
    Image.configure({ inline: false, allowBase64: false }),
    FigureExtension,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
  ];
}
