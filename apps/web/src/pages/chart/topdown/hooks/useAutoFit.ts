import { useEffect, useRef, type RefObject } from 'react';
import { zoomIdentity } from 'd3-zoom';
import type { ChartNode } from '../../../../store/api/chartNode';
import type { LayoutNode, TopdownLayout } from '../topdownLayout';
import type { CanvasZoom } from './useCanvasZoom';
import type { ViewportSize } from './useViewportSize';

export interface UseAutoFitOptions {
  roots: ChartNode[];
  layout: TopdownLayout;
  viewport: ViewportSize;
  nodeById: ReadonlyMap<string, LayoutNode>;
  /** The element whose client box the anchoring math is done against. */
  viewportRef: RefObject<HTMLDivElement | null>;
  zoom: CanvasZoom;
  fitToScreen: (animate?: boolean) => void;
}

/**
 * Keeps the view sensible across relayouts.
 *
 * - **Fit** whenever the dataset or the viewport itself changes.
 * - **Anchor** across every other relayout (zoom compaction, ＋N expansion): shift the
 *   translation so the card nearest the viewport center stays put on screen, instead of the
 *   diagram jumping out from under the reader. While the view is still auto-fitting, refit
 *   instead so the whole chart stays framed.
 */
export function useAutoFit({
  roots,
  layout,
  viewport,
  nodeById,
  viewportRef,
  zoom,
  fitToScreen,
}: UseAutoFitOptions): void {
  const { transformRef, userControlledRef, transformTo } = zoom;
  const fittedRef = useRef(false);

  // Read through a ref so refitting is driven by the data and the viewport, not by the
  // identity of `fitToScreen` — that changes on every relayout, which is the anchoring
  // case handled separately below.
  const fitToScreenRef = useRef(fitToScreen);
  useEffect(() => {
    fitToScreenRef.current = fitToScreen;
  }, [fitToScreen]);

  // A laid-out chart is a precondition, not a trigger: this flips false→true once, when the
  // data first arrives, so depending on it cannot cause a refit on later re-packs.
  const hasLayout = layout.width > 0;
  useEffect(() => {
    if (!hasLayout || viewport.width === 0) return;
    fitToScreenRef.current(fittedRef.current);
    fittedRef.current = true;
  }, [roots, viewport.width, viewport.height, hasLayout]);

  const prevLayoutRef = useRef(layout);
  const prevRootsRef = useRef(roots);
  useEffect(() => {
    const previous = prevLayoutRef.current;
    const sameData = prevRootsRef.current === roots;
    prevLayoutRef.current = layout;
    prevRootsRef.current = roots;
    const viewportEl = viewportRef.current;
    if (!sameData || !fittedRef.current || previous === layout || !viewportEl) return;
    // Until the user takes over, keep the whole chart fitted across relayouts.
    if (!userControlledRef.current) {
      fitToScreenRef.current(true);
      return;
    }
    const transform = transformRef.current;
    const cx = (viewportEl.clientWidth / 2 - transform.x) / transform.k;
    const cy = (viewportEl.clientHeight / 2 - transform.y) / transform.k;
    let anchor: LayoutNode | null = null;
    let bestDistance = Infinity;
    for (const node of previous.nodes) {
      const distance = Math.hypot(node.x + node.width / 2 - cx, node.y + node.height / 2 - cy);
      if (distance < bestDistance) {
        bestDistance = distance;
        anchor = node;
      }
    }
    const moved = anchor && nodeById.get(anchor.id);
    if (!anchor || !moved) return;
    const dx = moved.x + moved.width / 2 - (anchor.x + anchor.width / 2);
    const dy = moved.y + moved.height / 2 - (anchor.y + anchor.height / 2);
    if (dx === 0 && dy === 0) return;
    const { x, y, k } = transform;
    transformTo(zoomIdentity.translate(x - dx * k, y - dy * k).scale(k), false);
  }, [layout, roots, nodeById, transformTo, viewportRef, transformRef, userControlledRef]);
}
