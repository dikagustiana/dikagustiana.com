/**
 * Where each driver-tree node sits when the tree is drawn (brief §5.5): in
 * columns by depth, operating drivers on the left, profit to owners on the
 * right. Depth is the longest path from a node with no incoming edge, so an
 * edge always runs left to right.
 */
import type { DriverTree } from '../contract/types';

export interface TreeLayout {
  /** Column and row of each node id. */
  at: Map<string, { col: number; row: number }>;
  columns: number;
  rows: number;
}

export function treeLayout(tree: DriverTree): TreeLayout {
  const depth = new Map<string, number>();
  const incoming = (id: string) => tree.edges.filter((e) => e.to === id).map((e) => e.from);
  const visit = (id: string, seen: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (seen.has(id)) return 0; // a cycle; checkTreeEdges reports it elsewhere
    seen.add(id);
    const d = incoming(id).reduce((m, from) => Math.max(m, visit(from, seen) + 1), 0);
    depth.set(id, d);
    return d;
  };
  for (const n of tree.nodes) visit(n.id, new Set());
  const at = new Map<string, { col: number; row: number }>();
  const filled = new Map<number, number>();
  for (const n of tree.nodes) {
    const col = depth.get(n.id) ?? 0;
    const row = filled.get(col) ?? 0;
    filled.set(col, row + 1);
    at.set(n.id, { col, row });
  }
  return {
    at,
    columns: Math.max(0, ...Array.from(depth.values())) + 1,
    rows: Math.max(0, ...Array.from(filled.values())),
  };
}
