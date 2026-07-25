import {
  STACK_ENTRY_OFFSET,
  STACK_RAIL_OFFSET,
} from '../../../constants/canvasConnectors';
import { useBranchColor } from '../branchColor';
import { roundedFanPath, roundedStackPath } from './canvasGeometry';
import type { LayoutNode, TopdownLayout } from './topdownLayout';

export interface TreeEdgesProps {
  layout: TopdownLayout;
  byId: ReadonlyMap<string, LayoutNode>;
}

/**
 * The parent→child connectors, drawn box-to-box **beneath** the cards (standard org-chart
 * look): orthogonal elbows for fanned tiers, indented └ runs for stacked ones, each in its
 * branch color.
 */
export function TreeEdges({ layout, byId }: TreeEdgesProps) {
  const resolveBranchColor = useBranchColor();
  return (
    <svg
      className="edges-morph absolute top-0 left-0 overflow-visible pointer-events-none"
      width={layout.width}
      height={layout.height}
      aria-hidden="true"
    >
      {layout.edges.map((edge) => {
        const from = byId.get(edge.fromId);
        const to = byId.get(edge.toId);
        if (!from || !to) return null;
        const { rail } = resolveBranchColor(to.branchId);
        const d =
          edge.kind === 'stack'
            ? roundedStackPath(
                from.x + STACK_RAIL_OFFSET,
                from.y + from.height,
                to.x,
                to.y + Math.min(STACK_ENTRY_OFFSET, to.height / 2),
              )
            : roundedFanPath(
                from.x + from.width / 2,
                from.y + from.height,
                to.x + to.width / 2,
                to.y,
              );
        return (
          <path
            key={edge.id}
            className="fill-none [stroke-linecap:round]"
            d={d}
            style={{ stroke: rail }}
          />
        );
      })}
    </svg>
  );
}
