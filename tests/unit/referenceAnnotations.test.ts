/**
 * docs/prd/2026-10-fia-fixes item 10: the reference annotations a reader does
 * not see. The five references are those of "The objective function of the
 * firm" (section finance) as stored on 2026-10-24.
 */
import { describe, expect, it } from 'vitest';
import { citedIndexes, publicReferences, publicReferencesHtml, stripAnnotations } from '@/lib/editorial/referenceAnnotations';

const DAMODARAN =
  'Damodaran, A., <em>Applied Corporate Finance</em>, 4th ed., Wiley (© 2015), Chapters 1–2. VERIFIED: every quotation was checked against the PDF on disk, pages as printed. The framework specifies the 5th edition; MISNUMBERED, since the 4th edition is the latest in use.';
const BREALEY =
  'Brealey, Myers, Allen and Edmans, <em>Principles of Corporate Finance</em>, 14th ed., Chapter 1. UNAVAILABLE: the 13th-edition file on disk is damaged. Not quoted.';
const JENSEN =
  'Jensen, M. C. (2001), "Value Maximisation, Stakeholder Theory, and the Corporate Objective Function," <em>European Financial Management</em> 7(3), 297–317; also in <em>Journal of Applied Corporate Finance</em> 14(3). VERIFIED: abstract quotation checked against the <a href="https://eu.vlex.com/vid/value-maximisation-stakeholder-theory-856399780">vLex record</a>.';
const HART =
  'Hart, O. and Zingales, L. (2017), "Companies Should Maximize Shareholder Welfare Not Market Value," <em>Journal of Law, Finance, and Accounting</em> 2(2), 247–274. VERIFIED: quotations and pages from the <a href="https://www.ecgi.global/sites/default/files/working_papers/documents/5212017_0.pdf">ECGI working-paper version</a>, No. 521/2017; page numbers may differ in the journal version.';
const JOHNSON =
  'Johnson, S., La Porta, R., Lopez-de-Silanes, F. and Shleifer, A. (2000), "Tunneling," <em>American Economic Review</em> 90(2), 22–27. VERIFIED: quotations from the <a href="https://www.nber.org/papers/w7523.pdf">NBER Working Paper 7523</a> version; page numbers may differ in the AER version.';

const body = (cites = '') =>
  `<p>Hart and Zingales, a cited source, are less confident.${cites}</p><h2>References</h2><ol>${[DAMODARAN, BREALEY, JENSEN, HART, JOHNSON].map((r) => `<li><p>${r}</p></li>`).join('')}</ol>`;

const items = (html: string) => {
  const d = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(d.querySelectorAll('ol > li')).map((li) => ({ text: li.textContent ?? '', html: li.innerHTML }));
};

describe('the five references, as a reader sees them', () => {
  const out = items(publicReferencesHtml(body()));

  it('drops every annotated sentence and keeps the citation, its italics with it', () => {
    expect(out.map((i) => i.text)).toEqual([
      'Damodaran, A., Applied Corporate Finance, 4th ed., Wiley (© 2015), Chapters 1–2.',
      'Jensen, M. C. (2001), "Value Maximisation, Stakeholder Theory, and the Corporate Objective Function," European Financial Management 7(3), 297–317; also in Journal of Applied Corporate Finance 14(3).',
      'Hart, O. and Zingales, L. (2017), "Companies Should Maximize Shareholder Welfare Not Market Value," Journal of Law, Finance, and Accounting 2(2), 247–274.',
      'Johnson, S., La Porta, R., Lopez-de-Silanes, F. and Shleifer, A. (2000), "Tunneling," American Economic Review 90(2), 22–27.',
    ]);
    expect(out[0].html).toContain('<em>Applied Corporate Finance</em>');
    for (const i of out) expect(i.text).not.toMatch(/VERIFIED|UNVERIFIED|UNAVAILABLE|MISNUMBERED|on disk/);
  });

  it('drops Brealey, UNAVAILABLE and not cited in the body', () => {
    expect(out.some((i) => i.text.startsWith('Brealey'))).toBe(false);
  });

  it('keeps an UNAVAILABLE reference the body cites, without its note', () => {
    const cited = items(publicReferencesHtml(body(' As [2] notes.')));
    // Only the marked sentence goes; "Not quoted." carries no marker and stays.
    expect(cited[1].text).toBe('Brealey, Myers, Allen and Edmans, Principles of Corporate Finance, 14th ed., Chapter 1. Not quoted.');
  });

  it('leaves the body itself alone, and a body without annotations exactly as it was', () => {
    expect(publicReferencesHtml(body())).toContain('<p>Hart and Zingales, a cited source, are less confident.</p>');
    const plain = '<p>Text.</p><h2>References</h2><ol><li><p>Tirole, J., The Theory of Corporate Finance.</p></li></ol>';
    expect(publicReferencesHtml(plain)).toBe(plain);
    expect(publicReferencesHtml('{"type":"doc"}')).toBe('{"type":"doc"}');
  });
});

describe('plain-string references (presentation.references)', () => {
  it('strips a parenthesis, a sentence and a "NOT VERIFIED" whole, and drops what is only a note', () => {
    expect(stripAnnotations('Hillier, Grinblatt and Titman, second European edition, Chapter 12 (MISNUMBERED: framework specifies third European edition)')).toBe(
      'Hillier, Grinblatt and Titman, second European edition, Chapter 12',
    );
    expect(stripAnnotations('Beta from the fact sheet. NOT VERIFIED against Damodaran Online; via the fact sheet.')).toBe('Beta from the fact sheet.');
    expect(stripAnnotations('Damodaran and Brealey were UNAVAILABLE and are not used.')).toBe('');
    expect(
      publicReferences(['A. Book (MISNUMBERED: wrong edition)', "Tirole's no-direct-anchor claim was VERIFIED and is not cited.", { label: 'B. Paper. UNAVAILABLE: damaged.', url: 'https://x.test' }], new Set()),
    ).toEqual(['A. Book']);
  });

  it('reads citations as [n], [n, m] and #ref-n links', () => {
    expect([...citedIndexes('as [2] and [4, 5] say; see <a href="#ref-7">')].sort()).toEqual([2, 4, 5, 7]);
  });
});
