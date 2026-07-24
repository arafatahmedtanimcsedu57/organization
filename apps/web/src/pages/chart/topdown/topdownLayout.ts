import { flextree, type FlextreeNode } from 'd3-flextree';
import type { ChartNode } from '../../../store/api/chartNode';

/**
 * Top-down layout for the interactive canvas (`chart-canvas` capability).
 *
 * Two mechanisms keep the horizontal footprint — and thus horizontal scrolling —
 * minimal for the current viewport:
 *
 * 1. `d3-flextree` computes a tidy, variable-node-size Reingold–Tilford layout whose
 *    contour packing interlocks sibling subtree bounding boxes ("reuses the gaps").
 * 2. A compaction rule turns a subtree into a **vertical indented stack** (children
 *    below one another, elbow connectors) whenever fanning it out horizontally would
 *    exceed its share of the viewport width — reproducing the hybrid look of the
 *    reference organogram. The thresholds below are the tunable knobs.
 */

/** Card width (all cards share one width so columns align). */
export const CARD_WIDTH = 236;
/** Header block: department name + head + count badge. */
const HEADER_HEIGHT = 52;
/** One roster line (a title group, the staff line, or the expander). */
const ROSTER_LINE_HEIGHT = 22;
/** Vertical padding inside a card. */
const CARD_PAD_Y = 10;
/** Vertical gap between a card and its children row (the connector run). */
const TIER_GAP = 48;
/** Horizontal gap between adjacent sibling subtrees. */
const SIBLING_GAP = 28;
/** Outer padding around the whole diagram. */
const PADDING = 40;

/* --- compaction knobs (task 2.3) --- */
/** A fanned subtree may take at most this fraction of the viewport before it stacks. */
const STACK_VIEWPORT_FRACTION = 0.85;
/** Indent per depth level inside a vertical stack. */
const STACK_INDENT = 22;
/** Vertical gap between cards inside a stack. */
const STACK_GAP = 12;

/* --- roster display model (kept in sync with TopdownNode's rendering) --- */
/** Manager title-groups shown before the surplus collapses behind the `＋N` expander. */
export const MAX_MANAGER_ROWS = 4;
/** Estimated staff names per wrapped line when a roster renders in full. */
const STAFF_NAMES_PER_LINE = 3;

export interface TopdownLayoutOptions {
  /** Available width in px; drives the stacking budget. Omit for “never stack”. */
  viewportWidth?: number;
  /** Print mode: every roster renders in full (no `＋N` affordance, taller cards). */
  fullRosters?: boolean;
  /** Node ids whose roster the user expanded interactively (task 4.4). */
  expandedIds?: ReadonlySet<string>;
}

export interface LayoutNode {
  id: string;
  node: ChartNode;
  /** Left edge (px, diagram coordinates before the zoom transform). */
  x: number;
  /** Top edge. */
  y: number;
  width: number;
  height: number;
  /** Whether this node's roster renders in full (print or user-expanded). */
  fullRoster: boolean;
  /** True when this node was placed by the vertical-stack rule (indented list). */
  stacked: boolean;
  branchId: string;
}

export interface LayoutEdge {
  id: string;
  fromId: string;
  toId: string;
  /** 'fan' = orthogonal elbow below the parent; 'stack' = indented └ connector. */
  kind: 'fan' | 'stack';
}

/** A 兼務 posting drawn as a dashed cross-link between two department nodes. */
export interface KenmuLink {
  id: string;
  fromId: string;
  toId: string;
  label: string;
}

export interface TopdownLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  kenmu: KenmuLink[];
  width: number;
  height: number;
}

/** Count of manager roster lines: consecutive same-title members share one line. */
function managerGroupCount(node: ChartNode): number {
  let groups = 0;
  let lastTitle: string | null = null;
  for (const member of node.managers) {
    if (member.title !== lastTitle) {
      groups += 1;
      lastTitle = member.title;
    }
  }
  return groups;
}

/** Rendered card height for a node given its roster display mode. */
export function cardHeight(node: ChartNode, fullRoster: boolean): number {
  const groups = managerGroupCount(node);
  let rows: number;
  if (fullRoster) {
    rows = groups + Math.ceil(node.staff.length / STAFF_NAMES_PER_LINE);
  } else {
    const truncated = groups > MAX_MANAGER_ROWS;
    rows = Math.min(groups, MAX_MANAGER_ROWS) + (node.staff.length > 0 ? 1 : 0) + (truncated ? 1 : 0);
  }
  return HEADER_HEIGHT + rows * ROSTER_LINE_HEIGHT + CARD_PAD_Y * 2;
}

/** Number of leaf departments under a node (the node itself if childless). */
function leafCount(node: ChartNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, child) => sum + leafCount(child), 0);
}

/** A subtree's width if fanned out fully horizontally (every leaf its own column). */
function fanWidth(node: ChartNode): number {
  return leafCount(node) * (CARD_WIDTH + SIBLING_GAP);
}

/** One card already positioned inside a stacked subtree, relative to the stack's top-left. */
interface StackPlacement {
  node: ChartNode;
  relX: number;
  relY: number;
  height: number;
  parentId: string | null;
}

/** flextree datum: a fanned node (with children), or a whole stacked subtree as one box. */
interface Datum {
  node: ChartNode | null;
  size: [number, number];
  children: Datum[];
  stack?: StackPlacement[];
}

export function computeTopdownLayout(
  roots: ChartNode[],
  options: TopdownLayoutOptions = {},
): TopdownLayout {
  if (roots.length === 0) return { nodes: [], edges: [], kenmu: [], width: 0, height: 0 };

  const { viewportWidth, fullRosters = false, expandedIds } = options;
  const stackBudget = viewportWidth ? viewportWidth * STACK_VIEWPORT_FRACTION : Infinity;
  const isFull = (node: ChartNode) => fullRosters || (expandedIds?.has(node.id) ?? false);

  /** DFS-places a subtree as an indented vertical list; returns its bounding box. */
  function buildStack(node: ChartNode): { placements: StackPlacement[]; width: number; height: number } {
    const placements: StackPlacement[] = [];
    let cursorY = 0;
    let maxDepth = 0;
    const place = (n: ChartNode, depth: number, parentId: string | null) => {
      maxDepth = Math.max(maxDepth, depth);
      const height = cardHeight(n, isFull(n));
      placements.push({ node: n, relX: depth * STACK_INDENT, relY: cursorY, height, parentId });
      cursorY += height + STACK_GAP;
      for (const child of n.children) place(child, depth + 1, n.id);
    };
    place(node, 0, null);
    return { placements, width: CARD_WIDTH + maxDepth * STACK_INDENT, height: cursorY - STACK_GAP };
  }

  /** Depth 0 = divisions (never stacked); deeper subtrees stack when they blow the budget. */
  function toDatum(node: ChartNode, depth: number): Datum {
    if (depth >= 1 && node.children.length > 0 && fanWidth(node) > stackBudget) {
      const { placements, width, height } = buildStack(node);
      return { node, size: [width, height + TIER_GAP], children: [], stack: placements };
    }
    return {
      node,
      size: [CARD_WIDTH, cardHeight(node, isFull(node)) + TIER_GAP],
      children: node.children.map((child) => toDatum(child, depth + 1)),
    };
  }

  // A zero-size virtual root lets flextree lay out the whole forest at once.
  const rootDatum: Datum = { node: null, size: [0, 0], children: roots.map((r) => toDatum(r, 0)) };
  const layout = flextree<Datum>({
    children: (d) => (d.children.length ? d.children : null),
    nodeSize: (n) => n.data.size,
    spacing: () => SIBLING_GAP,
  });
  const tree = layout.hierarchy(rootDatum);
  layout(tree);

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  const nameToId = new Map<string, string>();

  tree.each((hnode: FlextreeNode<Datum>) => {
    const chart = hnode.data.node;
    if (!chart) return; // the virtual root
    const parentChart = hnode.parent?.data.node;

    if (hnode.data.stack) {
      // Emit every card of the stacked subtree; flextree positioned the box's center.
      const boxLeft = hnode.x - hnode.data.size[0] / 2;
      for (const placement of hnode.data.stack) {
        nameToId.set(placement.node.name, placement.node.id);
        nodes.push({
          id: placement.node.id,
          node: placement.node,
          x: boxLeft + placement.relX,
          y: hnode.y + placement.relY,
          width: CARD_WIDTH,
          height: placement.height,
          fullRoster: isFull(placement.node),
          stacked: placement.relX > 0,
          branchId: placement.node.branchId,
        });
        const parentId = placement.parentId ?? parentChart?.id ?? null;
        if (parentId) {
          edges.push({
            id: `${parentId}->${placement.node.id}`,
            fromId: parentId,
            toId: placement.node.id,
            kind: placement.parentId ? 'stack' : 'fan',
          });
        }
      }
      return;
    }

    nameToId.set(chart.name, chart.id);
    nodes.push({
      id: chart.id,
      node: chart,
      x: hnode.x - CARD_WIDTH / 2,
      y: hnode.y,
      width: CARD_WIDTH,
      height: cardHeight(chart, isFull(chart)),
      fullRoster: isFull(chart),
      stacked: false,
      branchId: chart.branchId,
    });
    if (parentChart) {
      edges.push({ id: `${parentChart.id}->${chart.id}`, fromId: parentChart.id, toId: chart.id, kind: 'fan' });
    }
  });

  // 兼務 cross-links: resolve each concurrent member's source department name to a node.
  const kenmu: KenmuLink[] = [];
  const seen = new Set<string>();
  for (const { node } of nodes) {
    for (const member of [...node.managers, ...node.staff]) {
      if (!member.concurrent || !member.sourceDepartmentName) continue;
      const fromId = nameToId.get(member.sourceDepartmentName);
      if (!fromId || fromId === node.id) continue;
      const id = `kenmu-${member.sysId}-${node.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      kenmu.push({
        id,
        fromId,
        toId: node.id,
        label: member.sourceTitle ? `${member.displayName} ・ ${member.sourceTitle}` : member.displayName,
      });
    }
  }

  // Normalize to a (0,0)-anchored box with outer padding.
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  for (const n of nodes) {
    n.x += PADDING - minX;
    n.y += PADDING - minY;
  }
  const width = Math.max(...nodes.map((n) => n.x + n.width)) + PADDING;
  const height = Math.max(...nodes.map((n) => n.y + n.height)) + PADDING;

  return { nodes, edges, kenmu, width, height };
}
