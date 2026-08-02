/**
 * FootnoteDialog — write or edit a footnote's text. The marker's number is
 * positional (a CSS counter), so the dialog carries only the note itself.
 * Saving an empty note deletes the marker — an empty footnote is a promise
 * the essay never keeps.
 */

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface FootnoteDialogState {
  pos: number;
  text: string;
  /**
   * Insert mode: no marker exists in the document yet — `pos` is where one
   * will be inserted on Save. Cancel/Escape/outside-click must leave the
   * document untouched, which is only possible if nothing was written first.
   */
  insert?: boolean;
}

interface FootnoteDialogProps {
  editor: Editor;
  state: FootnoteDialogState | null;
  onClose: () => void;
}

export function FootnoteDialog({ editor, state, onClose }: FootnoteDialogProps) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (state) setText(state.text);
  }, [state]);

  if (!state) return null;

  const save = () => {
    const trimmed = text.trim();
    if (state.insert) {
      if (trimmed) {
        editor
          .chain()
          .focus()
          .insertContentAt(state.pos, { type: 'footnote', attrs: { text: trimmed } })
          .run();
      }
      // An empty note in insert mode writes nothing — same outcome as Cancel.
    } else if (!trimmed) {
      editor.chain().focus().deleteFootnote(state.pos).run();
    } else {
      editor.chain().focus().updateFootnote(state.pos, trimmed).run();
    }
    onClose();
  };

  const remove = () => {
    if (!state.insert) {
      editor.chain().focus().deleteFootnote(state.pos).run();
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Footnote</DialogTitle>
          <DialogDescription>
            A point citation inside the argument. The end-of-essay references list is separate
            and stays for further reading.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Palepu, Healy & Peek, 5th ed., ch. 6, pp. 232–250."
          aria-label="Footnote text"
          className="min-h-[90px] text-sm"
          autoFocus
        />

        <DialogFooter>
          {!state.insert && (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-muted-foreground hover:text-destructive"
              onClick={remove}
            >
              Remove
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-accent-editorial text-white hover:bg-accent-editorial/90"
            onClick={save}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
