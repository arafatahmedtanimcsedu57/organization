import { useMemo } from 'react';
import type { ChartNode } from '../../../store/api/chartNode';
import { computeTopdownLayout } from './topdownLayout';
import { CanvasStage } from './ChartCanvas';

/** Printable width of an A4 portrait page at CSS 96dpi (210mm − 2×8mm margins ≈ 194mm). */
const PRINT_WIDTH_PX = 736;
/** Floor below which text stops being readable; rather than shrinking further, the
 * stacking budget below compacts the tree until it fits at ≥ this scale (task 8.4). */
const MIN_PRINT_SCALE = 0.45;

/**
 * `.topdown-print` — the print/PDF rendering of the chart (`?print=1`): the Top-down
 * layout with **every roster expanded in full**, compacted via the vertical-stack rule
 * to a width that fits A4 portrait at a readable scale, then scaled fit-to-width.
 * Height flows onto additional pages; the interactive view's toolbar never renders here.
 */
export function TopdownPrint({ roots }: { roots: ChartNode[] }) {
  const layout = useMemo(
    () =>
      computeTopdownLayout(roots, {
        // Give the stacker a budget such that fit-to-width lands at ≥ MIN_PRINT_SCALE.
        viewportWidth: PRINT_WIDTH_PX / MIN_PRINT_SCALE,
        fullRosters: true,
      }),
    [roots],
  );
  if (layout.width === 0) return null;

  const scale = Math.min(1, PRINT_WIDTH_PX / layout.width);

  return (
    <div
      className="topdown-print"
      style={{ width: layout.width * scale, height: layout.height * scale }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: layout.width }}>
        <CanvasStage
          layout={layout}
          matchSet={new Set()}
          activeMatchId={null}
          selectedId={null}
          showAllKenmu
          onSelect={() => {}}
          onToggleExpand={() => {}}
        />
      </div>
    </div>
  );
}
