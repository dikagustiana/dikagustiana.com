/**
 * The archetype interiors (PRD §7.8): one template per archetype, the zone
 * fallback for a company without a published model naming one, and the
 * matcher that binds a cost line to a station by its physical unit.
 */
import type { Archetype, Zone } from '@/lib/world/registry/types';
import { matchStation } from '@/lib/world/registry/physical-units';
import { PROC } from './proc';
import { DIST } from './dist';
import { ASSET } from './asset';
import { MINE } from './mine';
import { FARM } from './farm';
import { SERVICE } from './service';
import type { Interior, Station } from './types';

export type { Interior, Station } from './types';
export { stationAt } from './types';

export const INTERIORS: Record<Archetype, Interior> = { PROC, DIST, ASSET, MINE, FARM, SERVICE };

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
  return matchStation(archetype, INTERIORS[archetype].STATIONS, physicalUnit, description);
}

export const stationById = (archetype: Archetype, id: string): Station | undefined => INTERIORS[archetype].STATIONS.find((s) => s.id === id);
