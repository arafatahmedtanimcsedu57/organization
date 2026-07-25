import { useCallback, type RefObject } from 'react';
import { zoomIdentity } from 'd3-zoom';
import { FIT_INSET, MIN_SCALE, NODE_FOCUS_MIN_SCALE } from '../../../../constants/canvasZoom';
import type { LayoutNode, TopdownLayout } from '../topdownLayout';
import type { CanvasZoom } from './useCanvasZoom';

export interface CanvasFit {
  /** Frame the whole diagram and hand the view back to auto-fit mode. */
  fitToScreen: (animate?: boolean) => void;
  /** Center one card, taking view control (used by search jumps). */
  fitToNode: (id: string) => void;
}

export interface UseCanvasFitOptions {
  layout: TopdownLayout;
  nodeById: ReadonlyMap<string, LayoutNode>;
  /** The element whose client box defines "the screen" being fitted to. */
  viewportRef: RefObject<HTMLDivElement | null>;
  zoom: CanvasZoom;
}

/** Framing helpers — the seam where the zoom behavior meets the current layout. */
export function useCanvasFit({
  layout,
  nodeById,
  viewportRef,
  zoom,
}: UseCanvasFitOptions): CanvasFit {
  const { transformRef, transformTo, takeControl, releaseControl } = zoom;
  const { width: layoutWidth, height: layoutHeight } = layout;

  const fitToScreen = useCallback(
    (animate = true) => {
      const viewportEl = viewportRef.current;
      if (!viewportEl || layoutWidth === 0) return;
      // "Fit" re-enters auto mode: the budget pins to the overview value and any follow-up
      // relayout is refitted, so the whole chart truly ends up on screen.
      releaseControl();
      const vw = viewportEl.clientWidth;
      const vh = viewportEl.clientHeight;
      const k = Math.max(MIN_SCALE, Math.min(vw / layoutWidth, vh / layoutHeight, 1));
      // Center when the whole diagram fits; when MIN_SCALE leaves it larger than the
      // viewport, anchor to the top-left so the first division is on-screen and pannable.
      const tx = layoutWidth * k <= vw ? (vw - layoutWidth * k) / 2 : FIT_INSET;
      const ty =
        layoutHeight * k <= vh ? Math.max(FIT_INSET, (vh - layoutHeight * k) / 2) : FIT_INSET;
      transformTo(zoomIdentity.translate(tx, ty).scale(k), animate);
    },
    [layoutWidth, layoutHeight, transformTo, releaseControl, viewportRef],
  );

  const fitToNode = useCallback(
    (id: string) => {
      const viewportEl = viewportRef.current;
      const item = nodeById.get(id);
      if (!viewportEl || !item) return;
      takeControl();
      const k = Math.max(transformRef.current.k, NODE_FOCUS_MIN_SCALE);
      const tx = viewportEl.clientWidth / 2 - k * (item.x + item.width / 2);
      const ty = viewportEl.clientHeight / 2 - k * (item.y + item.height / 2);
      transformTo(zoomIdentity.translate(tx, ty).scale(k), true);
    },
    [nodeById, transformTo, takeControl, viewportRef, transformRef],
  );

  return { fitToScreen, fitToNode };
}
