/**
 * Slash-command entry point to the insert menu.
 *
 * TipTap ships no slash-command extension, only the `@tiptap/suggestion`
 * primitive it would be built on, so this is that build. The item list is NOT
 * defined here — it comes from `insertMenu.ts`, shared with the gutter `+`, so
 * the two entry points cannot drift.
 *
 * Formatting items (headings, lists, quote) used to live here. They moved to
 * the bubble menu: the selection toolbar formats, this menu inserts.
 *
 * The popup is plain DOM positioned from `coordsAtPos`. A React portal would
 * mean a floating-element library for one menu, which it does not earn.
 */

import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import {
  buildInsertItems,
  filterInsertItems,
  type InsertMenuItem,
  type InsertMenuOptions,
} from './insertMenu';

export type SlashCommandOptions = InsertMenuOptions;

function createMenu() {
  const el = document.createElement('div');
  el.className = 'tiptap-slash-menu';
  el.setAttribute('role', 'listbox');
  el.setAttribute('aria-label', 'Insert block');
  document.body.appendChild(el);
  return el;
}

/**
 * Place the menu near the caret, flipping above when the caret sits low in the
 * viewport. Measured after paint — reading offsetHeight before the rows exist
 * returns 0 and the flip never triggers, which is how a menu opened on the
 * last line ends up clipped off the bottom of the screen.
 */
function positionMenu(el: HTMLElement, rect: DOMRect | null) {
  if (!rect) return;
  const margin = 8;
  const height = el.offsetHeight;
  const width = el.offsetWidth;
  const fitsBelow = rect.bottom + margin + height < window.innerHeight;
  const top = fitsBelow
    ? rect.bottom + margin
    : Math.max(margin, rect.top - height - margin);
  el.style.top = `${Math.min(top, Math.max(margin, window.innerHeight - height - margin))}px`;
  el.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin))}px`;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return { onInsertFigure: undefined, onInsertLinkCard: undefined };
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options;

    return [
      Suggestion<InsertMenuItem>({
        editor: this.editor,
        char: '/',
        // Only at the start of a block: mid-sentence slashes are ordinary
        // punctuation ("and/or", a URL) and should never open a menu.
        startOfLine: true,
        allowSpaces: false,

        // …and never inside a code block, where a slash is a slash. A code
        // block is one textblock containing newlines, so `startOfLine` alone
        // does not stop the menu opening on its second and later lines.
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          return !$from.parent.type.spec.code;
        },

        items: ({ query }) => filterInsertItems(buildInsertItems(extensionOptions), query),

        command: ({ editor, range, props }) => props.run(editor, range),

        render: () => {
          let el: HTMLElement | null = null;
          let items: InsertMenuItem[] = [];
          let selected = 0;
          let onPick: (item: InsertMenuItem) => void = () => undefined;

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

          const close = () => {
            el?.remove();
            el = null;
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
              selected = Math.min(selected, Math.max(0, items.length - 1));
              onPick = item => props.command(item);
              if (!el) el = createMenu();
              paint();
              positionMenu(el, props.clientRect?.() ?? null);
            },

            onKeyDown: props => {
              if (!el) return false;
              const { key } = props.event;

              if (key === 'Escape') {
                // Close only. The `/` the author typed stays in the document —
                // swallowing it would delete a character they may have meant.
                close();
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

            onExit: close,
          };
        },
      }),
    ];
  },
});
