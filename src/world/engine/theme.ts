// Adapted from Factory Yard (github.com/Khalidabdi1/factory, commit 148758a), after ai-iso-skill (MIT, © 2026 Tolga Cohce).
import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// ---- tokens → materials ----
//
// THE ONE MAPPING TABLE (PRD §7.13, mega prompt §4.5). The engine names its
// tones after Factory Yard; each is read from one of the site's design tokens
// in src/index.css. No other file under src/world/engine or src/world/interiors
// may carry a colour: a test greps for hex outside this file. The night palette
// below is the one place hex is allowed, because night is one palette for
// both themes and no site token describes it.

export type FillKey = 'ground' | 'road' | 'body' | 'deck' | 'kob' | 'kod' | 'glass' | 'livef' | 'window' | 'lamp' | 'sea' | 'sand' | 'grass' | 'snow' | 'screen';
export type LineKey = 'line' | 'detail' | 'koline' | 'live';
export type TextKey = 'ink' | 'paint';

/** Engine tone → the site's CSS custom property it is read from. */
export const SITE_TOKENS: { fill: Record<FillKey, string>; line: Record<LineKey, string>; text: Record<TextKey, string> } = {
  fill: {
    ground: '--background',   // the slab
    road: '--muted',          // asphalt, a step darker than the ground
    body: '--card',           // walls
    deck: '--background',     // roofs and tops, lighter than walls
    kob: '--primary',         // two-tone goods and uniforms: the dark fill
    kod: '--accent',          // two-tone goods and uniforms: the deck of the dark fill
    glass: '--border',        // glazing by day
    livef: '--accent',        // the live fill: selection, busy lamps, beacons
    window: '--border',       // dark glass by day, lit after dark
    lamp: '--background',     // pale metal by day, lit after dark
    sea: '--secondary',       // the port's water
    sand: '--card',           // aprons and yards
    grass: '--muted',         // fields and plantation blocks
    snow: '--background',     // the hill's top
    screen: '--primary',      // a pierced screen's holes, lit after dark
  },
  line: {
    line: '--muted-foreground',   // the heavier of the two greys
    detail: '--border',           // the lighter of the two greys
    koline: '--foreground',       // outlines of two-tone goods
    live: '--accent',             // the one live colour
  },
  text: {
    ink: '--foreground',          // signs and labels
    paint: '--muted-foreground',  // paint on the ground
  },
};

// Night is one palette for both themes: the day colours slide toward it after dusk.
const NIGHT = {
  fill: { ground: '#0e0f10', road: '#0a0b0b', body: '#111213', deck: '#141516', kob: '#8c9093', kod: '#999da0', glass: '#08090a', livef: '#f4f5f5',
    window: '#e9ebec', lamp: '#f4f5f5', sea: '#090a0b', sand: '#141516', grass: '#0c0d0e', snow: '#232628', screen: '#e9ebec' } satisfies Record<FillKey, string>,
  line: { line: '#33373a', detail: '#202325', koline: '#3d4144', live: '#f4f5f5' } satisfies Record<LineKey, string>,
  text: { ink: '#70757a', paint: '#33373a' } satisfies Record<TextKey, string>,
};

/** What getComputedStyle gives back for a token: an HSL triplet ("215 60% 32%"), or any CSS colour. */
export function colorFromToken(raw: string, fallback = '#808080'): THREE.Color {
  const v = raw.trim();
  const c = new THREE.Color();
  if (!v) return c.setStyle(fallback);
  const triplet = v.match(/^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (triplet) return c.setStyle(`hsl(${triplet[1]}, ${triplet[2]}%, ${triplet[3]}%)`);
  try { c.setStyle(v); } catch { c.setStyle(fallback); }
  return c;
}

export interface Theme {
  fill: Record<FillKey, THREE.MeshBasicMaterial>;
  line: Record<LineKey, LineMaterial>;
  /** Text materials, pushed by every text mesh so the night blend can tint them. */
  text: Record<TextKey, THREE.MeshBasicMaterial[]>;
  /** The current day colour of a text tone, for a new text mesh. */
  textColor(k: TextKey): THREE.Color;
  /** Re-read the site's tokens (after a theme change) and re-tint. */
  apply(): void;
  /** 0 is full day, 1 full night; windows and lamps come on early in the dusk and go off late in the dawn. */
  shade(n: number, force?: boolean): void;
  /** Hairlines are 1 CSS px at any zoom; the line materials need the view's size. */
  setResolution(w: number, h: number): void;
  dispose(): void;
}

export function createTheme(read: (token: string) => string): Theme {
  const fill = {} as Record<FillKey, THREE.MeshBasicMaterial>;
  const line = {} as Record<LineKey, LineMaterial>;
  const text: Record<TextKey, THREE.MeshBasicMaterial[]> = { ink: [], paint: [] };
  // Faces are flat and unlit, pushed back a hair so the hairlines drawn on them always win the depth test.
  for (const k of Object.keys(SITE_TOKENS.fill) as FillKey[]) fill[k] = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  // 1 css px at any zoom: the WebGL stand-in for vector-effect:non-scaling-stroke.
  for (const k of Object.keys(SITE_TOKENS.line) as LineKey[]) line[k] = new LineMaterial({ linewidth: 1, worldUnits: false });
  const day = { fill: {} as Record<FillKey, THREE.Color>, line: {} as Record<LineKey, THREE.Color>, text: {} as Record<TextKey, THREE.Color> };
  const night = {
    fill: Object.fromEntries(Object.entries(NIGHT.fill).map(([k, v]) => [k, new THREE.Color(v)])) as Record<FillKey, THREE.Color>,
    line: Object.fromEntries(Object.entries(NIGHT.line).map(([k, v]) => [k, new THREE.Color(v)])) as Record<LineKey, THREE.Color>,
    text: Object.fromEntries(Object.entries(NIGHT.text).map(([k, v]) => [k, new THREE.Color(v)])) as Record<TextKey, THREE.Color>,
  };
  let dusk = 0;
  const shade = (n: number, force = false) => {
    if (!force && Math.abs(n - dusk) < 0.002) return;
    dusk = n; const lit = Math.min(1, n * 1.8);
    for (const k of Object.keys(fill) as FillKey[]) fill[k].color.copy(day.fill[k]).lerp(night.fill[k], k === 'window' || k === 'lamp' || k === 'screen' ? lit : n);
    for (const k of Object.keys(line) as LineKey[]) line[k].color.copy(day.line[k]).lerp(night.line[k], n);
    for (const k of Object.keys(text) as TextKey[]) { const c = day.text[k].clone().lerp(night.text[k], n); for (const m of text[k]) m.color.copy(c); }
  };
  const apply = () => {
    for (const k of Object.keys(SITE_TOKENS.fill) as FillKey[]) day.fill[k] = colorFromToken(read(SITE_TOKENS.fill[k]));
    for (const k of Object.keys(SITE_TOKENS.line) as LineKey[]) day.line[k] = colorFromToken(read(SITE_TOKENS.line[k]));
    for (const k of Object.keys(SITE_TOKENS.text) as TextKey[]) day.text[k] = colorFromToken(read(SITE_TOKENS.text[k]));
    shade(dusk, true);
  };
  apply();
  return {
    fill, line, text,
    textColor: (k) => day.text[k].clone().lerp(night.text[k], dusk),
    apply, shade,
    setResolution: (w, h) => { for (const m of Object.values(line)) m.resolution.set(w, h); },
    dispose: () => {
      for (const m of Object.values(fill)) m.dispose();
      for (const m of Object.values(line)) m.dispose();
      for (const k of Object.keys(text) as TextKey[]) { for (const m of text[k]) { m.map?.dispose(); m.dispose(); } text[k].length = 0; }
    },
  };
}
