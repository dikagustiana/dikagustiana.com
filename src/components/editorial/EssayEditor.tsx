/**
 * EssayEditor — the essay body, and the only editor in the product.
 *
 * Two things this deliberately does NOT have:
 *
 *   1. A persistent formatting toolbar. Formatting appears on selection and
 *      nowhere else. A standing toolbar and a selection toolbar are two
 *      surfaces competing for one job, and the standing one wins the writer's
 *      attention while they are trying to write.
 *   2. Its own extension list. Node types come from `getEditorExtensions()`;
 *      see src/lib/tiptap/extensions.ts for the four-place content contract.
 *
 * Insertion is the gutter `+` and `/` at the start of a line — the same menu
 * from the same list (src/lib/tiptap/insertMenu.ts), never two lists.
 */

import { useEditor, useEditorState, EditorContent, Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import DragHandle from '@tiptap/extension-drag-handle-react';
import type { JSONContent } from '@tiptap/core';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getEditorExtensions } from '@/lib/tiptap/extensions';
import { transformPastedHTML } from '@/lib/tiptap/pasteFromWord';
import { FigureUploader } from './FigureUploader';
import { FigureBlockData } from './FigureBlock';
import { LinkCardDialog } from './LinkCardDialog';
import { InsertMenuButton } from './InsertMenuButton';
import type { LinkCardData } from './LinkCardBlock';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  Quote,
  Link as LinkIcon,
  Unlink,
  Trash2,
  GripVertical,
  Columns3,
  Rows3,
} from 'lucide-react';

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
  section: 'next-big-thing' | 'green-transition' | 'finance';
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

/** Prompt for a URL and apply it to the current selection. */
function useSetLink(editor: Editor | null) {
  return useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);
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
  section,
  placeholder = 'Start writing...',
  className,
  minHeight = '60vh',
}: EssayEditorProps) {
  const [showFigureUploader, setShowFigureUploader] = useState(false);
  const [showLinkCard, setShowLinkCard] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const openFigureUploader = useCallback(() => setShowFigureUploader(true), []);
  const openLinkCard = useCallback(() => setShowLinkCard(true), []);

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
        slash: { onInsertFigure: openFigureUploader, onInsertLinkCard: openLinkCard },
      }),
    [placeholder, section, toast, openFigureUploader, openLinkCard],
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

  const editor = useEditor(
    {
      extensions,
      content,
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

  // Sync content that came from OUTSIDE — the essay loading, a recovered draft
  // being restored. An echo of what this editor just emitted is ignored.
  useEffect(() => {
    if (!editor) return;
    if (content === lastEmittedHtml.current) return;
    if (content === editor.getHTML()) return;

    lastEmittedHtml.current = content;
    editor.commands.setContent(content, { emitUpdate: false });
    // `emitUpdate: false` keeps this from looking like an edit, but it also
    // means the parent's JSON mirror would keep the document it had. Push the
    // fresh one so the two representations cannot disagree.
    onChangeJson?.(editor.getJSON());
  }, [content, editor, onChangeJson]);

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

  const setLink = useSetLink(editor);

  // `editor.isActive()` reads current state and does not re-render on its own;
  // without subscribing, the table controls would appear only when some
  // unrelated state change happened to repaint this component.
  const inTable = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e?.isActive('table'),
  });

  const bubbleButton = 'h-7 w-7';

  return (
    <div className={cn('group/canvas relative', className)} ref={canvasRef}>
      {/* The insert affordance lives in the gutter beside the current line,
          not in a toolbar. `/` at the start of a line opens the same menu. */}
      <InsertMenuButton
        editor={editor}
        containerRef={canvasRef}
        onInsertFigure={openFigureUploader}
        onInsertLinkCard={openLinkCard}
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
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md"
          // Text selections only — a selected figure, image or link card has
          // its own affordances and does not want a bold/italic bar over it.
          shouldShow={({ editor: e, from, to }) =>
            from !== to &&
            !e.isActive('figure') &&
            !e.isActive('image') &&
            !e.isActive('linkCard')
          }
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(bubbleButton, editor.isActive('bold') && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(bubbleButton, editor.isActive('italic') && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(bubbleButton, editor.isActive('strike') && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(bubbleButton, editor.isActive('link') && 'bg-secondary')}
            onClick={setLink}
            title="Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
          {editor.isActive('link') && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={bubbleButton}
              onClick={() => editor.chain().focus().unsetLink().run()}
              title="Remove link"
            >
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          )}

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          {/* The body allows two heading levels. They are the schema's h2 and
              h3 — h1 is the essay title, which is a database field, not a
              body block — so these are labelled by role, not by tag number. */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(bubbleButton, editor.isActive('heading', { level: 2 }) && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(bubbleButton, editor.isActive('heading', { level: 3 }) && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Subheading"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(bubbleButton, editor.isActive('blockquote') && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <Quote className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(bubbleButton, editor.isActive('bulletList') && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </BubbleMenu>
      )}

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

      <EditorContent editor={editor} />

      <style>{`
        .essay-prose {
          min-height: ${minHeight};
        }
        .essay-prose:focus {
          outline: none;
        }

        /* The measure. Set explicitly rather than inherited from a prose
           class, so the writing column is a decision instead of an accident. */
        .essay-prose,
        .essay-prose p,
        .essay-prose h2,
        .essay-prose h3,
        .essay-prose ul,
        .essay-prose ol,
        .essay-prose blockquote,
        .essay-prose pre {
          max-width: 680px;
        }
        .essay-prose p {
          font-size: 1.125rem;
          line-height: 1.75;
          margin-bottom: 1.25rem;
          color: hsl(var(--foreground));
        }
        .essay-prose p.is-empty:first-child::before,
        .essay-prose p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground) / 0.6);
          pointer-events: none;
          height: 0;
        }
        .essay-prose h2 {
          font-family: var(--font-display, inherit);
          font-size: 1.625rem;
          line-height: 1.3;
          font-weight: 650;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
        }
        .essay-prose h3 {
          font-family: var(--font-display, inherit);
          font-size: 1.25rem;
          line-height: 1.4;
          font-weight: 650;
          margin-top: 2rem;
          margin-bottom: 0.5rem;
        }
        .essay-prose ul,
        .essay-prose ol {
          padding-left: 1.5rem;
          margin-bottom: 1.25rem;
          font-size: 1.125rem;
          line-height: 1.75;
        }
        .essay-prose ul { list-style: disc; }
        .essay-prose ol { list-style: decimal; }
        .essay-prose li { margin-bottom: 0.35rem; }
        .essay-prose a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .essay-prose strong { font-weight: 650; }
        .essay-prose blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding-left: 1.25rem;
          margin: 1.75rem 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }
        .essay-prose pre {
          background: hsl(var(--muted));
          padding: 0.875rem 1rem;
          border-radius: 0.375rem;
          overflow-x: auto;
          font-size: 0.9375rem;
          margin: 1.5rem 0;
        }
        .essay-prose code {
          background: hsl(var(--muted));
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        .essay-prose pre code { background: none; padding: 0; }
        .essay-prose hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 2rem 0;
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

        /* Tables */
        .essay-prose table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          max-width: 680px;
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

        /* Upload placeholder — a decoration, never part of the document. */
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
        .essay-image-uploading::before {
          content: "";
          width: 0.875rem;
          height: 0.875rem;
          border-radius: 9999px;
          border: 2px solid hsl(var(--muted-foreground) / 0.3);
          border-top-color: hsl(var(--primary));
          animation: essay-image-spin 0.7s linear infinite;
        }
        @keyframes essay-image-spin {
          to { transform: rotate(360deg); }
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
