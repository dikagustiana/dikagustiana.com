/**
 * LinkPopover — the link form, anchored to the SELECTION, not the toolbar
 * button. Replaces the window.prompt the bubble menu used.
 *
 * Field one: link text, prefilled from the selection. Field two: the URL,
 * autofocused, with the accent focus ring (one of the accent token's five
 * roles). Primary "Link" button in the accent colour. Nothing changes in the
 * document until the URL is submitted.
 */

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface LinkPopoverState {
  from: number;
  to: number;
  /** Anchor point in viewport coordinates (editor.view.coordsAtPos). */
  left: number;
  top: number;
  initialText: string;
  initialUrl: string;
}

interface LinkPopoverProps {
  editor: Editor;
  state: LinkPopoverState;
  onClose: () => void;
}

export function LinkPopover({ editor, state, onClose }: LinkPopoverProps) {
  const [text, setText] = useState(state.initialText);
  const [url, setUrl] = useState(state.initialUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlRef.current?.focus();
    urlRef.current?.select();
  }, []);

  // Escape closes without touching the document; clicking outside likewise.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [onClose]);

  const submit = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      onClose();
      return;
    }
    const href = /^(https?:\/\/|mailto:|\/)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const { from, to } = state;
    const finalText = text.trim() || href;

    if (finalText !== state.initialText || from === to) {
      // Text edited (or collapsed selection): write the text, select it, link it.
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, finalText)
        .setTextSelection({ from, to: from + finalText.length })
        .setLink({ href })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .setLink({ href })
        .run();
    }
    onClose();
  };

  // Clamp into the viewport — a popover anchored near the right edge on a
  // 375px screen must not push the page sideways.
  const width = 320;
  const left = Math.max(8, Math.min(state.left, window.innerWidth - width - 8));
  const top = Math.min(state.top + 8, window.innerHeight - 160);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Edit link"
      className="fixed z-[70] rounded-md border border-border bg-popover p-3 shadow-lg"
      style={{ left, top, width }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        }
      }}
    >
      <div className="space-y-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Link text"
          aria-label="Link text"
          className="h-8 text-sm"
        />
        <Input
          ref={urlRef}
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Enter URL…"
          aria-label="URL"
          className="h-8 text-sm focus-visible:ring-accent-editorial"
        />
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        {state.initialUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-auto h-7 px-2 text-xs text-muted-foreground"
            onClick={() => {
              editor
                .chain()
                .focus()
                .setTextSelection({ from: state.from, to: state.to })
                .extendMarkRange('link')
                .unsetLink()
                .run();
              onClose();
            }}
          >
            Remove
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" className="h-7 px-3 text-xs" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 bg-accent-editorial px-3 text-xs text-white hover:bg-accent-editorial/90"
          onClick={submit}
        >
          Link
        </Button>
      </div>
    </div>
  );
}
