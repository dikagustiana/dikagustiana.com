/**
 * Two rules of the engine's code, checked on the files themselves
 * (mega prompt §4.5 and §14):
 *
 *   - no colour is written in scene code: a hex literal may appear only in
 *     the one mapping file, src/world/engine/theme.ts, where the night
 *     palette lives; everything else reads the site's tokens through it;
 *   - nothing in the engine calls Math.random(): every draw goes through the
 *     instance's seeded generator, so a seed replays the same world.
 *
 * And one rule of provenance (NOTICE.md): no file under src/ carries code
 * adapted from Factory Yard, so none may carry its adaptation header or a
 * link to its repository. scripts/world/check-engine.mjs holds the same
 * line in CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = ['src/world/engine', 'src/world/interiors', 'src/world/world', 'src/world/sim'].map((d) => path.resolve(__dirname, '../..', d));
const MAPPING_FILE = path.resolve(__dirname, '../../src/world/engine/theme.ts');

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) yield* walk(p);
    else if (p.endsWith('.ts')) yield p;
  }
}
const files = ROOTS.flatMap((r) => [...walk(r)]);
// comment lines may name the rule they describe; code lines may not break it
const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);
const hits = (re: RegExp, skip: (f: string) => boolean = () => false) =>
  files.filter((f) => !skip(f)).flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').flatMap((line, i) => (!isComment(line) && re.test(line) ? [`${path.relative(process.cwd(), f)}:${i + 1}`] : [])));

describe('engine code rules', () => {
  it('reads every colour through the mapping file: no hex outside theme.ts', () => {
    // a hex colour: # then 3, 4, 6 or 8 hex digits, not inside a word (a CSS id or an anchor would not appear in scene code anyway)
    expect(hits(/(^|[^\w&])#[0-9a-fA-F]{3,8}\b/, (f) => f === MAPPING_FILE)).toEqual([]);
  });

  it('never calls Math.random()', () => {
    expect(hits(/Math\.random\s*\(/)).toEqual([]);
  });

  it('never finds DOM elements by id (the shell passes the container)', () => {
    expect(hits(/getElementById|querySelector\s*\(\s*['"]#/)).toEqual([]);
  });

  it('draws unguarded text (Part.note) only on the whiteboard', () => {
    expect(hits(/\.note\(/, (f) => f.endsWith('whiteboard.ts') || f.endsWith('kernel/part.ts'))).toEqual([]);
  });

  // mega prompt §8.1: scene code sees only the boundary's shapes
  it('never imports the Finance in Action data layer, the link register, or the boundary itself (types aside)', () => {
    const imports = hits(/^import\s(?!type\s)[^;]*from\s+['"](@\/lib\/finance-in-action|@\/lib\/world\/registry\/links\.generated|@\/world\/data\/boundary|@\/integrations)/);
    expect(imports).toEqual([]);
    const dynamic = hits(/import\(\s*['"](@\/lib\/finance-in-action|@\/world\/data\/boundary|@\/integrations)/);
    expect(dynamic).toEqual([]);
  });

  it('carries no Factory Yard code: no file under src/ has its adaptation header or links its repository', () => {
    const SRC = path.resolve(__dirname, '../../src');
    const all = (fs.readdirSync(SRC, { recursive: true }) as string[]).map((f) => path.join(SRC, f)).filter((f) => /\.(ts|tsx|js|mjs|css|json|md)$/.test(f) && fs.statSync(f).isFile());
    const foreign = all.flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').flatMap((line, i) => (/Adapted from Factory Yard|github\.com\/Khalidabdi1\/factory/i.test(line) ? [`${path.relative(process.cwd(), f)}:${i + 1}`] : [])));
    expect(foreign).toEqual([]);
    // the nine kernel files that were adapted say what they are now
    for (const f of ['theme.ts', 'context.ts', 'world/ground.ts', 'kernel/path.ts', 'kernel/iso.ts', 'kernel/math.ts', 'kernel/part.ts', 'sim/clock.ts', 'view/index.ts']) {
      expect(fs.readFileSync(path.join(SRC, 'world/engine', f), 'utf8').split('\n')[0], f).toMatch(/^\/\/ Original to this repository/);
    }
  });
});
