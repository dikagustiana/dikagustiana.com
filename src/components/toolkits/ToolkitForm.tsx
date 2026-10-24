/**
 * Publishing a toolkit version from /admin/toolkits (docs/prd/finance-restructure §1 E, §3): Title, Slug
 * (from the title until edited, fixed once the toolkit exists), Purpose (one sentence, 140 characters),
 * Linked module, Version, Changelog, File (.xlsx, at most 25 MB), and the two attestations. Publish stays
 * disabled until every field passes and both boxes are ticked; the database checks the attestations again
 * (toolkits_publish_checks) and its refusal is shown here.
 */
import { useId, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  CHECK_LABELS,
  PURPOSE_MAX,
  canPublish,
  checksTicked,
  moduleLabel,
  slugify,
  toolkitErrors,
  usePublishToolkit,
  type ModuleRef,
  type Toolkit,
  type ToolkitChecks,
  type ToolkitDraft,
} from '@/hooks/queries/useToolkits';

const draftOf = (t: Toolkit | null): ToolkitDraft => ({
  id: t?.id,
  title: t?.title ?? '',
  slug: t?.slug ?? '',
  purpose: t?.purpose ?? '',
  module_id: t?.module_id ?? '',
  version: '',
  changelog: '',
  file: null,
  // A new version is attested afresh: the boxes start unticked every time.
  checks: { no_client_data: false, verified_model: false },
});

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Mounted with a key per toolkit and per publish, so every new version starts from a clean form. */
interface ToolkitFormProps {
  /** The toolkit a new version goes under, or null for a new toolkit. */
  toolkit: Toolkit | null;
  modules: ModuleRef[];
  /** Every other toolkit's slug, so a clash shows before the database refuses it. */
  takenSlugs: string[];
  onDone: () => void;
}

export function ToolkitForm({ toolkit, modules, takenSlugs, onDone }: ToolkitFormProps) {
  const id = useId();
  const [d, setD] = useState<ToolkitDraft>(() => draftOf(toolkit));
  const [slugEdited, setSlugEdited] = useState(!!toolkit);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const publish = usePublishToolkit();
  const { toast } = useToast();

  const takenVersions = useMemo(() => toolkit?.toolkit_versions.map((v) => v.version) ?? [], [toolkit]);
  const errors = toolkitErrors(d, { takenSlugs, takenVersions });
  const ready = canPublish(d, errors);
  const set = (patch: Partial<ToolkitDraft>) => setD((prev) => ({ ...prev, ...patch }));
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const shown = (k: keyof typeof errors) => (touched[k] ? errors[k] : undefined);
  const tick = (k: keyof ToolkitChecks, v: boolean) => set({ checks: { ...d.checks, [k]: v } });

  const submit = () => {
    if (!ready) return;
    publish.mutate(d, {
      onSuccess: (v) => {
        toast({ title: 'Published', description: `${d.title} v${v.version} is on /finance/toolkits.` });
        onDone();
      },
    });
  };

  return (
    <form
      className="space-y-5"
      aria-label={toolkit ? `New version of ${toolkit.title}` : 'New toolkit'}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field id={`${id}-title`} label="Title" error={shown('title')}>
        <Input
          id={`${id}-title`}
          value={d.title}
          onBlur={() => touch('title')}
          onChange={(e) => set({ title: e.target.value, ...(slugEdited ? {} : { slug: slugify(e.target.value) }) })}
        />
      </Field>
      <Field id={`${id}-slug`} label="Slug" error={shown('slug')} hint={toolkit ? 'Fixed once a version is published: it names the files.' : 'From the title until you edit it.'}>
        <Input
          id={`${id}-slug`}
          value={d.slug}
          disabled={!!toolkit}
          onBlur={() => touch('slug')}
          onChange={(e) => {
            setSlugEdited(true);
            set({ slug: e.target.value });
          }}
        />
      </Field>
      <Field id={`${id}-purpose`} label="Purpose" error={shown('purpose')} hint={`One sentence, at most ${PURPOSE_MAX} characters (${d.purpose.length}).`}>
        <Input id={`${id}-purpose`} value={d.purpose} maxLength={PURPOSE_MAX} onBlur={() => touch('purpose')} onChange={(e) => set({ purpose: e.target.value })} />
      </Field>
      <Field id={`${id}-module`} label="Linked module" error={shown('module_id')}>
        <select
          id={`${id}-module`}
          value={d.module_id}
          onBlur={() => touch('module_id')}
          onChange={(e) => set({ module_id: e.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Choose a module</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {moduleLabel(m)}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id={`${id}-version`}
        label="Version"
        error={shown('version')}
        hint={takenVersions.length ? `Published: ${takenVersions.join(', ')}. A new version never replaces one.` : 'MAJOR.MINOR or MAJOR.MINOR.PATCH, e.g. 1.0.'}
      >
        <Input id={`${id}-version`} value={d.version} placeholder="1.0" onBlur={() => touch('version')} onChange={(e) => set({ version: e.target.value.trim() })} />
      </Field>
      <Field id={`${id}-changelog`} label="Changelog">
        <Textarea id={`${id}-changelog`} value={d.changelog} rows={3} onChange={(e) => set({ changelog: e.target.value })} />
      </Field>
      <Field id={`${id}-file`} label="File" error={shown('file')} hint=".xlsx only, at most 25 MB.">
        <Input
          id={`${id}-file`}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            touch('file');
            set({ file: e.target.files?.[0] ?? null });
          }}
        />
      </Field>

      <fieldset className="space-y-3 rounded-md border border-border p-4">
        <legend className="px-1 text-sm font-medium">Before publishing</legend>
        {(Object.keys(CHECK_LABELS) as (keyof ToolkitChecks)[]).map((k) => (
          <label key={k} className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={d.checks[k]} onChange={(e) => tick(k, e.target.checked)} />
            <span>{CHECK_LABELS[k]}</span>
          </label>
        ))}
      </fieldset>

      {publish.isError && (
        <p role="alert" className="text-sm text-destructive">
          {publish.error instanceof Error ? publish.error.message : 'The toolkit could not be published.'}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!ready || publish.isPending}>
          {publish.isPending ? 'Publishing…' : 'Publish'}
        </Button>
        {!checksTicked(d.checks) && <span className="text-xs text-muted-foreground">Publish is enabled once both boxes are ticked.</span>}
      </div>
    </form>
  );
}
