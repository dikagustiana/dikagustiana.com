import { describe, it, expect } from 'vitest';
import { canPublishTranslation, presentationFromForm, translationFormFromRow } from '@/lib/translationForm';

describe('translationFormFromRow', () => {
  it('an absent row is an empty form', () => {
    expect(translationFormFromRow(null)).toEqual({
      title: '', snippet: '', deck: '', keyTakeaways: '', heroCaption: '', revisionNote: '', readTime: '',
    });
  });

  it('reads presentation and joins takeaways one per line', () => {
    const f = translationFormFromRow({
      title: 'Judul',
      snippet: 'Ringkas',
      read_time: '9 menit',
      presentation: { deck: 'Dek', key_takeaways: ['Satu', 'Dua'], hero_caption: 'Ket', revision_note: 'Cat' },
    });
    expect(f).toEqual({
      title: 'Judul', snippet: 'Ringkas', deck: 'Dek', keyTakeaways: 'Satu\nDua', heroCaption: 'Ket', revisionNote: 'Cat', readTime: '9 menit',
    });
  });

  it('survives a malformed presentation', () => {
    expect(translationFormFromRow({ title: 'x', presentation: ['nope'] }).deck).toBe('');
  });
});

describe('presentationFromForm', () => {
  const empty = translationFormFromRow(null);

  it('nothing set → null, not {}', () => {
    expect(presentationFromForm({ ...empty, deck: '  ', keyTakeaways: '\n \n' })).toBeNull();
  });

  it('keeps only filled keys, trims, splits takeaways on lines', () => {
    expect(presentationFromForm({ ...empty, deck: ' Dek ', keyTakeaways: 'Satu\r\n\n Dua ' })).toEqual({
      deck: 'Dek',
      key_takeaways: ['Satu', 'Dua'],
    });
  });

  it('round-trips through the row form', () => {
    const p = { deck: 'Dek', key_takeaways: ['Satu', 'Dua'], hero_caption: 'Ket', revision_note: 'Cat' };
    expect(presentationFromForm(translationFormFromRow({ title: 't', presentation: p }))).toEqual(p);
  });
});

describe('canPublishTranslation', () => {
  const ok = { saved: true, title: 'Judul', hasFull: true, hasBrief: false };
  it('saved, titled, with a body → ok', () => expect(canPublishTranslation(ok).ok).toBe(true));
  it('a Brief-only version may go live', () => expect(canPublishTranslation({ ...ok, hasFull: false, hasBrief: true }).ok).toBe(true));
  it('unsaved changes block it', () => expect(canPublishTranslation({ ...ok, saved: false }).ok).toBe(false));
  it('no title blocks it', () => expect(canPublishTranslation({ ...ok, title: ' ' }).ok).toBe(false));
  it('no body blocks it', () => expect(canPublishTranslation({ ...ok, hasFull: false }).ok).toBe(false));
});
