/**
 * Shared TipTap extension configuration — the single source of truth for
 * which node types the editor supports.
 *
 * Every editing surface builds from this function. No component configures
 * its own extension list: two lists drift, and a node present in one and
 * absent in the other is silently dropped the moment content crosses between
 * them.
 *
 * ── The five-place contract ───────────────────────────────────────────────
 * A block type is only real when it is registered in all of:
 *   1. this file                       — so the editor will accept it
 *   2. src/lib/tiptap/serialize.ts     — so JSON → HTML keeps it
 *   3. components/editorial/ArticleBody — so the published page renders it
 *   4. src/lib/sanitizeHtml.ts         — so the sanitizer does not strip it
 *   5. tests/unit/editorHtmlRoundTrip.test.ts — so parse(render(x)) is
 *      byte-stable; an unstable node makes `content` advance while
 *      `content_json` freezes, and the row holds two disagreeing documents.
 * Miss one and the block vanishes without an error. Adding a node here is
 * therefore the first of five edits, never the only one.
 */

import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Blockquote } from '@tiptap/extension-blockquote';
import { TextStyle, Color, BackgroundColor } from '@tiptap/extension-text-style';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextAlign from '@tiptap/extension-text-align';
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import { FigureExtension } from '@/components/editorial/FigureExtension';
import { LinkCardExtension } from './linkCard';
import { Callout } from './callout';
import { Footnote, type FootnoteOptions } from './footnote';
import { ImageUpload, type ImageUploadOptions } from './imageUpload';
import { SlashCommand, type SlashCommandOptions } from './slashCommand';

/** Link styling, shared so the editor and the published page agree. */
const LINK_CLASS = 'text-primary underline cursor-pointer hover:text-primary/80';

/**
 * Every heading level the Style ▾ menu offers. The schema used to allow only
 * h2/h3; the Substack replication widens it to the full six so no menu item
 * silently does nothing (docs/DECISIONS.md, "Heading levels").
 */
export const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

/**
 * Blockquote with a display variant: 'quote' (accent rail) or 'pull'
 * (centred, larger, no rail). One node, one attribute — a pull quote is a
 * presentation of a quote, not a different kind of content.
 *
 * Round-trip: the default variant renders NO attribute, so a plain
 * <blockquote> stays a plain <blockquote> byte-for-byte.
 */
export const EditorialBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      variant: {
        default: 'quote',
        parseHTML: element =>
          element.getAttribute('data-variant') === 'pull' ? 'pull' : 'quote',
        renderHTML: attributes =>
          attributes.variant === 'pull' ? { 'data-variant': 'pull' } : {},
      },
    };
  },
});

export interface EditorExtensionOptions {
  placeholder?: string;
  /** Paste / drag-drop image upload. Omit to leave uploads disabled. */
  upload?: ImageUploadOptions;
  /** Slash-command menu wiring. Omit to leave the menu off. */
  slash?: SlashCommandOptions;
  /** Click-to-edit wiring for math nodes. */
  onEditMath?: (params: { pos: number; latex: string; display: boolean }) => void;
  /** Click-to-edit wiring for footnote markers. */
  onEditFootnote?: FootnoteOptions['onEdit'];
}

/** The extension set shared by the editor and the schema-only consumer. */
function baseExtensions(interactive: EditorExtensionOptions | null) {
  return [
    StarterKit.configure({
      heading: { levels: [...HEADING_LEVELS] },
      // Replaced by EditorialBlockquote below (same node name, plus the
      // variant attribute) — registering both would duplicate the schema.
      blockquote: false,
      link: {
        openOnClick: false,
        HTMLAttributes: { class: LINK_CLASS },
      },
    }),
    EditorialBlockquote,

    // Inline colour and highlight: ONE textStyle mark carrying `color` and
    // `backgroundColor`, so the two palette popovers are the same component
    // writing to the same span.
    TextStyle,
    Color,
    BackgroundColor,

    Superscript,
    Subscript,

    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),

    // Math nodes render KaTeX client-side from data-latex; the stored HTML
    // carries only the source, never KaTeX's output markup.
    BlockMath.configure(
      interactive?.onEditMath
        ? {
            onClick: (node, pos) =>
              interactive.onEditMath?.({ pos, latex: String(node.attrs.latex ?? ''), display: true }),
          }
        : {},
    ),
    InlineMath.configure(
      interactive?.onEditMath
        ? {
            onClick: (node, pos) =>
              interactive.onEditMath?.({ pos, latex: String(node.attrs.latex ?? ''), display: false }),
          }
        : {},
    ),

    Footnote.configure({ onEdit: interactive?.onEditFootnote }),
    Callout,

    // Bare images: pasted markup, and legacy HTML bodies that contain <img>
    // with no surrounding <figure>. Without this node both are discarded.
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: { class: 'w-full h-auto rounded-md' },
    }),

    // Editorial figure: image plus caption, alt text and source attribution.
    FigureExtension,

    // Link preview card. Client-side, no iframe — see linkCard.ts.
    LinkCardExtension,

    Table.configure({ resizable: !!interactive, allowTableNodeSelection: true }),
    TableRow,
    TableHeader,
    TableCell,
  ];
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
    ...baseExtensions(options),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
    }),
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
  return baseExtensions(null);
}
