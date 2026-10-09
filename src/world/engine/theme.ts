// Original to this repository (Kawasan Industri world engine, fallback kernel), after ai-iso-skill (MIT, © 2026 Tolga Cohce).
/**
 * The world's colours: the one mapping from the site's design tokens
 * (src/index.css) to the engine's materials. Nothing else in the engine
 * writes a colour; scene code names a key ('deck', 'line', 'ink', a tone)
 * and the theme answers with a material or a colour read from the page.
 *
 * The vocabulary follows ai-iso-skill's monochrome look: a body and a deck
 * for faces, a structure line and a detail line, and one live colour kept
 * for whatever is live (the selection, a published model, a measured
 * link, the money layer). A few keys are mixes of two tokens, so the world
 * follows the light and the dark theme without a colour of its own.
 *
 * The only literal colours in the engine live here: the night palette (the
 * warm glow lit windows take after dark). The day fallbacks, used where no
 * stylesheet is present (tests, a detached container), are the light
 * theme's token values in the tokens' own HSL form.
 */
import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

/** Flat fills: ground, yards, decals, the whiteboard's bars. */
export type FillKey = 'ground' | 'body' | 'deck' | 'road' | 'glass' | 'sand' | 'grass' | 'sea' | 'kob' | 'kod' | 'livef' | 'window' | 'lamp' | 'screen';
/** Lines: structure, detail, the slab's grid, and the live colour. */
export type LineKey = 'line' | 'detail' | 'grid' | 'live';
/** Text: ink for what is read, paint for what is marked on the ground. */
export type TextKey = 'ink' | 'paint';
/**
 * Solid tones, for boxes, prisms and cylinders: n the plain body, w white,
 * k dark, g pale glass-grey, gr rock, gs grass slope, s sand, l a lamp,
 * nb and kb a walker's light and dark parts.
 */
export type Tone = 'n' | 'w' | 'k' | 'g' | 'gr' | 'gs' | 's' | 'l' | 'nb' | 'kb';

/** A key's colour: a token, or a mix of two tokens (t of the way from the first to the second). */
type Source = string | readonly [from: string, to: string, t: number];

/** Which token each key reads; the CSS custom properties of src/index.css. */
export const SITE_TOKENS: { fill: Record<FillKey, string>; line: Record<LineKey, string>; text: Record<TextKey, string>; tone: Record<Tone, string> } = {
  fill: {
    ground: '--background', body: '--card', deck: '--secondary', road: '--muted', glass: '--border', sand: '--muted', grass: '--secondary', sea: '--background',
    kob: '--muted-foreground', kod: '--muted-foreground', livef: '--accent', window: '--border', lamp: '--popover', screen: '--background',
  },
  line: { line: '--foreground', detail: '--muted-foreground', grid: '--border', live: '--accent' },
  text: { ink: '--foreground', paint: '--muted-foreground' },
  tone: { n: '--card', w: '--background', k: '--muted-foreground', g: '--secondary', gr: '--muted', gs: '--muted', s: '--muted', l: '--background', nb: '--card', kb: '--primary' },
};

/** Keys that are a mix of their token and a second one. */
const MIX: { fill: Partial<Record<FillKey, Source>>; line: Partial<Record<LineKey, Source>>; tone: Partial<Record<Tone, Source>> } = {
  fill: {
    sand: ['--muted', '--fia-cost', 0.1],
    grass: ['--secondary', '--section-green', 0.12],
    sea: ['--background', '--accent', 0.16],
    kod: ['--muted-foreground', '--background', 0.5],
    screen: ['--background', '--accent', 0.4],
  },
  line: {
    line: ['--foreground', '--background', 0.2],
    detail: ['--muted-foreground', '--background', 0.25],
  },
  tone: {
    gs: ['--muted', '--section-green', 0.14],
    s: ['--muted', '--fia-cost', 0.12],
    l: ['--background', '--accent-editorial', 0.6],
  },
};

/** The light theme's values, for a page without the stylesheet. */
const FALLBACK: Record<string, string> = {
  '--background': '0 0% 98%', '--foreground': '215 25% 17%', '--card': '200 40% 96%', '--popover': '0 0% 100%',
  '--primary': '215 28% 17%', '--secondary': '200 30% 94%', '--muted': '200 20% 92%', '--muted-foreground': '215 15% 45%',
  '--accent': '215 60% 32%', '--border': '215 20% 88%', '--section-green': '142 71% 45%', '--fia-cost': '24 75% 38%',
  '--accent-editorial': '20.4 100% 54.9%',
};

/** The night palette: lit windows glow warm after dark. */
const NIGHT_WINDOW = '#ffc978';

/** Line widths in CSS pixels. */
const WIDTH: Record<LineKey, number> = { line: 1, detail: 1, grid: 1, live: 2 };

/**
 * A token's value as a colour. Reads the forms a stylesheet gives: shadcn's
 * bare "H S% L%", hsl(…), rgb(…) and #hex; anything else gives the fallback
 * (itself in one of those forms), or black.
 */
export function colorFromToken(raw: string, fallback?: string): THREE.Color {
  const parsed = parseColor(raw);
  if (parsed) return parsed;
  return (fallback !== undefined ? parseColor(fallback) : null) ?? new THREE.Color(0, 0, 0);
}

function parseColor(raw: string): THREE.Color | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
    if (!/^[0-9a-f]{6}$/i.test(full)) return null;
    const n = parseInt(full, 16);
    return new THREE.Color().setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, THREE.SRGBColorSpace);
  }
  const nums = (s.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  if (/^rgba?\(/i.test(s) && nums.length >= 3) return new THREE.Color().setRGB(nums[0] / 255, nums[1] / 255, nums[2] / 255, THREE.SRGBColorSpace);
  if ((/^hsla?\(/i.test(s) || /^-?\d*\.?\d+(deg)?[\s,]+-?\d*\.?\d+%?[\s,]+-?\d*\.?\d+%?/.test(s)) && nums.length >= 3) {
    const h = (((nums[0] % 360) + 360) % 360) / 360;
    return new THREE.Color().setHSL(h, Math.min(1, nums[1] / 100), Math.min(1, nums[2] / 100), THREE.SRGBColorSpace);
  }
  return null;
}

export interface Theme {
  fill: Record<FillKey, THREE.MeshBasicMaterial>;
  line: Record<LineKey, LineMaterial>;
  /** The one material every solid is drawn with: its colours ride on the vertices (tone × face shade). */
  solid: THREE.MeshBasicMaterial;
  textColor(k: TextKey): THREE.Color;
  /** A tone's colour, shaded for a face: 1 for a roof, less for the walls (sRGB-space factor). */
  tone(t: Tone, shade?: number): THREE.Color;
  /** A material for one page of text, its glyphs drawn white and tinted by the key's colour. */
  textMaterial(k: TextKey, map: THREE.Texture): THREE.MeshBasicMaterial;
  /** Night, 0 by day to 1 at midnight: lit windows warm toward their night glow. */
  shade(night: number): void;
  /** Lines are drawn in screen pixels; they need the canvas size. */
  setResolution(w: number, h: number): void;
  dispose(): void;
}

export function createTheme(read: (token: string) => string): Theme {
  const token = (name: string) => colorFromToken(read(name), FALLBACK[name]);
  const resolve = (src: Source): THREE.Color => (typeof src === 'string' ? token(src) : token(src[0]).lerp(token(src[1]), src[2]));
  const colourOf = <K extends string>(key: K, tokens: Record<K, string>, mixes: Partial<Record<K, Source>>) => resolve(mixes[key] ?? tokens[key]);

  // Faces are drawn from both sides (Part keeps only the ones the camera sees); outlines win over the faces they
  // bound because Part nudges every line toward the camera, not because faces are pushed back.
  const faceMaterial = (color: THREE.Color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });

  const fill = {} as Record<FillKey, THREE.MeshBasicMaterial>;
  for (const k of Object.keys(SITE_TOKENS.fill) as FillKey[]) fill[k] = faceMaterial(colourOf(k, SITE_TOKENS.fill, MIX.fill));
  const windowDay = fill.window.color.clone(), windowNight = colorFromToken(NIGHT_WINDOW);

  const line = {} as Record<LineKey, LineMaterial>;
  for (const k of Object.keys(SITE_TOKENS.line) as LineKey[]) {
    line[k] = new LineMaterial({ linewidth: WIDTH[k], worldUnits: false });
    line[k].color.copy(colourOf(k, SITE_TOKENS.line, MIX.line));
  }

  const solid = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), vertexColors: true, side: THREE.DoubleSide });

  const text: Record<TextKey, THREE.Color> = { ink: colourOf('ink', SITE_TOKENS.text, {}), paint: colourOf('paint', SITE_TOKENS.text, {}) };
  const tones = new Map<string, THREE.Color>();
  const base = {} as Record<Tone, THREE.Color>;
  for (const t of Object.keys(SITE_TOKENS.tone) as Tone[]) base[t] = colourOf(t, SITE_TOKENS.tone, MIX.tone);

  let lastNight = -1;
  return {
    fill, line, solid,
    textColor: (k) => text[k].clone(),
    tone(t, shade = 1) {
      const key = `${t}:${shade.toFixed(3)}`;
      let c = tones.get(key);
      if (!c) {
        const rgb = { r: 0, g: 0, b: 0 };
        base[t].getRGB(rgb, THREE.SRGBColorSpace);
        c = new THREE.Color().setRGB(Math.min(1, rgb.r * shade), Math.min(1, rgb.g * shade), Math.min(1, rgb.b * shade), THREE.SRGBColorSpace);
        tones.set(key, c);
      }
      return c;
    },
    textMaterial: (k, map) => new THREE.MeshBasicMaterial({ map, color: text[k].clone(), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    shade(night) {
      const n = Math.max(0, Math.min(1, night));
      if (Math.abs(n - lastNight) < 0.005) return;
      lastNight = n;
      fill.window.color.copy(windowDay).lerp(windowNight, n);
    },
    setResolution(w, h) { for (const m of Object.values(line)) m.resolution.set(Math.max(1, w), Math.max(1, h)); },
    dispose() {
      for (const m of Object.values(fill)) m.dispose();
      for (const m of Object.values(line)) m.dispose();
      solid.dispose();
      tones.clear();
    },
  };
}
