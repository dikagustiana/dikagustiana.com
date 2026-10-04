/**
 * Finance in Action v3.1, Commit 9: rules that hold across the section's code.
 *
 * - Constraint 7: no number literals in components. Every figure comes from a
 *   package or the link register; sizes live in lib/finance-in-action/layout.ts.
 *   0 and 1 (indexes, signs, "one") are not figures and are allowed.
 * - Constraint 5: no market data anywhere in the section.
 * - Constraint 2: no figure from the reference prototype or the mockups.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const walk = (p: string): string[] => (fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((f) => walk(path.join(p, f))) : [p]);
const components = [
  ...walk(path.join(ROOT, 'src/components/finance-in-action/viewer')),
  ...walk(path.join(ROOT, 'src/pages/finance-in-action')),
].filter((f) => f.endsWith('.tsx'));
const section = [
  ...components,
  ...walk(path.join(ROOT, 'src/lib/finance-in-action')),
  ...walk(path.join(ROOT, 'src/data/finance-in-action')),
];

/** Source with comments, strings and template literals removed. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""');
}

describe('constraint 7: no number literals in components', () => {
  it.each(components.map((f) => path.relative(ROOT, f)))('%s', (rel) => {
    const found = code(fs.readFileSync(path.join(ROOT, rel), 'utf8')).match(/(?<![\w.$])\d+(?:\.\d+)?(?![\w])/g) ?? [];
    expect(found.filter((n) => n !== '0' && n !== '1')).toEqual([]);
  });
});

describe('constraint 5: no market data', () => {
  it('names no share price, P/E, market capitalisation, target price or market feed', () => {
    for (const f of section) {
      const text = fs.readFileSync(f, 'utf8');
      expect(text, f).not.toMatch(/share price|price[- ]to[- ]earnings|\bP\/E\b|market cap|target price|stock price|ticker feed|live market/i);
    }
  });
});
