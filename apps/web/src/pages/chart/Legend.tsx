import { useMemo } from 'react';
import type { ChartNode } from '../../store/api/chartNode';
import { createBranchColorResolver } from './branchColor';

/** `.legend` - explains the chart's visual conventions (branch color per top-level division,
 * the dashed 兼務 chip/arrow) so a printed or exported chart is self-explanatory without the
 * interactive UI around it. Renders in both interactive and print mode. */
export function Legend({ roots }: { roots: ChartNode[] }) {
  const resolveBranchColor = useMemo(
    () => createBranchColorResolver(roots.map((root) => root.branchId)),
    [roots],
  );
  if (roots.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-[22px] gap-y-2" aria-label="Chart legend">
      <div className="flex flex-wrap items-center gap-x-[14px] gap-y-1.5">
        {roots.map((root) => {
          const { rail } = resolveBranchColor(root.branchId);
          return (
            <span
              className="inline-flex items-center gap-1.5 text-[12px] text-sub font-jp"
              key={root.id}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: rail }}
                aria-hidden="true"
              />
              {root.name}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-[14px] gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-sub font-jp">
          <span className="p kenmu inline-flex items-baseline gap-1 py-[1px] px-2 border border-dashed border-brand rounded-full bg-brand-tint text-brand-dark font-jp text-[13.5px]">
            <span className="kenmu-mark font-bold">兼</span>
          </span>
          兼務（concurrent duty - chip names the source department + title）
        </span>
      </div>
    </div>
  );
}
