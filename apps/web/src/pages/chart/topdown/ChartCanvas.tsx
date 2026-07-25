import { 
  useCallback, 
  useMemo, 
  useRef, 
  useState 
} from 'react';

import { CanvasStage } from './CanvasStage';
import { CanvasToolbar } from './CanvasToolbar';
import type { LayoutNode } from './topdownLayout';

import { useAdaptiveLayout } from './hooks/useAdaptiveLayout';
import { useAutoFit } from './hooks/useAutoFit';
import { useCanvasFit } from './hooks/useCanvasFit';
import { useCanvasKeyboard } from './hooks/useCanvasKeyboard';
import { useCanvasSearch } from './hooks/useCanvasSearch';
import { useCanvasZoom } from './hooks/useCanvasZoom';
import { useExpandedNodes } from './hooks/useExpandedNodes';
import { useFullscreen } from './hooks/useFullscreen';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useViewportSize } from './hooks/useViewportSize';

import type { ChartNode } from '../../../store/api/chartNode';

import { ZOOM_STEP } from '../../../constants/canvasZoom';
import { BranchColorProvider, createBranchColorResolver } from '../branchColor';

export interface ChartCanvasProps {
  roots: ChartNode[];
  selectedId?: string | null;
  onSelectNode?: (node: ChartNode | null) => void;
}

/**
 * `.topdown-canvas` - the interactive organogram canvas (`chart-canvas` capability): a
 * flextree top-down layout on a pannable/zoomable dotted-grid surface with a floating
 * toolbar (search, fit, zoom, fullscreen).
 *
 * This component only wires the pieces together; each behavior lives in its own hook:
 * `useCanvasZoom` (gestures and the crisp-text bake), `useAdaptiveLayout` (zoom-adaptive
 * compaction), `useCanvasFit` + `useAutoFit` (framing and anchoring across relayouts),
 * `useCanvasSearch`, `useExpandedNodes`, `useFullscreen`, `useCanvasKeyboard`.
 */
export function ChartCanvas({ roots, selectedId = null, onSelectNode }: ChartCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  /** The three layers of the zoom surface, owned here and driven by `useCanvasZoom`. */
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomLayerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const zoom = useCanvasZoom({ viewportRef, stageRef, zoomLayerRef });
  const reducedMotion = useReducedMotion();
  const viewport = useViewportSize(viewportRef);
  const { isFullscreen, toggleFullscreen } = useFullscreen(wrapperRef);
  const { expandedIds, toggleExpand } = useExpandedNodes(zoom.takeControl);

  const layout = useAdaptiveLayout({
    roots,
    viewport,
    settledScale: zoom.settledScale,
    userControlled: zoom.userControlled,
    expandedIds,
  });
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout]);
  const resolveBranchColor = useMemo(
    () => createBranchColorResolver(roots.map((root) => root.branchId)),
    [roots],
  );

  const { fitToScreen, fitToNode } = useCanvasFit({ layout, nodeById, viewportRef, zoom });
  useAutoFit({ roots, layout, viewport, nodeById, viewportRef, zoom, fitToScreen });

  const search = useCanvasSearch({ layout, fitToNode });
  const handleKeyDown = useCanvasKeyboard({
    panBy: zoom.panBy,
    zoomBy: zoom.zoomBy,
    fitToScreen,
  });

  const handleSelect = useCallback(
    (item: LayoutNode) => onSelectNode?.(item.node),
    [onSelectNode],
  );
  const zoomIn = useCallback(() => zoom.zoomBy(ZOOM_STEP), [zoom]);
  const zoomOut = useCallback(() => zoom.zoomBy(1 / ZOOM_STEP), [zoom]);
  const fit = useCallback(() => fitToScreen(), [fitToScreen]);

  return (
    <div ref={wrapperRef} className="topdown-wrap relative bg-surface">
      <CanvasToolbar
        query={search.query}
        onQueryChange={search.setQuery}
        onSubmitSearch={search.cycleMatch}
        matchCount={search.matches.length}
        activeMatch={search.activeMatch}
        zoomPct={zoom.zoomPct}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fit}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <div
        ref={viewportRef}
        role="application"
        aria-label="Organization chart canvas"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        // `touch-none`: d3-zoom needs the browser's native touch panning disabled on the
        // element, or mobile drags/pinches are consumed by page scrolling and never reach it.
        className={`topdown-canvas relative overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          isFullscreen ? 'h-screen' : 'h-[72vh] min-h-[440px]'
        } bg-[radial-gradient(circle,var(--color-line)_1px,transparent_1px)] [background-size:22px_22px]`}
      >
        {/* Outer: fast `transform` during gestures. Inner: the settled scale baked as CSS
            `zoom` (see useCanvasZoom) so text re-lays-out natively sharp at any zoom. No
            `will-change-transform`: permanent compositing would freeze rasterization. */}
        <div ref={stageRef} className="absolute top-0 left-0 origin-top-left">
          <div ref={zoomLayerRef}>
            <BranchColorProvider value={resolveBranchColor}>
              <CanvasStage
                layout={layout}
                matchSet={search.matchSet}
                activeMatchId={search.activeMatchId}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                animateLayout={!reducedMotion}
                onSelect={handleSelect}
                onToggleExpand={toggleExpand}
              />
            </BranchColorProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
