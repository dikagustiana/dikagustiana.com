/**
 * Search (PRD §7.11): companies by ticker or name, sub-industries by name or
 * code, think-tank pieces by title. The index is the registry and the
 * published data, nothing else. A result opens the object.
 */
import { useId, useMemo, useState } from 'react';
import type { Piece } from '@/lib/world/thinkTank';
import { searchIndex, type SearchHit } from '@/lib/world/search';

export function Search({ pieces, onPick }: { pieces: readonly Piece[]; onPick: (hit: SearchHit) => void }) {
  const [q, setQ] = useState('');
  // useId's colons are not valid in an id token for aria-controls (axe aria-valid-attr-value)
  const id = `ws${useId().replace(/:/g, '')}`;
  const hits = useMemo(() => searchIndex(q, pieces), [q, pieces]);
  return (
    <div className="world-search" role="search">
      <label htmlFor={id} className="sr-only">Search companies, sub-industries and analyses</label>
      <input id={id} type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-controls={hits.length > 0 ? `${id}-list` : undefined} autoComplete="off" />
      {hits.length > 0 && (
        <ul id={`${id}-list`} aria-label="Results">
          {hits.map((h) => <li key={`${h.kind}-${h.id}`}><button type="button" onClick={() => { onPick(h); setQ(''); }}>{h.title}<small>{h.detail}</small></button></li>)}
        </ul>
      )}
    </div>
  );
}
