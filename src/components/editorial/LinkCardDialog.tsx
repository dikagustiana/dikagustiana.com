/**
 * LinkCardDialog — collects the URL (and optional title) for a link preview.
 *
 * There is no metadata fetch: the card is built client-side from what the
 * author types. Fetching a page's Open Graph tags needs a server round trip,
 * which this project does not have for the browser to call, and the embeds
 * people usually mean by "embed" need an `iframe`, which the sanitizer
 * forbids. See docs/DECISIONS.md.
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkCardBlock, linkCardHost, type LinkCardData } from './LinkCardBlock';

interface LinkCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (data: LinkCardData) => void;
}

function isUsableUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function LinkCardDialog({ open, onOpenChange, onInsert }: LinkCardDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // A dialog that remembers the last URL would insert it again by accident.
  useEffect(() => {
    if (!open) {
      setUrl('');
      setTitle('');
      setDescription('');
    }
  }, [open]);

  const valid = isUsableUrl(url);

  const submit = () => {
    if (!valid) return;
    onInsert({
      url: url.trim(),
      title: title.trim() || linkCardHost(url.trim()),
      description: description.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link preview</DialogTitle>
          <DialogDescription>
            A card linking to a page. The title and summary are yours to write — nothing is
            fetched from the page itself.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="link-card-url">URL</Label>
            <Input
              id="link-card-url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && valid) submit();
              }}
            />
            {url.trim() && !valid && (
              <p className="text-xs text-destructive">
                That is not a URL this can link to. It needs to start with http:// or https://.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-card-title">Title</Label>
            <Input
              id="link-card-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Optional — defaults to the domain"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-card-description">Summary</Label>
            <Input
              id="link-card-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional, one line"
            />
          </div>

          {valid && (
            <div className="rounded-md border border-dashed border-border p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Preview</p>
              <LinkCardBlock
                isEditing
                data={{ url: url.trim(), title: title.trim(), description: description.trim() }}
                className="my-0"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!valid}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
