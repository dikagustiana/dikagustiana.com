/**
 * Books on shelves (site cleanup 2026-10, PRD §D; supabase/migrations/20261024100000_books_shelves.sql).
 *
 * Readers get the shelves that hold a published book, each with its published books in order; the admin
 * gets every shelf and every live book, published or not. A free book is a file in the `books` bucket with
 * the owner's redistribution basis recorded (license_note); a paid book is an https purchase URL and no
 * file. RLS is the defence: readers are served only published, live rows, and every write is admin-only
 * (table and bucket); the checks here are courtesy, so a form can say what is wrong before the database
 * refuses it.
 *
 * Storage layout in `books`: files/<slug>/<timestamp>-<safe-name>.pdf|epub and
 * covers/<slug>/<timestamp>.<ext>. An upload whose row write fails is removed again (the object would be
 * orphaned); a file or cover replaced by a save is removed once the row no longer points at it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { logAuditEvent } from '@/lib/auditLog';

export type BookAccess = 'free' | 'paid';

export interface Shelf {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

export interface Book {
  id: string;
  slug: string;
  title: string | null;
  author: string | null;
  year: number | null;
  shelf_id: string | null;
  access: BookAccess;
  purchase_url: string | null;
  license_note: string | null;
  filepath: string | null;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  cover_path: string | null;
  synopsis_json: Json | null;
  synopsis_html: string | null;
  synopsis_excerpt: string | null;
  sort_order: number;
  published: boolean;
  deleted_at: string | null;
}

export interface ShelfWithBooks extends Shelf {
  books: Book[];
}

const BUCKET = 'books';
const SHELF_COLUMNS = 'id, slug, name, sort_order';
const BOOK_COLUMNS =
  'id, slug, title, author, year, shelf_id, access, purchase_url, license_note, filepath, filename, mime_type, size_bytes, cover_path, synopsis_json, synopsis_html, synopsis_excerpt, sort_order, published, deleted_at';

export const COVER_MAX_BYTES = 2 * 1024 * 1024;
export const FILE_MAX_BYTES = 50 * 1024 * 1024;
export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const FILE_TYPES = ['application/pdf', 'application/epub+zip'] as const;
const EXCERPT_CHARS = 240;

// ---------------------------------------------------------------------------
// Pure helpers (tests/unit/books.test.tsx)
// ---------------------------------------------------------------------------

const byOrder = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

/**
 * Shelves with their books, both in order. With `readers` (the public page), only published, live books,
 * and only shelves that hold one (D7); otherwise every shelf, and every live book.
 */
export function groupShelves(shelves: Shelf[], books: Book[], readers: boolean): ShelfWithBooks[] {
  const live = books.filter((b) => !b.deleted_at && (!readers || b.published));
  const out = [...shelves].sort(byOrder).map((s) => ({ ...s, books: live.filter((b) => b.shelf_id === s.id).sort(byOrder) }));
  return readers ? out.filter((s) => s.books.length > 0) : out;
}

/** A slug from a title: lower case, ASCII letters and digits, single hyphens. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export const SLUG_SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The plain text of a synopsis, its first ~240 characters cut at a word: the card's two-line preview. */
export function excerptOf(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<\/(p|li|h[1-6])>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  if (text.length <= EXCERPT_CHARS) return text;
  const cut = text.slice(0, EXCERPT_CHARS);
  const at = cut.lastIndexOf(' ');
  return `${(at > EXCERPT_CHARS * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}

export interface BookDraft {
  id?: string;
  title: string;
  slug: string;
  author: string;
  year: string;
  shelf_id: string;
  access: BookAccess;
  license_note: string;
  purchase_url: string;
  published: boolean;
  /** A new file to upload, or the stored one. */
  file: File | null;
  filepath: string | null;
  cover: File | null;
  cover_path: string | null;
  synopsis_json: Json | null;
  synopsis_html: string | null;
}

export type BookErrors = Partial<Record<'title' | 'slug' | 'year' | 'shelf_id' | 'file' | 'license_note' | 'purchase_url' | 'cover', string>>;

/**
 * What stops a book from being saved, field by field (03-DESIGN §6), as the database's own checks would:
 * free needs a file and its redistribution basis (R4); paid needs an https purchase URL and no file.
 */
export function bookErrors(d: BookDraft, takenSlugs: readonly string[] = []): BookErrors {
  const e: BookErrors = {};
  if (!d.title.trim()) e.title = 'A title is needed.';
  if (!d.slug) e.slug = 'A slug is needed.';
  else if (!SLUG_SHAPE.test(d.slug)) e.slug = 'Lower-case letters, digits and single hyphens only.';
  else if (takenSlugs.includes(d.slug)) e.slug = 'Another book has this slug.';
  if (d.year.trim() && !/^\d{1,4}$/.test(d.year.trim())) e.year = 'A year, such as 2023.';
  if (!d.shelf_id) e.shelf_id = 'Choose a shelf.';
  if (d.cover) {
    if (!(COVER_TYPES as readonly string[]).includes(d.cover.type)) e.cover = 'A JPG, PNG or WebP image.';
    else if (d.cover.size > COVER_MAX_BYTES) e.cover = 'At most 2 MB.';
  }
  if (d.access === 'free') {
    if (d.file) {
      if (!isBookFile(d.file)) e.file = 'A PDF or EPUB file.';
      else if (d.file.size > FILE_MAX_BYTES) e.file = 'At most 50 MB.';
    } else if (!d.filepath) e.file = 'A free book needs its file.';
    if (!d.license_note.trim()) e.license_note = 'Say why this book can be redistributed, e.g. CC BY 4.0.';
  } else if (!/^https:\/\/\S+$/.test(d.purchase_url.trim())) e.purchase_url = 'A link starting with https://.';
  return e;
}

function isBookFile(f: File): boolean {
  return (FILE_TYPES as readonly string[]).includes(f.type) || /\.(pdf|epub)$/i.test(f.name);
}

const extOf = (f: File, fallback: string) => (/\.([a-z0-9]+)$/i.exec(f.name)?.[1] ?? fallback).toLowerCase();

/** The public URL of a stored object, or null. */
export function publicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** The free book's file, saved under its title when downloaded. */
export function downloadUrl(book: Pick<Book, 'filepath' | 'title' | 'slug' | 'filename'>): string | null {
  if (!book.filepath) return null;
  const ext = /\.([a-z0-9]+)$/i.exec(book.filepath)?.[1] ?? 'pdf';
  const name = `${(book.title ?? book.slug).replace(/[\\/:*?"<>|]+/g, ' ').trim() || book.slug}.${ext}`;
  return supabase.storage.from(BUCKET).getPublicUrl(book.filepath, { download: name }).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function fetchAll(readers: boolean): Promise<ShelfWithBooks[]> {
  const [shelves, books] = await Promise.all([
    supabase.from('book_shelves').select(SHELF_COLUMNS).order('sort_order'),
    (() => {
      let q = supabase.from('books_uploads').select(BOOK_COLUMNS).is('deleted_at', null);
      if (readers) q = q.eq('published', true);
      return q.order('sort_order');
    })(),
  ]);
  if (shelves.error) throw shelves.error;
  if (books.error) throw books.error;
  return groupShelves((shelves.data ?? []) as Shelf[], (books.data ?? []) as unknown as Book[], readers);
}

/** The public page: shelves holding a published book, each with its published books. */
export const useShelves = () =>
  useQuery({
    queryKey: ['books', 'shelves', 'readers'],
    queryFn: () => fetchAll(true),
  });

/** /admin/books: every shelf, every live book. */
export const useAdminShelves = () =>
  useQuery({
    queryKey: ['books', 'shelves', 'admin'],
    queryFn: () => fetchAll(false),
  });

/** A book's slug from its id, as RLS allows: for an old link that names a book by id. */
export const useBookById = (id: string | undefined) =>
  useQuery({
    queryKey: ['books', 'by-id', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('books_uploads').select('id, slug').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as { id: string; slug: string } | null;
    },
    enabled: !!id,
    // A redirect waits on this; an id that is not a uuid, or not there, lands on the shelf at once.
    retry: false,
  });

// ---------------------------------------------------------------------------
// Writes (admin)
// ---------------------------------------------------------------------------

const useInvalidate = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['books'] });
};

export interface ShelfInput {
  id?: string;
  name: string;
  slug: string;
  sort_order?: number;
}

export const useSaveShelf = () => {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async (s: ShelfInput) => {
      const row = { name: s.name.trim(), slug: s.slug };
      if (s.id) {
        const { error } = await supabase.from('book_shelves').update(row).eq('id', s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('book_shelves').insert({ ...row, sort_order: s.sort_order ?? 0 });
        if (error) throw error;
      }
      await logAuditEvent({ action: s.id ? 'update' : 'create', table_name: 'book_shelves', record_id: s.id, record_title: row.name });
    },
    onSuccess: done,
  });
};

/**
 * Only an empty shelf can go; the database refuses one that holds a book (ON DELETE RESTRICT). Books removed
 * earlier (soft-deleted) still name the shelf, so they let go of it first.
 */
export const useDeleteShelf = () => {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async (s: Shelf) => {
      const { error: release } = await supabase.from('books_uploads').update({ shelf_id: null }).eq('shelf_id', s.id).not('deleted_at', 'is', null);
      if (release) throw release;
      const { error } = await supabase.from('book_shelves').delete().eq('id', s.id);
      if (error) throw error;
      await logAuditEvent({ action: 'delete', table_name: 'book_shelves', record_id: s.id, record_title: s.name });
    },
    onSuccess: done,
  });
};

/** Writes the whole order at once, as the homepage order does. */
const reorder = (table: 'book_shelves' | 'books_uploads') => async (ids: string[]) => {
  const results = await Promise.all(ids.map((id, i) => supabase.from(table).update({ sort_order: i }).eq('id', id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
};

export const useReorderShelves = () => {
  const done = useInvalidate();
  return useMutation({ mutationFn: reorder('book_shelves'), onSuccess: done });
};

export const useReorderBooks = () => {
  const done = useInvalidate();
  return useMutation({ mutationFn: reorder('books_uploads'), onSuccess: done });
};

/** The slug a removed book keeps, so its own slug is free for a new book (the slug is unique over every row). */
export const removedSlug = (slug: string, now: number = Date.now()) => `${slug}-removed-${now.toString(36)}`.slice(-100).replace(/^-+/, '');

/** Soft delete: the row stays, with deleted_at, out of every reader's sight; its objects stay too. */
export const useDeleteBook = () => {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async (b: Pick<Book, 'id' | 'title' | 'slug'>) => {
      const { error } = await supabase
        .from('books_uploads')
        .update({ deleted_at: new Date().toISOString(), published: false, slug: removedSlug(b.slug) })
        .eq('id', b.id);
      if (error) throw error;
      await logAuditEvent({ action: 'delete', table_name: 'books_uploads', record_id: b.id, record_title: b.title ?? b.slug });
    },
    onSuccess: done,
  });
};

export interface SaveBookInput {
  draft: BookDraft;
  shelfSlug: string;
  sortOrder: number;
}

/**
 * Uploads what is new (file, cover), then writes the row. If the row write fails, what was uploaded is
 * removed. Once the row is written, a file or cover it no longer points at is removed.
 */
export const useSaveBook = () => {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async ({ draft: d, shelfSlug, sortOrder }: SaveBookInput) => {
      const uploaded: string[] = [];
      const stamp = Date.now();
      const put = async (path: string, file: File) => {
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type || undefined });
        if (error) throw error;
        uploaded.push(path);
      };
      try {
        let filepath = d.access === 'free' ? d.filepath : null;
        let filename: string | null = null;
        let mime: string | null = null;
        let size: number | null = null;
        if (d.access === 'free' && d.file) {
          const safe = d.file.name.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_').slice(0, 80) || 'book';
          filepath = `files/${d.slug}/${stamp}-${safe}.${extOf(d.file, 'pdf')}`;
          await put(filepath, d.file);
          filename = d.file.name;
          mime = d.file.type || null;
          size = d.file.size;
        }
        let cover = d.cover_path;
        if (d.cover) {
          cover = `covers/${d.slug}/${stamp}.${extOf(d.cover, 'jpg')}`;
          await put(cover, d.cover);
        }
        const yearText = d.year.trim();
        const row = {
          slug: d.slug,
          title: d.title.trim(),
          author: d.author.trim() || null,
          year: yearText ? Number(yearText) : null,
          shelf_id: d.shelf_id,
          category: shelfSlug,
          access: d.access,
          purchase_url: d.access === 'paid' ? d.purchase_url.trim() : null,
          license_note: d.access === 'free' ? d.license_note.trim() : null,
          filepath,
          ...(d.access === 'paid' ? { filename: null, mime_type: null, size_bytes: null } : {}),
          ...(filename ? { filename, mime_type: mime, size_bytes: size } : {}),
          cover_path: cover,
          synopsis_json: d.synopsis_json,
          synopsis_html: d.synopsis_html,
          synopsis_excerpt: excerptOf(d.synopsis_html),
          published: d.published,
        };
        type Stored = { filepath: string | null; cover_path: string | null };
        let previous: Stored | null = null;
        let id = d.id;
        if (d.id) {
          const { data: before, error: readError } = await supabase.from('books_uploads').select('filepath, cover_path').eq('id', d.id).single();
          if (readError) throw readError;
          previous = before as Stored;
          const { error } = await supabase.from('books_uploads').update(row).eq('id', d.id);
          if (error) throw error;
        } else {
          const { data: auth } = await supabase.auth.getUser();
          const { data, error } = await supabase
            .from('books_uploads')
            .insert({ ...row, sort_order: sortOrder, uploaded_by: auth?.user?.id ?? null })
            .select('id')
            .single();
          if (error) throw error;
          id = (data as { id: string }).id;
        }
        const stale = [previous?.filepath, previous?.cover_path].filter((p): p is string => !!p && p !== row.filepath && p !== row.cover_path);
        if (stale.length) await supabase.storage.from(BUCKET).remove(stale);
        await logAuditEvent({ action: d.id ? 'update' : 'create', table_name: 'books_uploads', record_id: id, record_title: row.title });
        return id!;
      } catch (e) {
        if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
        throw e;
      }
    },
    onSuccess: done,
  });
};
