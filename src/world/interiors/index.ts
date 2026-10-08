/**
 * The archetype interiors (PRD §7.8): one template per archetype, the zone
 * fallback for a company without a published model naming one, and the
 * matcher that binds a cost line to a station by its physical unit.
 */
import type { Archetype } from '@/lib/world/registry/types';
import { PROC } from './proc';
import { DIST } from './dist';
import { ASSET } from './asset';
import { MINE } from './mine';
import { FARM } from './farm';
import { SERVICE } from './service';
import type { Interior } from './types';

export type { Interior } from './types';
export { ARCHETYPE_FOR_ZONE, STATIONS_BY_ARCHETYPE, archetypeForZone, stationAt, stationById, stationFor, type Station } from './stations';

export const INTERIORS: Record<Archetype, Interior> = { PROC, DIST, ASSET, MINE, FARM, SERVICE };
