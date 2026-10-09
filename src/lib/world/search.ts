/**
 * The search index (PRD §7.11, PRD v2 §3.13): companies by ticker or name,
 * sub-industries by name or code, stories by title, vehicles by their load
 * (a link's note: "coal"), think-tank pieces by title. The index is the
 * registry and the published data, nothing else. A result opens the object;
 * a story lights; a load selects a vehicle carrying it.
 */
import { REGISTRY, subIndustryByCode } from '@/lib/world/registry/subindustries.generated';
import { STORIES } from '@/lib/world/registry/stories.generated';
import type { Piece } from '@/lib/world/thinkTank';

export interface SearchHit { kind: 'company' | 'building' | 'story' | 'load' | 'piece'; id: string; title: string; detail: string }

const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function searchIndex(query: string, pieces: readonly Piece[], limit = 8): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const buildings: SearchHit[] = [], companies: SearchHit[] = [];
  for (const s of REGISTRY.subIndustries) {
    if (s.zone === 'unplaced') continue;
    if (s.code.toLowerCase().startsWith(q) || s.nameEn.toLowerCase().includes(q) || s.nameId.toLowerCase().includes(q)) buildings.push({ kind: 'building', id: s.code, title: s.nameEn, detail: `${s.code} · ${s.subSector.name}` });
    for (const c of s.companies) if (c.ticker.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q)) companies.push({ kind: 'company', id: c.ticker, title: `${c.ticker} · ${c.name}`, detail: s.nameEn });
  }
  const stories: SearchHit[] = STORIES.filter((s) => s.title.toLowerCase().includes(q)).map((s) => ({ kind: 'story', id: s.id, title: s.title, detail: 'Story' }));
  // a load is a link whose goods move in vehicles, between two placed sub-industries
  const placed = (code: string) => { const s = subIndustryByCode(code); return !!s && s.zone !== 'unplaced'; };
  const loads: SearchHit[] = REGISTRY.links.filter((l) => l.goods !== 'none' && l.note && l.note.toLowerCase().includes(q) && placed(l.from) && placed(l.to))
    .map((l) => ({ kind: 'load', id: `${l.from}>${l.to}`, title: capital(l.note!), detail: `A load · ${subIndustryByCode(l.from)!.nameEn} to ${subIndustryByCode(l.to)!.nameEn}` }));
  const found: SearchHit[] = [...buildings, ...stories, ...companies, ...loads];
  for (const p of pieces) if (p.title.toLowerCase().includes(q)) found.push({ kind: 'piece', id: p.slug, title: p.title, detail: 'Think tank' });
  return found.slice(0, limit);
}
