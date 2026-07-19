import type { OrgNode } from '@org-chart/domain';

/** Presentation tier used by the SPA to style division/department/group cards differently. */
export type ChartTier = 'division' | 'department' | 'group';

/** An `OrgNode` decorated with the tier + branch metadata the chart UI needs to render itself. */
export interface ChartNode extends Omit<OrgNode, 'children'> {
  tier: ChartTier;
  /** Id of the top-level division this node's whole subtree hangs off; drives branch coloring. */
  branchId: string;
  children: ChartNode[];
}

function tierForDepth(depth: number): ChartTier {
  if (depth === 0) return 'division';
  if (depth === 1) return 'department';
  return 'group';
}

/**
 * Decorate the domain tree with `tier` (division/department/group, by depth) and `branchId`
 * (the owning top-level division's id, cascaded to every descendant) so the SPA can style
 * tiers and color-code branches without re-deriving depth/ancestry itself.
 */
export function annotateChartTree(roots: OrgNode[]): ChartNode[] {
  const annotate = (node: OrgNode, depth: number, branchId: string): ChartNode => ({
    ...node,
    tier: tierForDepth(depth),
    branchId,
    children: node.children.map((child) => annotate(child, depth + 1, branchId)),
  });

  return roots.map((root) => annotate(root, 0, root.id));
}
