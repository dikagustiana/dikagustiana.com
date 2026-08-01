/**
 * PublishModal — every non-writing decision, at the publish boundary.
 *
 * The canvas is for writing. Placement, lesson type, references, key
 * takeaways and the cover image are all decisions about a finished piece, so
 * they live here rather than in a sidebar competing with the prose.
 *
 * It is also where validation is allowed to speak. While drafting the editor
 * says nothing — an empty new essay greeting its author with "5 issues to
 * fix" is a scold for not having written yet. The rules are unchanged; only
 * the moment they are voiced has moved.
 */

import { useEffect, useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle2, Loader2, Plus, Send, Trash2, XCircle } from 'lucide-react';
import type { FinanceModule } from '@/hooks/queries/useFinance';
import type { ValidationResult } from './WriterValidation';
import { cn } from '@/lib/utils';

export interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Reader access. Only 'everyone' exists — there is no paid tier. */
  isPublished: boolean;

  /* Placement */
  isFinanceSection: boolean;
  modules: FinanceModule[];
  moduleId: string | null;
  setModuleId: (v: string | null) => void;
  financeOrder: number | null;
  setFinanceOrder: (v: number | null) => void;
  lessonType: string;
  setLessonType: (v: string) => void;

  /* Category — required by the database (essays.category_id is NOT NULL). */
  categories: { id: string; name: string; slug: string }[];
  categoryId: string;
  setCategoryId: (v: string) => void;

  /* End matter */
  keyTakeaways: string[];
  setKeyTakeaways: (v: string[]) => void;
  references: { label: string; url: string }[];
  setReferences: (v: { label: string; url: string }[]) => void;

  /* Byline — shown on the reader side under the title. */
  author: string;
  setAuthor: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  authorBio: string;
  setAuthorBio: (v: string) => void;

  /* Cover */
  heroImageUrl: string;
  setHeroImageUrl: (v: string) => void;
  heroCaption: string;
  setHeroCaption: (v: string) => void;

  validation: ValidationResult;
  isSaving: boolean;
  onPublish: () => void;
  onSaveDraft: () => void;
}

export function PublishModal({
  open,
  onOpenChange,
  isPublished,
  isFinanceSection,
  modules,
  moduleId,
  setModuleId,
  financeOrder,
  setFinanceOrder,
  lessonType,
  setLessonType,
  categories,
  categoryId,
  setCategoryId,
  keyTakeaways,
  setKeyTakeaways,
  references,
  setReferences,
  author,
  setAuthor,
  date,
  setDate,
  authorBio,
  setAuthorBio,
  heroImageUrl,
  setHeroImageUrl,
  heroCaption,
  setHeroCaption,
  validation,
  isSaving,
  onPublish,
  onSaveDraft,
}: PublishModalProps) {
  const [track, setTrack] = useState<string>(
    () => modules.find(m => m.id === moduleId)?.track_slug ?? '',
  );

  // The modal stays mounted, so a lazy initialiser runs once — before the
  // module list has loaded and before this essay's placement is known. Without
  // this the Track select reads "All tracks" every time it is opened and the
  // Module list offers every module in the curriculum, four of them called
  // "01 · …". Re-derive on open; the writer's own choice still wins while it
  // is open.
  useEffect(() => {
    if (!open) return;
    setTrack(modules.find(m => m.id === moduleId)?.track_slug ?? '');
  }, [open, moduleId, modules]);

  const tracks = useMemo(
    () => Array.from(new Set(modules.map(m => m.track_slug))).sort(),
    [modules],
  );
  // Track → module is a narrowing, not two independent choices: picking the
  // track filters the modules, and picking a module fixes the track.
  const modulesForTrack = useMemo(
    () => modules.filter(m => !track || m.track_slug === track).sort((a, b) => a.sort_order - b.sort_order),
    [modules, track],
  );

  const selectedModule = modules.find(m => m.id === moduleId) ?? null;

  const setTakeaway = (index: number, value: string) => {
    const next = [...keyTakeaways];
    next[index] = value;
    setKeyTakeaways(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Post settings</DialogTitle>
          <DialogDescription>
            Everything that is not the writing. Set once, before it goes out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ── What is missing, stated plainly ── */}
          {validation.errors.length > 0 ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
                <XCircle className="h-4 w-4" />
                {validation.errors.length === 1
                  ? 'One thing is missing before this can be published'
                  : `${validation.errors.length} things are missing before this can be published`}
              </p>
              <ul className="space-y-1">
                {validation.errors.map((error, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-destructive">
                    <span aria-hidden className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-current" />
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Ready to publish
            </div>
          )}

          {validation.warnings.length > 0 && (
            <ul className="space-y-1">
              {validation.warnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-500">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {warning.message}
                </li>
              ))}
            </ul>
          )}

          <Separator />

          {/* ── Who can read this ── */}
          <div className="space-y-2">
            <Label>Who can read this?</Label>
            <p className="text-sm text-muted-foreground">
              Everyone. Drafts are visible only to you until you publish; there is no paid tier.
            </p>
          </div>

          <Separator />

          {/* ── Placement: the reference's "Section", in this project's terms ── */}
          {isFinanceSection && (
            <div className="space-y-4">
              <div>
                <Label className="text-base">Placement</Label>
                <p className="text-sm text-muted-foreground">
                  The module decides the track, the phase and the essay's URL.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="publish-track">Track</Label>
                  <Select
                    value={track || '__all__'}
                    onValueChange={v => setTrack(v === '__all__' ? '' : v)}
                  >
                    <SelectTrigger id="publish-track">
                      <SelectValue placeholder="All tracks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All tracks</SelectItem>
                      {tracks.map(t => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="publish-module">Module</Label>
                  <Select
                    value={moduleId || '__none__'}
                    onValueChange={v => {
                      const id = v === '__none__' ? null : v;
                      setModuleId(id);
                      const mod = modules.find(m => m.id === id);
                      if (mod) setTrack(mod.track_slug);
                    }}
                  >
                    <SelectTrigger id="publish-module">
                      <SelectValue placeholder="Select a module…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— No module —</SelectItem>
                      <SelectGroup>
                        {track && <SelectLabel>{track}</SelectLabel>}
                        {modulesForTrack.map(mod => (
                          <SelectItem key={mod.id} value={mod.id}>
                            {String(mod.sort_order).padStart(2, '0')} · {mod.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="publish-order">Order in module</Label>
                  <Input
                    id="publish-order"
                    type="number"
                    min={1}
                    value={financeOrder ?? ''}
                    onChange={e => setFinanceOrder(e.target.value ? Number(e.target.value) : null)}
                    placeholder="1"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="publish-lesson-type">Lesson type</Label>
                  <Select value={lessonType} onValueChange={setLessonType}>
                    <SelectTrigger id="publish-lesson-type">
                      <SelectValue placeholder="Lesson type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concept">concept</SelectItem>
                      <SelectItem value="framework">framework</SelectItem>
                      <SelectItem value="case-study">case-study</SelectItem>
                      <SelectItem value="exercise">exercise</SelectItem>
                      <SelectItem value="model-walkthrough">model-walkthrough</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedModule && (
                <p className="text-xs text-muted-foreground">
                  Publishes to <code className="font-mono">/finance/{selectedModule.track_slug}/{selectedModule.slug}/…</code>
                </p>
              )}
            </div>
          )}

          {categories.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="publish-category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="publish-category">
                  <SelectValue placeholder="Select a category…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* ── Key takeaways ── */}
          <div className="space-y-3">
            <div>
              <Label className="text-base">Key takeaways</Label>
              <p className="text-sm text-muted-foreground">
                {isFinanceSection && moduleId
                  ? 'Three required for concept and framework lessons; optional (but all-or-nothing) for case studies, exercises and model walkthroughs. They appear at the end of the article.'
                  : 'Three are required to publish. They appear at the end of the article.'}
              </p>
            </div>
            {keyTakeaways.map((takeaway, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="mt-2.5 w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <Textarea
                  value={takeaway}
                  onChange={e => setTakeaway(index, e.target.value)}
                  placeholder={`Takeaway ${index + 1}`}
                  rows={2}
                  className="flex-1"
                />
                {keyTakeaways.length > 3 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-1 text-muted-foreground hover:text-destructive"
                    onClick={() => setKeyTakeaways(keyTakeaways.filter((_, i) => i !== index))}
                    aria-label={`Remove takeaway ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setKeyTakeaways([...keyTakeaways, ''])}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add takeaway
            </Button>
          </div>

          <Separator />

          {/* ── References ── */}
          <div className="space-y-3">
            <Label className="text-base">References</Label>
            {references.length === 0 && (
              <p className="text-sm text-muted-foreground">None yet.</p>
            )}
            {references.map((reference, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-[1.6fr_1fr]">
                  <Input
                    value={reference.label}
                    onChange={e => {
                      const next = [...references];
                      next[index] = { ...next[index], label: e.target.value };
                      setReferences(next);
                    }}
                    placeholder="Source"
                  />
                  <Input
                    value={reference.url}
                    onChange={e => {
                      const next = [...references];
                      next[index] = { ...next[index], url: e.target.value };
                      setReferences(next);
                    }}
                    placeholder="URL (optional)"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setReferences(references.filter((_, i) => i !== index))}
                  aria-label={`Remove reference ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReferences([...references, { label: '', url: '' }])}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add reference
            </Button>
          </div>

          <Separator />

          {/* ── Byline ── */}
          <div className="space-y-3">
            <Label className="text-base">Byline</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="publish-author" className="text-sm font-normal text-muted-foreground">
                  Author
                </Label>
                <Input
                  id="publish-author"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="publish-date" className="text-sm font-normal text-muted-foreground">
                  Publish date
                </Label>
                <Input
                  id="publish-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>
            <Textarea
              value={authorBio}
              onChange={e => setAuthorBio(e.target.value)}
              placeholder="Author bio (optional) — appears under the article"
              rows={2}
              aria-label="Author bio"
            />
          </div>

          <Separator />

          {/* ── Cover image ── */}
          <div className="space-y-3">
            <Label className="text-base">Cover image</Label>
            <Input
              value={heroImageUrl}
              onChange={e => setHeroImageUrl(e.target.value)}
              placeholder="https://…"
              aria-label="Cover image URL"
            />
            <Input
              value={heroCaption}
              onChange={e => setHeroCaption(e.target.value)}
              placeholder="Caption or credit (optional)"
              aria-label="Cover image caption"
            />
            {heroImageUrl && (
              <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                <img
                  src={heroImageUrl}
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border pt-4 sm:justify-between">
          <Button type="button" variant="ghost" onClick={onSaveDraft} disabled={isSaving}>
            Save as draft
          </Button>
          <Button
            type="button"
            onClick={onPublish}
            disabled={isSaving || !validation.canPublish}
            className={cn(!validation.canPublish && 'cursor-not-allowed')}
          >
            {isSaving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1 h-4 w-4" />
            )}
            {isPublished ? 'Update published post' : 'Publish now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
