/**
 * Paste from Word — the owner's actual workflow.
 *
 * The fixture is the shape Word 365 puts on the clipboard: an Office namespace
 * declaration, `MsoNormal` paragraphs with inline `mso-*` styles, downlevel
 * conditional blocks, `<o:p>` filler, `<b>`/`<i>` rather than
 * `<strong>`/`<em>`, an `<h1>` (a level the body schema does not have, because
 * `h1` is the essay title), and fake lists — ordinary paragraphs carrying
 * `mso-list` with the bullet or number as literal text.
 *
 * The ordering bug this guards against: attribute stripping used to run before
 * list detection, so by the time anything looked for `mso-list` or
 * `MsoListParagraph` those attributes were gone. Every test passed, the paste
 * "worked", and a Word list arrived as flat paragraphs each starting with a
 * stray "·".
 */

import { describe, it, expect } from 'vitest';
import { isWordHtml, normalizeWordHtml, transformPastedHTML } from '@/lib/tiptap/pasteFromWord';

const WORD = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta name=Generator content="Microsoft Word 15 (filtered)">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings/></xml><![endif]-->
<style><!-- p.MsoNormal { margin:0cm; font-size:11.0pt; } --></style></head>
<body lang=EN-GB style='word-wrap:break-word'><div class=WordSection1>
<h1 style='mso-outline-level:1'><span style='font-size:16.0pt;color:#2F5496'>Document title<o:p></o:p></span></h1>
<h2 style='mso-outline-level:2'><span style='color:#2F5496'>A section<o:p></o:p></span></h2>
<h3 style='mso-outline-level:3'><span>A sub-section<o:p></o:p></span></h3>
<p class=MsoNormal style='line-height:107%'><span style='font-family:"Calibri",sans-serif'>Ordinary text with <b style='mso-bidi-font-weight:normal'>bold</b>, <i>italic</i>, and <a href="https://example.com/source"><span style='color:#0563C1'>a link</span></a>.<o:p></o:p></span></p>
<p class=MsoNormal><o:p>&nbsp;</o:p></p>
<p class=MsoListParagraphCxSpFirst style='margin-left:36.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol'><span style='mso-list:Ignore'>&middot;<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]><span>First bullet<o:p></o:p></span></p>
<p class=MsoListParagraphCxSpLast style='margin-left:36.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol'><span style='mso-list:Ignore'>&middot;<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]><span>Second bullet<o:p></o:p></span></p>
<p class=MsoNormal><span>A paragraph between the lists.<o:p></o:p></span></p>
<p class=MsoListParagraphCxSpFirst style='margin-left:36.0pt;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-list:Ignore'>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp; </span></span><![endif]><span>First step<o:p></o:p></span></p>
<p class=MsoListParagraphCxSpLast style='margin-left:36.0pt;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-list:Ignore'>2.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp; </span></span><![endif]><span>Second step<o:p></o:p></span></p>
</div></body></html>`;

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('paste from Word', () => {
  it('recognises Word clipboard HTML', () => {
    expect(isWordHtml(WORD)).toBe(true);
    expect(isWordHtml('<p>An ordinary paste from a browser.</p>')).toBe(false);
  });

  it('leaves non-Word HTML exactly as it was', () => {
    const plain = '<p>Copied from another tab, <strong>with</strong> marks.</p>';
    expect(transformPastedHTML(plain)).toBe(plain);
  });

  const doc = () => parse(normalizeWordHtml(WORD));

  it('maps Word heading levels into the two the schema allows', () => {
    const d = doc();
    // Word's H1 is the document title; the body's top level is h2.
    expect(d.querySelectorAll('h1')).toHaveLength(0);
    expect([...d.querySelectorAll('h2')].map(h => h.textContent)).toEqual([
      'Document title',
      'A section',
    ]);
    expect([...d.querySelectorAll('h3')].map(h => h.textContent)).toEqual(['A sub-section']);
  });

  it('turns fake lists into real ones and removes the literal marker', () => {
    const d = doc();
    const ul = d.querySelector('ul');
    const ol = d.querySelector('ol');
    expect(ul, 'bulleted list missing').not.toBeNull();
    expect(ol, 'numbered list missing').not.toBeNull();
    expect([...ul!.querySelectorAll('li')].map(li => li.textContent!.trim()))
      .toEqual(['First bullet', 'Second bullet']);
    expect([...ol!.querySelectorAll('li')].map(li => li.textContent!.trim()))
      .toEqual(['First step', 'Second step']);
    // No stray bullet or number left in the text.
    expect(d.body.textContent).not.toMatch(/[·•]/);
    expect(d.body.textContent).not.toMatch(/\b1\.\s+First step/);
  });

  it('does not merge a bulleted list into the numbered one that follows it', () => {
    const d = doc();
    expect(d.querySelectorAll('ul')).toHaveLength(1);
    expect(d.querySelectorAll('ol')).toHaveLength(1);
    expect(d.querySelectorAll('ul li')).toHaveLength(2);
    expect(d.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('keeps bold, italic and links, as the tags the schema parses', () => {
    const d = doc();
    expect(d.querySelector('strong')?.textContent).toBe('bold');
    expect(d.querySelector('em')?.textContent).toBe('italic');
    const a = d.querySelector('a[href]');
    expect(a?.getAttribute('href')).toBe('https://example.com/source');
    expect(a?.textContent).toBe('a link');
  });

  it('strips Office noise', () => {
    const html = normalizeWordHtml(WORD);
    expect(html).not.toMatch(/mso-/i);
    expect(html).not.toMatch(/class="?Mso/i);
    expect(html).not.toMatch(/<o:p/i);
    expect(html).not.toMatch(/style=/i);
    expect(html).not.toMatch(/data-w-(list|heading)/);
  });

  it('drops Word spacer paragraphs but no real ones', () => {
    const d = doc();
    const paragraphs = [...d.querySelectorAll('p')].map(p => p.textContent!.trim());
    expect(paragraphs).toEqual([
      'Ordinary text with bold, italic, and a link.',
      'A paragraph between the lists.',
    ]);
  });

  it('survives malformed input without costing the author the paste', () => {
    const broken = '<p class=MsoNormal>unclosed <span style="mso-x">text';
    expect(() => transformPastedHTML(broken)).not.toThrow();
    expect(transformPastedHTML(broken)).toContain('unclosed');
  });
});
