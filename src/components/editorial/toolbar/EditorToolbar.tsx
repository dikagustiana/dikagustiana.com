/**
 * EditorToolbar — the persistent formatting toolbar, replicating Substack's
 * writing surface. This deliberately REVERSES the earlier selection-only
 * bubble menu: the owner directed the reversal, and docs/DECISIONS.md records
 * it superseding the old gate (docs/GATE_LEDGER.md S2).
 *
 * Layout: separator groups in descending frequency of use —
 *   history | style | inline marks & colour | insert media | list & align |
 *   quote | more
 * The original's Button ▾ group (Subscribe / Share / Comment / Send) is
 * dropped, not repurposed — no subscriptions, no comments table, no email
 * exist, and a button that goes nowhere is worse than no button. Template ▾
 * is a scoping question reported in DECISIONS.md, not silently built.
 *
 * Two overflow strategies at once, like the original: the strip scrolls
 * horizontally with chevron affordances (‹ ›) appearing at either end when
 * content is clipped, AND a More ▾ menu carries the rare block types. The
 * More menu reads the SAME list as the slash command
 * (src/lib/tiptap/insertMenu.ts), so the two entry points cannot drift.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { scrollBehavior } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ColorGridPopover } from './ColorGridPopover';
import { LinkPopover, type LinkPopoverState } from './LinkPopover';
import { buildInsertItems, type InsertMenuOptions } from '@/lib/tiptap/insertMenu';
import {
  Undo2,
  Redo2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Baseline,
  Highlighter,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  Outdent,
  Quote,
  TextQuote,
  MessageSquareText,
  MoreHorizontal,
  Upload,
  Type,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  /** Same callbacks the slash menu uses — one list, two entry points. */
  insertOptions: InsertMenuOptions;
  className?: string;
}

const HEADING_ICONS = [Heading1, Heading2, Heading3, Heading4, Heading5, Heading6];
const ALIGNMENTS = [
  { value: 'left', label: 'Left', icon: AlignLeft },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'right', label: 'Right', icon: AlignRight },
  { value: 'justify', label: 'Justify', icon: AlignJustify },
] as const;

export function EditorToolbar({ editor, insertOptions, className }: EditorToolbarProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [clip, setClip] = useState({ left: false, right: false });
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [linkState, setLinkState] = useState<LinkPopoverState | null>(null);

  // One subscription for every button state — isActive() alone does not
  // re-render, and per-button subscriptions would be twenty selectors.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const headingLevel =
        ([1, 2, 3, 4, 5, 6] as const).find(level => e.isActive('heading', { level })) ?? null;
      const align =
        (['center', 'right', 'justify'] as const).find(a => e.isActive({ textAlign: a })) ?? 'left';
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        strike: e.isActive('strike'),
        code: e.isActive('code'),
        superscript: e.isActive('superscript'),
        subscript: e.isActive('subscript'),
        link: e.isActive('link'),
        color: (e.getAttributes('textStyle').color as string | undefined) ?? null,
        highlight: (e.getAttributes('textStyle').backgroundColor as string | undefined) ?? null,
        headingLevel,
        blockquote: e.isActive('blockquote'),
        blockquoteVariant: (e.getAttributes('blockquote').variant as string | undefined) ?? 'quote',
        callout: e.isActive('callout'),
        bulletList: e.isActive('bulletList'),
        orderedList: e.isActive('orderedList'),
        inList: e.isActive('listItem'),
        align,
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        canSink: e.can().sinkListItem('listItem'),
        canLift: e.can().liftListItem('listItem'),
      };
    },
  });

  // ── Chevron affordances: appear only when the strip is actually clipped ──
  const measureClip = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setClip(prev => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measureClip();
    el.addEventListener('scroll', measureClip, { passive: true });
    const observer = new ResizeObserver(measureClip);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', measureClip);
      observer.disconnect();
    };
  }, [measureClip]);

  const scrollByAmount = (direction: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: direction * 240, behavior: scrollBehavior() });
  };

  // ── The More ▾ menu reads the same list as the slash command. Image has
  //    its own toolbar dropdown, so it is the one item excluded here. ──
  const moreItems = useMemo(
    () => buildInsertItems(insertOptions).filter(item => item.id !== 'image'),
    [insertOptions],
  );

  const openLinkPopover = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    const existingHref = (editor.getAttributes('link').href as string | undefined) ?? '';
    setLinkState({
      from,
      to,
      left: coords.left,
      top: coords.bottom,
      initialText: editor.state.doc.textBetween(from, to, ' '),
      initialUrl: existingHref,
    });
  }, [editor]);

  if (!editor || !state) return null;

  // Formatting must act on the selection the writer made. Letting a button
  // take focus collapses that selection before the command runs — the gate
  // probe measured exactly that: every block command landed, every mark
  // command silently did nothing. preventDefault on mousedown keeps focus
  // (and the live selection) in the editor for pointer users; keyboard
  // users still reach every control by Tab, which never collapses it.
  const keepSelection = (e: React.MouseEvent) => e.preventDefault();

  const iconButton = 'h-8 w-8 shrink-0 text-foreground/80';
  const active = 'bg-secondary text-foreground';
  const chevronButton =
    'absolute top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm text-muted-foreground hover:text-foreground';

  const setHeading = (level: number | null) => {
    const chain = editor.chain().focus();
    if (level === null) chain.setParagraph().run();
    else chain.setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  };

  const setQuoteVariant = (variant: 'quote' | 'pull') => {
    const chain = editor.chain().focus();
    if (state.blockquote && state.blockquoteVariant === variant) {
      chain.toggleBlockquote().run();
      return;
    }
    if (!state.blockquote) chain.toggleBlockquote().run();
    editor.chain().updateAttributes('blockquote', { variant }).run();
  };

  const AlignIcon = ALIGNMENTS.find(a => a.value === state.align)?.icon ?? AlignLeft;

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className={cn('relative border-b border-border bg-background', className)}
    >
      {clip.left && (
        <button
          onMouseDown={keepSelection}
          type="button"
          aria-label="Scroll toolbar left"
          className={cn(chevronButton, 'left-1')}
          onClick={() => scrollByAmount(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {clip.right && (
        <button
          onMouseDown={keepSelection}
          type="button"
          aria-label="Scroll toolbar right"
          className={cn(chevronButton, 'right-1')}
          onClick={() => scrollByAmount(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div
        ref={scrollerRef}
        className="flex items-center gap-0.5 overflow-x-auto px-2 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* ══ History ══ */}
        <Button
          onMouseDown={keepSelection}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(iconButton, 'disabled:opacity-40')}
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          onMouseDown={keepSelection}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(iconButton, 'disabled:opacity-40')}
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

        {/* ══ Style ▾ ══ */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              onMouseDown={keepSelection}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 gap-1 px-2 text-sm font-normal"
              title="Style"
            >
              <Type className="h-4 w-4" />
              <span className="min-w-[3.25rem] text-left">
                {state.headingLevel ? `Heading ${state.headingLevel}` : 'Normal'}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onSelect={() => setHeading(null)}>
              <Pilcrow className="mr-2 h-4 w-4 text-muted-foreground" />
              Normal text
              {state.headingLevel === null && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {([1, 2, 3, 4, 5, 6] as const).map(level => {
              const Icon = HEADING_ICONS[level - 1];
              return (
                <DropdownMenuItem key={level} onSelect={() => setHeading(level)}>
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  Heading {level}
                  {state.headingLevel === level && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

        {/* ══ Inline marks & colour ══
            Code is mutually exclusive with B/I/S: while it is active the
            three become DISABLED, not merely inactive. */}
        <Button
          onMouseDown={keepSelection}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(iconButton, state.bold && active, 'disabled:opacity-40')}
          disabled={state.code}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          onMouseDown={keepSelection}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(iconButton, state.italic && active, 'disabled:opacity-40')}
          disabled={state.code}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          onMouseDown={keepSelection}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(iconButton, state.strike && active, 'disabled:opacity-40')}
          disabled={state.code}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          onMouseDown={keepSelection}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(iconButton, state.code && active)}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </Button>

        <ColorGridPopover
          label="Text colour"
          open={colorOpen}
          onOpenChange={setColorOpen}
          active={state.color}
          onPick={hex => editor.chain().focus().setColor(hex).run()}
          onClear={() => editor.chain().focus().unsetColor().run()}
          trigger={
            <Button
              onMouseDown={keepSelection}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconButton, state.color && active)}
              title="Text colour"
            >
              <span className="relative flex flex-col items-center">
                <Baseline className="h-4 w-4" />
                <span
                  className="mt-0.5 h-[3px] w-4 rounded-sm"
                  style={{ backgroundColor: state.color ?? 'var(--prose-ink)' }}
                />
              </span>
            </Button>
          }
        />
        <ColorGridPopover
          label="Highlight"
          open={highlightOpen}
          onOpenChange={setHighlightOpen}
          active={state.highlight}
          onPick={hex => editor.chain().focus().setBackgroundColor(hex).run()}
          onClear={() => editor.chain().focus().unsetBackgroundColor().run()}
          trigger={
            <Button
              onMouseDown={keepSelection}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconButton, state.highlight && active)}
              title="Highlight"
            >
              <span className="relative flex flex-col items-center">
                <Highlighter className="h-4 w-4" />
                <span
                  className="mt-0.5 h-[3px] w-4 rounded-sm"
                  style={{ backgroundColor: state.highlight ?? '#ffff00' }}
                />
              </span>
            </Button>
          }
        />

        {/* Superscript / subscript ▾ */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              onMouseDown={keepSelection}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconButton, (state.superscript || state.subscript) && active, 'w-10 gap-0')}
              title="Superscript / subscript"
            >
              {state.subscript ? <SubscriptIcon className="h-4 w-4" /> : <SuperscriptIcon className="h-4 w-4" />}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().unsetSuperscript().unsetSubscript().run()}
            >
              <Pilcrow className="mr-2 h-4 w-4 text-muted-foreground" />
              Normal
              {!state.superscript && !state.subscript && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.chain().focus().toggleSuperscript().run()}>
              <SuperscriptIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              Superscript
              {state.superscript && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.chain().focus().toggleSubscript().run()}>
              <SubscriptIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              Subscript
              {state.subscript && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          onMouseDown={keepSelection}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(iconButton, state.link && active)}
          onClick={openLinkPopover}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

        {/* ══ Insert media ══ — upload side only. "Stock photos", "Generate
            image", Audio and Video are dropped entirely, not present-and-
            broken (docs/DECISIONS.md). */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              onMouseDown={keepSelection}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconButton, 'w-10 gap-0')}
              title="Image"
            >
              <ImageIcon className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onSelect={() => insertOptions.onInsertFigure?.()}>
              <Upload className="mr-2 h-4 w-4 text-muted-foreground" />
              Upload from computer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

        {/* ══ List & align ══ */}
        <Button
          onMouseDown={keepSelection}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(iconButton, state.bulletList && active)}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          onMouseDown={keepSelection}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(iconButton, state.orderedList && active)}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              onMouseDown={keepSelection}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconButton, state.align !== 'left' && active, 'w-10 gap-0')}
              title="Alignment"
            >
              {/* The toolbar icon reflects the ACTIVE alignment. */}
              <AlignIcon className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {ALIGNMENTS.map(({ value, label, icon: Icon }) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => editor.chain().focus().setTextAlign(value).run()}
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {label}
                {state.align === value && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Indent / Outdent — progressive disclosure: only while the caret
            is inside a list, never permanently-visible disabled buttons. */}
        {state.inList && (
          <>
            <Button
              onMouseDown={keepSelection}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconButton, 'disabled:opacity-40')}
              disabled={!state.canLift}
              onClick={() => editor.chain().focus().liftListItem('listItem').run()}
              title="Outdent"
            >
              <Outdent className="h-4 w-4" />
            </Button>
            <Button
              onMouseDown={keepSelection}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconButton, 'disabled:opacity-40')}
              disabled={!state.canSink}
              onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
              title="Indent"
            >
              <Indent className="h-4 w-4" />
            </Button>
          </>
        )}

        <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

        {/* ══ Quote ▾ ══ */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              onMouseDown={keepSelection}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconButton, (state.blockquote || state.callout) && active, 'w-10 gap-0')}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onSelect={() => setQuoteVariant('quote')}>
              <Quote className="mr-2 h-4 w-4 text-muted-foreground" />
              Block quote
              {state.blockquote && state.blockquoteVariant === 'quote' && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setQuoteVariant('pull')}>
              <TextQuote className="mr-2 h-4 w-4 text-muted-foreground" />
              Pull quote
              {state.blockquote && state.blockquoteVariant === 'pull' && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.chain().focus().toggleCallout().run()}>
              <MessageSquareText className="mr-2 h-4 w-4 text-muted-foreground" />
              Callout
              {state.callout && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

        {/* ══ More ▾ ══ — rare block types, same list as the slash command.
            The accent badge dot marks new features, per the original. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              onMouseDown={keepSelection}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(iconButton, 'relative')}
              title="More"
            >
              <MoreHorizontal className="h-4 w-4" />
              {moreItems.some(item => item.isNew) && (
                <span
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent-editorial"
                  aria-hidden
                />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {moreItems.map(item => (
              <DropdownMenuItem key={item.id} onSelect={() => item.run(editor, null)}>
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {item.title}
                {item.isNew && (
                  <span className="ml-auto rounded-full bg-accent-editorial px-1.5 py-px text-[10px] font-semibold uppercase text-white">
                    New
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {linkState && <LinkPopover editor={editor} state={linkState} onClose={() => setLinkState(null)} />}
    </div>
  );
}
