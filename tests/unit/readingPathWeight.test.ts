/**
 * Weight regressions this session actually shipped or nearly shipped, pinned
 * as source-level assertions (the runtime facts were gate-measured; these
 * keep the next edit from silently undoing them):
 *
 * 1. The editorial barrel re-exported EssayEditor, which pulled the ENTIRE
 *    TipTap graph — extensions, ProseMirror, KaTeX — into the static bundle
 *    of every public essay page.
 * 2. ArticleBody imported katex statically, so every reader downloaded it
 *    for math no published essay contains.
 * 3. A manualChunk for katex re-created the static import from every page
 *    chunk; a "charts" manualChunk served a library with zero importers.
 * 4. package.json carried @tiptap packages at two different versions; on a
 *    clean install the two ProseMirror graphs crashed the writer studio —
 *    invisible to typecheck, build and tests.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('reading path stays decoupled from the editor', () => {
  it('the editorial barrel does not export EssayEditor', () => {
    const barrel = readFileSync('src/components/editorial/index.ts', 'utf-8');
    expect(barrel).not.toMatch(/export .*from '\.\/EssayEditor'/);
  });

  it('ArticleBody has no static katex import', () => {
    const src = readFileSync('src/components/editorial/ArticleBody.tsx', 'utf-8');
    expect(src).not.toMatch(/^import .*'katex'/m);
    expect(src).not.toMatch(/^import 'katex\//m);
    // The lazy entry point is the loader module, not bare katex.
    expect(src).toMatch(/import\('@\/lib\/katexLoader'\)/);
  });

  it('vite config has no charts or katex manualChunk', () => {
    const cfg = readFileSync('vite.config.ts', 'utf-8');
    expect(cfg).not.toMatch(/return "charts"/);
    expect(cfg).not.toMatch(/return "katex"/);
  });
});

describe('tiptap stays at ONE version', () => {
  it('every @tiptap dependency pins the same exact version', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    const versions = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })
      .filter(([name]) => name.startsWith('@tiptap/'))
      .map(([, v]) => v as string);
    expect(versions.length).toBeGreaterThan(5);
    expect(new Set(versions).size).toBe(1);
    // Exact pin — a caret range is how the two-version tree happened.
    expect(versions[0]).not.toMatch(/^[\^~]/);
  });
});
