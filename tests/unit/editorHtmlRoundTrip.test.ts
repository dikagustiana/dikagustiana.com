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
  list: '<ul><li><p>One</p></li><li><p>Two</p></li></ul>',
  blockquote: '<blockquote><p>Quoted.</p></blockquote>',
  divider: '<p>Before</p><hr><p>After</p>',
  codeBlock: '<pre><code>const x = 1;</code></pre>',
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
});
