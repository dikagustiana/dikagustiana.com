/**
 * Physical units → station tags (PRD §7.8; mega prompt §9.1). A cost line's
 * `driver.physicalUnit` and its description are matched to an archetype's
 * stations by tag: case-insensitive, whole tokens, with this synonym table
 * applied first, so that "GJ of fuel", "tonnes of coal" and "kiln fuel"
 * meet at the kiln. A line nothing matches binds to null (whiteboard only)
 * and the board lists it as "not placed in the drawing".
 */
import type { Archetype } from './types';

/** Phrases (lower case) that stand for a station tag, per archetype; longer phrases are applied first. */
export const SYNONYMS: Record<Archetype, Record<string, string>> = {
  PROC: { 'kiln fuel': 'kiln', 'gj': 'fuel', 'gigajoule': 'fuel', 'gigajoules': 'fuel', 'tonnes of coal': 'fuel', 'tons of coal': 'fuel', 'mmbtu': 'fuel', 'kwh': 'power', 'mwh': 'power', 'gwh': 'power', 'clinker produced': 'kiln', 'tonnes sold': 'despatch', 'tons sold': 'despatch', 'bags': 'packing', 'raw mix': 'raw' },
  DIST: { 'pallet days': 'racks', 'pallet-days': 'racks', 'pallets in': 'inbound', 'delivery orders': 'dos', 'cartons picked': 'picking', 'km driven': 'km', 'litres of diesel': 'fuel', 'liters of diesel': 'fuel', 'invoices issued': 'invoices', 'goods purchased': 'purchases' },
  ASSET: { 'kwh': 'kwh', 'mwh': 'mwh', 'gwh': 'gwh', 'tower tenancies': 'tenancy', 'tenancy ratio': 'tenancy', 'vehicles per day': 'traffic', 'traffic volume': 'traffic', 'passengers carried': 'passengers', 'available seat km': 'capacity', 'ask': 'capacity', 'rooms available': 'rooms', 'occupancy': 'utilisation', 'load factor': 'utilisation', 'gj': 'fuel', 'tonnes of coal': 'coal', 'mmbtu': 'gas', 'twenty-foot equivalent units': 'teu' },
  MINE: { 'bank cubic metres': 'bcm', 'bank cubic meters': 'bcm', 'strip ratio': 'overburden', 'overburden removed': 'overburden', 'litres of diesel': 'diesel', 'liters of diesel': 'diesel', 'haul distance': 'haul', 'tonnes hauled': 'haul', 'tonnes crushed': 'crushing', 'tonnes washed': 'washing', 'barrels of oil': 'barrels', 'boe': 'boe', 'tonnes sold': 'sold', 'tons sold': 'sold', 'tonnes mined': 'mined', 'rom tonnes': 'rom' },
  FARM: { 'fresh fruit bunches': 'ffb', 'planted hectares': 'hectares', 'mature hectares': 'hectares', 'oil extraction rate': 'oer', 'day-old chicks': 'doc', 'day old chicks': 'doc', 'feed conversion': 'feed', 'tonnes of feed': 'feed', 'tonnes harvested': 'harvest', 'cold room': 'cold', 'tonnes sold': 'sold', 'tons sold': 'sold' },
  SERVICE: { 'patient days': 'patients', 'bed days': 'beds', 'occupied beds': 'beds', 'room nights': 'guests', 'covers served': 'tables', 'full-time equivalents': 'headcount', 'fte': 'headcount', 'billable hours': 'hours', 'active accounts': 'accounts', 'net interest': 'interest', 'claims paid': 'claims' },
};

/** Words that carry no station: money, time, grammar. */
export const STOP = new Set(['rp', 'idr', 'usd', 'thousand', 'thousands', 'million', 'millions', 'billion', 'bn', 'mn', 'per', 'of', 'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'by', 'for', 'with', 'x', '×', 'cost', 'costs', 'quarter', 'quarterly', 'year', 'annual', 'tonne', 'tonnes', 'ton', 'tons', 'unit', 'units', 'each', 'none', 'mostly', 'fixed', 'variable', 'head']);

export interface MatchableStation { id: string; tags: readonly string[] }

/** The physical unit and description as tokens after the archetype's synonyms are applied. */
export function tokens(archetype: Archetype, physicalUnit: string, description: string): string[] {
  let text = ` ${physicalUnit} ${description} `.toLowerCase().replace(/[(),;:.!?/]/g, ' ');
  const table = SYNONYMS[archetype];
  for (const phrase of Object.keys(table).sort((a, b) => b.length - a.length)) text = text.split(` ${phrase} `).join(` ${table[phrase]} `);
  return text.split(/\s+/).filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t));
}

function bestOf(stations: readonly MatchableStation[], ts: readonly string[]): string | null {
  let best: { id: string; hits: number } | null = null;
  for (const s of stations) {
    const hits = ts.filter((t) => s.tags.includes(t)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { id: s.id, hits };
  }
  return best?.id ?? null;
}

/**
 * The station the line binds to. The description says what the line is
 * ("raw material cost per tonne of clinker"), the physical unit only how it
 * is measured ("Rp thousand per tonne of clinker"), so the description is
 * matched first and the unit only when the description names no station;
 * the station whose tags are hit most wins, ties go to the earlier station
 * in the archetype's order, and no hit binds nothing.
 */
export function matchStation(archetype: Archetype, stations: readonly MatchableStation[], physicalUnit: string, description: string): string | null {
  return bestOf(stations, tokens(archetype, '', description)) ?? bestOf(stations, tokens(archetype, physicalUnit, ''));
}
