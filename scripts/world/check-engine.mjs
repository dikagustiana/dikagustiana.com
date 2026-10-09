/**
 * The world engine's static check (CI: npm run check:world). Original to
 * this repository.
 *
 * Over every .ts file under src/world:
 *
 *   1. it parses;
 *   2. every import or re-export of a module under src/world (relative or
 *      '@/…') names a file that exists, and every name it takes is exported
 *      there;
 *   3. every identifier a file uses is declared in it, imported, or a
 *      JavaScript or browser global;
 *   4. loading the engine from its entry (src/world/engine/index.ts) the way
 *      ES modules evaluate (dependencies first, in import order, a cycle
 *      entered once), no module touches an imported binding at load time
 *      before the module that exports it has run.
 *
 * Files the entry does not reach (the data boundary, the placement and its
 * generated layout) are listed as pending: their problems are counted but do
 * not fail the run, unless --strict is passed.
 *
 * And over every file under src/:
 *
 *   5. provenance: no file carries code adapted from Factory Yard (NOTICE.md).
 *      A file with the adaptation header or a link to that repository fails
 *      the run, whatever --strict says.
 *
 *   node scripts/world/check-engine.mjs [--strict]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import babelTraverse from '@babel/traverse';

const traverse = babelTraverse.default ?? babelTraverse;
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');
const WORLD = path.join(SRC, 'world');
const ENTRY = path.join(WORLD, 'engine', 'index.ts');
const strict = process.argv.includes('--strict');
const short = (file) => path.relative(WORLD, file);

/** Names that exist without a declaration: the JavaScript globals of this Node, and the browser's the engine uses. */
const GLOBALS = new Set([...Object.getOwnPropertyNames(globalThis),
  'window', 'document', 'location', 'navigator', 'performance', 'localStorage', 'devicePixelRatio', 'matchMedia', 'getComputedStyle',
  'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'Element', 'HTMLElement', 'HTMLCanvasElement',
  'KeyboardEvent', 'PointerEvent', 'WheelEvent', 'EventListener', 'AddEventListenerOptions']);

function listFiles(dir, keep) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, keep));
    else if (keep(full)) out.push(full);
  }
  return out.sort();
}

// ---- 1. parse ----
const modules = new Map();
for (const file of listFiles(WORLD, (f) => f.endsWith('.ts'))) {
  let ast;
  try {
    ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['typescript'] });
  } catch (err) {
    console.log(`${short(file)}:${err.loc?.line ?? 0}: does not parse (${err.message})`);
    process.exit(1);
  }
  modules.set(file, { ast, exports: exportedNames(ast), specs: moduleSpecifiers(ast) });
}

function exportedNames(ast) {
  const names = new Set();
  const addPattern = (id) => {
    if (!id) return;
    if (id.type === 'Identifier') names.add(id.name);
    else if (id.type === 'ObjectPattern') for (const p of id.properties) addPattern(p.type === 'RestElement' ? p.argument : p.value);
    else if (id.type === 'ArrayPattern') for (const e of id.elements) addPattern(e);
  };
  for (const node of ast.program.body) {
    if (node.type === 'ExportDefaultDeclaration') names.add('default');
    if (node.type !== 'ExportNamedDeclaration') continue;
    const decl = node.declaration;
    if (decl?.type === 'VariableDeclaration') for (const d of decl.declarations) addPattern(d.id);
    else if (decl?.id) names.add(decl.id.name);
    for (const s of node.specifiers ?? []) names.add(s.exported.type === 'Identifier' ? s.exported.name : s.exported.value);
  }
  return names;
}

/** The module requests a file makes (imports and re-exports), with the names each one takes. */
function moduleSpecifiers(ast) {
  const out = [];
  for (const node of ast.program.body) {
    const isImport = node.type === 'ImportDeclaration';
    const isReexport = (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source;
    if (!isImport && !isReexport) continue;
    const spec = node.source.value;
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
    const taken = [];
    for (const s of node.specifiers ?? []) {
      if (s.type === 'ImportSpecifier') taken.push(s.imported.type === 'Identifier' ? s.imported.name : s.imported.value);
      else if (s.type === 'ExportSpecifier') taken.push(s.local.type === 'Identifier' ? s.local.name : s.local.value);
    }
    out.push({ spec, taken, line: node.loc?.start.line ?? 0 });
  }
  return out;
}

/** A specifier as the bundler resolves it: '@/x' is src/x; 'a/b' is a/b.ts, else a/b/index.ts. */
function resolveSpec(from, spec) {
  const base = spec.startsWith('@/') ? path.join(SRC, spec.slice(2)) : path.resolve(path.dirname(from), spec);
  if (base.endsWith('.ts')) return base;
  return fs.existsSync(`${base}.ts`) ? `${base}.ts` : path.join(base, 'index.ts');
}

// ---- reachability from the entry ----
const wired = new Set();
const reach = (file) => {
  if (wired.has(file) || !modules.has(file)) return;
  wired.add(file);
  for (const { spec } of modules.get(file).specs) reach(resolveSpec(file, spec));
};
if (fs.existsSync(ENTRY)) reach(ENTRY);
else console.log('no entry (engine/index.ts): every file is pending');
const pending = [...modules.keys()].filter((f) => !wired.has(f));

let problems = 0, pendingProblems = 0;
const problem = (file, msg) => {
  if (wired.has(file) || strict) { console.log(`${short(file)}: ${msg}`); problems++; } else pendingProblems++;
};

// ---- 2. imports resolve to real exports ----
for (const [file, mod] of modules) {
  for (const { spec, taken, line } of mod.specs) {
    const target = resolveSpec(file, spec), there = modules.get(target);
    if (!there) {
      // modules outside src/world (the registry, the chain data) are another check's business
      if (target.startsWith(WORLD)) problem(file, `line ${line}: ${spec} does not exist`);
      continue;
    }
    for (const name of taken) if (!there.exports.has(name)) problem(file, `line ${line}: ${spec} does not export ${name}`);
  }
}

// ---- 3. every name used is declared, imported or global ----
/** Node types that put whatever is inside them in type position; the TS wrappers of a value expression are not among them. */
const TYPE_POSITION = new Set(['TSTypeAnnotation', 'TSTypeParameterInstantiation', 'TSTypeParameterDeclaration', 'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration', 'TSDeclareFunction', 'TSModuleDeclaration', 'TSTypeReference', 'TSQualifiedName', 'TSTypeQuery',
  'TSExpressionWithTypeArguments', 'TSInterfaceHeritage', 'TSImportType', 'TSIndexedAccessType']);
const inTypePosition = (p) => !!p.findParent((q) => TYPE_POSITION.has(q.node.type));
for (const [file, { ast }] of modules) {
  const unknown = new Set();
  traverse(ast, {
    ReferencedIdentifier(p) {
      const name = p.node.name;
      // a constructor's parameter property (constructor(readonly id: string)) declares the name, it does not read it
      if (p.parent.type === 'TSParameterProperty') return;
      if (p.scope.hasBinding(name) || GLOBALS.has(name) || inTypePosition(p)) return;
      unknown.add(name);
    },
  });
  for (const name of unknown) problem(file, `${name} is used but never declared or imported`);
}

// ---- 4. load order from the entry ----
let orderProblems = 0;
if (fs.existsSync(ENTRY)) {
  /** For each wired module: the imported bindings it reads at load time (outside any function), with their source module. */
  const loadTimeReads = new Map();
  for (const file of wired) {
    const reads = [];
    traverse(modules.get(file).ast, {
      ReferencedIdentifier(p) {
        if (p.getFunctionParent() || inTypePosition(p)) return;
        const binding = p.scope.getBinding(p.node.name);
        if (binding?.kind !== 'module') return;
        const spec = binding.path.parent.source?.value;
        if (spec && (spec.startsWith('.') || spec.startsWith('@/'))) reads.push({ name: p.node.name, from: resolveSpec(file, spec) });
      },
    });
    loadTimeReads.set(file, reads);
  }
  const entered = new Set(), evaluated = new Set();
  const evaluate = (file) => {
    if (entered.has(file) || !modules.has(file)) return;
    entered.add(file);
    for (const { spec } of modules.get(file).specs) evaluate(resolveSpec(file, spec));
    for (const { name, from } of loadTimeReads.get(file) ?? []) {
      if (from !== file && modules.has(from) && !evaluated.has(from)) { console.log(`LOAD ORDER ${short(file)} reads ${name} before ${short(from)} has run`); orderProblems++; }
    }
    evaluated.add(file);
  };
  evaluate(ENTRY);
}

// ---- 5. provenance: no Factory Yard code anywhere in src/ ----
const FOREIGN = [/Adapted from Factory Yard/i, /github\.com\/Khalidabdi1\/factory/i];
const foreign = [];
for (const file of listFiles(SRC, (f) => /\.(ts|tsx|js|jsx|mjs|css|json|md|html)$/.test(f))) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => { if (FOREIGN.some((re) => re.test(line))) foreign.push(`${path.relative(path.dirname(SRC), file)}:${i + 1}`); });
}
for (const hit of foreign) console.log(`FACTORY YARD ${hit}: carries Factory Yard's adaptation header or source link (see NOTICE.md)`);

console.log(`${modules.size} files · ${wired.size} wired from the entry · ${pending.length} pending`);
if (pending.length) console.log(`pending (not wired from the entry): ${pending.map(short).join(', ')}${pendingProblems ? ` · ${pendingProblems} problem(s) in pending files` : ''}`);
console.log(problems ? `${problems} problem(s)` : 'wired files clean');
console.log(orderProblems ? `${orderProblems} load-order problem(s)` : 'load order ok');
console.log(foreign.length ? `${foreign.length} line(s) of Factory Yard provenance in src/` : 'no Factory Yard code in src/');
process.exit(problems || orderProblems || foreign.length ? 1 : 0);
