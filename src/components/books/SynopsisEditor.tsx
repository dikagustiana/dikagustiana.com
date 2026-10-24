/**
 * The synopsis editor (PRD D5; 02-ARCHITECTURE §4): the essay editor's TipTap setup with a reduced toolbar
 * (bold, italic, bullet and numbered lists, link) over the synopsis schema (getSynopsisExtensions), which
 * holds nothing else, so pasted structure cannot smuggle in a heading or a table. Pasting from Word goes
 * through the same clean-up as essays. It reports the document and its HTML on every change; the form
 * saves both, and the excerpt from the HTML.
 */
import { useCallback, useMemo, useState, type MouseEvent } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { Bold, Italic, Link2, List, ListOrdered } from 'lucide-react';
import { LinkPopover, type LinkPopoverState } from '@/components/editorial/toolbar/LinkPopover';
import { getSynopsisExtensions } from '@/lib/tiptap/extensions';
import { transformPastedHTML } from '@/lib/tiptap/pasteFromWord';
import { cn } from '@/lib/utils';

interface SynopsisEditorProps {
  initial: JSONContent | null;
  onChange: (doc: JSONContent | null, html: string | null) => void;
  labelledBy?: string;
}

const TOOL =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-secondary aria-pressed:text-foreground';

export function SynopsisEditor({ initial, onChange, labelledBy }: SynopsisEditorProps) {
  const extensions = useMemo(() => getSynopsisExtensions({ placeholder: 'What the book is about, and why it is on this shelf.' }), []);
  const [link, setLink] = useState<LinkPopoverState | null>(null);
  const editor = useEditor({
    extensions,
    content: initial ?? '',
    onUpdate: ({ editor: e }) => {
      const empty = e.isEmpty;
      onChange(empty ? null : e.getJSON(), empty ? null : e.getHTML());
    },
    editorProps: {
      transformPastedHTML,
      attributes: {
        class: 'min-h-[10rem] px-3 py-2 font-serif text-[16px] leading-[1.6] focus:outline-none [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
      },
    },
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: !!e?.isActive('bold'),
      italic: !!e?.isActive('italic'),
      bullet: !!e?.isActive('bulletList'),
      ordered: !!e?.isActive('orderedList'),
      link: !!e?.isActive('link'),
    }),
  });

  const openLink = useCallback(() => {
    if (!editor) return;
    const href = (editor.getAttributes('link').href as string | undefined) ?? '';
    if (href) editor.chain().extendMarkRange('link').run();
    const { from, to } = editor.state.selection;
    const at = editor.view.coordsAtPos(from);
    setLink({ from, to, left: at.left, top: at.bottom, initialText: editor.state.doc.textBetween(from, to, ' '), initialUrl: href });
  }, [editor]);

  // A button that took the focus would collapse the selection it is meant to format.
  const keep = (e: MouseEvent) => e.preventDefault();

  if (!editor) return null;
  return (
    <div className="rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
      <div role="toolbar" aria-label="Synopsis formatting" className="flex gap-1 border-b border-border px-1 py-1">
        <button type="button" className={TOOL} onMouseDown={keep} onClick={() => editor.chain().focus().toggleBold().run()} aria-pressed={state?.bold} aria-label="Bold" title="Bold">
          <Bold className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className={TOOL} onMouseDown={keep} onClick={() => editor.chain().focus().toggleItalic().run()} aria-pressed={state?.italic} aria-label="Italic" title="Italic">
          <Italic className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className={TOOL} onMouseDown={keep} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-pressed={state?.bullet} aria-label="Bulleted list" title="Bulleted list">
          <List className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className={TOOL} onMouseDown={keep} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-pressed={state?.ordered} aria-label="Numbered list" title="Numbered list">
          <ListOrdered className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" className={cn(TOOL)} onMouseDown={keep} onClick={openLink} aria-pressed={state?.link} aria-label="Link" title="Link">
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <EditorContent editor={editor} />
      {link && <LinkPopover editor={editor} state={link} onClose={() => setLink(null)} />}
    </div>
  );
}
