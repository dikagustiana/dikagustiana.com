/**
 * Fills the shelf's two stored spine columns (docs/prd/library-phase-2 §4, Data;
 * supabase/migrations/20261025100000_library_spines.sql) for every live book:
 *
 *   spine_color  the shelf's hue family, a lightness step by the book's id (src/lib/spines.ts): computed
 *                once and kept; --recolor computes it again (after shelves are reordered, if wanted)
 *   page_count   a PDF's pages, read by pdf.js (the reader's own version) from the file; an EPUB's is left
 *                to the paragraph extraction (step 3), a paid book has none; --recount reads them again
 *
 *   npx vite-node scripts/books/spine-metrics.ts [--slug <slug>] [--recolor] [--recount] [--dry-run]
 *
 * Settings: scripts/books/lib.ts. Prints one line per book; writes nothing with --dry-run.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { spineColor } from '../../src/lib/spines';
import { adminClient, args, fetchBookBytes, isEpub, settings } from './lib';

interface Row {
  id: string;
  slug: string;
  shelf_id: string | null;
  access: 'free' | 'paid';
  filepath: string | null;
  file_store: 'supabase' | 'r2';
  page_count: number | null;
  spine_color: string | null;
}

async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await getDocument({ data: bytes, useSystemFonts: false, isEvalSupported: false }).promise;
  try {
    return doc.numPages;
  } finally {
    await doc.destroy();
  }
}

async function main() {
  const { flags, values } = args();
  const s = settings();
  const db = adminClient(s);
  const dry = flags.has('dry-run');

  const shelves = await db.from('book_shelves').select('id, sort_order').order('sort_order');
  if (shelves.error) throw shelves.error;
  const place = new Map((shelves.data ?? []).map((sh, i) => [sh.id as string, i]));

  let q = db.from('books_uploads').select('id, slug, shelf_id, access, filepath, file_store, page_count, spine_color').is('deleted_at', null);
  if (values.slug) q = q.eq('slug', values.slug);
  const books = await q.order('sort_order');
  if (books.error) throw books.error;

  for (const b of (books.data ?? []) as Row[]) {
    const patch: { spine_color?: string; page_count?: number } = {};
    if (!b.spine_color || flags.has('recolor')) patch.spine_color = spineColor(place.get(b.shelf_id ?? '') ?? 0, b.id);
    let note = '';
    if (b.access === 'free' && b.filepath && !isEpub(b.filepath) && (!b.page_count || flags.has('recount'))) {
      try {
        patch.page_count = await pdfPageCount(await fetchBookBytes(s, b));
      } catch (e) {
        note = ` (pages not read: ${(e as Error).message})`;
      }
    }
    if (!Object.keys(patch).length) {
      console.log(`${b.slug}: unchanged`);
      continue;
    }
    if (!dry) {
      const { error } = await db.from('books_uploads').update(patch).eq('id', b.id);
      if (error) throw error;
    }
    console.log(`${b.slug}: ${JSON.stringify(patch)}${dry ? ' (dry run)' : ''}${note}`);
  }
}

main().catch((e) => {
  console.error(`spine-metrics: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
