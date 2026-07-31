import { describe, it, expect } from 'vitest';
import { parseImageBlock, serializeImageBlock, ImageBlockData } from '@/components/editorial/ImageBlock';
import { validateImages, countImages } from '@/lib/imageValidation';

describe('parseImageBlock', () => {
  it('parses a bare image', () => {
    expect(parseImageBlock('![Alt text](https://x/i.png)')).toEqual({
      src: 'https://x/i.png',
      alt: 'Alt text',
    });
  });

  it('parses attributes (caption, source, sourceUrl, width=full)', () => {
    const data = parseImageBlock(
      '![A](u){caption="cap",source="NASA",sourceUrl="http://s",width="full"}',
    );
    expect(data).toMatchObject({
      src: 'u',
      alt: 'A',
      caption: 'cap',
      sourceName: 'NASA',
      sourceUrl: 'http://s',
      widthMode: 'full',
    });
  });

  it('returns null for non-image strings', () => {
    expect(parseImageBlock('just text')).toBeNull();
    expect(parseImageBlock('')).toBeNull();
  });

  it('round-trips through serialize → parse', () => {
    const original: ImageBlockData = {
      src: 'https://x/p.png',
      alt: 'Hero',
      caption: 'A caption',
      sourceName: 'Source',
      sourceUrl: 'https://src',
      widthMode: 'full',
    };
    const round = parseImageBlock(serializeImageBlock(original));
    expect(round).toMatchObject(original);
  });

  it('serializes a minimal block without an attribute block', () => {
    expect(serializeImageBlock({ src: 'u', alt: 'a' })).toBe('![a](u)');
  });
});

describe('validateImages', () => {
  it('flags a missing alt text', () => {
    const r = validateImages('![](https://x/i.png)', 'next-big-thing');
    expect(r.errors.some((e) => /Missing alt text/.test(e.message))).toBe(true);
  });

  it('green-transition requires source attribution', () => {
    const r = validateImages('![alt](https://x/i.png)', 'green-transition');
    expect(r.errors.some((e) => /Missing source attribution/.test(e.message))).toBe(true);
  });

  it('green-transition allows an explicit noSource marker', () => {
    const r = validateImages('![alt](https://x/i.png){noSource="true"}', 'green-transition');
    expect(r.errors).toEqual([]);
  });

  it('next-big-thing only warns about missing source', () => {
    const r = validateImages('![alt](https://x/i.png)', 'next-big-thing');
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('countImages counts markdown images', () => {
    const content = '![a](1) text ![b](2){source="s"}';
    expect(countImages(content)).toBe(2);
  });

  it('returns empty results for content without images', () => {
    const r = validateImages('no images here', 'next-big-thing');
    expect(r.images).toEqual([]);
    expect(r.errors).toEqual([]);
  });
});
