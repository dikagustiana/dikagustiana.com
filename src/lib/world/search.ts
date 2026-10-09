/**
 * The search index (PRD §7.11): companies by ticker or name, sub-industries
 * by name or code, think-tank pieces by title. The index is the registry and
 * the published data, nothing else.
 */
import { REGISTRY } from '@/lib/world/registry/subindustries.generated';
import type { Piece } from '@/lib/world/thinkTank';

export interface SearchHit { kind: 'company' | 'building' | 'piece'; id: string; title: string; detail: string }

export function searchIndex(query: string, pieces: readonly Piece[], limit = 8): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const s of REGISTRY.subIndustries) {
    if (s.zone === 'unplaced') continue;
    if (s.code.toLowerCase().startsWith(q) || s.nameEn.toLowerCase().includes(q) || s.nameId.toLowerCase().includes(q)) hits.push({ kind: 'building', id: s.code, title: s.nameEn, detail: `${s.code} · ${s.subSector.name}` });
    for (const c of s.companies) if (c.ticker.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q)) hits.push({ kind: 'company', id: c.ticker, title: `${c.ticker} · ${c.name}`, detail: s.nameEn });
  }
  for (const p of pieces) if (p.title.toLowerCase().includes(q)) hits.push({ kind: 'piece', id: p.slug, title: p.title, detail: 'Think tank' });
  return hits.slice(0, limit);
}
