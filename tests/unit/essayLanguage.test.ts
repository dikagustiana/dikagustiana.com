/**
 * Essay language rules (src/lib/essayLanguage.ts): which of an essay's four
 * possible bodies a reader sees for a requested language and view, and which
 * header fields go with it. docs/prd/essay-language/02-BACA.md §B3.
 */

import { describe, it, expect } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import {
  availableLanguages,
  essayCells,
  localizeShellFields,
  parseLanguageParam,
  resolveSelection,
  translationBody,
  viewsFor,
  withLanguageParam,
  type EssayTranslation,
} from '@/lib/essayLanguage';

const doc = (...paragraphs: string[]): JSONContent => ({
  type: 'doc',
  content: paragraphs.map((text) => ({
    type: 'paragraph',
    content: text ? [{ type: 'text', text }] : [],
  })),
});

const tr = (over: Partial<EssayTranslation> = {}): EssayTranslation => ({
  essay_id: 'e1',
  locale: 'id',
  title: 'Judul',
  snippet: null,
  content_json: doc('Isi panjang.'),
  brief_json: doc('Isi ringkas.'),
  presentation: null,
  read_time: null,
  published: true,
  ...over,
});

describe('parseLanguageParam', () => {
  it.each([
    ['id', 'id'],
    ['ID', 'id'],
    [' id ', 'id'],
    ['en', 'en'],
    ['', 'en'],
    [null, 'en'],
    [undefined, 'en'],
    ['fr', 'en'],
    ['indonesia', 'en'],
  ])('%s → %s', (input, want) => {
    expect(parseLanguageParam(input as string | null | undefined)).toBe(want);
  });
});

describe('essayCells', () => {
  it('English only when there is no translation', () => {
    expect(essayCells({ hasBrief: false }, null)).toEqual({ en: { full: true, brief: false }, id: null });
  });

  it('a draft translation does not count', () => {
    expect(essayCells({ hasBrief: true }, tr({ published: false })).id).toBeNull();
  });

  it('a translation with only a title does not count', () => {
    expect(essayCells({ hasBrief: true }, tr({ content_json: null, brief_json: null })).id).toBeNull();
  });

  it('empty documents count as absent', () => {
    const cells = essayCells({ hasBrief: false }, tr({ content_json: doc(''), brief_json: doc('', '') }));
    expect(cells.id).toBeNull();
  });

  it('a Brief-only translation is a version', () => {
    expect(essayCells({ hasBrief: false }, tr({ content_json: null })).id).toEqual({ full: false, brief: true });
  });

  it('another locale is ignored', () => {
    expect(essayCells({ hasBrief: false }, tr({ locale: 'fr' })).id).toBeNull();
  });
});

describe('resolveSelection — every combination', () => {
  // en brief × id full × id brief = 8 combinations, each asked for all four selections.
  const combos = [false, true].flatMap((enBrief) =>
    [false, true].flatMap((idFull) => [false, true].map((idBrief) => ({ enBrief, idFull, idBrief }))),
  );

  for (const { enBrief, idFull, idBrief } of combos) {
    const translation =
      idFull || idBrief
        ? tr({ content_json: idFull ? doc('Panjang.') : null, brief_json: idBrief ? doc('Ringkas.') : null })
        : null;
    const cells = essayCells({ hasBrief: enBrief }, translation);
    const label = `en.brief=${enBrief} id.full=${idFull} id.brief=${idBrief}`;

    it(`${label}: the result always names a cell that exists`, () => {
      for (const language of ['en', 'id'] as const) {
        for (const view of ['full', 'brief'] as const) {
          const got = resolveSelection(cells, { language, view });
          expect(viewsFor(cells, got.language)).toContain(got.view);
          if (language === 'id' && !cells.id) expect(got.language).toBe('en');
          if (viewsFor(cells, got.language).includes(view) && got.language === language) {
            expect(got.view).toBe(view);
          }
        }
      }
    });
  }

  it('id + full on a Brief-only translation → id + brief', () => {
    const cells = essayCells({ hasBrief: true }, tr({ content_json: null }));
    expect(resolveSelection(cells, { language: 'id', view: 'full' })).toEqual({ language: 'id', view: 'brief' });
  });

  it('back to en from id + brief when English has no Brief → en + full', () => {
    const cells = essayCells({ hasBrief: false }, tr());
    expect(resolveSelection(cells, { language: 'en', view: 'brief' })).toEqual({ language: 'en', view: 'full' });
  });

  it('id requested with no translation → en, view kept when English has it', () => {
    const cells = essayCells({ hasBrief: true }, null);
    expect(resolveSelection(cells, { language: 'id', view: 'brief' })).toEqual({ language: 'en', view: 'brief' });
  });
});

describe('availableLanguages / viewsFor', () => {
  it('lists Indonesian only when it exists', () => {
    expect(availableLanguages(essayCells({ hasBrief: false }, null))).toEqual(['en']);
    expect(availableLanguages(essayCells({ hasBrief: false }, tr()))).toEqual(['en', 'id']);
  });

  it('Full first, and nothing for a missing language', () => {
    const cells = essayCells({ hasBrief: true }, null);
    expect(viewsFor(cells, 'en')).toEqual(['full', 'brief']);
    expect(viewsFor(cells, 'id')).toEqual([]);
  });
});

describe('localizeShellFields', () => {
  const english = {
    title: 'Title',
    seoTitle: 'Title',
    seoDescription: 'English description',
    deck: 'English deck',
    keyTakeaways: ['One', 'Two'],
    heroCaption: 'English caption',
    revisionNote: 'English note',
    readTime: '12 min read',
  };

  it('English is returned unchanged', () => {
    expect(localizeShellFields(english, tr(), 'en')).toBe(english);
  });

  it('Indonesian title always; blanks fall back to English', () => {
    const got = localizeShellFields(english, tr({ presentation: { deck: '  ' } }), 'id');
    expect(got.title).toBe('Judul');
    expect(got.seoTitle).toBe('Judul');
    expect(got.deck).toBe('English deck');
    expect(got.heroCaption).toBe('English caption');
    expect(got.revisionNote).toBe('English note');
    expect(got.readTime).toBe('12 min read');
  });

  it('untranslated key takeaways are hidden, not shown in English', () => {
    expect(localizeShellFields(english, tr(), 'id').keyTakeaways).toBeUndefined();
    expect(localizeShellFields(english, tr({ presentation: { key_takeaways: ['', ' '] } }), 'id').keyTakeaways).toBeUndefined();
  });

  it('translated fields win', () => {
    const got = localizeShellFields(
      english,
      tr({
        snippet: 'Ringkasan',
        read_time: '9 menit',
        presentation: { deck: 'Dek', key_takeaways: ['Satu'], hero_caption: 'Keterangan', revision_note: 'Catatan' },
      }),
      'id',
    );
    expect(got).toMatchObject({
      deck: 'Dek',
      seoDescription: 'Ringkasan',
      keyTakeaways: ['Satu'],
      heroCaption: 'Keterangan',
      revisionNote: 'Catatan',
      readTime: '9 menit',
    });
  });

  it('the snippet stands in for a missing deck', () => {
    expect(localizeShellFields(english, tr({ snippet: 'Ringkasan' }), 'id').deck).toBe('Ringkasan');
  });
});

describe('translationBody', () => {
  it('returns the chosen body as a JSON string', () => {
    expect(JSON.parse(translationBody(tr(), 'full')!)).toEqual(doc('Isi panjang.'));
    expect(JSON.parse(translationBody(tr(), 'brief')!)).toEqual(doc('Isi ringkas.'));
  });

  it('null for an absent or empty body', () => {
    expect(translationBody(null, 'full')).toBeNull();
    expect(translationBody(tr({ content_json: doc('') }), 'full')).toBeNull();
  });
});

describe('withLanguageParam', () => {
  it('sets and removes lang, keeping other parameters', () => {
    expect(withLanguageParam('', 'id')).toBe('?lang=id');
    expect(withLanguageParam('?theme=growth', 'id')).toBe('?theme=growth&lang=id');
    expect(withLanguageParam('?lang=id&theme=growth', 'en')).toBe('?theme=growth');
    expect(withLanguageParam('?lang=id', 'en')).toBe('');
  });
});
