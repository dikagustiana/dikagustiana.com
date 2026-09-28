// @vitest-environment node
/**
 * The per-essay share card (scripts/lib/shareCard.mjs): exactly 1200×630,
 * byte-identical for the same input, well under 300 KB, and a title that
 * never leaves its box. "Never leaves its box" is checked on the pixels of
 * the rendered PNG, not on the layout arithmetic: nothing is drawn in the
 * right margin, and nothing is drawn in the band between the tallest title
 * the card allows and the footer.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  FOOTER_TOP,
  TITLE_MAX_LINES,
  TITLE_SIZES,
  cmapCodePoints,
  fitTitle,
  missingGlyphs,
  renderShareCard,
  shareCardLabel,
  titleBox,
} from '../../scripts/lib/shareCard.mjs';

// The seven published titles, read live on 2026-09-28. The build checks
// whatever is published when it runs; this pins the set the design gate saw.
const PUBLISHED_TITLES = [
  'The Best Time Ever for an Idea Guy',
  'Thinking Was Expensive, but Attention with Discernment and Curiosity Is Appreciating',
  "Indonesia's Reindustrialization Bet",
  'Driver Tree Construction',
  'The Agentic Finance Function',
  'Macro Scenario Construction for CFOs',
  'Site Rebuild Note: What Was Lost, and What Survived',
];
const LONGEST = PUBLISHED_TITLES.reduce((a, b) => (b.length > a.length ? b : a));
const HOSTILE = 'The “Idea Guy” Is Back — He’s Brought Friends… & <Receipts>';
const OVERLONG =
  'Why Every Finance Function Will Eventually Need a Driver Tree, a Scenario Engine, a Forecasting Discipline, and the Humility to Admit That the Model Is Not the Business It Describes';

/** Minimal PNG reader: 8-bit RGB/RGBA, not interlaced (what resvg writes). */
function decodePng(png: Buffer) {
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  let pos = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  while (pos < png.length) {
    const length = png.readUInt32BE(pos);
    const type = png.toString('latin1', pos + 4, pos + 8);
    const data = png.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect(data[8]).toBe(8); // bit depth
      expect(data[12]).toBe(0); // not interlaced
      channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0;
      expect(channels).toBeGreaterThan(0);
    }
    if (type === 'IDAT') idat.push(data);
    pos += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[y * stride + x - channels] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0;
      let v = raw[y * (stride + 1) + 1 + x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pixels[y * stride + x] = v & 0xff;
    }
  }
  const rgb = (x: number, y: number) => [...pixels.subarray(y * stride + x * channels, y * stride + x * channels + 3)];
  return { width, height, rgb };
}

/** Rows and columns of a rendered card that hold anything but background. */
function inkIn(png: Buffer, box: { x0: number; x1: number; y0: number; y1: number }) {
  const { rgb } = decodePng(png);
  const bg = rgb(5, 5);
  const hits: string[] = [];
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      const p = rgb(x, y);
      if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 6) hits.push(`${x},${y}`);
    }
  }
  return hits;
}

// Nothing may be drawn right of the content column (the rule ends at 1103),
// nor between the tallest title the card allows (three lines at the largest
// step, plus its descenders) and the footer, whose ink starts at y = 543 on
// public/og-image.png. The band's bottom is that fixed line, not the module's
// own footer constant, so a footer moved up into the title cannot pass.
const FALLBACK_FOOTER_INK_TOP = 543;
const RIGHT_MARGIN = { x0: 1106, x1: CARD_WIDTH - 1, y0: 0, y1: CARD_HEIGHT - 1 };
const ABOVE_FOOTER = {
  x0: 0,
  x1: CARD_WIDTH - 1,
  y0: Math.ceil(titleBox(TITLE_SIZES[0], TITLE_MAX_LINES).bottom) + 8,
  y1: FALLBACK_FOOTER_INK_TOP - 3,
};
const FOOTER_ROWS = { x0: 96, x1: 460, y0: FALLBACK_FOOTER_INK_TOP, y1: FALLBACK_FOOTER_INK_TOP + 22 };

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

describe('share card', () => {
  it('is exactly 1200 × 630, read from the PNG header', async () => {
    const png = await renderShareCard({ title: 'Driver Tree Construction', label: 'Finance · Financial Analytics' });
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    expect([CARD_WIDTH, CARD_HEIGHT]).toEqual([1200, 630]);
  });

  it('renders the same input to byte-identical PNGs', async () => {
    const input = { title: LONGEST, label: 'The Next Big Thing · Society' };
    const first = await renderShareCard(input);
    const second = await renderShareCard(input);
    expect(sha256(first)).toBe(sha256(second));
  });

  it('stays under 300 KB, busiest cards included', async () => {
    for (const title of [LONGEST, HOSTILE, OVERLONG]) {
      const png = await renderShareCard({ title, label: 'The Next Big Thing · Technology' });
      expect(png.length).toBeLessThanOrEqual(300 * 1024);
    }
  });

  it('holds the longest published title in three lines, at the largest size', async () => {
    expect(ABOVE_FOOTER.y0).toBeLessThan(ABOVE_FOOTER.y1);
    expect(FOOTER_TOP).toBeGreaterThan(ABOVE_FOOTER.y1 - 10);
    const fitted = await fitTitle(LONGEST);
    expect(fitted).toMatchObject({ size: 64, truncated: false });
    expect(fitted.lines).toBeLessThanOrEqual(3);
    const png = await renderShareCard({ title: LONGEST, label: 'The Next Big Thing · Society' });
    expect(inkIn(png, RIGHT_MARGIN)).toEqual([]);
    expect(inkIn(png, ABOVE_FOOTER)).toEqual([]);
    expect(inkIn(png, FOOTER_ROWS).length).toBeGreaterThan(0); // the footer is drawn, where the fallback's is
  });

  it('draws a hostile title inside its box: ’ “ ” — … & < >', async () => {
    expect(missingGlyphs(HOSTILE)).toEqual([]);
    const fitted = await fitTitle(HOSTILE);
    expect(fitted.lines).toBeLessThanOrEqual(3);
    const png = await renderShareCard({ title: HOSTILE, label: 'Finance · Planning & Forecasting' });
    expect(inkIn(png, RIGHT_MARGIN)).toEqual([]);
    expect(inkIn(png, ABOVE_FOOTER)).toEqual([]);
  });

  it('wraps a dense title at the column edge, never past it', async () => {
    // Short words end every line within a word's width of the box edge, so a
    // box even a little wider than the column would put ink in the margin.
    const dense = Array.from({ length: 40 }, () => 'go').join(' ');
    const png = await renderShareCard({ title: dense, label: 'Finance · General' });
    expect(inkIn(png, RIGHT_MARGIN)).toEqual([]);
    expect(inkIn(png, ABOVE_FOOTER)).toEqual([]);
    expect(inkIn(png, { x0: 1040, x1: 1105, y0: 290, y1: 500 }).length).toBeGreaterThan(0); // it does reach the edge
  });

  it('steps a title that fits nowhere down to 48 px and cuts it at a word', async () => {
    const fitted = await fitTitle(OVERLONG);
    expect(fitted.size).toBe(48);
    expect(fitted.truncated).toBe(true);
    expect(fitted.lines).toBe(3);
    expect(fitted.text.endsWith('…')).toBe(true);
    expect(OVERLONG.startsWith(fitted.text.slice(0, -1))).toBe(true); // a prefix, cut at a word
    expect(fitted.text).not.toMatch(/[\s,;:]…$/);
    const png = await renderShareCard({ title: OVERLONG, label: 'A Label Far Too Long For One Line '.repeat(4) });
    expect(inkIn(png, RIGHT_MARGIN)).toEqual([]);
    expect(inkIn(png, ABOVE_FOOTER)).toEqual([]);
  });

  it('has a glyph for every character of every published title, and refuses one it has not', async () => {
    for (const title of PUBLISHED_TITLES) expect(missingGlyphs(title)).toEqual([]);
    expect(missingGlyphs('Growth 中 🙂')).toEqual(['中', '🙂']);
    await expect(renderShareCard({ title: 'The 中 Essay' })).rejects.toThrow(/U\+4E2D/);
  });

  it('reads the label from the database row: section, then track or else theme', () => {
    const nbt = { categories: { name: 'Society', sections: { name: 'The Next Big Thing' } }, finance_modules: null };
    const finance = {
      categories: { name: 'General', sections: { name: 'Finance' } },
      finance_modules: { slug: 't3-m03', track_slug: 'planning', finance_sections: { title: 'Planning & Forecasting' } },
    };
    expect(shareCardLabel(nbt)).toBe('The Next Big Thing · Society');
    expect(shareCardLabel(finance)).toBe('Finance · Planning & Forecasting');
    expect(shareCardLabel({ categories: { name: 'General', sections: null } })).toBe('General');
    expect(shareCardLabel({})).toBe('');
  });

  it('uses the recorded Plus Jakarta Sans files, read the same way fontTools reads them', () => {
    const file = (name: string) => readFileSync(`scripts/og-fonts/${name}`);
    // Static TTFs from tokotype/PlusJakartaSans at 18d1cd2, the commit
    // google/fonts ships as v2.071 (the variable font there is byte-identical).
    expect(sha256(file('PlusJakartaSans-Bold.ttf'))).toBe('5f5342ef76862b5b5365d1dff1a667629dfa484e388dd602552f647219c3870f');
    expect(sha256(file('PlusJakartaSans-SemiBold.ttf'))).toBe('65dbcedb6596a41c30869729eb31cb57d1f5edfe365684314bba8a1994eaa4cb');
    expect(sha256(file('OFL.txt'))).toBe('995c7199cab65954f545996326755daee7b63cc6b42b06c13da1f9502ab08a99');
    // fontTools getBestCmap() on the Bold file: 721 code points.
    expect(cmapCodePoints(file('PlusJakartaSans-Bold.ttf')).size).toBe(721);
  });
});
