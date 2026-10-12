/**
 * The accounting essay import (scripts/accounting-import): markdown with
 * frontmatter → the row the site stores. The fixtures are small inline
 * stand-ins; the batch itself is unpublished prose and is not in the repo.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  applyCorrections,
  docStats,
  docText,
  docToHtml,
  htmlToDoc,
  keyTakeaways,
  linkSlugs,
  markdownStats,
  markdownToHtml,
  normaliseMarkdown,
  normaliseRendered,
  numbersOf,
  parseFrontmatter,
  remapRelated,
  stripHeader,
  type CorrectionManifest,
} from '../../scripts/accounting-import/convert';
import { RETIRED_ESSAY_REDIRECTS } from '@/config/retiredEssaySlugs';

const FILE = `---
title: "Deferred Tax Assets: Deductible Differences"
deck: "The theory of deferred tax assets"
author: "Dika Gustiana"
date: 2026-10-11
fsli_slug: deferred-tax-assets
also_covers: [deferred-tax-liabilities, income-tax-expense-net]
related:
  - inventories-net
  - other-payables
read_time: "16 min read"
status: draft v0.8
---

# Deferred Tax Assets: Deductible Differences

*The theory of deferred tax assets*

**In brief**

- A deferred tax asset exists because the *books* and the return differ.
- It is recognised only to the extent that profit is **probable**.

---

PHE reports 55,781 (PHE FS 2024, PDF p. 11). This page also covers \`deferred-tax-liabilities\`.

## 1. Two measures of profit

**Permanent and temporary.** A *permanent difference* never reverses; see \`inventories-net\`.

> Accounting profit = 110,000 − 30,000 = 80,000
>
> \\+ investor's share = 5,000

| | Year 1 | Year 2 |
|---|---|---|
| Dr Income tax expense | 32,000 | 32,000 |
| Cr Deferred tax liability | 6,000 | 2,400 |

### Least-confident assertions

- The rate history was checked only in secondary sources.

## References

1. PT Pertamina Hulu Energi, consolidated financial statements 31 December 2024 (audited, USD thousand), \`Downloads\\FS PHE 2024.pdf\`: Note 43e. PSAK 211 (IFRS 11) para. 21A.
`;

const MANIFEST: CorrectionManifest = {
  relatedFsliRemap: { 'other-payables': 'trade-payables', 'additional-paid-in-capital': 'share-capital' },
  global: [{ rule: 'C4', find: ', `Downloads\\FS PHE 2024.pdf`', replace: '' }],
  files: {
    '01.md': [{ rule: 'C1', find: 'PSAK 211 (IFRS 11) para. 21A', replace: 'PSAK 111 (IFRS 11) para. 21A', count: 1 }],
  },
};

const PAGES = new Map([
  ['deferred-tax-assets', 'deferred-tax-assets'],
  ['deferred-tax-liabilities', 'deferred-tax-assets'],
  ['inventories-net', 'inventories-net'],
]);
const resolve = (slug: string) => PAGES.get(slug) ?? null;

function convert(text = FILE) {
  const { fm, body } = parseFrontmatter(text);
  const source = stripHeader(body, fm.title as string, fm.deck as string);
  const corrected = applyCorrections('01.md', source, MANIFEST, {});
  const linked = linkSlugs(corrected.text, 'deferred-tax-assets', resolve);
  const doc = htmlToDoc(markdownToHtml(linked.text));
  return { fm, source, corrected, linked, doc, content: docToHtml(doc) };
}

describe('frontmatter', () => {
  it('reads quoted and bare scalars, inline lists and block lists', () => {
    const { fm } = parseFrontmatter(FILE);
    expect(fm.title).toBe('Deferred Tax Assets: Deductible Differences');
    expect(fm.date).toBe('2026-10-11');
    expect(fm.status).toBe('draft v0.8');
    expect(fm.also_covers).toEqual(['deferred-tax-liabilities', 'income-tax-expense-net']);
    expect(fm.related).toEqual(['inventories-net', 'other-payables']);
  });

  it('refuses a body whose heading does not match the frontmatter', () => {
    const { body } = parseFrontmatter(FILE);
    expect(() => stripHeader(body, 'Another title', 'The theory of deferred tax assets')).toThrow();
  });
});

describe('corrections', () => {
  it('applies each entry the expected number of times and records it', () => {
    const { corrected } = convert();
    expect(corrected.text).toContain('PSAK 111 (IFRS 11) para. 21A');
    expect(corrected.text).not.toContain('Downloads');
    expect(corrected.applied.map((a) => `${a.rule} ${a.count}`)).toEqual(['C1 1', 'C4 1']);
  });

  it('refuses an entry that matches a different number of times', () => {
    const twice: CorrectionManifest = { ...MANIFEST, files: { '01.md': [{ rule: 'C1', find: 'PSAK', replace: 'X', count: 1 }] } };
    expect(() => applyCorrections('01.md', 'PSAK 211 and PSAK 212', twice, {})).toThrow(/matched 2 times/);
  });

  it('remaps related_fsli and drops the duplicates the remap creates', () => {
    expect(remapRelated(['share-capital', 'additional-paid-in-capital', 'other-payables'], MANIFEST.relatedFsliRemap))
      .toEqual(['share-capital', 'trade-payables']);
  });

  it('the batch manifest is the brief: PSAK numbering, file references, local paths', () => {
    const manifest = JSON.parse(readFileSync('scripts/accounting-import/corrections.json', 'utf8')) as CorrectionManifest;
    const entries = [...manifest.global, ...Object.values(manifest.files).flat()];
    expect(new Set(entries.map((e) => e.rule))).toEqual(new Set(['C1', 'C3', 'C4']));
    expect(entries.filter((e) => e.rule === 'C1').map((e) => e.replace).join(' ')).not.toMatch(/PSAK 211|PSAK 219 \(formerly PSAK 19/);
    expect(manifest.relatedFsliRemap).toEqual({
      'additional-paid-in-capital': 'share-capital',
      'other-equity-component': 'share-capital',
      'deferred-tax-liabilities': 'deferred-tax-assets',
      'lease-liabilities-non-current': 'right-of-use-assets-net',
      'other-payables': 'trade-payables',
    });
  });
});

describe('slug references', () => {
  it('links a line item to the page that covers it and leaves references to this page as written', () => {
    const { linked } = convert();
    expect(linked.text).toContain('see [inventories-net](/accounting/fsli/inventories-net)');
    expect(linked.text).toContain('This page also covers `deferred-tax-liabilities`.');
    expect(linked.linked).toEqual(['inventories-net']);
    expect(linked.selfRefs).toEqual(['deferred-tax-liabilities']);
  });

  it('leaves a code span that names no line item alone', () => {
    expect(linkSlugs('see `not-a-line-item`', null, resolve).text).toBe('see `not-a-line-item`');
  });
});

describe('conversion', () => {
  it('writes the HTML the editor writes: tables, formula blocks, lists, headings', () => {
    const { content } = convert();
    expect(content).toMatch(/<table style="min-width: \d+px;?"><colgroup>/);
    expect(content).toContain('<th colspan="1" rowspan="1"><p>Year 1</p></th>');
    expect(content).toContain('<blockquote><p>Accounting profit = 110,000 − 30,000 = 80,000</p><p>+ investor\'s share = 5,000</p></blockquote>');
    expect(content).toContain('<ul><li><p>A deferred tax asset exists because the <em>books</em>');
    expect(content).toContain('<p><strong>Permanent and temporary.</strong> A <em>permanent difference</em>');
    expect(content).toContain('<h2>1. Two measures of profit</h2>');
    expect(content).toContain('<h3>Least-confident assertions</h3>');
    expect(content).toContain('<h2>References</h2>');
    expect(content).toContain('href="/accounting/fsli/inventories-net"');
    expect(content).not.toContain('<h1');
  });

  it('round-trips: the stored HTML parses back to the stored document', () => {
    const { doc, content } = convert();
    expect(htmlToDoc(content)).toEqual(doc);
  });

  it('keeps every table and formula block, the text and every number', () => {
    const { linked, doc } = convert();
    const want = markdownStats(linked.text);
    const got = docStats(doc);
    expect(got.tables).toEqual(want.tables);
    expect(got.tables).toEqual([{ rows: 3, cols: 3 }]);
    expect([got.blockquotes, got.quoteParagraphs]).toEqual([want.blockquotes, want.quoteParagraphs]);
    expect(normaliseRendered(docText(doc))).toBe(normaliseMarkdown(linked.text));
    expect(numbersOf(normaliseRendered(docText(doc)))).toEqual(numbersOf(normaliseMarkdown(linked.text)));
  });

  it('takes the key takeaways from "In brief", as plain text', () => {
    const { source } = convert();
    expect(keyTakeaways(source)).toEqual([
      'A deferred tax asset exists because the books and the return differ.',
      'It is recognised only to the extent that profit is probable.',
    ]);
  });
});

describe('retired essay redirects', () => {
  it('send each archived essay to its line item page', () => {
    for (const [slug, to] of Object.entries(RETIRED_ESSAY_REDIRECTS)) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(to).toMatch(/^\/accounting\/fsli\/[a-z0-9-]+$/);
    }
    expect(Object.keys(RETIRED_ESSAY_REDIRECTS)).toHaveLength(13);
  });
});
