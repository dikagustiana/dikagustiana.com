/**
 * book-file's rules, with no I/O: what a request may ask, the object keys it
 * may touch, and the headers a signed read carries. index.ts is auth and
 * wiring; tests/unit/bookFile.test.ts covers this file.
 */

export const FILE_MAX_BYTES = 50 * 1024 * 1024;
export const READ_TTL_SECONDS = 60 * 60;
export const WRITE_TTL_SECONDS = 10 * 60;

export const SLUG_SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Every key this function signs a write or delete for: files/<slug>/<name>.pdf|epub. */
export const KEY_SHAPE = /^files\/[a-z0-9]+(?:-[a-z0-9]+)*\/[A-Za-z0-9_.-]{1,120}\.(pdf|epub)$/;

const TYPES: Record<'pdf' | 'epub', string> = { pdf: 'application/pdf', epub: 'application/epub+zip' };

export type Request =
  | { action: 'read'; slug: string; as: 'inline' | 'download' }
  | { action: 'upload'; slug: string; filename: string; contentType: string; size: number }
  | { action: 'remove'; key: string };

export type Parsed = { ok: true; req: Request } | { ok: false; message: string };

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function extOf(name: string): 'pdf' | 'epub' | null {
  const m = /\.(pdf|epub)$/i.exec(name);
  return m ? (m[1].toLowerCase() as 'pdf' | 'epub') : null;
}

export const contentTypeOf = (key: string) => TYPES[extOf(key) ?? 'pdf'];

export function parseRequest(body: unknown): Parsed {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const action = str(b.action);
  if (action === 'read') {
    const slug = str(b.slug);
    if (!SLUG_SHAPE.test(slug) || slug.length > 120) return { ok: false, message: 'A book slug is needed.' };
    return { ok: true, req: { action, slug, as: b.as === 'download' ? 'download' : 'inline' } };
  }
  if (action === 'upload') {
    const slug = str(b.slug);
    const filename = str(b.filename);
    const contentType = str(b.contentType);
    const size = typeof b.size === 'number' ? b.size : NaN;
    if (!SLUG_SHAPE.test(slug) || slug.length > 120) return { ok: false, message: 'A book slug is needed.' };
    const ext = extOf(filename);
    if (!ext) return { ok: false, message: 'A PDF or EPUB file.' };
    if (contentType && contentType !== TYPES[ext]) return { ok: false, message: 'The file type does not match its name.' };
    if (!Number.isFinite(size) || size <= 0) return { ok: false, message: 'The file is empty.' };
    if (size > FILE_MAX_BYTES) return { ok: false, message: 'At most 50 MB.' };
    return { ok: true, req: { action, slug, filename, contentType: TYPES[ext], size } };
  }
  if (action === 'remove') {
    const key = str(b.key);
    if (!KEY_SHAPE.test(key)) return { ok: false, message: 'Not a book file.' };
    return { ok: true, req: { action, key } };
  }
  return { ok: false, message: 'action must be read, upload or remove.' };
}

/** files/<slug>/<stamp>-<safe name>.<ext>, the layout useBooks.ts has always written. */
export function objectKey(slug: string, filename: string, now: number): string {
  const ext = extOf(filename) ?? 'pdf';
  const safe = filename.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_').replace(/^[._-]+/, '').slice(0, 80) || 'book';
  return `files/${slug}/${now}-${safe}.${ext}`;
}

/** The name a download is saved under: the title, with what file systems refuse taken out. */
export function downloadName(title: string | null, slug: string, key: string): string {
  const printable = [...(title ?? '')].map((c) => (c.charCodeAt(0) < 32 ? ' ' : c)).join('');
  const base = printable.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || slug;
  return `${base}.${extOf(key) ?? 'pdf'}`;
}

/** Content-Disposition with an ASCII fallback and the exact name in RFC 5987 form. */
export function contentDisposition(as: 'inline' | 'download', name: string): string {
  const ascii = name.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '') || 'book';
  const exact = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${as === 'download' ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${exact}`;
}

/** A token PostgREST and Auth will take as a Bearer: a JWT (three base64url parts), never an API key. */
export const isJwt = (token: string) => /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(token);
