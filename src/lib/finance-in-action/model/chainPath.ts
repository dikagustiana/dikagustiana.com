/**
 * The chain through a cell, for the inspector's breadcrumb (brief §5.5): from
 * the nearest source filing, through the cell, to profit attributable to
 * owners. Walked over the dependency graph only.
 */
import { treeLayout } from './treeLayout';
import type { Workbook } from './workbook';

function shortestPath(start: string, next: (k: string) => string[], isGoal: (k: string) => boolean): string[] | null {
  const parent = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const k = queue.shift()!;
    if (k !== start && isGoal(k)) {
      const path: string[] = [];
      for (let at: string | null = k; at !== null; at = parent.get(at) ?? null) path.unshift(at);
      return path;
    }
    for (const n of next(k)) {
      if (!parent.has(n)) {
        parent.set(n, k);
        queue.push(n);
      }
    }
  }
  return null;
}

/**
 * The end of the driver tree: of the nodes no edge leaves, the deepest one.
 * Profit to owners in every fixture; a side leaf such as a margin is not it.
 */
export function sinkRowRef(wb: Workbook): string | undefined {
  const { nodes, edges } = wb.pkg.driverTree;
  const layout = treeLayout(wb.pkg.driverTree);
  const leaves = nodes.filter((n) => !edges.some((e) => e.from === n.id));
  const col = (id: string) => layout.at.get(id)?.col ?? 0;
  const deepest = leaves.reduce<(typeof leaves)[number] | undefined>((best, n) => (!best || col(n.id) >= col(best.id) ? n : best), undefined);
  return deepest?.rowRef;
}

/**
 * Keys from a sourced cell to `key` to the sink row, in reading order. Either
 * end is left off when the graph does not reach it.
 */
export function chainThrough(wb: Workbook, key: string): string[] {
  const back =
    wb.cell(key)?.kind === 'sourced'
      ? [key]
      : shortestPath(key, (k) => wb.graph.precedents(k), (k) => wb.cell(k)?.kind === 'sourced')?.reverse() ?? [key];
  const sink = sinkRowRef(wb);
  const own = wb.address(key);
  const forward =
    sink && wb.rowRefOf(key) !== sink
      ? shortestPath(
          key,
          (k) => wb.graph.dependents(k),
          (k) => wb.rowRefOf(k) === sink && wb.address(k)?.periodIndex === own?.periodIndex,
        ) ??
        shortestPath(key, (k) => wb.graph.dependents(k), (k) => wb.rowRefOf(k) === sink)
      : null;
  return forward ? [...back, ...forward.slice(1)] : back;
}
