/**
 * A target is anything a reading can open or a shift can mark: a joint, a
 * layer, a stage, a node, a border, a return. These tell them apart, name
 * them, number them under a shift, and write the one line that is read on
 * hover — the definition a legend used to carry, now read on the element
 * itself.
 */
import {
  BAND_BY_ID,
  BORDERS,
  BYPRODUCT,
  CHAIN_COPY,
  DEFINE,
  JOINT_BY_ID,
  JOINT_IDS,
  JOINTS,
  MARGIN_KINDS,
  NODES,
  NON_PHYSICAL,
  RETAIL,
  RETAIL_GROUP,
  RETURNS,
  SHIFT_BY_ID,
  STAGES,
  STATUS,
  isMarked,
  jointLayers,
  shiftTarget,
  targetStatus,
  type JointId,
  type LensId,
  type ShiftId,
} from '@/data/industryChain';
import { MARK_ORDER } from './chainMarkOrder';

export const isJointId = (id: string): id is JointId => (JOINT_IDS as readonly string[]).includes(id);
export const isBandId = (id: string): boolean => id in BAND_BY_ID;
/** A door: something that opens a reading when selected, shift or no shift. */
export const isDoor = (id: string): boolean => isJointId(id) || isBandId(id);

const stageOf = (id: string) => STAGES.find((s) => s.id === id);
const nodeOf = (id: string) => NODES.find((n) => n.id === id) ?? RETAIL.find((r) => r.id === id);

export function targetLabel(id: string): string {
  if (isJointId(id)) return JOINT_BY_ID[id].label;
  if (BAND_BY_ID[id]) return BAND_BY_ID[id].label;
  if (id === RETAIL_GROUP.id) return RETAIL_GROUP.label;
  if (id === BYPRODUCT.id) return BYPRODUCT.label;
  const named =
    stageOf(id) ??
    nodeOf(id) ??
    BORDERS.find((b) => b.id === id) ??
    RETURNS.find((r) => r.id === id) ??
    NON_PHYSICAL.find((f) => f.id === id) ??
    SHIFT_BY_ID.reindustrialisation.moves.find((m) => m.id === id) ??
    SHIFT_BY_ID.green.moves.find((m) => m.id === id);
  return named?.label ?? id;
}

/**
 * The marks of one shift, in reading order, already filtered to the targets
 * that have a condition. The order is the generator's — where the marks land
 * on the plate — so the same list numbers the wide plate and the narrow
 * column, and a target listed in the data file but not yet placed on the
 * plate simply has no mark rather than an invented one.
 */
export function markedIds(shift: ShiftId): string[] {
  const placed = MARK_ORDER[shift] ?? [];
  const known = new Set(placed);
  return [
    ...placed.filter((id) => {
      const target = shiftTarget(shift, id);
      return target !== undefined && isMarked(target);
    }),
    // A target added to the data file since the last `npm run build:chain`
    // still gets a number, at the end, so the panel is reachable in the
    // column and the count never lies. The plate gains its mark on the next
    // regenerate; the unit test fails until then.
    ...SHIFT_BY_ID[shift].targets.filter((t) => !known.has(t.id) && isMarked(t)).map((t) => t.id),
  ];
}

/** The number a target shows under a shift, or 0 when it carries no mark. */
export function markNumber(shift: ShiftId, id: string): number {
  return markedIds(shift).indexOf(id) + 1;
}

/** How many essays the owner has attached to a target under a shift. */
export function markArticles(shift: ShiftId | null, id: string) {
  return shiftTarget(shift, id)?.articles ?? [];
}

/** "no essay yet" / "one essay" / "three essays". */
export function essayCount(n: number): string {
  if (n === 0) return CHAIN_COPY.mark.essayNone;
  return `${n} ${n === 1 ? CHAIN_COPY.mark.essayOne : CHAIN_COPY.mark.essayMany}`;
}

/**
 * The one line read on hover or focus. Under a shift, a marked element reads
 * as its mark: number, title, status, how many essays sit behind it. At rest
 * — and for anything a shift does not mark — the element reads as what it
 * is: the definition the legend used to hold, plus, for a joint, the kind of
 * margin cut there and the service performed there.
 */
export function hoverLine(id: string, shift: ShiftId | null, lens: LensId): { lead: string; detail: string } {
  const n = shift ? markNumber(shift, id) : 0;
  if (n > 0) {
    const status = targetStatus(shift, id)!;
    return {
      lead: `${n}. ${targetLabel(id)}`,
      detail: `${STATUS[status].label} · ${essayCount(markArticles(shift, id).length)}`,
    };
  }
  if (isJointId(id)) {
    const joint = JOINT_BY_ID[id];
    // The margin kind, then the service performed here — what finance sees —
    // so the kind is never named without saying what earns it.
    const service = joint.read.finance.chip.toLowerCase();
    const detail = lens === 'economy' ? `${MARGIN_KINDS[joint.margin].label} · ${service} · ${joint.read.economy.chip}` : `${MARGIN_KINDS[joint.margin].label} · ${service}`;
    return { lead: joint.label, detail };
  }
  const band = BAND_BY_ID[id];
  if (band) return { lead: band.label, detail: band.margin ? DEFINE.layerFee : DEFINE.layerTerms };
  const stage = stageOf(id);
  if (stage) return { lead: stage.label, detail: stage.origin ? DEFINE.origin : DEFINE.stage };
  if (id === RETAIL_GROUP.id) return { lead: `${RETAIL_GROUP.label} · ${RETAIL_GROUP.note}`, detail: DEFINE.node };
  const node = nodeOf(id);
  if (node) return { lead: node.label, detail: RETAIL.some((r) => r.id === id) ? DEFINE.retail : DEFINE.node };
  const border = BORDERS.find((b) => b.id === id);
  if (border) return { lead: `${border.label} · ${DEFINE.border}`, detail: border.note };
  if (id === BYPRODUCT.id) return { lead: BYPRODUCT.label, detail: DEFINE.byproduct };
  const ret = RETURNS.find((r) => r.id === id);
  if (ret) return { lead: ret.label, detail: ret.note ? `${DEFINE.return} · ${ret.note}` : DEFINE.return };
  const flow = NON_PHYSICAL.find((f) => f.id === id);
  if (flow) return { lead: flow.label, detail: flow.note };
  if (id === 'lane-economy') return { lead: CHAIN_COPY.lensName.economy, detail: DEFINE.economy };
  if (id === 'lane-finance') return { lead: CHAIN_COPY.lensName.finance, detail: DEFINE.finance };
  for (const s of Object.values(SHIFT_BY_ID)) {
    const move = s.moves.find((m) => m.id === id);
    if (move) return { lead: move.label, detail: s.label };
  }
  return { lead: targetLabel(id), detail: '' };
}

/**
 * What stays when a reading is isolated at the finance distance: the joint,
 * the two hands either side of it and the layers riding on it; for a stage or
 * a node, the element and the joints that touch it with their other ends. A
 * layer, a border or a return isolates nothing — there is no "one unit of
 * goods" to step into there.
 */
export function isolationSet(id: string): Set<string> | null {
  if (isJointId(id)) {
    const j = JOINT_BY_ID[id];
    return new Set([id, j.from, j.to, ...jointLayers(id).map((b) => b.id)]);
  }
  if (isBandId(id)) return null;
  const touching = JOINTS.filter((j) => j.from === id || j.to === id);
  if (touching.length === 0) return null;
  return new Set([id, ...touching.flatMap((j) => [j.id, j.from, j.to])]);
}
