import { describe, it, expect } from 'vitest';
import {
  validateFigures,
  extractFiguresFromContent,
  countFigures,
} from '@/lib/figureValidation';
import type { FigureBlockData } from '@/components/editorial/FigureBlock';

const fig = (over: Partial<FigureBlockData> = {}): FigureBlockData => ({
  src: 'https://x/img.png',
  altText: 'an alt',
  ...over,
});

describe('validateFigures', () => {
  it('passes a complete figure with no errors', () => {
    const r = validateFigures([fig({ sourceName: 'NASA' })], 'next-big-thing');
    expect(r.errors).toEqual([]);
  });

  it('errors when alt text is missing or blank', () => {
    const r = validateFigures([fig({ altText: '   ' })], 'next-big-thing');
    expect(r.errors.some((e) => /Missing alt text/.test(e.message))).toBe(true);
  });

  it('green-transition requires a source unless noSource', () => {
    const missing = validateFigures([fig({ sourceName: '' })], 'green-transition');
    expect(missing.errors.some((e) => /Missing source/.test(e.message))).toBe(true);

    const ok = validateFigures([fig({ noSource: true })], 'green-transition');
    expect(ok.errors).toEqual([]);
  });

  it('next-big-thing only warns about a missing source', () => {
    const r = validateFigures([fig({ sourceName: '' })], 'next-big-thing');
    expect(r.errors).toEqual([]);
    expect(r.warnings.some((w) => /Consider adding source/.test(w.message))).toBe(true);
  });

  it('warns on very tall aspect ratios', () => {
    const r = validateFigures([fig({ sourceName: 's', aspectRatio: 3 })], 'next-big-thing');
    expect(r.warnings.some((w) => /Very tall/.test(w.message))).toBe(true);
  });

  it('warns when there are more than 8 figures', () => {
    const many = Array.from({ length: 9 }, () => fig({ sourceName: 's' }));
    const r = validateFigures(many, 'next-big-thing');
    expect(r.warnings.some((w) => /overwhelm/.test(w.message))).toBe(true);
  });

  it('handles an empty figure list', () => {
    const r = validateFigures([], 'green-transition');
    expect(r).toEqual({ figures: [], errors: [], warnings: [] });
  });
});

describe('extractFiguresFromContent', () => {
  const toAttr = (data: object) =>
    JSON.stringify(data).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  it('extracts a figure embedded in HTML', () => {
    const html = `<p>x</p><figure data-figure="${toAttr({ src: 'a.png', altText: 'A' })}"></figure>`;
    const figs = extractFiguresFromContent(html);
    expect(figs).toHaveLength(1);
    expect(figs[0].src).toBe('a.png');
  });

  it('skips figures without a src', () => {
    const html = `<figure data-figure="${toAttr({ altText: 'no src' })}"></figure>`;
    expect(extractFiguresFromContent(html)).toHaveLength(0);
  });

  it('skips malformed JSON without throwing', () => {
    const html = `<figure data-figure="{not json}"></figure>`;
    expect(() => extractFiguresFromContent(html)).not.toThrow();
    expect(extractFiguresFromContent(html)).toHaveLength(0);
  });

  it('countFigures matches the number extracted', () => {
    const html =
      `<figure data-figure="${toAttr({ src: 'a', altText: 'a' })}"></figure>` +
      `<figure data-figure="${toAttr({ src: 'b', altText: 'b' })}"></figure>`;
    expect(countFigures(html)).toBe(2);
  });

  it('returns nothing for content with no figures', () => {
    expect(extractFiguresFromContent('<p>plain</p>')).toEqual([]);
  });
});
