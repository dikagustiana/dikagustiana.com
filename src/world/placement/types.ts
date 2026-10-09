/**
 * The generated layout: every region, block, plot, road, label, gate and
 * fixture the world draws, produced by src/world/placement/place.ts from the
 * registry and committed as layout.generated.ts so diffs are reviewable
 * (docs/world/PRD-kawasan-industri.md §9.4). Coordinates are the engine's:
 * +x east, +y south, +z up, one unit is a metre.
 */
import type { BuildingFamily, Zone } from '../../lib/world/registry/types.ts';

export type Pt = readonly [x: number, y: number];
export type Box = { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number };

export const REGION_IDS = ['ring-geological', 'ring-biological', 'estate', 'gateway', 'town', 'recovery', 'hill'] as const;
export type RegionId = (typeof REGION_IDS)[number];

export interface Region {
  id: RegionId;
  label: string;
  /** The region's outline, a closed polygon. */
  polygon: readonly Pt[];
  /** Where the region's label sits at the far view. */
  anchor: Pt;
}

/**
 * A company's lot (PRD v2 §3.5, D-V2-4): its family's form drawn at lot size, or, for a large family, an office unit
 * at the block's front beside the shared form. Its two bays stand on its driveway, the short road from its front to
 * the nearest road centreline, so goods leave from and arrive at the company, not the block.
 */
export interface Lot {
  id: string;
  /** Slot index inside the block, 0 and 1. */
  slot: number;
  /** The lot's footprint: the family form at lot size, or the office unit. */
  box: Box;
  /** True when the lot is an office unit beside a large family's shared form. */
  office: boolean;
  /** Where the lot's kerb sign stands, in front of the block on a face the camera sees. */
  sign: Pt;
  bays: { despatch: Pt; receiving: Pt };
  /** From the lot's front (the despatch bay) to a point on the nearest road's centreline. */
  driveway: readonly Pt[];
}

export interface Block {
  id: string;
  /** The sub-industry code the block belongs to. */
  code: string;
  zone: Zone;
  region: RegionId;
  family: BuildingFamily;
  box: Box;
  /** Which way the block's front faces: 's' south or 'e' east (the two faces the camera sees). */
  front: 's' | 'e';
  /** Two company lots along the front, side by side (PRD v2 §3.5). */
  lots: readonly Lot[];
  /** Where the block's signboard, label and status mark stand: its front centre, on the kerb. */
  anchor: Pt;
}

export type RoadKind = 'ring' | 'radial' | 'main' | 'raw-export' | 'town' | 'recovery' | 'haul' | 'estate';

export interface Road {
  id: string;
  kind: RoadKind;
  /** Centreline, open or closed. */
  points: readonly Pt[];
  closed: boolean;
  width: number;
  /** The raw-export road is drawn dashed (PRD §7.4). */
  dashed: boolean;
}

export interface Gate {
  id: string;
  /** The road the gate stands on, where it leaves the estate. */
  road: string;
  at: Pt;
  /** Heading of the road at the gate, radians, +x east. */
  heading: number;
  weighbridge: boolean;
  /** The chain joint whose transfer this gate carries, from src/data/industryChain.ts. */
  jointId: string;
}

export interface Signpost {
  id: string;
  /** The joint whose economy chip the signpost shows. */
  jointId: string;
  at: Pt;
}

export interface Label {
  id: string;
  text: string;
  at: Pt;
  /** The zoom level the label is drawn at. */
  level: 'far' | 'middle' | 'near';
}

export interface Fixture {
  id: string;
  kind: 'quay' | 'apron' | 'interchange' | 'rail-yard' | 'warehouse' | 'cold-store' | 'power-plant' | 'water-plant' | 'operator-office' | 'think-tank' | 'telecom-tower' | 'construction-site';
  box: Box;
  region: RegionId;
}

export interface GeneratedLayout {
  /** The world's slab. */
  world: Box;
  seed: number;
  /** SHA-256 of the registry constants the layout was generated from. */
  registrySha256: string;
  regions: readonly Region[];
  blocks: readonly Block[];
  roads: readonly Road[];
  gates: readonly Gate[];
  signposts: readonly Signpost[];
  labels: readonly Label[];
  fixtures: readonly Fixture[];
  rail: { points: readonly Pt[]; yard: Box } | null;
  port: { quay: Box; apron: Box; water: Box } | null;
  hill: { centre: Pt; radius: number; height: number } | null;
}
