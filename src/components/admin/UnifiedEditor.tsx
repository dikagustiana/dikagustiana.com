/**
 * UnifiedEditor — The single writing surface for all sections.
 *
 * Design principles:
 *   - FigureBlock is always available (no section gating).
 *   - Toolbar always shows: formatting, headings, quote, Insert Figure.
 *   - Images can be pasted from clipboard or dragged in at any time.
 *   - Outputs TipTap JSON (canonical format). HTML is never stored.
 *   - Auto-focuses on mount so writing starts immediately.
 */

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FigureUploader } from '@/components/editorial/FigureUploader';
import { FigureBlockData } from '@/components/editorial/FigureBlock';
import { getEditorExtensions } from '@/lib/tiptap/extensions';
import { isLegacyHtmlContent } from '@/lib/tiptap/serialize';
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
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UnifiedEditorProps {
  /** Initial content — TipTap JSON object, JSON string, or legacy HTML string. */
  initialContent?: JSONContent | string | null;
  /** Called on every change with the canonical TipTap JSON. */
  onChange: (json: JSONContent) => void;
  /** Uploads a File to storage and returns its public URL. */
  onImageUpload: (file: File) => Promise<string>;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  minHeight?: string;
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

interface MenuBarProps {
  editor: Editor | null;
  onInsertFigure: () => void;
  isUploading: boolean;
}

function MenuBar({ editor, onInsertFigure, isUploading }: MenuBarProps) {
  const setLink = useCallback(() => {
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

  if (!editor) return null;

  const btn = 'h-8 w-8 p-0 hover:bg-secondary';
  const active = 'bg-secondary text-foreground';

  return (
    <div className="flex flex-wrap items-center gap-1 py-2 mb-3 border-b border-border/60 bg-background/85 backdrop-blur-sm sticky top-0 z-10">
      {/* Text formatting */}
      <Button type="button" variant="ghost" size="icon" className={cn(btn, editor.isActive('bold') && active)} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={cn(btn, editor.isActive('italic') && active)} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
        <Italic className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={cn(btn, editor.isActive('strike') && active)} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={cn(btn, editor.isActive('code') && active)} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
        <Code className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings */}
      <Button type="button" variant="ghost" size="icon" className={cn(btn, editor.isActive('heading', { level: 2 }) && active)} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={cn(btn, editor.isActive('heading', { level: 3 }) && active)} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
        <Heading3 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <Button type="button" variant="ghost" size="icon" className={cn(btn, editor.isActive('bulletList') && active)} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={cn(btn, editor.isActive('orderedList') && active)} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Block elements */}
      <Button type="button" variant="ghost" size="icon" className={cn(btn, editor.isActive('blockquote') && active)} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
        <Quote className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={btn} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
        <Minus className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Figure insert — always visible */}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 px-3 gap-2"
        onClick={onInsertFigure}
        title="Insert Image / Figure"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Insert Figure</span>
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Links */}
      <Button type="button" variant="ghost" size="icon" className={cn(btn, editor.isActive('link') && active)} onClick={setLink} title="Add Link">
        <LinkIcon className="h-4 w-4" />
      </Button>
      {editor.isActive('link') && (
        <Button type="button" variant="ghost" size="icon" className={btn} onClick={() => editor.chain().focus().unsetLink().run()} title="Remove Link">
          <Unlink className="h-4 w-4" />
        </Button>
      )}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* History */}
      <Button type="button" variant="ghost" size="icon" className={btn} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
        <Undo className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className={btn} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Shift+Z)">
        <Redo className="h-4 w-4" />
      </Button>

      {/* Upload indicator */}
      {isUploading && (
        <span className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor component
// ---------------------------------------------------------------------------

export function UnifiedEditor({
  initialContent,
  onChange,
  onImageUpload,
  placeholder = 'Start writing...',
  autoFocus = true,
  className,
  minHeight = '60vh',
}: UnifiedEditorProps) {
  const [showFigureDialog, setShowFigureDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const hasInitialized = useRef(false);

  // Resolve initial content to something TipTap understands
  const resolveInitialContent = (): JSONContent | string | undefined => {
    if (!initialContent) return undefined;
    if (typeof initialContent === 'object') return initialContent;
    // String — could be JSON string or HTML
    if (typeof initialContent === 'string') {
      const trimmed = initialContent.trim();
      if (!trimmed) return undefined;
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed?.type === 'doc') return parsed as JSONContent;
        } catch {
          // Not valid JSON, treat as HTML
        }
      }
      // Legacy HTML — TipTap can parse HTML natively
      return trimmed;
    }
    return undefined;
  };

  const editor = useEditor({
    extensions: getEditorExtensions(placeholder),
    content: resolveInitialContent(),
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON());
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
        ),
      },
      // ── Image paste (Tumblr-like: paste → image appears → keep typing) ──
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              void handleInlineImageUpload(file);
              return true;
            }
          }
        }
        return false;
      },
      // ── Image drag & drop ──
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (file.type.startsWith('image/')) {
          event.preventDefault();
          void handleInlineImageUpload(file);
          return true;
        }
        return false;
      },
    },
  });

  // Sync external content changes (e.g. when loading saved essay)
  useEffect(() => {
    if (!editor || hasInitialized.current) return;
    hasInitialized.current = true;
    // Initial content is set via the useEditor config, no additional sync needed
  }, [editor]);

  // ── Inline image upload (paste / drop) ──
  const handleInlineImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return;
      setIsUploading(true);
      try {
        const url = await onImageUpload(file);

        // Get dimensions
        const dimensions = await getImageDimensions(url);

        const figureData: FigureBlockData = {
          src: url,
          altText: '', // Will be validated at publish time
          kind: 'image',
          widthMode: 'content',
          naturalWidth: dimensions.width,
          naturalHeight: dimensions.height,
          aspectRatio: dimensions.height / dimensions.width,
        };

        editor.chain().focus().insertFigure(figureData).run();
      } catch {
        // Silently fail — the toast in the parent handles error display
      } finally {
        setIsUploading(false);
      }
    },
    [editor, onImageUpload],
  );

  // ── Toolbar Figure insert (via FigureUploader dialog) ──
  const handleFigureInsert = useCallback(
    (data: FigureBlockData) => {
      if (!editor) return;
      editor.chain().focus().insertFigure(data).run();
      setShowFigureDialog(false);
    },
    [editor],
  );

  return (
    <div className={cn('bg-background', className)}>
      <MenuBar
        editor={editor}
        onInsertFigure={() => setShowFigureDialog(true)}
        isUploading={isUploading}
      />

      <div className="overflow-y-auto" style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>

      {/* FigureUploader dialog — full metadata entry */}
      <Dialog open={showFigureDialog} onOpenChange={setShowFigureDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Insert Figure</DialogTitle>
          </DialogHeader>
          <FigureUploader
            onInsert={handleFigureInsert}
            onCancel={() => setShowFigureDialog(false)}
          />
        </DialogContent>
      </Dialog>

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
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}
