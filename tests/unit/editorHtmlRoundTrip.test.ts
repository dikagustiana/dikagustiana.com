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
import { getSchemaExtensions, getBriefExtensions } from '@/lib/tiptap/extensions';

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

function briefEditorWith(html: string): Editor {
  return new Editor({
    extensions: getBriefExtensions(),
    content: html,
  });
}

/** Same round trip, through the Brief's restricted schema. */
function briefRoundTrip(html: string): string {
  const editor = briefEditorWith(html);
  const out = editor.getHTML();
  editor.destroy();
  return out;
}

/** Every node type present in a document, for restriction assertions. */
function nodeTypes(doc: { type?: string; content?: unknown[] } | undefined): Set<string> {
  const seen = new Set<string>();
  const walk = (node: { type?: string; content?: unknown[] } | undefined) => {
    if (!node) return;
    if (node.type) seen.add(node.type);
    for (const child of (node.content ?? []) as { type?: string; content?: unknown[] }[]) {
      walk(child);
    }
  };
  walk(doc);
  return seen;
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

// ── The Brief companion's restricted schema. Its round-trip stability
//    matters for the same reason the long schema's does; its RESTRICTION
//    matters more — a forbidden block that survives paste would defeat the
//    form constraint (flowing prose only) at the schema level, where no UI
//    check could catch it. These are the unit form of GATE B4/B5. ──

describe('brief schema (restricted)', () => {
  it('everything a Brief can hold survives a round trip byte-for-byte', () => {
    const html =
      '<p>Compression is a <strong>test of understanding</strong>, with ' +
      '<em>emphasis</em> and a <a target="_blank" rel="noopener noreferrer nofollow" ' +
      'class="text-primary underline cursor-pointer hover:text-primary/80" ' +
      'href="https://www.bis.org/publ/qtrpdf/r_qt2403.htm?a=1&amp;b=2">source link</a>.</p>' +
      '<p>Second paragraph, a<br>hard break inside.</p>';
    const once = briefRoundTrip(html);
    const twice = briefRoundTrip(once);
    expect(twice).toBe(once);
  });

  it('a brief document renders identically under the FULL schema (the public page)', () => {
    // ArticleBody renders the Brief through the same JSON branch the long
    // body uses, against the full schema. The full schema carries extra attr
    // DEFAULTS (e.g. textAlign) the brief schema does not, so JSON equality
    // across schemas is not the contract — rendered-HTML equality is: the
    // public parse of a brief document must not change what it shows.
    const briefEd = briefEditorWith(
      '<p>One <strong>bold</strong> and <em>italic</em> and <a href="https://example.com">a link</a>.</p>',
    );
    const briefHtml = briefEd.getHTML();
    briefEd.destroy();

    const fullEd = editorWith(briefHtml);
    expect(fullEd.getHTML()).toBe(briefHtml);
    fullEd.destroy();
  });

  const SMUGGLE_CASES: Record<string, { html: string; forbidden: string[]; mustKeepText: string }> = {
    heading: {
      html: '<h2>Heading text</h2><p>Prose.</p>',
      forbidden: ['heading'],
      mustKeepText: 'Heading text',
    },
    list: {
      html: '<ul><li><p>Item one</p></li><li><p>Item two</p></li></ul>',
      forbidden: ['bulletList', 'orderedList', 'listItem'],
      mustKeepText: 'Item one',
    },
    table: {
      html: '<table><tbody><tr><th><p>Cell head</p></th></tr><tr><td><p>Cell body</p></td></tr></tbody></table>',
      forbidden: ['table', 'tableRow', 'tableHeader', 'tableCell'],
      mustKeepText: 'Cell head',
    },
    figure: {
      html: '<figure data-type="figure-block" data-figure="{}" class="figure-block"><img src="https://example.com/i.png" alt="x"><figcaption>Caption text</figcaption></figure><p>After.</p>',
      forbidden: ['figure', 'image'],
      mustKeepText: 'After.',
    },
    blockquote: {
      html: '<blockquote><p>Quoted words</p></blockquote>',
      forbidden: ['blockquote'],
      mustKeepText: 'Quoted words',
    },
    codeAndRule: {
      html: '<pre><code>const x = 1;</code></pre><hr><p>Prose stays.</p>',
      forbidden: ['codeBlock', 'horizontalRule'],
      mustKeepText: 'Prose stays.',
    },
  };

  for (const [name, c] of Object.entries(SMUGGLE_CASES)) {
    it(`${name} cannot be smuggled in — structure drops, words survive`, () => {
      const editor = briefEditorWith(c.html);
      const json = editor.getJSON();
      const text = editor.getText();
      editor.destroy();

      const types = nodeTypes(json);
      for (const forbidden of c.forbidden) {
        expect(types.has(forbidden)).toBe(false);
      }
      // The schema keeps prose: exclusion means flattening, not data loss.
      expect(text).toContain(c.mustKeepText);
      // Whatever remains is inside the permitted vocabulary.
      for (const t of types) {
        expect(['doc', 'paragraph', 'text', 'hardBreak']).toContain(t);
      }
    });
  }

  it('pasting the full-schema serialisation of a table flattens to prose in the brief editor', () => {
    // The realistic smuggle path: copy from the LONG essay (full schema
    // HTML) and paste into the Brief. The table geometry must not survive.
    const full = editorWith(
      '<table><tbody><tr><th colspan="1" rowspan="1"><p>H</p></th></tr>' +
        '<tr><td colspan="1" rowspan="1"><p>C</p></td></tr></tbody></table>',
    );
    const fullHtml = full.getHTML();
    full.destroy();

    const brief = briefEditorWith(fullHtml);
    const types = nodeTypes(brief.getJSON());
    brief.destroy();
    expect(types.has('table')).toBe(false);
    expect(types.has('tableCell')).toBe(false);
  });
});
