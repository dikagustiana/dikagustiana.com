/**
 * The world_kawasan flag (PRD §7.1; mega prompt rule 5), the site's way: a
 * build-time constant. VITE_WORLD_KAWASAN=true turns the world on; unset,
 * __WORLD_KAWASAN__ is false, the chain wrappers render the schematic
 * exactly as before, and Rollup drops the world's modules, so no chunk of
 * them reaches dist/ (scripts/world/assert-world-flag.mjs checks that).
 */
export const WORLD_KAWASAN: boolean = __WORLD_KAWASAN__;
