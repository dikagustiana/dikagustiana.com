/**
 * Slash-command menu.
 *
 * TipTap ships no official slash-command extension, only the `@tiptap/suggestion`
 * primitive it would be built on, so this is that build.
 *
 * The popup is plain DOM positioned from `coordsAtPos`. A React portal would
 * mean pulling in a floating-element library for one menu; the menu is a list
 * of buttons and does not earn the dependency.
 */

import { Extension } from '@tiptap/core';
import type { Editor, Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

export interface SlashCommandOptions {
  /** Opens the Insert Figure dialog. Omit and the Figure item is hidden. */
  onInsertFigure?: () => void;
}

interface SlashItem {
  title: string;
  hint: string;
  keywords: string[];
  run: (editor: Editor, range: Range) => void;
}

function buildItems(options: SlashCommandOptions): SlashItem[] {
  const items: SlashItem[] = [
    {
      title: 'Heading 2',
      hint: 'Section heading',
      keywords: ['h2', 'heading', 'title', 'section'],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
    },
    {
      title: 'Heading 3',
      hint: 'Sub-heading',
      keywords: ['h3', 'heading', 'subheading'],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
    },
    {
      title: 'Bullet list',
      hint: 'Unordered list',
      keywords: ['ul', 'bullet', 'list', 'unordered'],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: 'Numbered list',
      hint: 'Ordered list',
      keywords: ['ol', 'number', 'ordered', 'list'],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: 'Quote',
      hint: 'Pull quote',
      keywords: ['quote', 'blockquote', 'pull'],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: 'Code block',
      hint: 'Monospaced block',
      keywords: ['code', 'pre', 'snippet'],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: 'Table',
      hint: '3 × 3 with header row',
      keywords: ['table', 'grid', 'rows', 'columns'],
      run: (editor, range) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      title: 'Divider',
      hint: 'Horizontal rule',
      keywords: ['hr', 'divider', 'rule', 'separator'],
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
  ];

  if (options.onInsertFigure) {
    items.push({
      title: 'Figure',
      hint: 'Image with caption and source',
      keywords: ['image', 'figure', 'picture', 'photo', 'graph', 'chart'],
      run: (editor, range) => {
        editor.chain().focus().deleteRange(range).run();
        options.onInsertFigure?.();
      },
    });
  }

  return items;
}

/** Renders the menu and keeps the DOM in step with the selected index. */
function createMenu() {
  const el = document.createElement('div');
  el.className = 'tiptap-slash-menu';
  el.setAttribute('role', 'listbox');
  document.body.appendChild(el);
  return el;
}

function positionMenu(el: HTMLElement, rect: DOMRect | null) {
  if (!rect) return;
  const margin = 8;
  const height = el.offsetHeight || 260;
  // Flip above the caret when there is not enough room below it.
  const below = rect.bottom + margin;
  const fitsBelow = below + height < window.innerHeight;
  el.style.left = `${Math.min(rect.left, window.innerWidth - el.offsetWidth - margin)}px`;
  el.style.top = fitsBelow ? `${below}px` : `${Math.max(margin, rect.top - height - margin)}px`;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return { onInsertFigure: undefined };
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options;

    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        allowSpaces: false,

        items: ({ query }) => {
          const all = buildItems(extensionOptions);
          const q = query.trim().toLowerCase();
          if (!q) return all;
          return all.filter(
            item =>
              item.title.toLowerCase().includes(q) ||
              item.keywords.some(k => k.startsWith(q)),
          );
        },

        command: ({ editor, range, props }) => props.run(editor, range),

        render: () => {
          let el: HTMLElement | null = null;
          let items: SlashItem[] = [];
          let selected = 0;
          let onPick: (item: SlashItem) => void = () => undefined;

          const paint = () => {
            if (!el) return;
            el.innerHTML = '';
            if (items.length === 0) {
              const empty = document.createElement('div');
              empty.className = 'tiptap-slash-empty';
              empty.textContent = 'No matching block';
              el.appendChild(empty);
              return;
            }
            items.forEach((item, index) => {
              const button = document.createElement('button');
              button.type = 'button';
              button.className = 'tiptap-slash-item';
              button.setAttribute('role', 'option');
              button.setAttribute('aria-selected', String(index === selected));
              if (index === selected) button.dataset.selected = 'true';

              const title = document.createElement('span');
              title.className = 'tiptap-slash-title';
              title.textContent = item.title;

              const hint = document.createElement('span');
              hint.className = 'tiptap-slash-hint';
              hint.textContent = item.hint;

              button.append(title, hint);
              // mousedown, not click: click fires after the editor has already
              // lost the selection the command needs.
              button.addEventListener('mousedown', event => {
                event.preventDefault();
                onPick(item);
              });
              el?.appendChild(button);
            });
            el.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({
              block: 'nearest',
            });
          };

          return {
            onStart: props => {
              items = props.items;
              selected = 0;
              onPick = item => props.command(item);
              el = createMenu();
              paint();
              positionMenu(el, props.clientRect?.() ?? null);
            },

            onUpdate: props => {
              items = props.items;
              selected = 0;
              onPick = item => props.command(item);
              paint();
              if (el) positionMenu(el, props.clientRect?.() ?? null);
            },

            onKeyDown: props => {
              if (!el) return false;
              const { key } = props.event;

              if (key === 'Escape') {
                el.remove();
                el = null;
                return true;
              }
              if (key === 'ArrowDown') {
                selected = items.length ? (selected + 1) % items.length : 0;
                paint();
                return true;
              }
              if (key === 'ArrowUp') {
                selected = items.length ? (selected - 1 + items.length) % items.length : 0;
                paint();
                return true;
              }
              if (key === 'Enter' || key === 'Tab') {
                const item = items[selected];
                if (!item) return false;
                onPick(item);
                return true;
              }
              return false;
            },

            onExit: () => {
              el?.remove();
              el = null;
            },
          };
        },
      }),
    ];
  },
});
