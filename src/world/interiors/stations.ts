/**
 * The stations of the six archetypes (PRD §7.8), as data: ids, labels, the
 * tags a cost line's physical unit is matched against, anchors as fractions
 * of the plot box; the zone fallback; and the matcher. No three.js here, so
 * the shell can bind a company's lines without loading the renderer: the
 * drawing of each archetype lives beside it (proc.ts, dist.ts, …) and is
 * loaded with the engine.
 */
import type { Archetype, Zone } from '@/lib/world/registry/types';
import { matchStation } from '@/lib/world/registry/physical-units';
import type { Box } from '@/world/placement/types';

export interface Station {
  id: string;
  /** The label drawn beside the station; never a figure. */
  label: string;
  /** Tags a cost line's physical unit and description are matched against (lower case, whole tokens). */
  tags: readonly string[];
  /** Where the station stands in the plot, as fractions of the box: x from the west wall, y from the north (back) wall. */
  anchor: readonly [number, number];
}

export const STATIONS_BY_ARCHETYPE: Record<Archetype, readonly Station[]> = {
  PROC: [
  { id: 'receiving', label: 'Receiving', tags: ['raw', 'material', 'materials', 'receiving', 'limestone', 'ore', 'feed', 'feedstock', 'input', 'inputs', 'inbound', 'purchases'], anchor: [0.12, 0.25] },
  { id: 'preparation', label: 'Preparation', tags: ['crushing', 'crusher', 'preparation', 'grinding', 'mill', 'milling', 'mixing', 'blending'], anchor: [0.3, 0.6] },
  { id: 'line', label: 'Main line', tags: ['kiln', 'smelter', 'reactor', 'furnace', 'process', 'line', 'fuel', 'power', 'electricity', 'gas', 'coal', 'energy', 'clinker', 'heat', 'steam', 'produced', 'production', 'conversion', 'yield'], anchor: [0.5, 0.3] },
  { id: 'packing', label: 'Packing', tags: ['packing', 'packaging', 'bags', 'bagging', 'filling', 'bottling', 'cans'], anchor: [0.7, 0.65] },
  { id: 'store', label: 'Store', tags: ['store', 'finished', 'goods', 'inventory', 'stock', 'warehouse'], anchor: [0.85, 0.3] },
  { id: 'despatch', label: 'Despatch', tags: ['despatch', 'dispatch', 'loading', 'trucks', 'freight', 'delivery', 'distribution', 'sold', 'sales', 'shipping', 'logistics'], anchor: [0.88, 0.82] },
  ],
  DIST: [
  { id: 'inbound', label: 'Inbound docks', tags: ['inbound', 'receiving', 'pallets', 'pallet', 'dock', 'docks', 'arrival', 'purchases', 'purchased', 'goods', 'cogs', 'merchandise', 'supplier', 'suppliers'], anchor: [0.12, 0.3] },
  { id: 'racks', label: 'Racks', tags: ['racks', 'rack', 'storage', 'pallet-days', 'inventory', 'warehouse', 'stock', 'holding', 'days', 'shelf', 'shelves', 'sqm', 'space'], anchor: [0.4, 0.3] },
  { id: 'picking', label: 'Picking', tags: ['picking', 'pick', 'cartons', 'carton', 'orders', 'order', 'handling', 'labour', 'labor', 'staff', 'headcount', 'wages', 'salaries'], anchor: [0.55, 0.68] },
  { id: 'loading', label: 'Loading docks', tags: ['loading', 'trips', 'trip', 'dos', 'delivery', 'deliveries', 'outbound', 'freight', 'fleet', 'fuel', 'trucks', 'km', 'drops', 'routes', 'transport', 'logistics', 'sold'], anchor: [0.8, 0.68] },
  { id: 'office', label: 'Office', tags: ['office', 'invoices', 'invoice', 'capital', 'clock', 'admin', 'overhead', 'overheads', 'sga', 'selling', 'general', 'administrative', 'rent', 'receivables', 'payables', 'marketing'], anchor: [0.85, 0.2] },
  ],
  ASSET: [
  { id: 'asset', label: 'The asset', tags: ['asset', 'assets', 'towers', 'tower', 'plaza', 'toll', 'plant', 'unit', 'units', 'vessel', 'vessels', 'capacity', 'utilisation', 'utilization', 'mw', 'mwh', 'kwh', 'gwh', 'km', 'sites', 'site', 'tenancy', 'tenancies', 'rooms', 'floor', 'sqm', 'depreciation', 'fleet', 'aircraft', 'berth', 'berths', 'lanes', 'generation'], anchor: [0.45, 0.42] },
  { id: 'maintenance', label: 'Maintenance yard', tags: ['maintenance', 'repair', 'repairs', 'spares', 'yard', 'upkeep', 'overhaul', 'servicing'], anchor: [0.15, 0.78] },
  { id: 'operations', label: 'Operations centre', tags: ['operations', 'control', 'centre', 'center', 'staff', 'network', 'monitoring', 'fuel', 'power', 'energy', 'electricity', 'crew', 'headcount', 'wages', 'salaries', 'coal', 'gas'], anchor: [0.8, 0.2] },
  { id: 'entry', label: 'Entry', tags: ['customer', 'customers', 'entry', 'gate', 'traffic', 'passengers', 'users', 'tenants', 'subscribers', 'vehicles', 'revenue', 'ticket', 'tickets', 'connections', 'volume', 'throughput', 'teu', 'calls'], anchor: [0.86, 0.8] },
  ],
  MINE: [
  { id: 'pit', label: 'Pit', tags: ['pit', 'well', 'pad', 'drilling', 'overburden', 'stripping', 'blasting', 'mined', 'mining', 'bcm', 'contractor', 'contractors', 'extraction', 'lifting', 'barrels', 'boe', 'wells'], anchor: [0.15, 0.3] },
  { id: 'haul', label: 'Haul road', tags: ['haul', 'hauling', 'haulage', 'trucks', 'distance', 'km', 'fuel', 'diesel', 'tyres', 'tires'], anchor: [0.4, 0.55] },
  { id: 'plant', label: 'Crusher', tags: ['crusher', 'crushing', 'wash', 'washing', 'plant', 'processing', 'power', 'electricity', 'reagents', 'smelting'], anchor: [0.62, 0.3] },
  { id: 'stockpile', label: 'Stockpile', tags: ['stockpile', 'stock', 'inventory', 'rom', 'blending', 'storage', 'tanks'], anchor: [0.76, 0.7] },
  { id: 'loadout', label: 'Load-out', tags: ['load-out', 'loadout', 'rail', 'barge', 'barging', 'port', 'jetty', 'shipping', 'freight', 'sold', 'sales', 'royalty', 'royalties', 'pipeline', 'offtake'], anchor: [0.9, 0.4] },
  ],
  FARM: [
  { id: 'blocks', label: 'Blocks', tags: ['field', 'fields', 'pond', 'ponds', 'block', 'blocks', 'hectares', 'ha', 'planting', 'seed', 'seeds', 'feed', 'fertiliser', 'fertilizer', 'stocking', 'fry', 'chicks', 'doc', 'cattle', 'trees', 'palms'], anchor: [0.2, 0.42] },
  { id: 'harvest', label: 'Harvest', tags: ['harvest', 'harvesting', 'collection', 'ffb', 'picking', 'labour', 'labor', 'workers', 'wages', 'yield'], anchor: [0.48, 0.65] },
  { id: 'handling', label: 'Primary handling', tags: ['mill', 'milling', 'hatchery', 'cold', 'room', 'processing', 'drying', 'extraction', 'oer', 'power', 'fuel', 'energy', 'slaughter', 'packing', 'grading'], anchor: [0.72, 0.3] },
  { id: 'despatch', label: 'Despatch', tags: ['despatch', 'dispatch', 'transport', 'delivery', 'freight', 'sold', 'sales', 'shipping', 'logistics'], anchor: [0.88, 0.78] },
  ],
  SERVICE: [
  { id: 'reception', label: 'Reception', tags: ['reception', 'customers', 'customer', 'clients', 'client', 'patients', 'patient', 'visitors', 'front', 'sales', 'marketing', 'revenue', 'booking', 'bookings', 'guests', 'students', 'members', 'subscribers', 'accounts'], anchor: [0.2, 0.72] },
  { id: 'floor', label: 'Work floor', tags: ['work', 'floor', 'staff', 'labour', 'labor', 'doctors', 'nurses', 'teachers', 'engineers', 'consultants', 'hours', 'beds', 'bed', 'seats', 'tables', 'kitchen', 'food', 'materials', 'supplies', 'drugs', 'medicines', 'headcount', 'wages', 'salaries', 'crew', 'fuel'], anchor: [0.55, 0.4] },
  { id: 'office', label: 'Back office', tags: ['office', 'back', 'admin', 'overhead', 'overheads', 'rent', 'it', 'systems', 'sga', 'general', 'administrative', 'finance', 'interest', 'funding', 'provisions', 'claims'], anchor: [0.85, 0.2] },
  ],
};

/** The fallback archetype per zone (PRD §7.8, the table's last column). */
export const ARCHETYPE_FOR_ZONE: Record<Zone, Archetype> = {
  'ring-geological': 'MINE',
  'ring-biological': 'FARM',
  'estate-primary': 'PROC',
  'estate-manufacturing': 'PROC',
  'estate-utilities': 'ASSET',
  'estate-operator': 'SERVICE',
  'estate-warehousing': 'DIST',
  gateway: 'ASSET',
  'town-distribution': 'DIST',
  'town-retail': 'DIST',
  'town-services': 'SERVICE',
  'town-health': 'SERVICE',
  'town-business': 'SERVICE',
  'town-financial': 'SERVICE',
  infrastructure: 'ASSET',
  recovery: 'PROC',
  unplaced: 'SERVICE',
};

export const archetypeForZone = (zone: Zone): Archetype => ARCHETYPE_FOR_ZONE[zone];

/** The station of an archetype a cost line binds to, or null for the whiteboard only. */
export function stationFor(archetype: Archetype, physicalUnit: string, description: string): string | null {
  return matchStation(archetype, STATIONS_BY_ARCHETYPE[archetype], physicalUnit, description);
}

export const stationById = (archetype: Archetype, id: string): Station | undefined => STATIONS_BY_ARCHETYPE[archetype].find((s) => s.id === id);

/** A station's floor position in a plot box. */
export const stationAt = (b: Box, s: Station): [number, number] => [b.x0 + (b.x1 - b.x0) * s.anchor[0], b.y0 + (b.y1 - b.y0) * s.anchor[1]];
