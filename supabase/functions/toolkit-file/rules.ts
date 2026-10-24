/**
 * toolkit-file's rules, with no I/O: what a request may ask, the object key a
 * version is stored at, and the headers a download carries. index.ts is auth
 * and wiring; tests/unit/toolkitFile.test.ts covers this file.
 *
 * A version's file lives at toolkits/<slug>/<version>/<slug>-v<version>.xlsx
 * in dg-books-public (docs/prd/finance-restructure §4, Storage), so the name a
 * reader saves is the one the card's button shows: "Download driver-tree-v1.2.xlsx".
 */

export const FILE_MAX_BYTES = 25 * 1024 * 1024;
export const READ_TTL_SECONDS = 60 * 60;
export const WRITE_TTL_SECONDS = 10 * 60;

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const SLUG_SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** MAJOR.MINOR or MAJOR.MINOR.PATCH, as toolkit_versions_version_shape. */
export const VERSION_SHAPE = /^[0-9]+\.[0-9]+(\.[0-9]+)?$/;

export type Request =
  | { action: 'read'; slug: string; version: string | null }
  | { action: 'upload'; slug: string; version: string; size: number };

export type Parsed = { ok: true; req: Request } | { ok: false; message: string };

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const slugOk = (s: string) => SLUG_SHAPE.test(s) && s.length <= 80;

export function parseRequest(body: unknown): Parsed {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const action = str(b.action);
  const slug = str(b.slug);
  if (action === 'read') {
    if (!slugOk(slug)) return { ok: false, message: 'A toolkit slug is needed.' };
    const version = b.version == null || b.version === '' ? null : str(b.version);
    if (version !== null && !VERSION_SHAPE.test(version)) return { ok: false, message: 'Not a version.' };
    return { ok: true, req: { action, slug, version } };
  }
  if (action === 'upload') {
    const version = str(b.version);
    const filename = str(b.filename);
    const contentType = str(b.contentType);
    const size = typeof b.size === 'number' ? b.size : NaN;
    if (!slugOk(slug)) return { ok: false, message: 'A toolkit slug is needed.' };
    if (!VERSION_SHAPE.test(version)) return { ok: false, message: 'The version is MAJOR.MINOR or MAJOR.MINOR.PATCH.' };
    if (!/\.xlsx$/i.test(filename)) return { ok: false, message: 'An .xlsx file.' };
    if (contentType && contentType !== XLSX_TYPE) return { ok: false, message: 'The file type does not match its name.' };
    if (!Number.isFinite(size) || size <= 0) return { ok: false, message: 'The file is empty.' };
    if (size > FILE_MAX_BYTES) return { ok: false, message: 'At most 25 MB.' };
    return { ok: true, req: { action, slug, version, size } };
  }
  return { ok: false, message: 'action must be read or upload.' };
}

export const fileName = (slug: string, version: string) => `${slug}-v${version}.xlsx`;

/** toolkits/<slug>/<version>/<slug>-v<version>.xlsx */
export const objectKey = (slug: string, version: string) => `toolkits/${slug}/${version}/${fileName(slug, version)}`;

export interface VersionRow {
  version: string;
  file_key: string;
  published_at: string;
}

/** The asked version, or the latest published when none is asked. */
export function pickVersion(rows: VersionRow[], version: string | null): VersionRow | null {
  if (version) return rows.find((r) => r.version === version) ?? null;
  return [...rows].sort((a, b) => (a.published_at < b.published_at ? 1 : a.published_at > b.published_at ? -1 : 0))[0] ?? null;
}

/** Content-Disposition: attachment, with an ASCII name (the keys are ASCII already). */
export const attachment = (key: string) => `attachment; filename="${key.split('/').pop()!.replace(/["\\]/g, '')}"`;

/** A token PostgREST and Auth will take as a Bearer: a JWT (three base64url parts), never an API key. */
export const isJwt = (token: string) => /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(token);
