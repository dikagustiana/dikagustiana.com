/**
 * The shelf's pure parts (docs/prd/library-phase-2 §3, Shelf): how tall, how thick and what colour a book's
 * spine is, how spines pack onto planks at a given width, and how the books group under each sort.
 * tests/unit/spines.test.ts.
 *
 * Height follows the page count (160–240 px), thickness the file's size (28–56 px). Colour comes from a
 * twelve-hue palette keyed by shelf: one hue family per shelf, each book a step lighter or darker by its id,
 * so a shelf reads as one cloth without every spine being the same. The colour is computed once and stored
 * on the row (books_uploads.spine_color, scripts/books/spine-metrics.ts); a row without one gets the same
 * colour computed here.
 */

export const SPINE_MIN_H = 160;
export const SPINE_MAX_H = 240;
export const SPINE_MIN_W = 28;
export const SPINE_MAX_W = 56;
/** The gap between two spines on a plank. */
export const SPINE_GAP = 4;

/** Pages that map to the shortest and the tallest spine. */
const PAGES_LO = 60;
const PAGES_HI = 600;
/** File sizes that map to the thinnest and the thickest spine (log scale: 100 KB to 50 MB). */
const BYTES_LO = 100 * 1024;
const BYTES_HI = 50 * 1024 * 1024;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The spine's height from the page count; a book without one (a paid book, or not yet counted) stands mid-height. */
export function spineHeight(pageCount: number | null | undefined): number {
  if (!pageCount || !Number.isFinite(pageCount) || pageCount <= 0) return Math.round((SPINE_MIN_H + SPINE_MAX_H) / 2);
  const t = (clamp(pageCount, PAGES_LO, PAGES_HI) - PAGES_LO) / (PAGES_HI - PAGES_LO);
  return Math.round(SPINE_MIN_H + t * (SPINE_MAX_H - SPINE_MIN_H));
}

/** The spine's thickness from the file's size; a book without a file (paid) is of middling thickness. */
export function spineWidth(sizeBytes: number | null | undefined): number {
  if (!sizeBytes || !Number.isFinite(sizeBytes) || sizeBytes <= 0) return Math.round((SPINE_MIN_W + SPINE_MAX_W) / 2);
  const t = (Math.log(clamp(sizeBytes, BYTES_LO, BYTES_HI)) - Math.log(BYTES_LO)) / (Math.log(BYTES_HI) - Math.log(BYTES_LO));
  return Math.round(SPINE_MIN_W + t * (SPINE_MAX_W - SPINE_MIN_W));
}

/** Twelve book-cloth hues, one family per shelf in shelf order. */
export const SPINE_PALETTE = [
  '#7a2e2e', // oxblood
  '#2f3e5c', // navy
  '#2f5a45', // forest
  '#a87a2a', // ochre
  '#5a3a5e', // plum
  '#2d6168', // teal
  '#a2522c', // rust
  '#4a5560', // slate
  '#6b6a36', // olive
  '#3c3a73', // indigo
  '#b5654a', // terracotta
  '#55703f', // moss
] as const;

/** Lightness steps within a family. */
const STEPS = [-0.07, 0, 0.06, 0.12];

/** A small, stable string hash (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hexToHsl(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** The colour of a book's spine: its shelf's hue family (by the shelf's place), a lightness step by its id. */
export function spineColor(shelfIndex: number, bookId: string): string {
  const base = SPINE_PALETTE[((shelfIndex % SPINE_PALETTE.length) + SPINE_PALETTE.length) % SPINE_PALETTE.length];
  const [h, s, l] = hexToHsl(base);
  return hslToHex(h, s, clamp(l + STEPS[hashString(bookId) % STEPS.length], 0.12, 0.7));
}

export const SPINE_COLOR_SHAPE = /^#[0-9a-f]{6}$/;

/** Light or dark type for a spine, by the colour's relative luminance. */
export function spineInk(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum > 0.32 ? '#1f1b16' : '#f6efe2';
}

/**
 * Spines onto planks: left to right, a new plank when the next spine would pass the edge. Returns each
 * plank's indices into `widths`. A spine wider than the whole plank still gets a plank of its own.
 */
export function packPlanks(widths: readonly number[], inner: number, gap = SPINE_GAP): number[][] {
  const planks: number[][] = [];
  let row: number[] = [];
  let used = 0;
  widths.forEach((w, i) => {
    const need = row.length ? used + gap + w : w;
    if (row.length && need > inner) {
      planks.push(row);
      row = [i];
      used = w;
    } else {
      row.push(i);
      used = need;
    }
  });
  if (row.length) planks.push(row);
  return planks;
}

export type ShelfSort = 'shelf' | 'year' | 'author';
export const SHELF_SORTS: { key: ShelfSort; label: string }[] = [
  { key: 'shelf', label: 'Shelf' },
  { key: 'year', label: 'Year' },
  { key: 'author', label: 'Author' },
];
export const parseSort = (v: string | null): ShelfSort => (v === 'year' || v === 'author' ? v : 'shelf');

export interface Groupable {
  id: string;
  title: string | null;
  slug: string;
  author: string | null;
  year: number | null;
}

export interface Group<B> {
  key: string;
  label: string;
  books: B[];
}

/** The surname an author list is filed under: the last word of the first name in it. */
export function surname(author: string | null | undefined): string {
  const first = (author ?? '').split(/;|&|,| and /)[0].trim();
  const words = first.split(/\s+/).filter(Boolean);
  return words[words.length - 1] ?? '';
}

/** A spine's accessible name: title, author, year, and "to buy" for a paid book. */
export const spineLabel = (b: Groupable & { access: 'free' | 'paid' }) =>
  [b.title ?? b.slug, b.author, b.year, b.access === 'paid' ? 'to buy' : null].filter((x) => x !== null && x !== undefined && x !== '').join(', ');

const titleOf = (b: Groupable) => (b.title ?? b.slug).toLocaleLowerCase();

/**
 * The books under the page's sort. By shelf, the shelves as they come (already in order). By year, a run per
 * decade, oldest first, undated last. By author, a run per initial of the surname, unknown authors last.
 */
export function groupBooks<B extends Groupable>(shelves: { slug: string; name: string; books: B[] }[], sort: ShelfSort): Group<B>[] {
  if (sort === 'shelf') return shelves.map((s) => ({ key: s.slug, label: s.name, books: s.books }));
  const all = shelves.flatMap((s) => s.books);
  const runs = new Map<string, Group<B>>();
  const put = (key: string, label: string, b: B) => {
    const g = runs.get(key) ?? { key, label, books: [] };
    g.books.push(b);
    runs.set(key, g);
  };
  if (sort === 'year') {
    const sorted = [...all].sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity) || titleOf(a).localeCompare(titleOf(b)));
    for (const b of sorted) {
      if (b.year === null) put('undated', 'Undated', b);
      else {
        const decade = Math.floor(b.year / 10) * 10;
        put(String(decade), `${decade}s`, b);
      }
    }
  } else {
    const sorted = [...all].sort((a, b) => {
      const sa = surname(a.author).toLocaleLowerCase();
      const sb = surname(b.author).toLocaleLowerCase();
      if (!sa !== !sb) return sa ? -1 : 1;
      return sa.localeCompare(sb) || titleOf(a).localeCompare(titleOf(b));
    });
    for (const b of sorted) {
      const initial = surname(b.author).normalize('NFKD').charAt(0).toUpperCase();
      if (/[A-Z]/.test(initial)) put(initial, initial, b);
      else if (b.author) put('other', 'Other', b);
      else put('unknown', 'Unknown author', b);
    }
  }
  return [...runs.values()];
}
