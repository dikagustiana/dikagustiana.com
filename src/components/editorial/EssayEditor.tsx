import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FigureExtension } from './FigureExtension';
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
} from 'lucide-react';

interface EssayEditorProps {
  content: string;
  onChange: (content: string) => void;
  section: 'next-big-thing' | 'green-transition';
  placeholder?: string;
  className?: string;
  minHeight?: string;
  distractionFree?: boolean;
}

interface MenuBarProps {
  editor: Editor | null;
  distractionFree?: boolean;
  onInsertFigure: () => void;
}

function MenuBar({ editor, distractionFree, onInsertFigure }: MenuBarProps) {
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

  const buttonClass = cn(
    "h-8 w-8 p-0 hover:bg-secondary",
    distractionFree && "h-9 w-9"
  );

  const activeClass = "bg-secondary text-foreground";

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30 rounded-t-md",
      distractionFree && "justify-center py-3 bg-card border-muted"
    )}>
      {/* Text Formatting */}
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
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings - Only H2 and H3 for essay body */}
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
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('orderedList') && activeClass)}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Block Elements */}
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
        title="Horizontal Rule"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Figure Insert */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, 'text-primary')}
        onClick={onInsertFigure}
        title="Insert Figure"
      >
        <ImagePlus className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Links */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClass, editor.isActive('link') && activeClass)}
        onClick={setLink}
        title="Add Link"
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
          title="Remove Link"
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

      {/* Overflow (includes Insert Figure so it remains accessible on narrow toolbars) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={buttonClass}
            title="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onInsertFigure();
            }}
            className="gap-2"
          >
            <ImagePlus className="h-4 w-4" />
            Insert Figure
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
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
              onSelect={(e) => {
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

export function EssayEditor({
  content,
  onChange,
  section,
  placeholder = 'Start writing your essay...',
  className,
  minHeight = '400px',
  distractionFree = false,
}: EssayEditorProps) {
  const [showFigureUploader, setShowFigureUploader] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3], // Only H2 and H3 allowed in essay body
        },
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
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
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
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const handleInsertFigure = useCallback((data: FigureBlockData) => {
    if (!editor) return;
    editor.chain().focus().insertFigure(data).run();
    setShowFigureUploader(false);
  }, [editor]);

  return (
    <div className={cn(
      "border border-border rounded-md overflow-hidden bg-background",
      distractionFree && "border-0 shadow-none",
      className
    )}>
      <MenuBar 
        editor={editor} 
        distractionFree={distractionFree}
        onInsertFigure={() => setShowFigureUploader(true)}
      />
      
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
        className={cn(
          "p-4 overflow-y-auto",
          distractionFree && "px-8 py-6"
        )}
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>
      
      {/* Editor Styles */}
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

// Helper to get plain text from HTML
export function getPlainTextFromHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}
