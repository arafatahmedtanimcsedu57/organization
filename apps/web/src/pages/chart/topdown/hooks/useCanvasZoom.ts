import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import 'd3-transition'; // side-effect: enables selection.transition() for eased zoom
import {
  BAKE_DELAY_MS,
  MAX_SCALE,
  MIN_SCALE,
  SETTLED_SCALE_EPSILON,
  SUPPORTS_CSS_ZOOM,
  TRANSITION_MS,
} from '../../../../constants/canvasZoom';
import { useReducedMotion } from './useReducedMotion';

export interface CanvasZoomElements {
  /** The gesture surface: d3-zoom is bound here and it defines the visible box. */
  viewportRef: RefObject<HTMLDivElement | null>;
  /** Outer layer that carries the live `transform` during a gesture. */
  stageRef: RefObject<HTMLDivElement | null>;
  /** Inner layer that receives the settled scale as CSS `zoom`. */
  zoomLayerRef: RefObject<HTMLDivElement | null>;
}

export interface CanvasZoom {
  /** Live transform, readable from callbacks without re-rendering on every zoom frame. */
  transformRef: RefObject<ZoomTransform>;
  /** Mirrors `userControlled` for cheap checks in hot paths (60Hz zoom events). */
  userControlledRef: RefObject<boolean>;
  /** Rounded zoom percentage for the toolbar readout. */
  zoomPct: number;
  /** Scale after the last settled gesture; drives the adaptive stacking budget. */
  settledScale: number;
  /** False in auto-fit mode (initial load / after "Fit"); true once the user takes over. */
  userControlled: boolean;
  /** Any deliberate view action (gesture, zoom button, search jump, ＋N) exits auto-fit. */
  takeControl: () => void;
  /** "Fit" hands the view back to auto-fit mode. */
  releaseControl: () => void;
  transformTo: (transform: ZoomTransform, animate: boolean) => void;
  zoomBy: (factor: number) => void;
  panBy: (dx: number, dy: number) => void;
}

/**
 * Owns the canvas's pan/zoom: d3-zoom wiring, the transform → DOM plumbing, and the
 * crisp-text bake.
 *
 * The transform lives in refs and is written straight to the DOM, so gestures never
 * re-render the tree mid-flight; React state only sees the rounded percentage and the
 * settled scale.
 *
 * Crisp-text strategy: `transform: scale()` rasterizes the cards at layout size and
 * GPU-downscales the bitmap, which blurs text below 100%. So the gesture runs on a fast
 * `transform` (scaled relative to the last baked zoom), and once it settles for a beat the
 * scale is **baked** as CSS `zoom` on the inner layer — real layout at the target size, so
 * glyphs render natively sharp at any zoom. Falls back to pure transform where CSS `zoom`
 * is unsupported.
 *
 * Deliberately knows nothing about the layout: `useCanvasFit` composes the two, which keeps
 * the layout free to depend on `settledScale` without a cycle. The three DOM refs are owned
 * by the component that renders those elements and handed in here.
 */
export function useCanvasZoom({
  viewportRef,
  stageRef,
  zoomLayerRef,
}: CanvasZoomElements): CanvasZoom {
  const behaviorRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const zoomPctRef = useRef(100);
  /** Scale currently baked into the zoom layer as CSS `zoom`. */
  const bakedScaleRef = useRef(1);
  const bakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userControlledRef = useRef(false);

  const [zoomPct, setZoomPct] = useState(100);
  const [settledScale, setSettledScale] = useState(1);
  const [userControlled, setUserControlled] = useState(false);
  const reducedMotion = useReducedMotion();

  const takeControl = useCallback(() => {
    if (!userControlledRef.current) {
      userControlledRef.current = true;
      setUserControlled(true);
    }
  }, []);

  const releaseControl = useCallback(() => {
    userControlledRef.current = false;
    setUserControlled(false);
  }, []);

  /** Applies a zoom transform to the stage DOM; React state only sees the rounded %. */
  const applyTransform = useCallback((transform: ZoomTransform) => {
    transformRef.current = transform;
    if (stageRef.current) {
      const baked = bakedScaleRef.current;
      const { x, y, k } = transform;
      stageRef.current.style.transform = `translate(${x}px, ${y}px) scale(${k / baked})`;
    }
    if (bakeTimerRef.current) clearTimeout(bakeTimerRef.current);
    bakeTimerRef.current = setTimeout(() => {
      bakeTimerRef.current = null;
      const settled = transformRef.current;
      const layer = zoomLayerRef.current;
      const stage = stageRef.current;
      if (SUPPORTS_CSS_ZOOM && layer && stage) {
        // Atomic (same task): re-layout the content at the settled scale and reset the
        // outer transform to plain translation, so the swap causes no visual jump.
        bakedScaleRef.current = settled.k;
        layer.style.setProperty('zoom', String(settled.k));
        stage.style.transform = `translate(${settled.x}px, ${settled.y}px) scale(1)`;
      }
      // Feed the adaptive stacking budget; the epsilon skips no-op relayouts.
      setSettledScale((prev) => (Math.abs(prev - settled.k) < SETTLED_SCALE_EPSILON ? prev : settled.k));
    }, BAKE_DELAY_MS);
    const pct = Math.round(transform.k * 100);
    if (pct !== zoomPctRef.current) {
      zoomPctRef.current = pct;
      setZoomPct(pct);
    }
  }, [stageRef, zoomLayerRef]);

  // Wire d3-zoom once; the toolbar and node clicks are excluded from drag-panning.
  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;
    const behavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([MIN_SCALE, MAX_SCALE])
      .filter((event: Event & { ctrlKey?: boolean; button?: number; type: string }) => {
        const target = event.target as Element | null;
        if (target?.closest('.canvas-toolbar')) return false;
        if (event.type === 'wheel') return true;
        return !event.button;
      })
      .on('zoom', (event) => {
        // A real gesture (wheel/drag) hands view control to the user; programmatic
        // transforms (initial fit chain) keep auto-fitting until then.
        if (event.sourceEvent) takeControl();
        applyTransform(event.transform);
      });
    behaviorRef.current = behavior;
    const selection = select(viewportEl);
    selection.call(behavior).on('dblclick.zoom', null);
    return () => {
      // Own every allocation: the behavior's own listener, the element's `.zoom` listeners,
      // the ref, and any bake still pending from the last gesture.
      behavior.on('zoom', null);
      selection.on('.zoom', null);
      behaviorRef.current = null;
      if (bakeTimerRef.current) {
        clearTimeout(bakeTimerRef.current);
        bakeTimerRef.current = null;
      }
    };
  }, [applyTransform, takeControl, viewportRef]);

  const transformTo = useCallback(
    (transform: ZoomTransform, animate: boolean) => {
      const viewportEl = viewportRef.current;
      const behavior = behaviorRef.current;
      if (!viewportEl || !behavior) return;
      const selection = select(viewportEl);
      if (animate && !reducedMotion) {
        selection.transition().duration(TRANSITION_MS).call(behavior.transform, transform);
      } else {
        selection.call(behavior.transform, transform);
      }
    },
    [reducedMotion, viewportRef],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const viewportEl = viewportRef.current;
      const behavior = behaviorRef.current;
      if (!viewportEl || !behavior) return;
      takeControl();
      behavior.scaleBy(select(viewportEl), factor);
    },
    [takeControl, viewportRef],
  );

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const viewportEl = viewportRef.current;
      const behavior = behaviorRef.current;
      if (!viewportEl || !behavior) return;
      takeControl();
      behavior.translateBy(select(viewportEl), dx, dy);
    },
    [takeControl, viewportRef],
  );

  return {
    transformRef,
    userControlledRef,
    zoomPct,
    settledScale,
    userControlled,
    takeControl,
    releaseControl,
    transformTo,
    zoomBy,
    panBy,
  };
}
