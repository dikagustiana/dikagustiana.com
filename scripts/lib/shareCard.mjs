/**
 * The per-essay share card: a 1200×630 PNG, drawn at build time.
 *
 * Why this exists: every essay without a hero image shared as the same
 * /og-image.png, so in WhatsApp six different essays showed one picture and
 * differed only in text. This draws each essay its own card in the family of
 * that fallback: the same canvas, background, rule, lantern and footer, with
 * the essay's label and title in place of the site's name and deck.
 *
 * satori lays the card out and turns the text into paths (SVG); resvg
 * rasterises the SVG (PNG). Both are deterministic, neither is a browser,
 * and nothing is fetched: the fonts and the logo are files in this repo.
 * Both packages are devDependencies; this module runs only in Node, at build
 * time and under vitest. It never reaches the client bundle.
 *
 * Fonts: static Plus Jakarta Sans TTFs in scripts/og-fonts/ (see its
 * README.md). satori reads TTF but not WOFF2 (the only format public/fonts/
 * self-hosts), and the variable TTF in google/fonts crashes its font parser.
 */
import fs from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

// Measured from public/og-image.png, the fallback card this one sits beside.
const BACKGROUND = '#f8f7f4';
const INK = '#0f172a';
const SECONDARY = '#334155';
const MARGIN = 96;
const CONTENT_WIDTH = CARD_WIDTH - 2 * MARGIN; // 1008
const RULE = { top: 96, height: 3 };
const LOGO = { top: 159, size: 88 };
// The label sits beside the lantern, centred on it, so the title keeps the
// fallback's own position (its first capital starts at y = 299).
const LABEL = { gap: 28, size: 22, letterSpacing: 2.6 };
const TITLE = { capTop: 299, sizes: [64, 56, 48], lineHeight: 1.15, maxLines: 3, letterSpacing: -0.01 };
const FOOTER = { top: 537, size: 22, text: 'Dika Gustiana · dikagustiana.com' };

const FAMILY = 'Plus Jakarta Sans';
const fontFile = name => fs.readFileSync(new URL(`../og-fonts/${name}`, import.meta.url));
const SEMIBOLD = fontFile('PlusJakartaSans-SemiBold.ttf');
const BOLD = fontFile('PlusJakartaSans-Bold.ttf');
const FONTS = [
  { name: FAMILY, data: SEMIBOLD, weight: 600, style: 'normal' },
  { name: FAMILY, data: BOLD, weight: 700, style: 'normal' },
];
// public/logo.png holds JPEG bytes under a .png name. Browsers sniff the
// content; resvg trusts the data URI's declared type and drops a mismatched
// image. So the type is read from the file's own magic bytes.
const LOGO_BYTES = fs.readFileSync(new URL('../../public/logo.png', import.meta.url));
const LOGO_TYPE =
  LOGO_BYTES[0] === 0xff && LOGO_BYTES[1] === 0xd8
    ? 'image/jpeg'
    : LOGO_BYTES.subarray(1, 4).toString('latin1') === 'PNG'
      ? 'image/png'
      : null;
if (!LOGO_TYPE) throw new Error('shareCard: public/logo.png is neither JPEG nor PNG');
const LOGO_SRC = `data:${LOGO_TYPE};base64,${LOGO_BYTES.toString('base64')}`;

// Plus Jakarta Sans's vertical metrics (units per em = 1000): hhea ascender
// 1038, descender 222, cap height 745. The title's box is placed so its first
// capital lands on TITLE.capTop at every size.
const ASCENT = 1.038;
const DESCENT = 0.222;
const CAP_HEIGHT = 0.745;
const capOffset = size => size * ((TITLE.lineHeight - (ASCENT + DESCENT)) / 2 + (ASCENT - CAP_HEIGHT));

// ---------------------------------------------------------------------------
// Glyph coverage, read from the fonts' own character maps
// ---------------------------------------------------------------------------

/** The code points a TrueType font maps to a real glyph (cmap format 12, else 4). */
export function cmapCodePoints(font) {
  const u16 = o => font.readUInt16BE(o);
  const u32 = o => font.readUInt32BE(o);
  let cmap = -1;
  for (let i = 0; i < u16(4); i++) {
    const record = 12 + i * 16;
    if (font.toString('latin1', record, record + 4) === 'cmap') cmap = u32(record + 8);
  }
  if (cmap < 0) throw new Error('shareCard: font has no cmap table');
  let best = null;
  for (let i = 0; i < u16(cmap + 2); i++) {
    const record = cmap + 4 + i * 8;
    const platform = u16(record);
    const encoding = u16(record + 2);
    const offset = cmap + u32(record + 4);
    const format = u16(offset);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    const score = !unicode ? 0 : format === 12 ? 2 : format === 4 ? 1 : 0;
    if (score > (best?.score ?? 0)) best = { score, offset, format };
  }
  if (!best) throw new Error('shareCard: font has no Unicode cmap subtable');
  const points = new Set();
  if (best.format === 12) {
    for (let g = 0; g < u32(best.offset + 12); g++) {
      const group = best.offset + 16 + g * 12;
      const start = u32(group);
      const end = u32(group + 4);
      const startGlyph = u32(group + 8);
      for (let c = start; c <= end; c++) if (startGlyph + (c - start) !== 0) points.add(c);
    }
    return points;
  }
  const segCountX2 = u16(best.offset + 6);
  const ends = best.offset + 14;
  const starts = ends + segCountX2 + 2;
  const deltas = starts + segCountX2;
  const rangeOffsets = deltas + segCountX2;
  for (let s = 0; s < segCountX2 / 2; s++) {
    const end = u16(ends + s * 2);
    const start = u16(starts + s * 2);
    const delta = font.readInt16BE(deltas + s * 2);
    const rangeOffset = u16(rangeOffsets + s * 2);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph = rangeOffset === 0 ? (c + delta) & 0xffff : u16(rangeOffsets + s * 2 + rangeOffset + (c - start) * 2);
      if (rangeOffset !== 0 && glyph !== 0) glyph = (glyph + delta) & 0xffff;
      if (glyph !== 0) points.add(c);
    }
  }
  return points;
}

const COVERAGE = { 600: cmapCodePoints(SEMIBOLD), 700: cmapCodePoints(BOLD) };

/** Characters of `text` the card's font (600 or 700) has no glyph for; [] when fully covered. */
export function missingGlyphs(text, weight = 700) {
  const covered = COVERAGE[weight];
  if (!covered) throw new Error(`shareCard: no font loaded for weight ${weight}`);
  return [...new Set([...String(text)].filter(ch => !/\s/.test(ch) && !covered.has(ch.codePointAt(0))))];
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const div = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

const titleStyle = size => ({
  fontFamily: FAMILY,
  fontWeight: 700,
  fontSize: size,
  lineHeight: TITLE.lineHeight,
  letterSpacing: `${TITLE.letterSpacing}em`,
});

/** How many lines `text` wraps to at `size` across the content width, measured by satori itself. */
async function lineCount(text, size) {
  const svg = await satori(div({ width: CONTENT_WIDTH, ...titleStyle(size) }, text), {
    width: CONTENT_WIDTH,
    fonts: FONTS,
  });
  const height = Number(/<svg[^>]*\sheight="([\d.]+)"/.exec(svg)?.[1]);
  if (!Number.isFinite(height)) throw new Error('shareCard: could not measure the title');
  return Math.round(height / (size * TITLE.lineHeight));
}

/**
 * The largest step that holds the whole title in TITLE.maxLines lines. When
 * even the smallest cannot, the title is cut at a word boundary and closed
 * with an ellipsis.
 */
export async function fitTitle(title) {
  for (const size of TITLE.sizes) {
    const lines = await lineCount(title, size);
    if (lines <= TITLE.maxLines) return { size, lines, text: title, truncated: false };
  }
  const size = TITLE.sizes[TITLE.sizes.length - 1];
  const words = title.split(' ');
  const cut = k => `${words.slice(0, k).join(' ').replace(/[\s,;:.–—-]+$/u, '')}…`;
  let lo = 0;
  let hi = words.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if ((await lineCount(cut(mid), size)) <= TITLE.maxLines) lo = mid;
    else hi = mid - 1;
  }
  // lo === 0: a single word too long for three lines. The clamp below still
  // holds the box; the cut then falls mid-word.
  const text = lo > 0 ? cut(lo) : title;
  return { size, lines: Math.min(await lineCount(text, size), TITLE.maxLines), text, truncated: true };
}

/** Where the title box starts and ends at a size, for a number of lines. */
export function titleBox(size, lines) {
  const top = Math.round(TITLE.capTop - capOffset(size));
  return { top, bottom: top + lines * size * TITLE.lineHeight };
}
export const FOOTER_TOP = FOOTER.top;
export const TITLE_SIZES = TITLE.sizes;
export const TITLE_MAX_LINES = TITLE.maxLines;

const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();

/**
 * The card's label, read from the database row the prerender fetches:
 * the section's name, then the finance track or else the category (the
 * theme). No names are written here; they come from `sections.name`,
 * `finance_sections.title` and `categories.name` through the essay select.
 */
export function shareCardLabel(row) {
  const section = clean(row?.categories?.sections?.name);
  const theme = clean(row?.finance_modules?.finance_sections?.title) || clean(row?.categories?.name);
  return [section, theme].filter(Boolean).join(' · ');
}

/**
 * The share card for one essay, as PNG bytes.
 * @param {{ title: string, label?: string }} input
 */
export async function renderShareCard({ title, label = '' }) {
  const cleanTitle = clean(title);
  const cleanLabel = clean(label);
  if (!cleanTitle) throw new Error('shareCard: an essay card needs a title');
  const missing = [...missingGlyphs(cleanTitle, 700), ...missingGlyphs(cleanLabel, 600)];
  if (missing.length > 0) {
    const points = missing.map(ch => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} ${ch}`);
    throw new Error(`shareCard: no glyph in Plus Jakarta Sans for ${points.join(', ')} in "${cleanTitle}"`);
  }

  const fitted = await fitTitle(cleanTitle);
  const tree = div(
    { position: 'relative', width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: BACKGROUND, fontFamily: FAMILY },
    [
      div({ position: 'absolute', left: MARGIN, top: RULE.top, width: CONTENT_WIDTH, height: RULE.height, backgroundColor: INK }),
      div(
        { position: 'absolute', left: MARGIN, top: LOGO.top, width: CONTENT_WIDTH, height: LOGO.size, alignItems: 'center' },
        [
          { type: 'img', props: { src: LOGO_SRC, width: LOGO.size, height: LOGO.size, style: { width: LOGO.size, height: LOGO.size } } },
          div(
            {
              marginLeft: LABEL.gap,
              width: CONTENT_WIDTH - LOGO.size - LABEL.gap,
              color: SECONDARY,
              fontWeight: 600,
              fontSize: LABEL.size,
              letterSpacing: LABEL.letterSpacing,
              textTransform: 'uppercase',
              // Case-sensitive forms: the middle dot and the ampersand sit at capital height.
              fontFeatureSettings: '"case" 1',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
            cleanLabel,
          ),
        ],
      ),
      {
        type: 'div',
        props: {
          style: {
            position: 'absolute',
            left: MARGIN,
            top: titleBox(fitted.size, fitted.lines).top,
            width: CONTENT_WIDTH,
            color: INK,
            ...titleStyle(fitted.size),
            display: 'block',
            lineClamp: TITLE.maxLines,
          },
          children: fitted.text,
        },
      },
      div(
        { position: 'absolute', left: MARGIN, top: FOOTER.top, color: INK, fontWeight: 700, fontSize: FOOTER.size },
        FOOTER.text,
      ),
    ],
  );

  const svg = await satori(tree, { width: CARD_WIDTH, height: CARD_HEIGHT, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: 'original' }, font: { loadSystemFonts: false } }).render().asPng();
}
