/**
 * EssayEditor — the essay body editor.
 *
 * The one editing surface for essay bodies. Three others (WriterModeEditor,
 * InlineEssayEditor, EssayBodyEditor, all built on RichTextEditor, plus the
 * WriterStudio/UnifiedEditor stack) have been removed: each configured its own
 * extension list, so a block written in one could be silently discarded by
 * another.
 *
 * Extensions come from `getEditorExtensions()` and are not configured here.
 * See src/lib/tiptap/extensions.ts for the four-place content contract.
 */

import { useEditor, useEditorState, EditorContent, Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import DragHandle from '@tiptap/extension-drag-handle-react';
import type { JSONContent } from '@tiptap/core';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { FigureUploader } from './FigureUploader';
import { FigureBlockData } from './FigureBlock';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  Minus,
  ImagePlus,
  MoreHorizontal,
  Table as TableIcon,
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
   * canonical body format (writing-layout-spec §3.2) and autosave stores it,
   * so it is taken straight from the editor rather than reparsed out of the
   * HTML — the document is already in memory and the round-trip is lossy.
   */
  onChangeJson?: (json: JSONContent) => void;
  section: 'next-big-thing' | 'green-transition' | 'finance';
  placeholder?: string;
  className?: string;
  minHeight?: string;
  distractionFree?: boolean;
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
// Toolbar
// ---------------------------------------------------------------------------

interface MenuBarProps {
  editor: Editor | null;
  distractionFree?: boolean;
  onInsertFigure: () => void;
}

function MenuBar({ editor, distractionFree, onInsertFigure }: MenuBarProps) {
  const setLink = useSetLink(editor);

  if (!editor) return null;

  const buttonClass = cn('h-8 w-8 p-0 hover:bg-secondary', distractionFree && 'h-9 w-9');
  const activeClass = 'bg-secondary text-foreground';

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30 rounded-t-md',
        distractionFree && 'justify-center py-3 bg-card border-muted',
      )}
    >
      {/* Text formatting */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('bold') && activeClass)}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('italic') && activeClass)}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('strike') && activeClass)}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('code') && activeClass)}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >
        <Code className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings — only H2 and H3 in an essay body */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('heading', { level: 2 }) && activeClass)}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('heading', { level: 3 }) && activeClass)}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('bulletList') && activeClass)}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('orderedList') && activeClass)}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Blocks */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('blockquote') && activeClass)}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal rule"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('table') && activeClass)}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title="Insert table"
      >
        <TableIcon className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* The one distinguished action in the toolbar: everything else is a
          formatting toggle, this one opens a dialog and adds content. */}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={cn('h-8 px-3 gap-2', distractionFree && 'h-9')}
        onClick={onInsertFigure}
        title="Insert figure"
      >
        <ImagePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Insert Figure</span>
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Links */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('link') && activeClass)}
        onClick={setLink}
        title="Add link"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      {editor.isActive('link') && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={buttonClass}
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Remove link"
        >
          <Unlink className="h-4 w-4" />
        </Button>
      )}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* History */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Overflow — keeps Insert Figure and links reachable on a narrow toolbar */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={buttonClass} title="More">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem
            onSelect={e => {
              e.preventDefault();
              onInsertFigure();
            }}
            className="gap-2"
          >
            <ImagePlus className="h-4 w-4" />
            Insert figure
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={e => {
              e.preventDefault();
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            }}
            className="gap-2"
          >
            <TableIcon className="h-4 w-4" />
            Insert table
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={e => {
              e.preventDefault();
              setLink();
            }}
            className="gap-2"
          >
            <LinkIcon className="h-4 w-4" />
            Add link
          </DropdownMenuItem>
          {editor.isActive('link') && (
            <DropdownMenuItem
              onSelect={e => {
                e.preventDefault();
                editor.chain().focus().unsetLink().run();
              }}
              className="gap-2"
            >
              <Unlink className="h-4 w-4" />
              Remove link
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table controls — shown only while the caret is inside a table
// ---------------------------------------------------------------------------

function TableControls({ editor }: { editor: Editor }) {
  const item = 'gap-2';
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 px-2 py-1.5">
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
          <DropdownMenuItem className={item} onSelect={() => editor.chain().focus().addColumnBefore().run()}>
            Insert left
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => editor.chain().focus().addColumnAfter().run()}>
            Insert right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={item} onSelect={() => editor.chain().focus().deleteColumn().run()}>
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
          <DropdownMenuItem className={item} onSelect={() => editor.chain().focus().addRowBefore().run()}>
            Insert above
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => editor.chain().focus().addRowAfter().run()}>
            Insert below
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => editor.chain().focus().toggleHeaderRow().run()}>
            Toggle header row
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={item} onSelect={() => editor.chain().focus().deleteRow().run()}>
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
        {/* Destructive, so it sits apart and stays ghost-weight until pressed. */}
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
  placeholder = 'Start writing your essay...',
  className,
  minHeight = '400px',
  distractionFree = false,
}: EssayEditorProps) {
  const [showFigureUploader, setShowFigureUploader] = useState(false);
  const { toast } = useToast();

  const openFigureUploader = useCallback(() => setShowFigureUploader(true), []);

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
        slash: { onInsertFigure: openFigureUploader },
      }),
    [placeholder, section, toast, openFigureUploader],
  );

  const editor = useEditor(
    {
      extensions,
      content,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
        onChangeJson?.(editor.getJSON());
      },
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm sm:prose max-w-none focus:outline-none',
            'prose-headings:font-display prose-headings:font-semibold',
            'prose-h2:text-xl prose-h3:text-lg',
            'prose-p:text-foreground prose-p:leading-relaxed',
            'prose-strong:text-foreground prose-strong:font-semibold',
            'prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground',
            'prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-sm',
            'prose-pre:bg-muted prose-pre:text-foreground',
            'prose-li:text-foreground',
            distractionFree && 'prose-lg',
          ),
        },
      },
    },
    [extensions],
  );

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const handleInsertFigure = useCallback(
    (data: FigureBlockData) => {
      if (!editor) return;
      editor.chain().focus().insertFigure(data).run();
      setShowFigureUploader(false);
    },
    [editor],
  );

  const setLink = useSetLink(editor);

  // `editor.isActive()` is read from the current state and does not re-render
  // on its own; without subscribing, the table controls would appear only when
  // some unrelated state change happened to repaint this component.
  const inTable = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e?.isActive('table'),
  });

  return (
    <div
      className={cn(
        'border border-border rounded-md overflow-hidden bg-background',
        distractionFree && 'border-0 shadow-none',
        className,
      )}
    >
      <MenuBar
        editor={editor}
        distractionFree={distractionFree}
        onInsertFigure={openFigureUploader}
      />

      {/* Contextual: table actions are meaningless outside a table, and a row
          of permanently-disabled buttons reads as broken rather than inactive.

          The wrapper is always rendered even when empty. ProseMirror mutates
          the DOM underneath this subtree, so a sibling that appears and
          disappears changes the child list React is reconciling against and
          throws "insertBefore … not a child of this node" — which is exactly
          what inserting a table used to do. */}
      <div data-editor-slot="table-controls">
        {editor && inTable ? <TableControls editor={editor} /> : null}
      </div>

      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 rounded-md border border-border bg-popover p-1 shadow-md"
          // Text selections only — a selected figure or table gets its own
          // affordances and does not want a bold/italic bar over it.
          shouldShow={({ editor: e, from, to }) =>
            from !== to && !e.isActive('figure') && !e.isActive('image')
          }
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', editor.isActive('bold') && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', editor.isActive('italic') && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', editor.isActive('strike') && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', editor.isActive('code') && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
          >
            <Code className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', editor.isActive('heading', { level: 2 }) && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', editor.isActive('heading', { level: 3 }) && 'bg-secondary')}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="mx-0.5 h-5" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', editor.isActive('link') && 'bg-secondary')}
            onClick={setLink}
            title="Add link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
          {editor.isActive('link') && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => editor.chain().focus().unsetLink().run()}
              title="Remove link"
            >
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          )}
        </BubbleMenu>
      )}

      {editor && (
        <DragHandle editor={editor}>
          <div
            className="flex h-6 w-5 cursor-grab items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground active:cursor-grabbing"
            aria-label="Drag to reorder block"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </DragHandle>
      )}

      {showFigureUploader && (
        <div className="p-4 border-b border-border">
          <FigureUploader
            section={section}
            onInsert={handleInsertFigure}
            onCancel={() => setShowFigureUploader(false)}
          />
        </div>
      )}

      <div
        className={cn('p-4 overflow-y-auto', distractionFree && 'px-8 py-6')}
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Editor styles */}
      <style>{`
        .ProseMirror {
          min-height: ${minHeight};
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h2 {
          font-size: 1.25rem;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror h3 {
          font-size: 1.125rem;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror p {
          margin-bottom: 0.75rem;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }
        .ProseMirror pre {
          background: hsl(var(--muted));
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          overflow-x: auto;
        }
        .ProseMirror code {
          background: hsl(var(--muted));
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1.5rem 0;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
        }
        .ProseMirror .figure-block {
          margin: 2rem 0;
        }
        .ProseMirror figure[data-type="figure-block"] {
          margin: 0;
        }
        .ProseMirror figure[data-type="figure-block"].ProseMirror-selectednode {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
          border-radius: 0.5rem;
        }

        /* Tables */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1.5rem 0;
          overflow: hidden;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem 0.75rem;
          vertical-align: top;
          position: relative;
          min-width: 3rem;
        }
        .ProseMirror table th {
          background: hsl(var(--muted));
          font-weight: 600;
          text-align: left;
        }
        .ProseMirror table p {
          margin-bottom: 0;
        }
        .ProseMirror table .selectedCell:after {
          content: "";
          position: absolute;
          inset: 0;
          background: hsl(var(--primary) / 0.12);
          pointer-events: none;
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: hsl(var(--primary));
          pointer-events: none;
        }
        .ProseMirror.resize-cursor {
          cursor: col-resize;
        }

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
        .tiptap-slash-title {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .tiptap-slash-hint {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }
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
