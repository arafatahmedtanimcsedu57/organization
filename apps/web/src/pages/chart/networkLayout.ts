import type { ChartNode, ChartTier } from '../../store/api/chartNode';

/** Pixel constants for the dendrogram-style layout — a department per column-depth,
 * siblings stacked vertically. Kept in one place so NetworkView can size its SVG/HTML
 * layers from the same numbers used to compute positions. */
export const NODE_WIDTH = 208;
export const NODE_HEIGHT = 52;
const COL_WIDTH = 260;
const ROW_HEIGHT = 64;
const PADDING = 32;

export interface NetworkNode {
  id: string;
  name: string;
  nameEn?: string;
  tier: ChartTier;
  branchId: string;
  head: string;
  memberCount: number;
  x: number;
  y: number;
}

export interface NetworkEdge {
  id: string;
  fromId: string;
  toId: string;
}

export interface KenmuEdge extends NetworkEdge {
  label: string;
}

export interface NetworkLayout {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  kenmuEdges: KenmuEdge[];
  width: number;
  height: number;
}

function average(values: number[]): number {
  return (Math.min(...values) + Math.max(...values)) / 2;
}

/** Flattens the department tree into a node-link layout: x = depth (reporting-line
 * column), y = a dendrogram position (leaves stack in traversal order, parents center
 * over their children). Also resolves each concurrent member's `sourceDepartmentName`
 * to a node id so the caller can draw a dashed 兼務 arrow between the two departments. */
export function computeNetworkLayout(roots: ChartNode[]): NetworkLayout {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  const nameToId = new Map<string, string>();
  let leafIndex = 0;

  function layout(node: ChartNode, depth: number, parentId: string | null): number {
    nameToId.set(node.name, node.id);
    const y =
      node.children.length === 0
        ? leafIndex++ * ROW_HEIGHT
        : average(node.children.map((child) => layout(child, depth + 1, node.id)));

    nodes.push({
      id: node.id,
      name: node.name,
      nameEn: node.nameEn,
      tier: node.tier,
      branchId: node.branchId,
      head: node.head,
      memberCount: node.managers.length + node.staff.length,
      x: depth * COL_WIDTH + PADDING,
      y: y + PADDING,
    });
    if (parentId) edges.push({ id: `${parentId}->${node.id}`, fromId: parentId, toId: node.id });
    return y;
  }

  roots.forEach((root) => layout(root, 0, null));

  const kenmuEdges: KenmuEdge[] = [];
  function collectKenmu(node: ChartNode) {
    for (const member of [...node.managers, ...node.staff]) {
      if (!member.concurrent || !member.sourceDepartmentName) continue;
      const fromId = nameToId.get(member.sourceDepartmentName);
      if (!fromId) continue;
      kenmuEdges.push({
        id: `kenmu-${member.sysId}-${node.id}`,
        fromId,
        toId: node.id,
        label: member.sourceTitle ? `${member.displayName} ・ ${member.sourceTitle}` : member.displayName,
      });
    }
    node.children.forEach(collectKenmu);
  }
  roots.forEach(collectKenmu);

  const width = Math.max(0, ...nodes.map((n) => n.x)) + NODE_WIDTH + PADDING;
  const height = Math.max(0, ...nodes.map((n) => n.y)) + NODE_HEIGHT / 2 + PADDING;

  return { nodes, edges, kenmuEdges, width, height };
}
