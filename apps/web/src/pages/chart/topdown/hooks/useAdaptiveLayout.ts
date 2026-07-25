import { useEffect, useMemo, useState } from 'react';
import {
  BUDGET_QUANTUM,
  MIN_BUDGET_WIDTH,
  OVERVIEW_PROBES,
  OVERVIEW_PROBE_GROWTH,
} from '../../../../constants/chartLayout';
import type { ChartNode } from '../../../../store/api/chartNode';
import { computeTopdownLayout, type TopdownLayout } from '../topdownLayout';
import type { ViewportSize } from './useViewportSize';

/** Budgets are bucketed so small zoom nudges cannot thrash the layout. */
function quantize(value: number): number {
  return Math.max(MIN_BUDGET_WIDTH, Math.round(value / BUDGET_QUANTUM) * BUDGET_QUANTUM);
}

export interface BudgetInputs {
  viewportWidth: number;
  /** Row-wrap width that best matches the viewport's aspect ratio (see `useOverviewBudget`). */
  overviewBudget: number | undefined;
  userControlled: boolean;
  settledScale: number;
  /** The budget the current layout was computed with. */
  current: number | undefined;
  /** Width of the layout that budget produced. */
  currentLayoutWidth: number;
}

/**
 * The stacking budget for the next layout: the width actually visible at the settled zoom
 * (zoomed in ⇒ narrower ⇒ more stacking and tighter row wrapping), capped at the overview
 * budget so a zoomed-out view wraps toward the viewport's shape instead of a tall sliver.
 *
 * Pure, and deliberately fed its own previous output — the hysteresis below is what keeps
 * "fit → relayout → refit" from ping-ponging between two wrappings.
 */
export function nextBudgetWidth({
  viewportWidth,
  overviewBudget,
  userControlled,
  settledScale,
  current,
  currentLayoutWidth,
}: BudgetInputs): number | undefined {
  if (!viewportWidth || !overviewBudget) return undefined;
  const cap = quantize(Math.max(overviewBudget, viewportWidth));
  // Auto-fit mode pins the budget to the zoom-independent overview value: letting it follow
  // the fitted zoom would make fit → relayout → refit chase itself.
  if (!userControlled) return cap;
  // User mode follows the width visible at the settled zoom, with hysteresis so the
  // auto→user mode flip alone never restructures (on large screens the fit is
  // height-limited, leaving `visible` below the pinned overview budget): shrink only when
  // the current layout truly overflows the view (horizontal dragging would be needed),
  // grow only when zooming back out.
  const visible = viewportWidth / Math.max(settledScale, 0.01);
  const desired = quantize(Math.min(visible, cap));
  const previous = current ?? cap;
  // Dead-bands: at the fitted zoom `visible ≈ layout width`, so rounding noise must never
  // trigger a relayout — only meaningful zoom changes may.
  if (desired >= previous + 2 * BUDGET_QUANTUM) return desired; // zooming out: re-fan wider
  if (desired < previous && visible < currentLayoutWidth - BUDGET_QUANTUM) {
    return desired; // zoomed in far enough that the layout truly overflows: compact
  }
  return previous; // stable zone: leave the layout alone
}

/**
 * The row-wrap width whose resulting diagram shape best matches the viewport's aspect ratio.
 * Found by probing a few candidate widths (a layout pass is cheap); an area-based estimate
 * alone undershoots because stacking and row gaps add height.
 */
function useOverviewBudget(roots: ChartNode[], viewport: ViewportSize): number | undefined {
  const unbounded = useMemo(() => computeTopdownLayout(roots, {}), [roots]);
  return useMemo(() => {
    if (unbounded.width === 0 || !viewport.width || !viewport.height) return undefined;
    const targetAspect = viewport.width / viewport.height;
    let candidate = Math.sqrt(unbounded.width * unbounded.height * targetAspect);
    let best = candidate;
    let bestScore = Infinity;
    for (let probe = 0; probe < OVERVIEW_PROBES; probe++) {
      const probed = computeTopdownLayout(roots, { viewportWidth: candidate });
      const aspect = probed.width / probed.height;
      const score = Math.abs(Math.log(aspect / targetAspect));
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
      if (aspect >= targetAspect) break; // wide enough — widening further only overshoots
      candidate *= OVERVIEW_PROBE_GROWTH; // too tall: widen the rows and retry
    }
    return best;
  }, [roots, unbounded, viewport.width, viewport.height]);
}

export interface UseAdaptiveLayoutOptions {
  roots: ChartNode[];
  viewport: ViewportSize;
  /** Zoom scale after the last settled gesture (from `useCanvasZoom`). */
  settledScale: number;
  userControlled: boolean;
  /** Node ids whose roster the user expanded interactively. */
  expandedIds: ReadonlySet<string>;
}

/**
 * The laid-out tree, recomputed only when the data, the effective width, or an expansion
 * changes.
 *
 * The budget the layout was built with is held in state and reconciled after commit, so
 * render stays pure: the layout React paints is always the one its committed budget
 * produced, and the fixpoint (`nextBudgetWidth` returning its own input) ends the loop
 * after at most one extra pass.
 */
export function useAdaptiveLayout({
  roots,
  viewport,
  settledScale,
  userControlled,
  expandedIds,
}: UseAdaptiveLayoutOptions): TopdownLayout {
  const overviewBudget = useOverviewBudget(roots, viewport);
  const [budgetWidth, setBudgetWidth] = useState<number | undefined>(undefined);

  const layout = useMemo(
    () => computeTopdownLayout(roots, { viewportWidth: budgetWidth, expandedIds }),
    [roots, budgetWidth, expandedIds],
  );

  // The budget is a hysteresis state machine whose next value depends on the width of the
  // layout the *current* value produced — a genuine feedback loop, so it cannot be derived
  // in a single pass. Reconciling after commit is the least-bad of the three options: doing
  // it during render needs a render-phase setState or a ref written during render (both
  // impure), and pushing it into the resize/gesture callbacks would spread the layout logic
  // across the zoom and resize hooks and re-introduce refs mirroring layout state.
  //
  // The loop is provably finite: `nextBudgetWidth` returns its own `current` input inside
  // the dead-band, so it reaches a fixpoint after at most one extra pass, and the identity
  // bail-out below means the steady state costs no re-render at all.
  useEffect(() => {
    const next = nextBudgetWidth({
      viewportWidth: viewport.width,
      overviewBudget,
      userControlled,
      settledScale,
      current: budgetWidth,
      currentLayoutWidth: layout.width,
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- documented fixpoint, see above
    setBudgetWidth((prev) => (prev === next ? prev : next));
  }, [viewport.width, overviewBudget, userControlled, settledScale, budgetWidth, layout.width]);

  return layout;
}
