/**
 * Toolkits (docs/prd/finance-restructure §1 E, §3, §4): the downloadable templates behind the essays.
 *
 * Tables: public.toolkits and public.toolkit_versions (supabase/migrations/20261024170000_toolkits.sql).
 * Readers see published toolkits only (RLS); the admin sees and writes every row. A toolkit is published
 * only with both attestations true: the form disables Publish until both boxes are ticked, and the
 * database refuses the write otherwise (toolkits_publish_checks), whatever the form did.
 *
 * Files: R2, through the toolkit-file edge function (src/lib/toolkitFile.ts). Publishing a version writes
 * the toolkit row (metadata, checks, status), uploads the file to a new key, then inserts the version row.
 * A version is never replaced: a new one is a new row and a new key.
 *
 * The tables are newer than src/integrations/supabase/types.ts, so the client is used untyped here and the
 * rows are typed below.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { uploadToolkitFile } from '@/lib/toolkitFile';
import { slugify } from '@/hooks/queries/useBooks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export { slugify };

export const TOOLKITS_KEY = ['toolkits'] as const;
export const PURPOSE_MAX = 140;
export const FILE_MAX_BYTES = 25 * 1024 * 1024;
export const VERSION_SHAPE = /^[0-9]+\.[0-9]+(\.[0-9]+)?$/;
const SLUG_SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface ModuleRef {
  id: string;
  slug: string;
  title: string;
  track_slug: string;
  sort_order: number;
}

export interface ToolkitVersion {
  id: string;
  toolkit_id: string;
  version: string;
  changelog: string | null;
  file_key: string;
  size_bytes: number;
  sha256: string;
  published_at: string;
}

export interface ToolkitChecks {
  no_client_data: boolean;
  verified_model: boolean;
}

export interface Toolkit {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  module_id: string;
  format: 'xlsx';
  status: 'draft' | 'published';
  checks: Partial<ToolkitChecks>;
  created_at: string;
  updated_at: string;
  toolkit_versions: ToolkitVersion[];
  finance_modules: ModuleRef | null;
}

/** The two attestations, worded as the form shows them (PRD §3). */
export const CHECK_LABELS: Record<keyof ToolkitChecks, string> = {
  no_client_data: 'This file contains no SAMB Group or client data (names, figures, structures).',
  verified_model: 'This file passed verify-financial-model (formulas, links, tie-outs).',
};

/** "T4 · Driver-Based Forecasting and Business Model Mapping": the track's code from the module slug, then the title. */
export const moduleLabel = (m: Pick<ModuleRef, 'slug' | 'title'>) => `${m.slug.split('-')[0].toUpperCase()} · ${m.title}`;
export const modulePath = (m: Pick<ModuleRef, 'slug' | 'track_slug'>) => `/finance/${m.track_slug}/${m.slug}`;
export const toolkitAnchor = (slug: string) => `toolkit-${slug}`;
export const TOOLKITS_PATH = '/finance/toolkits';

/** Newest first. */
export const byNewest = (versions: ToolkitVersion[]) =>
  [...versions].sort((a, b) => (a.published_at < b.published_at ? 1 : a.published_at > b.published_at ? -1 : 0));

/** The file name a version downloads as: the last part of its key. */
export const versionFileName = (v: Pick<ToolkitVersion, 'file_key'>) => v.file_key.split('/').pop() ?? v.file_key;

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
/** "24 Oct 2026" */
export const formatDate = (iso: string) => DATE.format(new Date(iso));

const SELECT = '*, toolkit_versions(*), finance_modules(id, slug, title, track_slug, sort_order)';

/**
 * What a reader is shown: RLS already returns readers published toolkits only; the admin also gets drafts,
 * so the same predicate is applied here (as groupShelves does for books) and the admin sees the page as a
 * reader does. A toolkit with no file yet has nothing to download and is left out.
 */
function forReaders(data: unknown): Toolkit[] {
  return ((data ?? []) as Toolkit[])
    .filter((t) => t.status === 'published')
    .map((t) => ({ ...t, toolkit_versions: byNewest(t.toolkit_versions ?? []) }))
    .filter((t) => t.toolkit_versions.length > 0);
}

/** Published toolkits that have a file, each with its versions newest first (the public page). */
export const useToolkits = () =>
  useQuery({
    queryKey: [...TOOLKITS_KEY, 'published'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Toolkit[]> => {
      const { data, error } = await db.from('toolkits').select(SELECT).order('title');
      if (error) throw error;
      return forReaders(data);
    },
  });

/** The published toolkits that come from one module (the module page's "Toolkit" line). */
export const useModuleToolkits = (moduleId: string | undefined) =>
  useQuery({
    queryKey: [...TOOLKITS_KEY, 'module', moduleId],
    enabled: !!moduleId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Toolkit[]> => {
      const { data, error } = await db.from('toolkits').select(SELECT).eq('module_id', moduleId).order('title');
      if (error) throw error;
      return forReaders(data);
    },
  });

/** Every toolkit, drafts included (the admin page; RLS returns them to the admin only). */
export const useAdminToolkits = () =>
  useQuery({
    queryKey: [...TOOLKITS_KEY, 'admin'],
    queryFn: async (): Promise<Toolkit[]> => {
      const { data, error } = await db.from('toolkits').select(SELECT).order('title');
      if (error) throw error;
      return ((data ?? []) as Toolkit[]).map((t) => ({ ...t, toolkit_versions: byNewest(t.toolkit_versions ?? []) }));
    },
  });

/** The Finance modules a toolkit can name, in track then module order. */
export const useFinanceModuleOptions = () =>
  useQuery({
    queryKey: ['finance-modules', 'options'],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<ModuleRef[]> => {
      const { data, error } = await db.from('finance_modules').select('id, slug, title, track_slug, sort_order');
      if (error) throw error;
      return ((data ?? []) as ModuleRef[]).sort(
        (a, b) => a.slug.split('-')[0].localeCompare(b.slug.split('-')[0]) || a.sort_order - b.sort_order,
      );
    },
  });

export interface ToolkitDraft {
  /** The toolkit a new version goes under, or undefined for a new toolkit. */
  id?: string;
  title: string;
  slug: string;
  purpose: string;
  module_id: string;
  version: string;
  changelog: string;
  file: File | null;
  checks: ToolkitChecks;
}

export type ToolkitErrors = Partial<Record<'title' | 'slug' | 'purpose' | 'module_id' | 'version' | 'file', string>>;

/** The form's rules, the same the database checks; the two checkboxes are the gate on top of them. */
export function toolkitErrors(d: ToolkitDraft, ctx: { takenSlugs: string[]; takenVersions: string[] }): ToolkitErrors {
  const e: ToolkitErrors = {};
  if (!d.title.trim()) e.title = 'A title.';
  if (!SLUG_SHAPE.test(d.slug) || d.slug.length > 80) e.slug = 'Lower-case letters, digits and single hyphens.';
  else if (!d.id && ctx.takenSlugs.includes(d.slug)) e.slug = 'Another toolkit has this slug.';
  if (!d.purpose.trim()) e.purpose = 'One sentence on what the file is for.';
  else if (d.purpose.length > PURPOSE_MAX) e.purpose = `At most ${PURPOSE_MAX} characters.`;
  if (!d.module_id) e.module_id = 'The module the file comes from.';
  if (!VERSION_SHAPE.test(d.version)) e.version = 'MAJOR.MINOR or MAJOR.MINOR.PATCH, e.g. 1.2.';
  else if (ctx.takenVersions.includes(d.version)) e.version = `Version ${d.version} is already published; a new version needs a new number.`;
  if (!d.file) e.file = 'The .xlsx file.';
  else if (!/\.xlsx$/i.test(d.file.name)) e.file = 'An .xlsx file.';
  else if (d.file.size > FILE_MAX_BYTES) e.file = 'At most 25 MB.';
  return e;
}

export const checksTicked = (c: ToolkitChecks) => c.no_client_data && c.verified_model;
export const canPublish = (d: ToolkitDraft, errors: ToolkitErrors) => Object.keys(errors).length === 0 && checksTicked(d.checks);

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** A database refusal in a sentence; the gate's own constraint says which rule it was. */
function refusal(error: { message?: string; code?: string } | null): Error {
  const msg = error?.message ?? '';
  if (msg.includes('toolkits_publish_checks')) return new Error('The server refused to publish: both checks must be ticked.');
  if (error?.code === '23505') return new Error('That slug or version already exists.');
  return new Error(msg || 'The toolkit could not be saved.');
}

/** Publishes one version: the toolkit row (published, with its checks), the file, then the version row. */
export const usePublishToolkit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: ToolkitDraft): Promise<ToolkitVersion> => {
      if (!d.file) throw new Error('The .xlsx file.');
      const row = {
        title: d.title.trim(),
        purpose: d.purpose.trim(),
        module_id: d.module_id,
        status: 'published',
        checks: { no_client_data: d.checks.no_client_data, verified_model: d.checks.verified_model },
      };
      const written = d.id
        ? await db.from('toolkits').update(row).eq('id', d.id).select('id, slug').single()
        : await db.from('toolkits').insert({ ...row, slug: d.slug }).select('id, slug').single();
      if (written.error) throw refusal(written.error);
      const { id, slug } = written.data as { id: string; slug: string };

      const sha256 = await sha256Hex(d.file);
      const fileKey = await uploadToolkitFile(slug, d.version, d.file);
      const version = await db
        .from('toolkit_versions')
        .insert({ toolkit_id: id, version: d.version, changelog: d.changelog.trim() || null, file_key: fileKey, size_bytes: d.file.size, sha256 })
        .select('*')
        .single();
      if (version.error) throw refusal(version.error);
      return version.data as ToolkitVersion;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TOOLKITS_KEY }),
  });
};
