/**
 * EssayEditor — the essay body, and the only editor in the product.
 *
 * Formatting lives in the PERSISTENT TOOLBAR (EditorToolbar), mounted by the
 * page above this canvas. This deliberately reverses the earlier
 * selection-only bubble menu: the owner directed a Substack replication, and
 * Substack formats from a standing toolbar. The reversal is recorded in
 * docs/DECISIONS.md and supersedes the old GATE S2 (docs/GATE_LEDGER.md).
 *
 * Block insertion has two entry points sharing ONE list
 * (src/lib/tiptap/insertMenu.ts): the gutter `+` / `/` slash menu, and the
 * toolbar's More ▾ menu. Never two lists — two lists drift.
 *
 * Node types come from `getEditorExtensions()`; see
 * src/lib/tiptap/extensions.ts for the five-place content contract.
 */

import { useEditor, useEditorState, EditorContent, Editor } from '@tiptap/react';
import DragHandle from '@tiptap/extension-drag-handle-react';
import type { JSONContent } from '@tiptap/core';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getEditorExtensions } from '@/lib/tiptap/extensions';
import type { InsertMenuOptions } from '@/lib/tiptap/insertMenu';
import { transformPastedHTML } from '@/lib/tiptap/pasteFromWord';
import { FigureUploader } from './FigureUploader';
import { FigureBlockData } from './FigureBlock';
import { LinkCardDialog } from './LinkCardDialog';
import { InsertMenuButton } from './InsertMenuButton';
import { MathDialog, type MathDialogState } from './toolbar/MathDialog';
import { FootnoteDialog, type FootnoteDialogState } from './toolbar/FootnoteDialog';
import type { LinkCardData } from './LinkCardBlock';
import 'katex/dist/katex.min.css';
import {
  Trash2,
  GripVertical,
  Columns3,
  Rows3,
} from 'lucide-react';

/** What the page needs to mount the toolbar above this canvas. */
export interface EditorSurface {
  editor: Editor;
  insertOptions: InsertMenuOptions;
}

interface EssayEditorProps {
  content: string;
  onChange: (content: string) => void;
  /**
   * Emits the TipTap document alongside the HTML. `content_json` is the
   * canonical body format and autosave stores it, so it is taken straight from
   * the editor rather than reparsed out of the HTML — the document is already
   * in memory and the round-trip is lossy.
   */
  onChangeJson?: (json: JSONContent) => void;
  /** The live editor + insert callbacks, for the page-level toolbar. */
  onSurfaceChange?: (surface: EditorSurface | null) => void;
  section: 'next-big-thing' | 'green-transition' | 'finance';
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

// ---------------------------------------------------------------------------
// Table controls — contextual, only while the caret is inside a table
// ---------------------------------------------------------------------------

function TableControls({ editor }: { editor: Editor }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1.5">
      <span className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Table
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
            <Columns3 className="h-3.5 w-3.5" />
            Column
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => editor.chain().focus().addColumnBefore().run()}>
            Insert left
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => editor.chain().focus().addColumnAfter().run()}>
            Insert right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => editor.chain().focus().deleteColumn().run()}>
            Delete column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
            <Rows3 className="h-3.5 w-3.5" />
            Row
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => editor.chain().focus().addRowBefore().run()}>
            Insert above
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => editor.chain().focus().addRowAfter().run()}>
            Insert below
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => editor.chain().focus().toggleHeaderRow().run()}>
            Toggle header row
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => editor.chain().focus().deleteRow().run()}>
            Delete row
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs"
        onClick={() => editor.chain().focus().mergeOrSplit().run()}
      >
        Merge / split
      </Button>

      <div className="ml-auto">
        {/* Destructive, so it stays ghost-weight until pressed. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete table
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export function EssayEditor({
  content,
  onChange,
  onChangeJson,
  onSurfaceChange,
  section,
  placeholder = 'Start writing...',
  className,
  minHeight = '60vh',
}: EssayEditorProps) {
  const [showFigureUploader, setShowFigureUploader] = useState(false);
  const [showLinkCard, setShowLinkCard] = useState(false);
  const [mathState, setMathState] = useState<MathDialogState | null>(null);
  const [footnoteState, setFootnoteState] = useState<FootnoteDialogState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // The dialog callbacks are wired into the extension list, which must not
  // rebuild when a dialog opens — rebuilding tears down the editor and loses
  // the selection and undo history. They read the live editor through a ref.
  const editorRef = useRef<Editor | null>(null);

  const openFigureUploader = useCallback(() => setShowFigureUploader(true), []);
  const openLinkCard = useCallback(() => setShowLinkCard(true), []);
  const openMathInsert = useCallback(() => setMathState({ latex: '', display: true }), []);
  const openMathEdit = useCallback(
    (params: { pos: number; latex: string; display: boolean }) => setMathState(params),
    [],
  );
  const openFootnoteEdit = useCallback(
    (pos: number, text: string) => setFootnoteState({ pos, text }),
    [],
  );
  const insertFootnoteFlow = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    // Nothing is written until the dialog saves — inserting a provisional
    // empty marker here would survive Cancel/Escape, get autosaved, and
    // publish as a blank footnote entry.
    const pos = ed.state.selection.from;
    setFootnoteState({ pos, text: '', insert: true });
  }, []);

  // ONE options object feeds the slash menu, the gutter `+` and (via
  // onSurfaceChange) the toolbar's More ▾ — the single-list guarantee.
  const insertOptions = useMemo<InsertMenuOptions>(
    () => ({
      onInsertFigure: openFigureUploader,
      onInsertLinkCard: openLinkCard,
      onInsertMath: openMathInsert,
      onInsertFootnote: insertFootnoteFlow,
    }),
    [openFigureUploader, openLinkCard, openMathInsert, insertFootnoteFlow],
  );

  // Rebuilding the extension list would tear down and recreate the editor,
  // losing the selection and the undo history on every render.
  const extensions = useMemo(
    () =>
      getEditorExtensions({
        placeholder,
        upload: {
          folder: section,
          onError: message =>
            toast({ title: 'Upload failed', description: message, variant: 'destructive' }),
          onSuccess: () => toast({ title: 'Image added' }),
        },
        slash: insertOptions,
        onEditMath: openMathEdit,
        onEditFootnote: openFootnoteEdit,
      }),
    [placeholder, section, toast, insertOptions, openMathEdit, openFootnoteEdit],
  );

  // The last HTML this editor emitted. The parent mirrors the document as an
  // HTML string and can also push a new one in (load, recovery restore), so the
  // sync effect below has to tell those two apart. Comparing against
  // `editor.getHTML()` is not enough: if any node's HTML does not survive a
  // parse/serialise round trip byte-for-byte, the comparison never settles, the
  // editor re-parses its own output on every keystroke, and — because that
  // re-parse is deliberately silent — `content` advances while `content_json`
  // freezes. That is not hypothetical: it is how a saved essay ended up with an
  // HTML column and a JSON column describing different documents.
  const lastEmittedHtml = useRef<string | null>(null);

  // TipTap ≥3.29 hands out the Editor before its view mounts (isDestroyed
  // reports true until then) and nulls the schema when an instance is torn
  // down — so any effect that reads the document must wait for onCreate and
  // guard against a destroyed instance. Without this, `editor.getHTML()` in
  // the sync effect crashed the whole editor page on a clean install:
  // "Cannot read properties of null (reading 'cached')".
  const [editorReady, setEditorReady] = useState(0);

  const editor = useEditor(
    {
      extensions,
      content,
      onCreate: () => setEditorReady(v => v + 1),
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        lastEmittedHtml.current = html;
        onChange(html);
        onChangeJson?.(editor.getJSON());
      },
      editorProps: {
        // The owner writes in Word and pastes in. Without this, Word's
        // MsoNormal spans and inline styles reach ProseMirror, which keeps
        // what it recognises and drops the rest without a word.
        transformPastedHTML,
        attributes: {
          class: 'essay-prose focus:outline-none',
        },
      },
    },
    [extensions],
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Hand the live editor and the shared insert list to the page, which
  // mounts the persistent toolbar above this canvas.
  useEffect(() => {
    if (!editor) return;
    onSurfaceChange?.({ editor, insertOptions });
    return () => onSurfaceChange?.(null);
  }, [editor, insertOptions, onSurfaceChange]);

  // Sync content that came from OUTSIDE — the essay loading, a recovered draft
  // being restored. An echo of what this editor just emitted is ignored.
  // `editorReady` re-runs this once the view mounts; the isDestroyed guard
  // skips pre-mount and torn-down instances (see the note above useEditor).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (content === lastEmittedHtml.current) return;
    if (content === editor.getHTML()) return;

    lastEmittedHtml.current = content;
    editor.commands.setContent(content, { emitUpdate: false });
    // `emitUpdate: false` keeps this from looking like an edit, but it also
    // means the parent's JSON mirror would keep the document it had. Push the
    // fresh one so the two representations cannot disagree.
    onChangeJson?.(editor.getJSON());
  }, [content, editor, editorReady, onChangeJson]);

  const handleInsertFigure = useCallback(
    (data: FigureBlockData) => {
      if (!editor) return;
      editor.chain().focus().insertFigure(data).run();
      setShowFigureUploader(false);
    },
    [editor],
  );

  const handleInsertLinkCard = useCallback(
    (data: LinkCardData) => {
      if (!editor) return;
      editor.chain().focus().insertLinkCard(data).run();
      setShowLinkCard(false);
    },
    [editor],
  );

  // `editor.isActive()` reads current state and does not re-render on its own;
  // without subscribing, the table controls would appear only when some
  // unrelated state change happened to repaint this component.
  const inTable = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e?.isActive('table'),
  });

  return (
    <div className={cn('group/canvas relative', className)} ref={canvasRef}>
      {/* The insert affordance lives in the gutter beside the current line;
          `/` at the start of a line opens the same menu. */}
      <InsertMenuButton
        editor={editor}
        containerRef={canvasRef}
        onInsertFigure={openFigureUploader}
        onInsertLinkCard={openLinkCard}
        onInsertMath={openMathInsert}
        onInsertFootnote={insertFootnoteFlow}
      />

      {/* Contextual: table actions are meaningless outside a table, and a row
          of permanently-disabled buttons reads as broken rather than inactive.
          The wrapper is always mounted — a sibling that appears and disappears
          changes the child list React reconciles against and throws
          "insertBefore … not a child of this node", which is exactly what
          inserting a table used to do. */}
      <div data-editor-slot="table-controls">
        {editor && inTable ? <TableControls editor={editor} /> : null}
      </div>

      {editor && (
        <DragHandle editor={editor}>
          <div
            className="flex h-6 w-5 cursor-grab items-center justify-center rounded text-muted-foreground/50 opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover/canvas:opacity-100 active:cursor-grabbing"
            aria-label="Drag to reorder block"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </DragHandle>
      )}

      {showFigureUploader && (
        <div className="mb-4">
          <FigureUploader
            section={section}
            onInsert={handleInsertFigure}
            onCancel={() => setShowFigureUploader(false)}
          />
        </div>
      )}

      <LinkCardDialog
        open={showLinkCard}
        onOpenChange={setShowLinkCard}
        onInsert={handleInsertLinkCard}
      />

      {editor && <MathDialog editor={editor} state={mathState} onClose={() => setMathState(null)} />}
      {editor && (
        <FootnoteDialog editor={editor} state={footnoteState} onClose={() => setFootnoteState(null)} />
      )}

      <EditorContent editor={editor} />

      <style>{`
        .essay-prose {
          min-height: ${minHeight};
        }
        .essay-prose:focus {
          outline: none;
        }

        /* Typography, measure and rhythm come from the shared editorial type
           system in src/index.css — the SAME rules the published page reads
           (.prose-editorial), so the two surfaces cannot drift. Everything
           below is editor-only chrome. */
        .essay-prose p.is-empty:first-child::before,
        .essay-prose p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground) / 0.6);
          pointer-events: none;
          height: 0;
        }
        .essay-prose a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .essay-prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
        }
        .essay-prose .figure-block { margin: 2rem 0; }
        .essay-prose figure[data-type="figure-block"] { margin: 0; }
        .essay-prose figure[data-type="figure-block"].ProseMirror-selectednode {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
          border-radius: 0.5rem;
        }
        .essay-prose .link-card { text-decoration: none; }

        /* Math node views (KaTeX renders inside them). */
        .essay-prose .tiptap-mathematics-render {
          border-radius: 0.25rem;
        }
        .essay-prose .tiptap-mathematics-render--editable {
          cursor: pointer;
        }
        .essay-prose .tiptap-mathematics-render--editable:hover {
          background: hsl(var(--secondary));
        }
        .essay-prose div.tiptap-mathematics-render {
          display: block;
          text-align: center;
          margin: 24px 0;
          overflow-x: auto;
        }
        .essay-prose span.tiptap-mathematics-render {
          display: inline-block;
          padding: 0 1px;
        }
        .essay-prose .block-math-error,
        .essay-prose .inline-math-error {
          color: hsl(var(--destructive));
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.875em;
        }

        /* Footnote markers: numbering is a CSS counter over document order,
           so a marker can never disagree with its position. The published
           page renders real numbers (ArticleBody), same visual result. */
        .essay-prose {
          counter-reset: editorial-footnote;
        }
        .essay-prose sup[data-type="footnote"] {
          counter-increment: editorial-footnote;
        }
        .essay-prose sup[data-type="footnote"]::after {
          content: counter(editorial-footnote);
        }
        .essay-prose sup[data-type="footnote"]:hover {
          text-decoration: underline;
        }
        .essay-prose sup[data-type="footnote"].ProseMirror-selectednode {
          outline: 2px solid hsl(var(--accent-editorial));
          border-radius: 2px;
        }

        /* Tables */
        .essay-prose table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1.75rem 0;
          overflow: hidden;
          font-size: 1rem;
        }
        .essay-prose table td,
        .essay-prose table th {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem 0.75rem;
          vertical-align: top;
          position: relative;
          min-width: 3rem;
        }
        .essay-prose table th {
          background: hsl(var(--muted));
          font-weight: 600;
          text-align: left;
        }
        .essay-prose table p { margin-bottom: 0; font-size: 1rem; }
        .essay-prose table .selectedCell:after {
          content: "";
          position: absolute;
          inset: 0;
          background: hsl(var(--primary) / 0.12);
          pointer-events: none;
        }
        .essay-prose .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: hsl(var(--primary));
          pointer-events: none;
        }
        .essay-prose.resize-cursor { cursor: col-resize; }

        /* Upload placeholder — a decoration, never part of the document.
           Deliberately STATIC: the old 0.7s spinner looped forever on the
           writing canvas, and motion on a writing surface is unusually
           costly — the gate caps canvas animation at 200ms, and a 200ms/rev
           spinner is frantic. The dashed box + text is the feedback; the
           toast confirms completion. */
        .essay-image-uploading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 1.5rem 0;
          padding: 1.25rem;
          border: 1px dashed hsl(var(--border));
          border-radius: 0.5rem;
          background: hsl(var(--muted) / 0.4);
          color: hsl(var(--muted-foreground));
          font-size: 0.875rem;
        }

        /* Slash-command menu */
        .tiptap-slash-menu {
          position: fixed;
          z-index: 60;
          min-width: 15rem;
          /* Never wider than the screen it is clamped into — on a phone the
             min-width plus a long hint would otherwise push the page
             sideways. */
          max-width: calc(100vw - 1rem);
          max-height: 18rem;
          overflow-y: auto;
          padding: 0.25rem;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--popover));
          color: hsl(var(--popover-foreground));
          box-shadow: 0 10px 30px -10px hsl(var(--foreground) / 0.25);
        }
        .tiptap-slash-item {
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.05rem;
          padding: 0.4rem 0.55rem;
          border: 0;
          border-radius: 0.375rem;
          background: transparent;
          text-align: left;
          cursor: pointer;
        }
        .tiptap-slash-item:hover,
        .tiptap-slash-item[data-selected="true"] {
          background: hsl(var(--secondary));
        }
        .tiptap-slash-title { font-size: 0.875rem; font-weight: 500; }
        .tiptap-slash-hint { font-size: 0.75rem; color: hsl(var(--muted-foreground)); }
        .tiptap-slash-empty {
          padding: 0.5rem 0.55rem;
          font-size: 0.8125rem;
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </div>
  );
}

/** Plain text from an HTML body — used for word counts and reading time. */
export function getPlainTextFromHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}
