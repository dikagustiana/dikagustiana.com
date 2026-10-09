/**
 * The engine's public contract (mega prompt §4.2) and the entity contract every
 * clickable thing in the world honours (Factory Yard's, kept).
 */
import type * as THREE from 'three';
import type { Goods, Registry, Story } from '@/lib/world/registry/types';
import type { GeneratedLayout } from '@/world/placement/types';
import type { FlowWeight, ModelStatus, StationBinding, WhiteboardContent } from '@/world/data/types';

/** What a card shows. Rows are [label, value] pairs; actions render as buttons in the card's footer. */
export interface EntityInfo {
  kind: string;
  title: string;
  status: string;
  rows: readonly (readonly [string, string])[];
  bar?: { v: number; max: number; label: string };
  actions?: readonly (readonly [string, () => void])[];
}

/** The dashed route a selected vehicle draws ahead of itself. */
export interface EntityRoute {
  pts?: readonly (readonly [number, number])[];
  path?: { at(s: number): { x: number; y: number }; length: number; closed?: boolean };
  s?: number;
  closed?: boolean;
  next?: readonly [number, number];
  stop?: string;
}

/** Anything clickable: kind, id, groups (three.js groups with userData.entity = this), pick, info(), readout(). */
export interface Entity {
  kind: string;
  id: string;
  groups: THREE.Object3D[];
  /** A local anchor for tags and the debug screenOf(). */
  pick?: readonly [number, number, number];
  info(): EntityInfo;
  readout(): string;
  /** The hover label (PRD v2 §3.4): a lot's ticker and name, a block's sub-industry, a vehicle's load and ends; the card's title when absent. */
  label?(): string;
  route?(): EntityRoute | null;
  /** A part drawn for many things says which one was hit. */
  resolve?(point: THREE.Vector3): Entity;
  /** Buildings that open as a section drawing: called on open and close, and every frame while open. */
  peeked?(on: boolean): void;
  whileOpen?(): void;
  opened?(): boolean;
  isPerson?: boolean;
  bbox?: THREE.Box3;
  /** True while a followed thing is up in the sky. */
  aloft?(): boolean;
  /** Called by the simulation every fixed step. */
  update?(dt: number): void;
  /** What a highlight by tag can find this entity by: its code, its chain id, its tickers. */
  tags?: readonly string[];
  /** Its place in the keyboard's cycle: the registry's order (PRD v2 §3.4). */
  order?: number;
  /** A thing that moves on its own (a vehicle, a ship, a walker): its pick is local to its first group, which follows it. */
  moves?: boolean;
  /** Its box where it stands now, for the selection's frame and the hover's outline (a vehicle drawn by instancing). */
  extent?(): THREE.Box3;
  /** What the debug API reports about it (a vehicle's origin, destination, load and state); never shown on a card. */
  facts?(): Record<string, string | number>;
}

/** A closed building's shell and its section drawing, on the group's userData.peek. */
export interface Peek {
  shell: THREE.Object3D;
  cut?: THREE.Object3D;
  inside?: THREE.Object3D;
  box: readonly [number, number, number, number];
  z?: readonly [number, number];
  /** Builds the section the first time it opens. */
  section?(): { cut: THREE.Object3D; inside: THREE.Object3D };
  /** A station also opens when the view comes in close over it. */
  near?: boolean;
}

/** The views the camera frames: the hero is the home (PRD v2 §3.1), whole is the map. */
export const VIEW_NAMES = ['hero', 'whole', 'ring', 'estate', 'gateway', 'town', 'thinktank'] as const;
export type ViewName = (typeof VIEW_NAMES)[number];

/** The three bands of detail (PRD v2 §3.3), by the camera's zoom in pixels per metre. */
export type Band = 'district' | 'street' | 'inside';

export const LAYER_NAMES = ['logistics', 'cold-chain', 'credit', 'energy', 'governance', 'regulation'] as const;
export type LayerName = (typeof LAYER_NAMES)[number];

export const OVERLAY_NAMES = ['none', 'reindustrialisation', 'green-transition'] as const;
export type OverlayName = (typeof OVERLAY_NAMES)[number];

/** The site's tokens mapped to engine names are read from CSS variables; this is what the shell may override. */
export interface ThemeTokens {
  /** The CSS font family for in-world text. */
  font: string;
}

/** What the pointer is over (PRD v2 §3.4): the shell shows the label and reads it out. */
export interface Hover {
  id: string;
  kind: string;
  label: string;
}

export interface Selection {
  id: string;
  kind: string;
  info: EntityInfo;
}

/** Per-frame readings the shell can subscribe to instead of the engine writing into DOM ids. */
export interface FrameReading {
  clock: string;
  night: number;
  readout: string;
  paused: boolean;
  view: ViewName | null;
  zoom: number;
  /** The distance control's reading of the camera: 0 at the hero (home) view, 1 at the near view. */
  distance: number;
  /** The level of detail the zoom gives (PRD v2 §3.3): district, street or inside. */
  band: Band;
}

/** A condition mark the shell has placed: on an entity (a gate or signpost) or at a region's label anchor. */
export interface WorldMark {
  targetId: string;
  n: number;
  label: string;
  form: 'filled' | 'open' | 'dashed';
  at: { kind: 'entity'; id: string } | { kind: 'region'; id: string };
}

/** The renderer surface the engine needs; a test can pass a fake. */
export interface RendererLike {
  domElement: HTMLCanvasElement;
  setSize(w: number, h: number, updateStyle?: boolean): void;
  setPixelRatio(r: number): void;
  setClearColor(c: number, a: number): void;
  render(scene: THREE.Object3D, camera: THREE.Camera): void;
  dispose(): void;
  forceContextLoss(): void;
  clippingPlanes: THREE.Plane[];
  autoClear: boolean;
  info: { autoReset: boolean; reset(): void; render: { calls: number } };
  capabilities: { getMaxAnisotropy(): number };
}

/** Follow's state (PRD v2 §3.10): riding a vehicle, gliding a hop no vehicle carries, stopped at a lot, or ended. */
export interface FollowReading {
  mode: 'ride' | 'glide' | 'stop' | 'end';
  /** The story ridden, or null for a single vehicle. */
  story: string | null;
  hop: number;
  hops: number;
  vehicle: string | null;
  /** The lot the camera stands at (a stop, the end). */
  lot: string | null;
  /** How far through the ride, 0 to 1. */
  progress: number;
  /** Seconds of the frame's clock since the ride began. */
  elapsed: number;
}

/** A lit story's hop (PRD v2 §3.10): its ends in reading order, its goods, the joints its routes cross, whether measured. */
export interface LitHop { from: string; to: string; goods: Goods; joints: string[]; measured: boolean }

/** What a card's action asks the shell to do. */
export type WorldAction =
  | { type: 'open-board'; ticker: string }
  | { type: 'open-index'; code: string }
  | { type: 'open-thinktank' }
  | { type: 'open-condition'; targetId: string };

export interface WorldOptions {
  registry: Registry;
  layout: GeneratedLayout;
  theme: ThemeTokens;
  seed?: number;
  initialView?: ViewName;
  /** Phones: fewer vehicles, lite models sooner. */
  reducedDetail?: boolean;
  /** Exposes window.world. */
  debug?: boolean;
  /** Simulated seconds run before the first frame; measured in Phase D, see WARMUP_SECONDS. */
  warmupSeconds?: number;
  onSelect?: (sel: Selection | null) => void;
  /** The thing under the pointer changed: its label for the shell's readout (PRD v2 §3.4). */
  onHover?: (h: Hover | null) => void;
  onAction?: (action: WorldAction) => void;
  /** Follow began, moved on, stopped at a lot, ended (a reading) or let go (null) (PRD v2 §3.10). */
  onFollow?: (f: FollowReading | null) => void;
  onReady?: () => void;
  /** Tests pass a fake renderer; the default creates a WebGLRenderer on the engine's canvas. */
  createRenderer?: (canvas: HTMLCanvasElement) => RendererLike;
}

export interface WorldHandle {
  select(id: string | null): void;
  selected(): string | null;
  lookAt(view: ViewName): void;
  /** 0 economy (the hero, home view) … 1 finance (near view on the selected or last building). */
  setDistance(t: number): void;
  setOverlay(name: OverlayName): void;
  /** The marks of the active shift, placed by the shell; an empty list clears them. */
  setMarks(marks: readonly WorldMark[]): void;
  setLayer(name: LayerName, on: boolean): void;
  setModelStatus(statuses: Map<string, ModelStatus>): void;
  /** Flow classes from the boundary: measured links carry more vehicles than expected ones. */
  setFlowWeights(flows: FlowWeight[]): void;
  /** Light the chain of a building or company (PRD §7.9): one level, or the whole connected chain; null clears. */
  highlightChain(id: string | null, depth: 1 | 'all'): void;
  /** Light a story end to end and frame it (PRD v2 §3.10): every hop's routes, every lot outlined, the rest dimmed; null clears it. */
  lightStory(story: Story | null): LitHop[];
  /** Frame one hop of the lit story (the strip's hop buttons). */
  frameHop(i: number): void;
  /** Light the entities whose id, code or chain id is named (a think-tank piece's tags); an empty list clears. */
  setHighlight(ids: readonly string[]): void;
  /** Open a company's plot as a section and mark its bound stations with the cost lines' labels (PRD §7.8). */
  exposeCompany(ticker: string, stations: readonly StationBinding[], whiteboard?: WhiteboardContent | null): void;
  /** Light the marker of one cost line while the board hovers or focuses it; null lights none. */
  lightStation(lineId: string | null): void;
  /** Ride along (PRD v2 §3.10): 'story:<id>' rides a story from its first lot, a vehicle's id rides that vehicle; null lets go. */
  follow(id: string | null): void;
  following(): FollowReading | null;
  /** A vehicle carrying a link's load ('from>to'): one on the road, laden if any is, else one sent now; null when the link moves nothing (search by load, PRD v2 §3.13). */
  vehicleOn(key: string): string | null;
  pause(on: boolean): void;
  /** Per-frame readings for the shell's clock and readout; returns the unsubscribe. */
  subscribe(fn: (r: FrameReading) => void): () => void;
  /** Run the simulation forward by hand (tests, the debug API). */
  step(seconds: number): void;
  dispose(): void;
}
