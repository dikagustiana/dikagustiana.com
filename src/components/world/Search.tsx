/**
 * Search (PRD §7.11): companies by ticker or name, sub-industries by name or
 * code, think-tank pieces by title. The index is the registry and the
 * published data, nothing else. A result opens the object. The field itself
 * is FrameShell's, the one the poster fallback draws before this arrives.
 */
import { useMemo, useState } from 'react';
import type { Piece } from '@/lib/world/thinkTank';
import { searchIndex, type SearchHit } from '@/lib/world/search';
import { SearchField } from './FrameShell';

export function Search({ pieces, onPick }: { pieces: readonly Piece[]; onPick: (hit: SearchHit) => void }) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchIndex(q, pieces), [q, pieces]);
  return (
    <SearchField value={q} onChange={setQ} results={(listId) => (hits.length > 0 ? (
      <ul id={listId} aria-label="Results">
        {hits.map((h) => <li key={`${h.kind}-${h.id}`}><button type="button" onClick={() => { onPick(h); setQ(''); }}>{h.title}<small>{h.detail}</small></button></li>)}
      </ul>
    ) : null)} />
  );
}
