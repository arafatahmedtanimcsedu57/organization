import type { OrgNode } from '@org-chart/domain';

/** Presentation tier the SPA uses to style division/department/group cards differently. */
export type ChartTier = 'division' | 'department' | 'group';

/** Mirrors the API's `ChartNode` (`apps/api/src/org-chart/chart-node.ts`): an `OrgNode`
 * decorated with the tier + branch metadata the chart UI needs to render itself. */
export interface ChartNode extends Omit<OrgNode, 'children'> {
  tier: ChartTier;
  branchId: string;
  children: ChartNode[];
}
