/**
 * MathDialog — write or edit a LaTeX node, with a live KaTeX preview.
 *
 * One dialog serves inline and display math (the "Display equation" switch),
 * insert and edit (edit passes the node's pos). Saving an existing node with
 * an emptied source deletes it — an empty math node has nothing to render
 * and would be invisible in the document.
 */

import { useEffect, useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export interface MathDialogState {
  /** Node position when editing; undefined when inserting. */
  pos?: number;
  latex: string;
  display: boolean;
}

interface MathDialogProps {
  editor: Editor;
  state: MathDialogState | null;
  onClose: () => void;
}

export function MathDialog({ editor, state, onClose }: MathDialogProps) {
  const [latex, setLatex] = useState('');
  const [display, setDisplay] = useState(true);

  useEffect(() => {
    if (state) {
      setLatex(state.latex);
      setDisplay(state.display);
    }
  }, [state]);

  const preview = useMemo(() => {
    if (!latex.trim()) return null;
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: display });
    } catch {
      return null;
    }
  }, [latex, display]);

  if (!state) return null;
  const isEdit = state.pos !== undefined;

  const save = () => {
    const source = latex.trim();

    if (isEdit && state.pos !== undefined) {
      if (!source) {
        // Emptied: delete the node rather than keep an invisible one.
        if (state.display) editor.chain().focus().deleteBlockMath({ pos: state.pos }).run();
        else editor.chain().focus().deleteInlineMath({ pos: state.pos }).run();
      } else if (state.display) {
        editor.chain().focus().updateBlockMath({ pos: state.pos, latex: source }).run();
      } else {
        editor.chain().focus().updateInlineMath({ pos: state.pos, latex: source }).run();
      }
      onClose();
      return;
    }

    if (!source) {
      onClose();
      return;
    }
    if (display) {
      editor.chain().focus().insertBlockMath({ latex: source }).run();
    } else {
      editor.chain().focus().insertInlineMath({ latex: source }).run();
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit equation' : 'LaTeX'}</DialogTitle>
          <DialogDescription>
            KaTeX syntax. Display equations sit on their own line; inline ones flow with the text.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={latex}
            onChange={e => setLatex(e.target.value)}
            placeholder={'\\text{FCF} = \\text{EBIT}(1 - t) + D\\&A - \\Delta NWC - \\text{CapEx}'}
            aria-label="LaTeX source"
            className="min-h-[90px] font-mono text-sm"
            autoFocus
          />

          <div className="flex items-center gap-2">
            {/* Editing keeps the node's kind — converting inline↔display in
                place would need a delete+insert and reselection; out of scope. */}
            <Switch
              id="math-display"
              checked={display}
              onCheckedChange={setDisplay}
              disabled={isEdit}
            />
            <Label htmlFor="math-display" className="text-sm">
              Display equation
            </Label>
          </div>

          <div
            className="min-h-[56px] rounded-md border border-border bg-muted/30 p-3"
            aria-label="Preview"
          >
            {preview ? (
              <div dangerouslySetInnerHTML={{ __html: preview }} />
            ) : (
              <span className="text-sm text-muted-foreground">Preview</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-accent-editorial text-white hover:bg-accent-editorial/90"
            onClick={save}
          >
            {isEdit ? 'Save' : 'Insert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
