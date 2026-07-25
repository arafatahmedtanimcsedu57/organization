import { ToolbarButton } from './ToolbarButton';

export interface CanvasToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Advance to the next hit — bound to Enter in the search field. */
  onSubmitSearch: () => void;
  matchCount: number;
  /** Zero-based index of the focused hit. */
  activeMatch: number;
  zoomPct: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

/**
 * `.canvas-toolbar` — the floating search / fit / zoom / fullscreen bar. Its class is what
 * `useCanvasZoom`'s d3 filter checks to keep toolbar interactions from drag-panning the
 * canvas underneath, and E2E uses it to read the zoom percentage.
 */
export function CanvasToolbar({
  query,
  onQueryChange,
  onSubmitSearch,
  matchCount,
  activeMatch,
  zoomPct,
  onZoomIn,
  onZoomOut,
  onFit,
  isFullscreen,
  onToggleFullscreen,
}: CanvasToolbarProps) {
  const hits = matchCount === 0 ? '0 hits' : `${activeMatch + 1}/${matchCount}`;

  return (
    <div className="canvas-toolbar no-print absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1.5 shadow-2">
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmitSearch();
        }}
        placeholder="Search employee / department…"
        aria-label="Search the chart"
        className="w-56 h-[30px] rounded-md border border-line-strong bg-surface px-2.5 font-jp text-[12.5px] text-ink focus:outline-none focus:border-brand"
      />
      <span
        className={`w-14 text-center font-mono text-[11px] ${
          query && matchCount === 0 ? 'text-crit-ink' : 'text-sub'
        }`}
        role="status"
      >
        {query ? hits : ''}
      </span>
      <span className="w-px h-5 bg-line mx-1" aria-hidden="true" />
      <ToolbarButton label="Fit to screen" onClick={onFit}>
        ⤢
      </ToolbarButton>
      <ToolbarButton label="Zoom out" onClick={onZoomOut}>
        −
      </ToolbarButton>
      <span className="w-12 text-center font-mono text-[11.5px] text-ink" aria-live="polite">
        {zoomPct}%
      </span>
      <ToolbarButton label="Zoom in" onClick={onZoomIn}>
        ＋
      </ToolbarButton>
      <span className="w-px h-5 bg-line mx-1" aria-hidden="true" />
      <ToolbarButton
        label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        onClick={onToggleFullscreen}
      >
        {isFullscreen ? '⤡' : '⛶'}
      </ToolbarButton>
    </div>
  );
}
