import {
  BEND_RADIUS,
  KENMU_BOW_MAX,
  KENMU_BOW_MIN,
  KENMU_BOW_RATIO,
  MIN_BEND_RADIUS,
} from '../../../constants/canvasConnectors';
import type { LayoutNode, TopdownLayout } from './topdownLayout';

/** Fan elbow (parent bottom-center → child top-center) with rounded bends. */
export function roundedFanPath(fromX: number, fromY: number, toX: number, toY: number): string {
  const midY = (fromY + toY) / 2;
  const dx = toX - fromX;
  if (Math.abs(dx) < 1) return `M${fromX},${fromY} V${toY}`;
  const r = Math.max(0, Math.min(BEND_RADIUS, Math.abs(dx) / 2, midY - fromY, toY - midY));
  if (r < MIN_BEND_RADIUS) return `M${fromX},${fromY} V${midY} H${toX} V${toY}`;
  const dir = Math.sign(dx);
  return (
    `M${fromX},${fromY} V${midY - r} Q${fromX},${midY} ${fromX + dir * r},${midY} ` +
    `H${toX - dir * r} Q${toX},${midY} ${toX},${midY + r} V${toY}`
  );
}

/** Stack └ connector (down the parent's indent line, curving right into the child). */
export function roundedStackPath(x: number, fromY: number, toX: number, toY: number): string {
  const r = Math.max(0, Math.min(BEND_RADIUS, (toX - x) / 2, toY - fromY));
  if (r < MIN_BEND_RADIUS) return `M${x},${fromY} V${toY} H${toX}`;
  return `M${x},${fromY} V${toY - r} Q${x},${toY} ${x + r},${toY} H${toX}`;
}

/** The path plus the source-dot and label anchor points of one 兼務 link. */
export interface KenmuGeometry {
  d: string;
  /** Source dot (where the curve leaves the source card). */
  x1: number;
  y1: number;
  /** Label anchor (curve midpoint). */
  lx: number;
  ly: number;
}

/**
 * 兼務 curve, drawn **name-to-name**: it leaves the side of the source card at the person's
 * roster row and enters the side of the target card at their `(兼)` row (`fromY`/`toY` are
 * those row centers in diagram coords; callers fall back to the card centers when a row is
 * collapsed out of view). Routes side-to-side so the bow clears the cards.
 */
export function kenmuGeometry(
  from: LayoutNode,
  to: LayoutNode,
  fromY: number,
  toY: number,
): KenmuGeometry {
  const rightward = to.x + to.width / 2 >= from.x + from.width / 2;
  const x1 = rightward ? from.x + from.width : from.x;
  const x2 = rightward ? to.x : to.x + to.width;
  const bow = Math.max(KENMU_BOW_MIN, Math.min(KENMU_BOW_MAX, Math.abs(x2 - x1) * KENMU_BOW_RATIO));
  const c1x = rightward ? x1 + bow : x1 - bow;
  const c2x = rightward ? x2 - bow : x2 + bow;
  return {
    d: `M${x1},${fromY} C${c1x},${fromY} ${c2x},${toY} ${x2},${toY}`,
    x1,
    y1: fromY,
    lx: (x1 + x2) / 2,
    ly: (fromY + toY) / 2,
  };
}

/**
 * A stable id per layout *object*, used as the connector SVGs' `key` so their fade-in replays
 * on every re-pack (elbow/curve paths change shape and cannot tween; the cards glide via CSS).
 *
 * Backed by a WeakMap cache rather than a render-phase counter: asking twice for the same
 * layout always yields the same id, so a render React replays or discards leaves nothing behind.
 */
const layoutVersions = new WeakMap<TopdownLayout, number>();
let nextLayoutVersion = 0;

export function layoutVersion(layout: TopdownLayout): number {
  const known = layoutVersions.get(layout);
  if (known !== undefined) return known;
  const assigned = ++nextLayoutVersion;
  layoutVersions.set(layout, assigned);
  return assigned;
}
