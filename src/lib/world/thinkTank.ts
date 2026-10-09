/**
 * The think tank's pieces (PRD §7.10, §8.5): published essays of a room's
 * section, with the owner's kind, tags, evidence and falsifier. Until the
 * essay schema carries those fields in production, they are read from the
 * interim file docs/world/think-tank-tags.json, owner-authored; the
 * migration file under supabase/migrations/ adds the same four fields.
 */
import tags from '../../../docs/world/think-tank-tags.json';
import type { Room } from '@/lib/world/registry/types';

export interface PieceTag {
  kind: 'thesis' | 'model-based';
  /** Sub-industry codes, chain node ids, tickers. */
  tags: string[];
  /** Links to published models and named sources (theses). */
  evidence?: { label: string; href: string }[];
  /** What would prove this wrong (theses). */
  falsifier?: string;
}

/** The interim tag file's shape: essay slug → its tags. Empty until the owner writes it. */
export interface TagFile { about: string; entries: Record<string, PieceTag> }

export interface PublishedEssay { slug: string; title: string; section: string; date: string | null; phase: string | null }

export interface Piece extends PublishedEssay {
  room: string;
  kind: PieceTag['kind'];
  tags: string[];
  evidence: { label: string; href: string }[];
  falsifier: string | null;
  /** True when the owner tagged it; untagged essays appear in their room and light nothing. */
  tagged: boolean;
}

export const TAG_FILE = tags as TagFile;

/** The rooms' pieces from the published essays and the tag file; a room with a null section lists tagged essays from any section. */
export function piecesFor(rooms: readonly Room[], essays: readonly PublishedEssay[]): Piece[] {
  const out: Piece[] = [];
  for (const room of rooms.filter((r) => r.on)) {
    for (const e of essays) {
      const t = TAG_FILE.entries[e.slug];
      const inRoom = room.section ? e.section === room.section : !!t && t.tags.some((x) => /^[A-Z][1-9]\d{2}$/.test(x));
      if (!inRoom) continue;
      out.push({ ...e, room: room.id, kind: t?.kind ?? 'thesis', tags: t?.tags ?? [], evidence: t?.evidence ?? [], falsifier: t?.falsifier ?? null, tagged: !!t });
    }
  }
  return out;
}
