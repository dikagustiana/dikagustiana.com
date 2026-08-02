/**
 * The ONE lazy entry point for KaTeX. Dynamically imported by ArticleBody
 * when a math node actually renders, so readers of math-less essays never
 * download it.
 *
 * The CSS is imported HERE, statically, on purpose: a bare dynamic
 * `import('katex/dist/katex.min.css')` is a CSS-only dynamic import, which
 * Vite hoists into the importing chunk's own stylesheet list — the CSS then
 * loads on every essay page and the "lazy" load is a lie. Bundled behind
 * this module, both the JS and the CSS live in one async chunk.
 */
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default katex;
