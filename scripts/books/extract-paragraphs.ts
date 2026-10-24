/**
 * Extracts free books' text into the private R2 bucket and marks them ai_ready
 * (docs/prd/library-phase-2 §4, Extraction; the layout in supabase/functions/_shared/bookText.ts:
 * text/<book id>/index.json and text/<book id>/ch-<n>.json, beside the books' files in Cloudflare, not in
 * Postgres).
 *
 *   npx vite-node scripts/books/extract-paragraphs.ts [--slug <slug>] [--dry-run]
 *
 * Only books with access = 'free' are read: a paid book has no file and no text, and is never touched. For
 * each: the file (R2 through a signed GET, or the public bucket; scripts/books/lib.ts) is read by
 * scripts/books/paragraphs.ts. A scan (no text layer) is flagged ai_ready = false and any text it had is
 * removed; OCR is out of scope. Otherwise the book is first set ai_ready = false (so the ask function never
 * reads half a book), each chapter file then the index is written with signed PUTs (the R2 signer the edge
 * functions use, _shared/r2.ts), chapter files the new text no longer has are deleted, and then
 * ai_ready = true. page_count is written either way.
 */
import { r2Configured, r2FromEnv, signR2 } from '../../supabase/functions/_shared/r2';
import { readIndex, textChapterKey, textFiles, textIndexKey } from '../../supabase/functions/_shared/bookText';
import { extractEpub, extractPdf } from './paragraphs';
import { adminClient, args, fetchBookBytes, isEpub, settings } from './lib';

interface Row {
  id: string;
  slug: string;
  access: 'free' | 'paid';
  filepath: string | null;
  file_store: 'supabase' | 'r2';
}

async function main() {
  const { flags, values } = args();
  const s = settings();
  const db = adminClient(s);
  const dry = flags.has('dry-run');
  const r2 = r2FromEnv((name) => s.env[name]);
  if (!dry && !r2Configured(r2)) throw new Error('The R2_* settings are needed: the text is written to R2.');

  const put = async (key: string, body: unknown) => {
    const res = await fetch(await signR2(r2, 'PUT', key, 300), { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error(`R2 refused ${key} (${res.status}).`);
    await res.body?.cancel();
  };
  const remove = async (key: string) => {
    const res = await fetch(await signR2(r2, 'DELETE', key, 60), { method: 'DELETE' });
    await res.body?.cancel();
    if (!res.ok && res.status !== 404) throw new Error(`R2 would not remove ${key} (${res.status}).`);
  };
  const oldIndex = async (id: string) => {
    const res = await fetch(await signR2(r2, 'GET', textIndexKey(id), 60));
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    return readIndex(await res.json().catch(() => null), id);
  };

  let q = db.from('books_uploads').select('id, slug, access, filepath, file_store').eq('access', 'free').is('deleted_at', null);
  if (values.slug) q = q.eq('slug', values.slug);
  const books = await q.order('sort_order');
  if (books.error) throw books.error;
  if (!books.data?.length) console.log(values.slug ? `${values.slug}: no free, live book by that slug.` : 'No free, live books.');

  for (const b of (books.data ?? []) as Row[]) {
    if (b.access !== 'free' || !b.filepath) {
      console.log(`${b.slug}: skipped (not a free book with a file)`);
      continue;
    }
    let result;
    try {
      const bytes = await fetchBookBytes(s, b);
      result = isEpub(b.filepath) ? await extractEpub(bytes) : await extractPdf(bytes);
    } catch (e) {
      console.log(`${b.slug}: not read (${(e as Error).message}); left as it was`);
      continue;
    }
    const files = textFiles(b.id, result.pageCount, result.paragraphs);
    console.log(
      result.scanned
        ? `${b.slug}: ${result.pageCount} pages, no text layer: flagged ai_ready = false`
        : `${b.slug}: ${result.pageCount} pages, ${result.paragraphs.length} paragraphs in ${files.chapters.length} chapter(s) → R2 ${textIndexKey(b.id)}`,
    );
    if (dry) {
      for (const p of result.paragraphs.slice(0, 3)) console.log(`  [¶${p.para}] ch ${p.chapter} p ${p.page}: ${p.text.slice(0, 80)}…`);
      continue;
    }
    const off = await db.from('books_uploads').update({ ai_ready: false, page_count: result.pageCount }).eq('id', b.id);
    if (off.error) throw off.error;
    const before = await oldIndex(b.id);
    const keep = new Set(result.scanned ? [] : files.chapters.map((c) => c.chapter));
    if (!result.scanned) {
      for (const c of files.chapters) await put(textChapterKey(b.id, c.chapter), c);
      await put(textIndexKey(b.id), files.index);
    } else if (before) await remove(textIndexKey(b.id));
    for (const c of before?.chapters ?? []) if (!keep.has(c.chapter)) await remove(textChapterKey(b.id, c.chapter));
    if (result.scanned) continue;
    const on = await db.from('books_uploads').update({ ai_ready: result.paragraphs.length > 0 }).eq('id', b.id);
    if (on.error) throw on.error;
  }
}

main().catch((e) => {
  console.error(`extract-paragraphs: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
