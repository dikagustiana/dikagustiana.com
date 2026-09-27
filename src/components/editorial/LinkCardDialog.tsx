/**
 * LinkCardDialog — collects a link preview's URL and details.
 *
 * "Fetch details" asks the `link-preview` edge function for the page's
 * metadata. This is authoring time, never read time (docs/DECISIONS.md,
 * "Link previews: server-resolved, metadata only"). What comes back is plain
 * text, and it lands in ordinary editable fields:
 *   - manual values always win: a field the author has typed in is never
 *     overwritten by a fetch;
 *   - a snapshot belongs to the link it was fetched for. Change the link and
 *     the untouched fetched values go with it, and only a snapshot of THIS link
 *     is stored with its fetch time (`resolvedAt`);
 *   - a failed fetch shows a plain sentence and leaves every field usable.
 *     Manual entry is the floor, and publishing never waits on a fetch.
 * No iframe, no provider markup: the card is an anchor and text, which the
 * sanitizer already allows.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { LinkCardBlock, type LinkCardData } from './LinkCardBlock';
import { linkCardHost } from '@/lib/tiptap/linkCardData';
import { fetchLinkPreview, LINK_PREVIEW_FALLBACK_MESSAGE } from '@/lib/linkPreview';
import { fullDate } from '@/lib/formatDate';

interface LinkCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (data: LinkCardData) => void;
}

const EDITABLE = ['title', 'description', 'author', 'siteName', 'publishedAt', 'authorUrl'] as const;
type Editable = (typeof EDITABLE)[number];
type Fields = Record<Editable, string>;
const EMPTY: Fields = { title: '', description: '', author: '', siteName: '', publishedAt: '', authorUrl: '' };

type FetchState = { status: 'idle' } | { status: 'loading' } | { status: 'fetched' } | { status: 'failed'; message: string };

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
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [resolvedAt, setResolvedAt] = useState('');
  const [fetchedFor, setFetchedFor] = useState('');
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });
  // Read inside async callbacks, so refs rather than state: a field typed in
  // WHILE a fetch is in flight must still win when the answer lands.
  const touched = useRef(new Set<Editable>());
  const latestRequest = useRef(0);

  // A dialog that remembers the last URL would insert it again by accident.
  useEffect(() => {
    if (!open) {
      setUrl('');
      setFields(EMPTY);
      setResolvedAt('');
      setFetchedFor('');
      setFetchState({ status: 'idle' });
      touched.current = new Set();
      latestRequest.current += 1; // an answer arriving after close is dropped
    }
  }, [open]);

  const valid = isUsableUrl(url);
  const authorUrlInvalid = fields.authorUrl.trim() !== '' && !isUsableUrl(fields.authorUrl);

  const edit = (field: Editable, value: string) => {
    touched.current.add(field);
    setFields(current => ({ ...current, [field]: value }));
  };

  const changeUrl = (value: string) => {
    setUrl(value);
    latestRequest.current += 1; // a fetch in flight was for the old link
    if (fetchState.status === 'loading') setFetchState({ status: 'idle' });
    if (fetchedFor && value.trim() !== fetchedFor) {
      setFields(current => {
        const next = { ...current };
        for (const field of EDITABLE) if (!touched.current.has(field)) next[field] = '';
        return next;
      });
      setResolvedAt('');
      setFetchedFor('');
      setFetchState({ status: 'idle' });
    }
  };

  const fetchDetails = async () => {
    const target = url.trim();
    if (!isUsableUrl(target)) return;
    const request = ++latestRequest.current;
    setFetchState({ status: 'loading' });
    const result = await fetchLinkPreview(target);
    if (request !== latestRequest.current) return; // superseded, or the dialog closed
    if (!result.ok) {
      setFetchState({ status: 'failed', message: result.message });
      return;
    }
    setFields(current => {
      const next = { ...current };
      for (const field of EDITABLE) if (!touched.current.has(field)) next[field] = result.data[field];
      return next;
    });
    setResolvedAt(result.data.resolvedAt);
    setFetchedFor(target);
    setFetchState({ status: 'fetched' });
  };

  const card = (): LinkCardData => {
    const target = url.trim();
    return {
      url: target,
      title: fields.title.trim() || linkCardHost(target),
      description: fields.description.trim(),
      author: fields.author.trim(),
      authorUrl: authorUrlInvalid ? '' : fields.authorUrl.trim(),
      siteName: fields.siteName.trim(),
      publishedAt: fields.publishedAt.trim(),
      resolvedAt: fetchedFor === target ? resolvedAt : '',
    };
  };

  const submit = () => {
    if (!valid) return;
    onInsert(card());
  };

  const status =
    fetchState.status === 'fetched' && resolvedAt
      ? `Details fetched ${fullDate(resolvedAt)}. Every field below stays editable.`
      : fetchState.status === 'failed'
        ? fetchState.message === LINK_PREVIEW_FALLBACK_MESSAGE
          ? fetchState.message
          : `${fetchState.message} You can fill the fields in yourself.`
        : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Link preview</DialogTitle>
          <DialogDescription>
            A card linking to a page. Fetch its details from the page, or write them yourself. What
            you type always wins, and the card shows exactly what is here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="link-card-url">URL</Label>
            <div className="flex gap-2">
              <Input
                id="link-card-url"
                value={url}
                onChange={e => changeUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && valid) submit();
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={fetchDetails}
                disabled={!valid || fetchState.status === 'loading'}
              >
                {fetchState.status === 'loading' ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Fetching…
                  </>
                ) : (
                  'Fetch details'
                )}
              </Button>
            </div>
            {url.trim() && !valid && (
              <p className="text-xs text-destructive">
                That is not a URL this can link to. It needs to start with http:// or https://.
              </p>
            )}
            <p
              role="status"
              aria-live="polite"
              className={fetchState.status === 'failed' ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
            >
              {status}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-card-title">Title</Label>
            <Input
              id="link-card-title"
              value={fields.title}
              onChange={e => edit('title', e.target.value)}
              placeholder="Optional — defaults to the domain"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-card-description">Summary</Label>
            <Input
              id="link-card-description"
              value={fields.description}
              onChange={e => edit('description', e.target.value)}
              placeholder="Optional, one line"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="link-card-author">Author</Label>
              <Input
                id="link-card-author"
                value={fields.author}
                onChange={e => edit('author', e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-card-source">Source</Label>
              <Input
                id="link-card-source"
                value={fields.siteName}
                onChange={e => edit('siteName', e.target.value)}
                placeholder="Optional — defaults to the domain"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="link-card-date">Published</Label>
              <Input
                id="link-card-date"
                type="date"
                value={fields.publishedAt}
                onChange={e => edit('publishedAt', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-card-author-url">Author link</Label>
              <Input
                id="link-card-author-url"
                value={fields.authorUrl}
                onChange={e => edit('authorUrl', e.target.value)}
                placeholder="Optional"
              />
              {authorUrlInvalid && (
                <p className="text-xs text-destructive">Not a link; it will be left out.</p>
              )}
            </div>
          </div>

          {valid && (
            <div className="rounded-md border border-dashed border-border p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Preview</p>
              <LinkCardBlock isEditing data={card()} className="my-0" />
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
