/**
 * Puts essays back as a backup file holds them (site cleanup 2026-10, WP3 rollback).
 *
 *   npx vite-node scripts/content/restore-from-backup.ts backups/essays-lecture-notes-<timestamp>.json
 *   npx vite-node scripts/content/restore-from-backup.ts -- --dry-run backups/essays-lecture-notes-<timestamp>.json
 *
 * The file is the one strip-lecture-notes.ts writes before it changes anything: each row's id, slug,
 * content, content_json and presentation as they were. In one transaction each essay gets those three
 * columns back and one `rollback` revision in essay_revisions; an id the database no longer has stops the
 * whole restore. The database is the one in .env.local (scripts/fia/db.ts); nothing here prints a secret.
 */
import { readFileSync } from 'node:fs';
import { connect } from '../fia/db';

interface BackupRow {
  id: string;
  slug: string;
  content: string | null;
  content_json: unknown;
  presentation: unknown;
}

const args = process.argv.slice(2).filter((a) => a !== '--');
const dryRun = args.includes('--dry-run');
const file = args.find((a) => !a.startsWith('--'));

async function main() {
  if (!file) throw new Error('usage: npx vite-node scripts/content/restore-from-backup.ts <backup.json>');
  const rows = JSON.parse(readFileSync(file, 'utf8')) as BackupRow[];
  if (!Array.isArray(rows) || !rows.length || rows.some((r) => !r.id || !('content_json' in r))) throw new Error(`${file} is not an essays backup`);
  const { client } = await connect();
  try {
    await client.query('begin');
    for (const r of rows) {
      const up = await client.query(
        'update public.essays set content = $2, content_json = $3::jsonb, presentation = $4::jsonb, updated_at = now() where id = $1 returning id',
        [r.id, r.content, JSON.stringify(r.content_json), JSON.stringify(r.presentation ?? null)],
      );
      if (up.rowCount !== 1) throw new Error(`${r.slug} (${r.id}) is not in the database; nothing restored`);
      await client.query(
        `insert into public.essay_revisions (essay_id, revision_no, change_type, title, snippet, content_json, status, change_summary, changed_by)
         select e.id, coalesce((select max(x.revision_no) from public.essay_revisions x where x.essay_id = e.id), 0) + 1, 'rollback',
                e.title, e.snippet, e.content_json, e.status, $2, null
           from public.essays e where e.id = $1`,
        [r.id, `Restored from ${file.split('/').pop()}`],
      );
    }
    if (dryRun) {
      await client.query('rollback');
      console.log(`dry run: ${rows.length} essays would be restored; nothing written`);
    } else {
      await client.query('commit');
      console.log(`restored ${rows.length} essays from ${file}, one transaction`);
    }
  } catch (e) {
    await client.query('rollback').catch(() => undefined);
    throw e;
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
