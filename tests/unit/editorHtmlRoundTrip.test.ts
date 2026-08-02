/**
 * HTML round-trip stability for every block the insert menu can produce.
 *
 * This is the fifth hazard in the content contract, and it is invisible to
 * typecheck, build and every other test. `EssayEditor` mirrors the document
 * into React state as HTML and pushes external changes back in with
 * `setContent`. If a node's `renderHTML` output does not survive being parsed
 * and re-serialised byte-for-byte, that mirror never settles: the editor keeps
 * re-parsing its own output, `content` advances and `content_json` freezes, and
 * the row ends up holding two documents that disagree.
 *
 * It is not hypothetical — `linkCard` shipped with `JSON.stringify(...).replace(/"/g, '&quot;')`
 * in an attribute value that the DOM serialiser escapes again, so every save
 * round-tripped to `&amp;quot;` and the JSON column stopped updating at the
 * block before it.
 */

import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import { getSchemaExtensions } from '@/lib/tiptap/extensions';

function editorWith(html: string): Editor {
  return new Editor({
    extensions: getSchemaExtensions(),
    content: html,
  });
}

/** Parse the HTML and serialise it again; a stable node returns itself. */
function roundTrip(html: string): string {
  const editor = editorWith(html);
  const out = editor.getHTML();
  editor.destroy();
  return out;
}

const CASES: Record<string, string> = {
  paragraph: '<p>Ordinary text with <strong>bold</strong> and a <a href="https://example.com">link</a>.</p>',
  heading: '<h2>A heading</h2><h3>A subheading</h3>',
  headingAllLevels: '<h1>One</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4><h5>Five</h5><h6>Six</h6>',
  list: '<ul><li><p>One</p></li><li><p>Two</p></li></ul>',
  blockquote: '<blockquote><p>Quoted.</p></blockquote>',
  pullQuote: '<blockquote data-variant="pull"><p>Pulled.</p></blockquote>',
  callout: '<div data-type="callout"><p>An aside worth a box.</p></div>',
  divider: '<p>Before</p><hr><p>After</p>',
  codeBlock: '<pre><code>const x = 1;</code></pre>',
  superSub: '<p>x<sup>2</sup> and H<sub>2</sub>O</p>',
  inlineCode: '<p>Mixing <code>WACC</code> into prose.</p>',
  table:
    '<table><tbody><tr><th colspan="1" rowspan="1"><p>H</p></th></tr>' +
    '<tr><td colspan="1" rowspan="1"><p>C</p></td></tr></tbody></table>',
};

describe('editor HTML round-trip', () => {
  for (const [name, html] of Object.entries(CASES)) {
    it(`${name} survives a parse/serialise round trip`, () => {
      const once = roundTrip(html);
      const twice = roundTrip(once);
      expect(twice).toBe(once);
    });
  }

  it('linkCard survives a parse/serialise round trip', () => {
    const editor = new Editor({ extensions: getSchemaExtensions(), content: '<p></p>' });
    editor.commands.insertLinkCard({
      url: 'https://www.bis.org/publ/qtrpdf/r_qt2403.htm?a=1&b=2',
      title: 'A title with "quotes" & an ampersand',
      description: 'One line.',
    });
    const once = editor.getHTML();
    editor.destroy();

    const twice = roundTrip(once);
    expect(twice).toBe(once);

    // …and the attributes still read back as the values that went in.
    const reparsed = editorWith(once);
    const node = reparsed.getJSON().content?.find(n => n.type === 'linkCard');
    reparsed.destroy();
    expect(node?.attrs?.url).toBe('https://www.bis.org/publ/qtrpdf/r_qt2403.htm?a=1&b=2');
    expect(node?.attrs?.title).toBe('A title with "quotes" & an ampersand');
  });

  it('figure survives a parse/serialise round trip', () => {
    const editor = new Editor({ extensions: getSchemaExtensions(), content: '<p></p>' });
    editor.commands.insertFigure({
      src: 'https://example.com/i.png',
      altText: 'Alt text',
      caption: 'A caption with "quotes" & an ampersand',
      widthMode: 'content',
      kind: 'image',
      noSource: true,
    });
    const once = editor.getHTML();
    editor.destroy();

    expect(roundTrip(once)).toBe(once);
  });

  // ── The Substack-toolbar additions. Each new node/mark is the fifth place
  //    of the content contract for itself: parse(render(x)) must be
  //    byte-stable or `content` advances while `content_json` freezes. ──

  it('text colour and highlight (one textStyle span) survive a round trip', () => {
    const editor = editorWith('<p>Plain</p>');
    editor.chain().setContent('<p>coloured</p>').selectAll().setColor('#980000').run();
    editor.chain().selectAll().setBackgroundColor('#ffff00').run();
    const once = editor.getHTML();
    editor.destroy();

    const twice = roundTrip(once);
    expect(twice).toBe(once);

    // …and both attrs read back on the SAME mark.
    const reparsed = editorWith(once);
    const textNode = reparsed.getJSON().content?.[0]?.content?.[0];
    reparsed.destroy();
    const textStyle = (textNode?.marks ?? []).find(m => m.type === 'textStyle');
    expect(textStyle?.attrs?.color).toBeTruthy();
    expect(textStyle?.attrs?.backgroundColor).toBeTruthy();
  });

  it('alignment on paragraph and heading survives a round trip', () => {
    for (const html of [
      '<p style="text-align: center">Centred</p>',
      '<h2 style="text-align: right">Right heading</h2>',
    ]) {
      const once = roundTrip(html);
      expect(roundTrip(once)).toBe(once);
      expect(once).toContain('text-align');
    }
  });

  it('inline and block math survive a round trip with hostile LaTeX', () => {
    const editor = editorWith('<p></p>');
    editor.commands.insertBlockMath({ latex: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} & "quoted" < 1' });
    const once = editor.getHTML();
    editor.destroy();

    const twice = roundTrip(once);
    expect(twice).toBe(once);

    const reparsed = editorWith(once);
    const node = reparsed.getJSON().content?.find(n => n.type === 'blockMath');
    reparsed.destroy();
    expect(node?.attrs?.latex).toBe('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} & "quoted" < 1');

    const inlineOnce = roundTrip('<p>Where <span data-type="inline-math" data-latex="\\beta &gt; 1"></span> holds.</p>');
    expect(roundTrip(inlineOnce)).toBe(inlineOnce);
  });

  it('footnote survives a round trip and keeps its note text', () => {
    const editor = editorWith('<p>Claim.</p>');
    editor.commands.insertFootnote({ text: 'See BIS Quarterly, "Q1 2024" & annexes <3' });
    const once = editor.getHTML();
    editor.destroy();

    const twice = roundTrip(once);
    expect(twice).toBe(once);

    const reparsed = editorWith(once);
    let noteText: string | undefined;
    reparsed.state.doc.descendants(n => {
      if (n.type.name === 'footnote') noteText = String(n.attrs.text);
    });
    reparsed.destroy();
    expect(noteText).toBe('See BIS Quarterly, "Q1 2024" & annexes <3');
  });
});
