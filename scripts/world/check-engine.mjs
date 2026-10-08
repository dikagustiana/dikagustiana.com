/**
 * Checks the world engine under src/world/engine, after Factory Yard's
 * scripts/check-yard.mjs (github.com/Khalidabdi1/factory, commit 148758a):
 *
 *   - every file parses, and every relative import names a module that exists
 *     and exports what is imported;
 *   - every name a module uses is declared, imported, or a browser/JS global;
 *   - simulating ES module evaluation from the entry (index.ts), nothing is
 *     used at load time before its own module has run.
 *
 * Difference from the original: files not reachable from the entry are
 * reported as PENDING (vendored, not yet wired) and their unresolved imports
 * of modules that were deliberately not ported (../layout, ./sahel, …) do not
 * fail the run. Files reachable from the entry must be clean. Pass --strict
 * to make pending files fail too; the build does that once Phase D has wired
 * every ported module.
 *
 *   node scripts/world/check-engine.mjs [--strict]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import traverseMod from '@babel/traverse';

const traverse = traverseMod.default;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/world/engine');
const ENTRY = path.join(ROOT, 'index.ts');
const STRICT = process.argv.includes('--strict');
const rel = (f) => path.relative(ROOT, f);

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.ts')) files.push(p);
  }
})(ROOT);
files.sort();

const BROWSER = new Set(['window', 'document', 'location', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'getComputedStyle',
  'devicePixelRatio', 'ResizeObserver', 'navigator', 'localStorage', 'HTMLElement', 'HTMLCanvasElement', 'KeyboardEvent', 'PointerEvent', 'WheelEvent', 'Element']);

// ---- parse and collect exports ----
const mods = new Map();
for (const f of files) {
  let ast;
  try {
    ast = parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['typescript'], allowAwaitOutsideFunction: true });
  } catch (e) {
    console.log(`${rel(f)}:${e.loc?.line}:${e.loc?.column} syntax error · ${e.message}`);
    process.exit(1);
  }
  const names = new Set();
  for (const st of ast.program.body) {
    if (st.type === 'ExportNamedDeclaration') {
      const d = st.declaration;
      if (d?.declarations) d.declarations.forEach((x) => { if (x.id.type === 'Identifier') names.add(x.id.name); else if (x.id.type === 'ObjectPattern') x.id.properties.forEach((pr) => pr.value?.name && names.add(pr.value.name)); });
      else if (d?.id) names.add(d.id.name);
      for (const sp of st.specifiers ?? []) names.add(sp.exported.name ?? sp.exported.value);
    }
    if (st.type === 'ExportDefaultDeclaration') names.add('default');
  }
  mods.set(f, { ast, names });
}

const resolve = (from, spec) => path.resolve(path.dirname(from), spec) + (spec.endsWith('.ts') ? '' : '.ts');

// ---- reachability from the entry ----
const reachable = new Set();
if (fs.existsSync(ENTRY)) {
  (function visit(f) {
    if (reachable.has(f) || !mods.has(f)) return;
    reachable.add(f);
    for (const st of mods.get(f).ast.program.body) if (st.type === 'ImportDeclaration' && st.source.value.startsWith('.')) visit(resolve(f, st.source.value));
  })(ENTRY);
} else {
  console.log('no entry (index.ts) yet: every file is pending');
}
const pending = files.filter((f) => !reachable.has(f));

// ---- imports and free names ----
let bad = 0, pendingProblems = 0;
const report = (f, msg) => { if (reachable.has(f) || STRICT) { console.log(`${rel(f)}: ${msg}`); bad++; } else pendingProblems++; };
for (const f of files) {
  const { ast } = mods.get(f);
  for (const st of ast.program.body) {
    if (st.type !== 'ImportDeclaration' || !st.source.value.startsWith('.')) continue;
    const target = resolve(f, st.source.value), ex = mods.get(target);
    if (!ex) { report(f, `no module ${st.source.value}`); continue; }
    for (const sp of st.specifiers) if (sp.type === 'ImportSpecifier' && !ex.names.has(sp.imported.name ?? sp.imported.value)) report(f, `${sp.imported.name} is not exported by ${st.source.value}`);
  }
  const free = new Set();
  const inType = (p) => !!p.findParent((q) => q.node.type.startsWith('TS') && !['TSAsExpression', 'TSNonNullExpression', 'TSSatisfiesExpression'].includes(q.node.type));
  traverse(ast, {
    ReferencedIdentifier(p) {
      const n = p.node.name;
      if (!p.scope.hasBinding(n) && !BROWSER.has(n) && !(n in globalThis) && !inType(p)) free.add(n);
    },
  });
  for (const n of free) report(f, `free ${n}`);
}

// ---- load order from the entry ----
let tdz = 0;
if (fs.existsSync(ENTRY)) {
  const importsOf = new Map(), evalDeps = new Map();
  for (const f of reachable) {
    const { ast } = mods.get(f), imps = [], deps = new Set();
    for (const st of ast.program.body) if (st.type === 'ImportDeclaration' && st.source.value.startsWith('.')) imps.push(resolve(f, st.source.value));
    traverse(ast, {
      ReferencedIdentifier(p) {
        if (p.getFunctionParent()) return;
        const b = p.scope.getBinding(p.node.name);
        if (b?.kind === 'module' && b.path.parent.source?.value.startsWith('.')) deps.add(`${resolve(f, b.path.parent.source.value)}|${p.node.name}`);
      },
    });
    importsOf.set(f, imps); evalDeps.set(f, deps);
  }
  const state = new Map(), done = new Set();
  (function visit(f) {
    if (state.has(f) || !mods.has(f)) return;
    state.set(f, 'busy');
    for (const d of importsOf.get(f) ?? []) visit(d);
    for (const dep of evalDeps.get(f) ?? []) { const [m, n] = dep.split('|'); if (m !== f && !done.has(m)) { console.log(`LOAD ORDER ${rel(f)} uses ${n} before ${rel(m)} has run`); tdz++; } }
    done.add(f);
  })(ENTRY);
}

console.log(`${files.length} files · ${reachable.size} wired from the entry · ${pending.length} pending`);
if (pending.length) console.log(`pending (not yet wired): ${pending.map(rel).join(', ')}${pendingProblems ? ` · ${pendingProblems} unresolved reference(s) in pending files` : ''}`);
console.log(bad ? `${bad} problem(s)` : 'wired files clean');
console.log(tdz ? `${tdz} load-order problem(s)` : 'load order ok');
process.exit(bad || tdz ? 1 : 0);
