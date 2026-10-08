/**
 * The think tank's section drawing (PRD §7.10): one room per research
 * programme the registry switches on, side by side behind the terrace,
 * each labelled with the programme's name; a reading table in each. The
 * rooms' pieces are the shell's (ThinkTank.tsx); nothing here reads an
 * essay.
 */
import { TOP } from '../engine/kernel/iso';
import type { Part } from '../engine/kernel/part';
import type { Box } from '@/world/placement/types';
import { lowWall } from './base';

export interface RoomSpec { id: string; label: string }

/** Rooms along the box from west to east, partitioned by low walls; a table and the label in each. */
export function buildRooms(p: Part, b: Box, rooms: readonly RoomSpec[]): { id: string; box: Box }[] {
  const n = Math.max(1, rooms.length), w = (b.x1 - b.x0) / n;
  const out: { id: string; box: Box }[] = [];
  rooms.forEach((r, i) => {
    const x0 = b.x0 + i * w, x1 = x0 + w;
    if (i > 0) lowWall(p, x0, b.y0, x0, b.y1, 0, [[(b.y0 + b.y1) / 2 - 0.8, (b.y0 + b.y1) / 2 + 0.8]]);
    const cx = (x0 + x1) / 2, cy = (b.y0 + b.y1) / 2;
    p.box(cx - 1.0, cy - 0.5, 0, 2.0, 1.0, 0.7, 'n');
    for (const [dx, dy] of [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]] as const) p.box(cx + dx - 0.2, cy + dy - 0.2, 0, 0.4, 0.4, 0.45, 'k');
    p.text(TOP(x0 + 0.5, b.y1 - 1.1, 0.03), r.label, 0, 0, 0.6, 'paint');
    out.push({ id: r.id, box: { x0, x1, y0: b.y0, y1: b.y1 } });
  });
  return out;
}
