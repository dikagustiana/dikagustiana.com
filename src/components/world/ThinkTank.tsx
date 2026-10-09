/**
 * The think tank (PRD §7.10; mega prompt §10): the rooms from the registry,
 * each listing the published essays of its section by title and date, with
 * the owner's kind on every piece. Opening a piece lights what it is tagged
 * with and keeps it lit while its card is open; a thesis shows its evidence
 * and what would prove it wrong, a model-based piece links to its models.
 * An untagged essay appears in its room and lights nothing.
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { REGISTRY, subIndustryByCode } from '@/lib/world/registry/subindustries.generated';
import { STATUS_VOCAB } from '@/lib/world/constants';
import { modelPath } from '@/lib/finance-in-action/routes';
import { fullDate } from '@/lib/formatDate';
import type { Piece } from '@/lib/world/thinkTank';

export default function ThinkTank({ pieces, piece, onPiece, onClose, onSelect }: { pieces: readonly Piece[]; piece: string | null; onPiece: (slug: string) => void; onClose: () => void; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>('h3')?.focus(); }, []);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  const open = piece ? pieces.find((p) => p.slug === piece) ?? null : null;
  return (
    <div className="world-board" role="dialog" aria-label="The think tank" ref={ref}>
      <div className="world-board__head"><h3 tabIndex={-1} className="text-xl">The think tank</h3><button type="button" className="world-card__close" aria-label="Close the think tank" onClick={onClose}>×</button></div>
      <p className="text-sm text-muted-foreground">Each room is one of the site's research programmes. A piece lights the buildings it is tagged with while it is open.</p>
      {REGISTRY.rooms.filter((r) => r.on).map((room) => {
        const inRoom = pieces.filter((p) => p.room === room.id);
        return (
          <section key={room.id} aria-labelledby={`room-${room.id}`}>
            <h4 id={`room-${room.id}`}>{room.label}</h4>
            {inRoom.length ? (
              <ul className="grid gap-1">
                {inRoom.map((p) => (
                  <li key={p.slug}><button type="button" className="world-board__figure" aria-pressed={piece === p.slug} onClick={() => onPiece(p.slug)}>{p.title}</button>
                    <span className="text-muted-foreground text-sm"> · {p.date ? fullDate(p.date) : 'undated'} · {STATUS_VOCAB[p.kind].glyph} {STATUS_VOCAB[p.kind].word}{p.tagged ? '' : ' · untagged'}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nothing published here yet.</p>}
          </section>
        );
      })}
      {open && (
        <section aria-label="The piece">
          <h4>{STATUS_VOCAB[open.kind].word}</h4>
          <p className="text-lg"><Link to={`/essays/${open.slug}`}>{open.title}</Link></p>
          {open.tags.length ? <p className="text-sm">Lights: {open.tags.map((t) => { const s = subIndustryByCode(t); return <button key={t} type="button" className="world-board__figure mr-2" onClick={() => onSelect(t)}>{s ? s.nameEn : t}</button>; })}</p> : <p className="text-sm text-muted-foreground">Untagged: this piece lights nothing yet.</p>}
          {open.kind === 'thesis' ? (
            <>
              <p className="text-sm"><strong>The evidence it rests on:</strong>{open.evidence.length ? <ul>{open.evidence.map((e) => <li key={e.href}><a href={e.href}>{e.label}</a></li>)}</ul> : ' not recorded yet.'}</p>
              <p className="text-sm"><strong>What would prove this wrong:</strong> {open.falsifier ?? 'not recorded yet.'}</p>
            </>
          ) : (
            <p className="text-sm"><strong>Models:</strong>{open.tags.filter((t) => /^[A-Z]{4}$/.test(t)).length ? <ul>{open.tags.filter((t) => /^[A-Z]{4}$/.test(t)).map((t) => <li key={t}><Link to={modelPath(t)}>{t}</Link></li>)}</ul> : ' none named yet.'}</p>
          )}
        </section>
      )}
    </div>
  );
}
