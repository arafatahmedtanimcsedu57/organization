import { flextree, type FlextreeNode } from 'd3-flextree';
import {
  CARD_PAD_Y,
  CARD_WIDTH,
  HEADER_HEIGHT,
  MAX_MANAGER_ROWS,
  PADDING,
  ROOT_GAP,
  ROSTER_LINE_HEIGHT,
  ROW_GAP,
  SIBLING_GAP,
  STACK_GAP,
  STACK_INDENT,
  STACK_VIEWPORT_FRACTION,
  STAFF_NAMES_PER_LINE,
  TIER_GAP,
} from '../../../constants/chartLayout';
import type { ChartNode } from '../../../store/api/chartNode';

/**
 * Top-down layout for the interactive canvas (`chart-canvas` capability).
 *
 * Two mechanisms keep the horizontal footprint - and thus horizontal scrolling -
 * minimal for the current viewport:
 *
 * 1. `d3-flextree` computes a tidy, variable-node-size Reingold–Tilford layout whose
 *    contour packing interlocks sibling subtree bounding boxes ("reuses the gaps").
 * 2. A **cascading compaction rule** turns subtrees into **vertical indented stacks**
 *    (children below one another, elbow connectors) when fanning them out horizontally
 *    would exceed their share of the viewport width - reproducing the hybrid look of
 *    the reference organogram. The cascade works bottom-up: the deepest crowded
 *    subtree stacks first, which shrinks its parent's fanned width, so upper tiers
 *    stay side-by-side whenever possible. A parent that still overflows greedily
 *    stacks its widest child subtrees one at a time, and collapses into a single
 *    list only as a last resort. The thresholds below are the tunable knobs.
 * 3. **Row wrapping**: the division forest greedily wraps into rows that fit the
 *    budget, so a wide organization grows downward (natural scrolling) instead of
 *    trailing off far to the right.
 *
 * All card metrics and tuning knobs live in `constants/chartLayout.ts`, which the card
 * renderer reads too - the height model here and the rows `TopdownNode` paints must agree.
 */

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
  /** The person's stable id - shared by their primary + concurrent rows, so the UI can
   * anchor the link name-to-name and cross-highlight every place they appear. */
  sysId: string;
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
  /** Width of this datum's laid-out subtree (a stack's box, or the fanned children row). */
  subtreeWidth: number;
}

/** Width of a fanned children row (contour-packed lower bound flextree can only beat). */
function fannedWidth(children: Datum[]): number {
  if (children.length === 0) return CARD_WIDTH;
  const sum = children.reduce((acc, child) => acc + child.subtreeWidth, 0);
  return Math.max(CARD_WIDTH, sum + SIBLING_GAP * (children.length - 1));
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

  /** The whole subtree under `node` as one indented-list box. */
  function stackDatum(node: ChartNode): Datum {
    const { placements, width, height } = buildStack(node);
    return { node, size: [width, height + TIER_GAP], children: [], stack: placements, subtreeWidth: width };
  }

  /**
   * Bottom-up cascade (depth 0 = divisions, which never stack themselves): children are
   * resolved first, so a deep subtree that stacked already reads as one narrow box here.
   * An overflowing parent then greedily stacks its widest fanned children until it fits,
   * and only collapses into a single list itself when even that is not enough.
   */
  function toDatum(node: ChartNode, depth: number): Datum {
    const children = node.children.map((child) => toDatum(child, depth + 1));
    let width = fannedWidth(children);
    if (children.length > 0 && width > stackBudget) {
      const tried = new Set<number>();
      while (width > stackBudget) {
        let widest = -1;
        for (let i = 0; i < children.length; i++) {
          const child = children[i]!;
          if (child.stack || child.children.length === 0 || tried.has(i)) continue;
          if (widest < 0 || child.subtreeWidth > children[widest]!.subtreeWidth) widest = i;
        }
        if (widest < 0) break;
        tried.add(widest);
        const stacked = stackDatum(children[widest]!.node!);
        if (stacked.subtreeWidth < children[widest]!.subtreeWidth) {
          children[widest] = stacked;
          width = fannedWidth(children);
        }
      }
      if (depth >= 1 && width > stackBudget) return stackDatum(node);
    }
    return {
      node,
      size: [CARD_WIDTH, cardHeight(node, isFull(node)) + TIER_GAP],
      children,
      subtreeWidth: width,
    };
  }

  // Wrap the division forest into rows that fit the budget: a wide organization
  // grows downward instead of trailing off to the right. No budget = one row.
  const rootDatums = roots.map((r) => toDatum(r, 0));
  const rowBudget = viewportWidth ?? Infinity;
  const rows: Datum[][] = [];
  let row: Datum[] = [];
  let rowWidth = 0;
  for (const datum of rootDatums) {
    const grown = rowWidth + ROOT_GAP + datum.subtreeWidth;
    if (row.length > 0 && grown > rowBudget) {
      rows.push(row);
      row = [datum];
      rowWidth = datum.subtreeWidth;
    } else {
      row.push(datum);
      rowWidth = row.length === 1 ? datum.subtreeWidth : grown;
    }
  }
  if (row.length > 0) rows.push(row);

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  const nameToId = new Map<string, string>();
  let rowY = 0;

  // Each row is laid out by its own flextree pass under a zero-size virtual root,
  // then shifted below the previous row.
  for (const rowDatums of rows) {
    const rootDatum: Datum = { node: null, size: [0, 0], children: rowDatums, subtreeWidth: 0 };
    const layout = flextree<Datum>({
      children: (d) => (d.children.length ? d.children : null),
      nodeSize: (n) => n.data.size,
      spacing: (a, b) => (a.depth === 1 && b.depth === 1 ? ROOT_GAP : SIBLING_GAP),
    });
    const tree = layout.hierarchy(rootDatum);
    layout(tree);

    const rowNodes: LayoutNode[] = [];
    tree.each((hnode: FlextreeNode<Datum>) => {
      const chart = hnode.data.node;
      if (!chart) return; // the virtual root
      const parentChart = hnode.parent?.data.node;

      if (hnode.data.stack) {
        // Emit every card of the stacked subtree; flextree positioned the box's center.
        const boxLeft = hnode.x - hnode.data.size[0] / 2;
        for (const placement of hnode.data.stack) {
          const stackedNode = placement.node;
          const stackedId = stackedNode.id;
          nameToId.set(stackedNode.name, stackedId);
          rowNodes.push({
            id: stackedId,
            node: stackedNode,
            x: boxLeft + placement.relX,
            y: hnode.y + placement.relY,
            width: CARD_WIDTH,
            height: placement.height,
            fullRoster: isFull(stackedNode),
            stacked: placement.relX > 0,
            branchId: stackedNode.branchId,
          });
          const parentId = placement.parentId ?? parentChart?.id ?? null;
          if (parentId) {
            edges.push({
              id: `${parentId}->${stackedId}`,
              fromId: parentId,
              toId: stackedId,
              kind: placement.parentId ? 'stack' : 'fan',
            });
          }
        }
        return;
      }

      nameToId.set(chart.name, chart.id);
      rowNodes.push({
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

    // Left-align the row and drop it below the previous one.
    const rowMinX = Math.min(...rowNodes.map((n) => n.x));
    const rowMinY = Math.min(...rowNodes.map((n) => n.y));
    for (const n of rowNodes) {
      n.x -= rowMinX;
      n.y += rowY - rowMinY;
    }
    rowY = Math.max(...rowNodes.map((n) => n.y + n.height)) + ROW_GAP;
    nodes.push(...rowNodes);
  }

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
        sysId: member.sysId,
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
