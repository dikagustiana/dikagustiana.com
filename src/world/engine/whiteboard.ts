/**
 * The in-world whiteboard (PRD §7.7; mega prompt §9.3): drawn on the cut's
 * back wall with the engine's text texture, the top three drivers by share
 * of cost of revenue with their figures, a miniature waterfall with values
 * on the bars, and the peer position as marks on one scale. Twelve
 * characters per label. With no published model: "No model yet" and
 * nothing else. The content arrives pre-formatted from the shell
 * (WhiteboardContent); this is the only module that calls Part.note.
 * Clicking the board opens the full board: the group is an entity whose
 * one action is "Open board".
 */
import * as THREE from 'three';
import type { EngineContext } from './context';
import type { Entity, WorldAction } from './types';
import type { WhiteboardContent } from '@/world/data/types';
import { FRONT, SIDE } from './kernel/iso';
import { Part } from './kernel/part';

export const NO_MODEL_NOTE = 'No model yet';
const BOARD_W = 7.2, BOARD_H = 2.4;

export interface Wall { x0: number; x1: number; y: number; z: number }

/** The board on the back wall of a plot cut open: front 's' puts it on the north wall facing south, 'e' on the west wall facing east. */
export function drawWhiteboard(ctx: EngineContext, wall: Wall, front: 's' | 'e', content: WhiteboardContent | null, ticker: string | null, onAction: (a: WorldAction) => void): THREE.Group {
  const p = new Part(ctx);
  const span = wall.x1 - wall.x0, w = Math.min(BOARD_W, span - 1.0), h = BOARD_H;
  const u0 = wall.x0 + (span - w) / 2, top = wall.z - 0.25;
  // the wall's inner face: FRONT for y = const facing +y, SIDE for x = const facing +x; both take the top-left corner
  const M = front === 's' ? FRONT(u0, wall.y + 0.24, top) : SIDE(wall.y + 0.24, u0 + w, top);
  p.fill2(M, 0, 0, w, h, 'lamp', 0.01);
  p.rect2(M, 0, 0, w, h, 'line', 0.02);
  const line = (y: number) => p.draw(M, [0.2, y, w - 0.2, y], 'detail', 0.02);
  if (!content) {
    p.note(M, NO_MODEL_NOTE, w / 2, h / 2 + 0.12, 0.42, 'ink', 'middle', 0.03);
  } else {
    p.note(M, `${content.ticker} · ${content.period}`, 0.2, 0.34, 0.26, 'ink', 'start', 0.03);
    line(0.46);
    // the top three drivers, label left and figure right
    content.drivers.slice(0, 3).forEach((d, i) => {
      const y = 0.78 + i * 0.3;
      p.note(M, d.label.slice(0, 12), 0.2, y, 0.22, 'ink', 'start', 0.03);
      p.note(M, d.figure, w * 0.46, y, 0.22, 'ink', 'end', 0.03);
    });
    // the waterfall: bars from left to right on the scale, values on them
    const wx0 = w * 0.5, ww = w * 0.46, by = 0.62, bh = 0.92;
    const n = Math.max(1, content.waterfall.length), bw = ww / n;
    content.waterfall.forEach((b, i) => {
      const x = wx0 + i * bw + bw * 0.1, top0 = by + bh * (1 - Math.max(b.from, b.to)), bot = by + bh * (1 - Math.min(b.from, b.to));
      p.fill2(M, x, top0, bw * 0.8, Math.max(0.03, bot - top0), b.role === 'cost' ? 'kob' : b.role === 'unsplit' ? 'glass' : 'kod', 0.02);
      p.note(M, b.figure, x + bw * 0.4, top0 - 0.04, 0.14, 'ink', 'middle', 0.03);
      p.note(M, b.label.slice(0, 12), x + bw * 0.4, by + bh + 0.16, 0.12, 'paint', 'middle', 0.03);
    });
    // the peer position: one scale with the company's mark, the comparator's, or the band and the median
    const py = h - 0.32, px0 = 0.2, pw = w - 0.4;
    line(py);
    if (content.peer) {
      const at = (f: number) => px0 + pw * Math.max(0, Math.min(1, f));
      p.note(M, content.peer.heading, px0, py - 0.1, 0.16, 'paint', 'start', 0.03);
      if (content.peer.min !== undefined && content.peer.max !== undefined) p.fill2(M, at(content.peer.min), py - 0.05, Math.max(0.05, at(content.peer.max) - at(content.peer.min)), 0.1, 'glass', 0.02);
      if (content.peer.median !== undefined) p.draw(M, [at(content.peer.median), py - 0.12, at(content.peer.median), py + 0.12], 'line', 0.03);
      if (content.peer.other !== undefined) p.rect2(M, at(content.peer.other) - 0.05, py - 0.05, 0.1, 0.1, 'line', 0.03);
      p.fill2(M, at(content.peer.self) - 0.06, py - 0.06, 0.12, 0.12, 'livef', 0.03);
    } else {
      p.note(M, 'no peer published', px0, py - 0.1, 0.16, 'paint', 'start', 0.03);
    }
  }
  const g = p.build(`whiteboard-${ticker ?? 'plot'}`);
  if (ticker) {
    const ent: Entity = { kind: 'whiteboard', id: `wb:${ticker}`, groups: [g], pick: [wall.x0 + span / 2, wall.y, wall.z],
      info: () => ({ kind: 'Whiteboard', title: content ? `${content.ticker} · ${content.period}` : NO_MODEL_NOTE, status: content ? 'Published' : NO_MODEL_NOTE, rows: [['Ticker', ticker]], actions: [['Open board', () => onAction({ type: 'open-board', ticker })]] }),
      readout: () => `whiteboard · ${ticker}` };
    g.userData.entity = ent;
  }
  return g;
}
