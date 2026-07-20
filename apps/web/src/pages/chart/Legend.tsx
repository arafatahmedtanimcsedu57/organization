import type { ChartNode } from '../../store/api/chartNode';
import { branchColorFor } from './branchColor';

/** `.legend` — explains the chart's visual conventions (branch color per top-level division,
 * the dashed 兼務 chip/arrow) so a printed or exported chart is self-explanatory without the
 * interactive UI around it. Renders in both interactive and print mode. */
export function Legend({ roots }: { roots: ChartNode[] }) {
  if (roots.length === 0) return null;

  return (
    <div className="legend" aria-label="Chart legend">
      <div className="legend-group">
        {roots.map((root) => {
          const { rail } = branchColorFor(root.branchId);
          return (
            <span className="legend-item" key={root.id}>
              <span className="legend-swatch" style={{ background: rail }} aria-hidden="true" />
              {root.name}
            </span>
          );
        })}
      </div>
      <div className="legend-group">
        <span className="legend-item">
          <span className="p kenmu legend-kenmu">
            <span className="kenmu-mark">兼</span>
          </span>
          兼務（concurrent duty — chip names the source department + title）
        </span>
      </div>
    </div>
  );
}
