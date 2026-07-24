import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import 'd3-transition'; // side-effect: enables selection.transition() for eased zoom
import type { ChartNode } from '../../../store/api/chartNode';
import { branchColorFor } from '../branchColor';
import {
  computeTopdownLayout,
  type LayoutNode,
  type TopdownLayout,
} from './topdownLayout';
import { TopdownNode } from './TopdownNode';

const MIN_SCALE = 0.15;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 1.25;
const PAN_STEP = 48;
const TRANSITION_MS = 350;
/** Idle delay before the settled scale is baked as CSS `zoom` (crisp re-layout). */
const BAKE_DELAY_MS = 180;
/** CSS `zoom` is standard in Chrome/Edge/Safari and Firefox 126+; guard for older engines. */
const SUPPORTS_CSS_ZOOM =
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('zoom', '0.5');

/** One searchable entry: a department node plus its haystack text. */
interface SearchEntry {
  id: string;
  text: string;
}

function buildSearchIndex(layout: TopdownLayout): SearchEntry[] {
  return layout.nodes.map(({ id, node }) => ({
    id,
    text: [
      node.name,
      node.nameEn ?? '',
      node.head,
      ...node.managers.map((m) => `${m.displayName} ${m.title}`),
      ...node.staff.map((m) => `${m.displayName} ${m.title}`),
    ]
      .join(' ')
      .toLowerCase(),
  }));
}

export interface ChartCanvasProps {
  roots: ChartNode[];
  selectedId?: string | null;
  onSelectNode?: (node: ChartNode | null) => void;
}

/**
 * `.topdown-canvas` — the interactive organogram canvas (`chart-canvas` capability):
 * flextree top-down layout on a pannable/zoomable dotted-grid surface with a floating
 * toolbar (search, fit, zoom, fullscreen). The zoom transform lives in refs and is applied
 * straight to the DOM, so pan/zoom never re-renders or relayouts the tree.
 */
export function ChartCanvas({ roots, selectedId = null, onSelectNode }: ChartCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  /** Inner layer that receives the baked CSS `zoom` (see `applyTransform`). */
  const zoomLayerRef = useRef<HTMLDivElement>(null);
  const behaviorRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const zoomPctRef = useRef(100);
  /** Scale currently baked into the zoom layer as CSS `zoom`. */
  const bakedScaleRef = useRef(1);
  const bakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const [zoomPct, setZoomPct] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeMatch, setActiveMatch] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const reducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Task 2.4: relayout only when the data, the viewport width, or an expansion changes.
  const layout = useMemo(
    () => computeTopdownLayout(roots, { viewportWidth: viewport.width || undefined, expandedIds }),
    [roots, viewport.width, expandedIds],
  );
  const nodeById = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);
  const searchIndex = useMemo(() => buildSearchIndex(layout), [layout]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter((entry) => entry.text.includes(q)).map((entry) => entry.id);
  }, [query, searchIndex]);
  const matchSet = useMemo(() => new Set(matches), [matches]);

  /**
   * Applies a zoom transform to the stage DOM; React state only sees the rounded %.
   *
   * Crisp-text strategy: `transform: scale()` rasterizes the cards at layout size and
   * GPU-downscales the bitmap, which blurs text below 100%. So the gesture runs on a fast
   * `transform` (scaled relative to the last baked zoom), and once it settles for a beat the
   * scale is **baked** as CSS `zoom` on the inner layer — real layout at the target size, so
   * glyphs render natively sharp at any zoom. Falls back to pure transform where CSS `zoom`
   * is unsupported.
   */
  const applyTransform = useCallback((t: ZoomTransform) => {
    transformRef.current = t;
    if (stageRef.current) {
      const baked = bakedScaleRef.current;
      stageRef.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.k / baked})`;
    }
    if (SUPPORTS_CSS_ZOOM) {
      if (bakeTimerRef.current) clearTimeout(bakeTimerRef.current);
      bakeTimerRef.current = setTimeout(() => {
        const settled = transformRef.current;
        const layer = zoomLayerRef.current;
        const stage = stageRef.current;
        if (!layer || !stage) return;
        // Atomic (same task): re-layout the content at the settled scale and reset the
        // outer transform to plain translation, so the swap causes no visual jump.
        bakedScaleRef.current = settled.k;
        layer.style.setProperty('zoom', String(settled.k));
        stage.style.transform = `translate(${settled.x}px, ${settled.y}px) scale(1)`;
      }, BAKE_DELAY_MS);
    }
    const pct = Math.round(t.k * 100);
    if (pct !== zoomPctRef.current) {
      zoomPctRef.current = pct;
      setZoomPct(pct);
    }
  }, []);

  useEffect(
    () => () => {
      if (bakeTimerRef.current) clearTimeout(bakeTimerRef.current);
    },
    [],
  );

  const transformTo = useCallback(
    (t: ZoomTransform, animate: boolean) => {
      const viewportEl = viewportRef.current;
      const behavior = behaviorRef.current;
      if (!viewportEl || !behavior) return;
      const sel = select(viewportEl);
      if (animate && !reducedMotion) {
        sel.transition().duration(TRANSITION_MS).call(behavior.transform, t);
      } else {
        sel.call(behavior.transform, t);
      }
    },
    [reducedMotion],
  );

  const fitToScreen = useCallback(
    (animate = true) => {
      const viewportEl = viewportRef.current;
      if (!viewportEl || layout.width === 0) return;
      const vw = viewportEl.clientWidth;
      const vh = viewportEl.clientHeight;
      const k = Math.max(MIN_SCALE, Math.min(vw / layout.width, vh / layout.height, 1));
      // Center when the whole diagram fits; when MIN_SCALE leaves it larger than the
      // viewport, anchor to the top-left so the first division is on-screen and pannable.
      const tx = layout.width * k <= vw ? (vw - layout.width * k) / 2 : 12;
      const ty = layout.height * k <= vh ? Math.max(12, (vh - layout.height * k) / 2) : 12;
      transformTo(zoomIdentity.translate(tx, ty).scale(k), animate);
    },
    [layout.width, layout.height, transformTo],
  );

  const fitToNode = useCallback(
    (id: string) => {
      const viewportEl = viewportRef.current;
      const item = nodeById.get(id);
      if (!viewportEl || !item) return;
      const k = Math.max(transformRef.current.k, 0.9);
      const tx = viewportEl.clientWidth / 2 - k * (item.x + item.width / 2);
      const ty = viewportEl.clientHeight / 2 - k * (item.y + item.height / 2);
      transformTo(zoomIdentity.translate(tx, ty).scale(k), true);
    },
    [nodeById, transformTo],
  );

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
      .on('zoom', (event) => applyTransform(event.transform));
    behaviorRef.current = behavior;
    const sel = select(viewportEl);
    sel.call(behavior).on('dblclick.zoom', null);
    return () => {
      sel.on('.zoom', null);
    };
  }, [applyTransform]);

  // Task 2.4: track the viewport size (window resize + fullscreen) with a ResizeObserver.
  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setViewport((prev) =>
        Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1
          ? { width, height }
          : prev,
      );
    });
    observer.observe(viewportEl);
    return () => observer.disconnect();
  }, []);

  // First layout (and layout size changes from resize): fit the whole chart.
  const fittedRef = useRef(false);
  useEffect(() => {
    if (layout.width === 0 || viewport.width === 0) return;
    fitToScreen(fittedRef.current);
    fittedRef.current = true;
  }, [layout.width, layout.height, viewport.width, viewport.height, fitToScreen]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapperRef.current?.requestFullscreen();
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const viewportEl = viewportRef.current;
    const behavior = behaviorRef.current;
    if (!viewportEl || !behavior) return;
    behavior.scaleBy(select(viewportEl), factor);
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    const viewportEl = viewportRef.current;
    const behavior = behaviorRef.current;
    if (!viewportEl || !behavior) return;
    behavior.translateBy(select(viewportEl), dx, dy);
  }, []);

  // Search: jump to the first match when the query (or layout) changes.
  useEffect(() => {
    setActiveMatch(0);
    if (matches.length > 0) fitToNode(matches[0]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches.join('|')]);

  const cycleMatch = useCallback(() => {
    if (matches.length === 0) return;
    const next = (activeMatch + 1) % matches.length;
    setActiveMatch(next);
    fitToNode(matches[next]!);
  }, [matches, activeMatch, fitToNode]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (item: LayoutNode) => onSelectNode?.(item.node),
    [onSelectNode],
  );

  // Task 3.4: keyboard navigation on the canvas.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.target as HTMLElement).tagName === 'INPUT') return;
      switch (event.key) {
        case 'ArrowUp': panBy(0, PAN_STEP); break;
        case 'ArrowDown': panBy(0, -PAN_STEP); break;
        case 'ArrowLeft': panBy(PAN_STEP, 0); break;
        case 'ArrowRight': panBy(-PAN_STEP, 0); break;
        case '+': case '=': zoomBy(ZOOM_STEP); break;
        case '-': zoomBy(1 / ZOOM_STEP); break;
        case '0': fitToScreen(); break;
        default: return;
      }
      event.preventDefault();
    },
    [panBy, zoomBy, fitToScreen],
  );

  const activeMatchId = matches[activeMatch] ?? null;

  return (
    <div ref={wrapperRef} className="topdown-wrap relative bg-surface">
      {/* Floating toolbar (reference organogram, Assign omitted). */}
      <div className="canvas-toolbar no-print absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1.5 shadow-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') cycleMatch();
          }}
          placeholder="Search employee / department…"
          aria-label="Search the chart"
          className="w-56 h-[30px] rounded-md border border-line-strong bg-surface px-2.5 font-jp text-[12.5px] text-ink focus:outline-none focus:border-brand"
        />
        <span
          className={`w-14 text-center font-mono text-[11px] ${query && matches.length === 0 ? 'text-crit-ink' : 'text-sub'}`}
          role="status"
        >
          {query ? (matches.length === 0 ? '0 hits' : `${activeMatch + 1}/${matches.length}`) : ''}
        </span>
        <span className="w-px h-5 bg-line mx-1" aria-hidden="true" />
        <ToolbarButton label="Fit to screen" onClick={() => fitToScreen()}>
          ⤢
        </ToolbarButton>
        <ToolbarButton label="Zoom out" onClick={() => zoomBy(1 / ZOOM_STEP)}>
          −
        </ToolbarButton>
        <span className="w-12 text-center font-mono text-[11.5px] text-ink" aria-live="polite">
          {zoomPct}%
        </span>
        <ToolbarButton label="Zoom in" onClick={() => zoomBy(ZOOM_STEP)}>
          ＋
        </ToolbarButton>
        <span className="w-px h-5 bg-line mx-1" aria-hidden="true" />
        <ToolbarButton label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
          {isFullscreen ? '⤡' : '⛶'}
        </ToolbarButton>
      </div>

      <div
        ref={viewportRef}
        role="application"
        aria-label="Organization chart canvas"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={`topdown-canvas relative overflow-hidden cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          isFullscreen ? 'h-screen' : 'h-[72vh] min-h-[440px]'
        } bg-[radial-gradient(circle,var(--color-line)_1px,transparent_1px)] [background-size:22px_22px]`}
      >
        {/* Outer: fast `transform` during gestures. Inner: the settled scale baked as CSS
            `zoom` (see applyTransform) so text re-lays-out natively sharp at any zoom. No
            `will-change-transform`: permanent compositing would freeze rasterization. */}
        <div ref={stageRef} className="absolute top-0 left-0 origin-top-left">
          <div ref={zoomLayerRef}>
            <CanvasStage
              layout={layout}
              matchSet={matchSet}
              activeMatchId={activeMatchId}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onSelect={handleSelect}
              onToggleExpand={toggleExpand}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="w-[30px] h-[30px] grid place-items-center rounded-md text-[14px] text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {children}
    </button>
  );
}

/** Corner radius for the rounded bends on tree connectors. */
const BEND_RADIUS = 9;

/** Fan elbow (parent bottom-center → child top-center) with rounded bends. */
function roundedFanPath(fromX: number, fromY: number, toX: number, toY: number): string {
  const midY = (fromY + toY) / 2;
  const dx = toX - fromX;
  if (Math.abs(dx) < 1) return `M${fromX},${fromY} V${toY}`;
  const r = Math.max(0, Math.min(BEND_RADIUS, Math.abs(dx) / 2, midY - fromY, toY - midY));
  if (r < 0.5) return `M${fromX},${fromY} V${midY} H${toX} V${toY}`;
  const dir = Math.sign(dx);
  return (
    `M${fromX},${fromY} V${midY - r} Q${fromX},${midY} ${fromX + dir * r},${midY} ` +
    `H${toX - dir * r} Q${toX},${midY} ${toX},${midY + r} V${toY}`
  );
}

/** Stack └ connector (down the parent's indent line, curving right into the child). */
function roundedStackPath(x: number, fromY: number, toX: number, toY: number): string {
  const r = Math.max(0, Math.min(BEND_RADIUS, (toX - x) / 2, toY - fromY));
  if (r < 0.5) return `M${x},${fromY} V${toY} H${toX}`;
  return `M${x},${fromY} V${toY - r} Q${x},${toY} ${x + r},${toY} H${toX}`;
}

/** 兼務 curve between two cards, anchored by their relative position (below / above /
 * side-by-side) so the curve leaves and enters at sensible edges instead of always
 * swinging bottom→top. Returns the path plus start/label anchor points. */
function kenmuGeometry(from: LayoutNode, to: LayoutNode) {
  const fromCx = from.x + from.width / 2;
  const toCx = to.x + to.width / 2;
  if (to.y >= from.y + from.height + 8) {
    const y1 = from.y + from.height;
    const y2 = to.y;
    const midY = (y1 + y2) / 2;
    return {
      d: `M${fromCx},${y1} C${fromCx},${midY} ${toCx},${midY} ${toCx},${y2}`,
      x1: fromCx, y1, lx: (fromCx + toCx) / 2, ly: midY,
    };
  }
  if (from.y >= to.y + to.height + 8) {
    const y1 = from.y;
    const y2 = to.y + to.height;
    const midY = (y1 + y2) / 2;
    return {
      d: `M${fromCx},${y1} C${fromCx},${midY} ${toCx},${midY} ${toCx},${y2}`,
      x1: fromCx, y1, lx: (fromCx + toCx) / 2, ly: midY,
    };
  }
  // Same tier: route side to side.
  const rightwards = toCx >= fromCx;
  const x1 = rightwards ? from.x + from.width : from.x;
  const x2 = rightwards ? to.x : to.x + to.width;
  const y1 = from.y + from.height / 2;
  const y2 = to.y + to.height / 2;
  const midX = (x1 + x2) / 2;
  return {
    d: `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`,
    x1, y1, lx: midX, ly: (y1 + y2) / 2 - 4,
  };
}

/** The laid-out stage: connector SVG beneath, absolutely-positioned cards above.
 * Exported so the print renderer (`TopdownPrint`) shares one rendering path. */
export function CanvasStage({
  layout,
  matchSet,
  activeMatchId,
  selectedId,
  hoveredId = null,
  onHover,
  showAllKenmu = false,
  onSelect,
  onToggleExpand,
}: {
  layout: TopdownLayout;
  matchSet: ReadonlySet<string>;
  activeMatchId: string | null;
  selectedId: string | null;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  /** Print: no hover exists, so every 兼務 link renders fully labeled. */
  showAllKenmu?: boolean;
  onSelect: (item: LayoutNode) => void;
  onToggleExpand: (id: string) => void;
}) {
  const byId = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);
  /** The card whose 兼務 links are spotlighted. */
  const focusId = hoveredId ?? selectedId ?? activeMatchId;
  const anyFocus = focusId !== null;

  return (
    <div className="relative" style={{ width: layout.width, height: layout.height }}>
      <svg
        className="absolute top-0 left-0 overflow-visible pointer-events-none"
        width={layout.width}
        height={layout.height}
        aria-hidden="true"
      >
        <defs>
          <marker
            id="kenmu-arrow"
            viewBox="0 0 10 10"
            refX="7.5"
            refY="5"
            markerWidth="6.5"
            markerHeight="6.5"
            orient="auto-start-reverse"
          >
            <path d="M0.5,1 L9,5 L0.5,9 Z" className="fill-brand" />
          </marker>
        </defs>
        {layout.edges.map((edge) => {
          const from = byId.get(edge.fromId);
          const to = byId.get(edge.toId);
          if (!from || !to) return null;
          const { rail } = branchColorFor(to.branchId);
          const d =
            edge.kind === 'stack'
              ? roundedStackPath(
                  from.x + 11,
                  from.y + from.height,
                  to.x,
                  to.y + Math.min(18, to.height / 2),
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
              className="fill-none stroke-2 opacity-90 [stroke-linecap:round]"
              d={d}
              style={{ stroke: rail }}
            />
          );
        })}
        {/* 兼務 layer: quiet dotted bead-curves by default; the hovered/selected card's
            links light up with an arrowhead, a source dot, and a haloed label, while
            unrelated links recede — so provenance is readable without canvas spaghetti. */}
        {layout.kenmu.map((link) => {
          const from = byId.get(link.fromId);
          const to = byId.get(link.toId);
          if (!from || !to) return null;
          const active = showAllKenmu || link.fromId === focusId || link.toId === focusId;
          const geo = kenmuGeometry(from, to);
          return (
            <g
              key={link.id}
              className={`kenmu-link transition-opacity duration-150 ${
                active ? 'opacity-100' : anyFocus && !showAllKenmu ? 'opacity-[0.08]' : 'opacity-30'
              }`}
            >
              <path
                className={`fill-none stroke-brand [stroke-linecap:round] ${
                  active
                    ? '[stroke-width:2] [stroke-dasharray:1_6]'
                    : '[stroke-width:1.5] [stroke-dasharray:0.1_7]'
                }`}
                d={geo.d}
                markerEnd={active ? 'url(#kenmu-arrow)' : undefined}
              />
              {active ? (
                <>
                  <circle cx={geo.x1} cy={geo.y1} r={3} className="fill-brand" />
                  <text
                    x={geo.lx}
                    y={geo.ly - 7}
                    textAnchor="middle"
                    className="font-jp text-[10.5px] font-semibold fill-brand-dark"
                    style={{
                      paintOrder: 'stroke',
                      stroke: 'var(--color-surface)',
                      strokeWidth: 4,
                      strokeLinejoin: 'round',
                    }}
                  >
                    兼 {link.label}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
      {layout.nodes.map((item) => (
        <TopdownNode
          key={item.id}
          item={item}
          highlighted={item.id === activeMatchId || matchSet.has(item.id)}
          selected={item.id === selectedId}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          onHover={onHover}
        />
      ))}
    </div>
  );
}
