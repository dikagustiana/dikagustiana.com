/**
 * The shelf's pure parts (src/lib/spines.ts; docs/prd/library-phase-2 §3, §4 Tests): the spine metric clamps,
 * the shelf's colours, packing onto planks, and the three sorts.
 */
import { describe, expect, it } from 'vitest';
import {
  SPINE_COLOR_SHAPE,
  SPINE_MAX_H,
  SPINE_MAX_W,
  SPINE_MIN_H,
  SPINE_MIN_W,
  groupBooks,
  packPlanks,
  parseSort,
  spineColor,
  spineHeight,
  spineInk,
  spineWidth,
  surname,
} from '@/lib/spines';
import { withSpines, type Book } from '@/hooks/queries/useBooks';

describe('spine metrics', () => {
  it('holds the height to 160–240 px by page count, mid-height without one', () => {
    expect(spineHeight(1)).toBe(SPINE_MIN_H);
    expect(spineHeight(60)).toBe(SPINE_MIN_H);
    expect(spineHeight(600)).toBe(SPINE_MAX_H);
    expect(spineHeight(5000)).toBe(SPINE_MAX_H);
    expect(spineHeight(330)).toBe(200);
    expect(spineHeight(null)).toBe(200);
    expect(spineHeight(0)).toBe(200);
    expect(spineHeight(Number.NaN)).toBe(200);
    expect(spineHeight(100)).toBeLessThan(spineHeight(200));
  });

  it('holds the thickness to 28–56 px by file size, middling without a file', () => {
    expect(spineWidth(1)).toBe(SPINE_MIN_W);
    expect(spineWidth(100 * 1024)).toBe(SPINE_MIN_W);
    expect(spineWidth(50 * 1024 * 1024)).toBe(SPINE_MAX_W);
    expect(spineWidth(2 ** 40)).toBe(SPINE_MAX_W);
    expect(spineWidth(null)).toBe(42);
    const mid = spineWidth(344_379);
    expect(mid).toBeGreaterThan(SPINE_MIN_W);
    expect(mid).toBeLessThan(SPINE_MAX_W);
  });

  it('colours a shelf in one hue family, varied by book, the same every time', () => {
    const a = spineColor(0, 'book-a');
    expect(a).toMatch(SPINE_COLOR_SHAPE);
    expect(spineColor(0, 'book-a')).toBe(a);
    expect(spineColor(12, 'book-a')).toBe(a);
    // Another shelf, another family.
    expect(spineColor(1, 'book-a')).not.toBe(a);
    const shelf = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => spineColor(3, id));
    expect(new Set(shelf).size).toBeGreaterThan(1);
    expect(spineInk('#f4ecda')).toBe('#1f1b16');
    expect(spineInk('#2f3e5c')).toBe('#f6efe2');
  });

  it('packs spines onto planks left to right, a new plank when one is full', () => {
    expect(packPlanks([40, 40, 40], 128, 4)).toEqual([[0, 1, 2]]);
    expect(packPlanks([40, 40, 40], 127, 4)).toEqual([[0, 1], [2]]);
    expect(packPlanks([200, 10], 100, 4)).toEqual([[0], [1]]);
    expect(packPlanks([], 100)).toEqual([]);
    const many = packPlanks(Array.from({ length: 200 }, () => 42), 1000);
    expect(many.flat()).toHaveLength(200);
    expect(many.every((p) => p.length * 42 + (p.length - 1) * 4 <= 1000)).toBe(true);
  });
});

describe('the sorts', () => {
  const b = (id: string, title: string, author: string | null, year: number | null) => ({ id, slug: id, title, author, year });
  const shelves = [
    { slug: 'history', name: 'History', books: [b('1', 'Madilog', 'Tan Malaka', 1943), b('2', 'Untitled', null, null)] },
    { slug: 'finance', name: 'Finance', books: [b('3', 'Valuation', 'Aswath Damodaran', 2012), b('4', 'Naar de Republiek', 'Tan Malaka', 1925), b('5', 'Zakat', 'Émile Ávila', 1999)] },
  ];

  it('defaults to the shelves, as they come', () => {
    expect(parseSort(null)).toBe('shelf');
    expect(parseSort('colour')).toBe('shelf');
    expect(groupBooks(shelves, 'shelf').map((g) => [g.label, g.books.map((x) => x.id)])).toEqual([
      ['History', ['1', '2']],
      ['Finance', ['3', '4', '5']],
    ]);
  });

  it('files by decade, oldest first, undated last', () => {
    expect(groupBooks(shelves, 'year').map((g) => [g.label, g.books.map((x) => x.id)])).toEqual([
      ['1920s', ['4']],
      ['1940s', ['1']],
      ['1990s', ['5']],
      ['2010s', ['3']],
      ['Undated', ['2']],
    ]);
  });

  it("files by the surname's initial, accents folded, unknown authors last", () => {
    expect(surname('Tan Malaka')).toBe('Malaka');
    expect(surname('A. Damodaran; B. Writer')).toBe('Damodaran');
    expect(surname(null)).toBe('');
    expect(groupBooks(shelves, 'author').map((g) => [g.label, g.books.map((x) => x.id)])).toEqual([
      ['A', ['5']],
      ['D', ['3']],
      ['M', ['1', '4']],
      ['Unknown author', ['2']],
    ]);
  });
});

describe('spines on the shelf data', () => {
  it('keeps a stored colour, and computes the same one from the shelf order without', () => {
    const base = { slug: 'x', title: 'X', author: null, year: null, access: 'free', size_bytes: 344_379 } as Book;
    const shelves = [{ id: 's2', slug: 'b', name: 'B', sort_order: 1 }, { id: 's1', slug: 'a', name: 'A', sort_order: 0 }];
    const out = withSpines(
      [{ ...shelves[0], books: [{ ...base, id: 'k1', shelf_id: 's2', page_count: 600, spine_color: '#123456' } as Book, { ...base, id: 'k2', shelf_id: 's2' } as Book] }],
      shelves,
    );
    const [stored, computed] = out[0].books;
    expect(stored.spine).toMatchObject({ color: '#123456', h: SPINE_MAX_H });
    // Shelf "b" is second in shelf order.
    expect(computed.spine.color).toBe(spineColor(1, 'k2'));
    expect(computed.spine.h).toBe(200);
    expect(computed.page_count).toBeNull();
  });
});
