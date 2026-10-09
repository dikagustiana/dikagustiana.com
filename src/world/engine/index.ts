/**
 * The world engine: Factory Yard's kernel, theme, view and simulation, made
 * mountable (docs/world/PRD-kawasan-industri.md §9). Importing this module
 * has no side effects; everything happens inside createWorld.
 */
export { createWorld, WorldError, WARMUP_SECONDS } from './create';
export type { WorldHandle, WorldOptions, ViewName, LayerName, OverlayName, Selection, FrameReading, Entity, EntityInfo, ThemeTokens, RendererLike } from './types';
export { VIEW_NAMES, LAYER_NAMES, OVERLAY_NAMES } from './types';
export { SITE_TOKENS, colorFromToken } from './theme';
export { createRng, DEFAULT_SEED } from './kernel/math';
export { STEP } from './sim/clock';
