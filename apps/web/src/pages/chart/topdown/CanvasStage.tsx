import { useMemo, useState } from 'react';
import { layoutVersion } from './canvasGeometry';
import { KenmuLinks } from './KenmuLinks';
import { TopdownNode } from './TopdownNode';
import { TreeEdges } from './TreeEdges';
import type { LayoutNode, TopdownLayout } from './topdownLayout';
import { useMemberAnchors } from './hooks/useMemberAnchors';

const NO_NODES: ReadonlySet<string> = new Set();

export interface CanvasStageProps {
  layout: TopdownLayout;
  matchSet: ReadonlySet<string>;
  activeMatchId: string | null;
  selectedId: string | null;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  /** Print: no hover exists, so every 兼務 link renders fully labeled. */
  showAllKenmu?: boolean;
  /** Interactive canvas: glide cards and crossfade connectors on relayout. */
  animateLayout?: boolean;
  onSelect: (item: LayoutNode) => void;
  onToggleExpand: (id: string) => void;
}

/**
 * The laid-out stage: connector SVG beneath, absolutely-positioned cards above, 兼務 curves
 * on top. Shared by the interactive canvas and the print renderer so both go through one
 * rendering path.
 */
export function CanvasStage({
  layout,
  matchSet,
  activeMatchId,
  selectedId,
  hoveredId = null,
  onHover,
  showAllKenmu = false,
  animateLayout = false,
  onSelect,
  onToggleExpand,
}: CanvasStageProps) {
  const byId = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout]);
  /** Everyone who holds a 兼務 posting - their name rows become hover-linkable. */
  const kenmuSysIds = useMemo(() => new Set(layout.kenmu.map((link) => link.sysId)), [layout]);
  const { containerRef, anchorY } = useMemberAnchors(layout);

  // Person-level hover: hovering a 兼務 name anywhere spotlights that person's link(s) and
  // every card/row where they appear. Independent of the card hover the canvas tracks.
  const [hoveredSysId, setHoveredSysId] = useState<string | null>(null);

  /** Cards containing the hovered person, so only those re-render on a name hover. */
  const cardsWithHovered = useMemo(() => {
    if (!hoveredSysId) return NO_NODES;
    const ids = new Set<string>();
    for (const { id, node } of layout.nodes) {
      const holds =
        node.managers.some((member) => member.sysId === hoveredSysId) ||
        node.staff.some((member) => member.sysId === hoveredSysId);
      if (holds) ids.add(id);
    }
    return ids;
  }, [layout, hoveredSysId]);

  // Connector SVGs remount per layout so their fade-in replays on every re-pack: elbow and
  // curve paths change shape and cannot tween, while the cards glide via CSS instead.
  const edgeKey = animateLayout ? layoutVersion(layout) : 0;
  /** The card whose 兼務 links are spotlighted (search / select / card hover). */
  const focusId = hoveredId ?? selectedId ?? activeMatchId;

  return (
    <div
      ref={containerRef}
      className={`relative ${animateLayout ? 'layout-animate' : ''}`}
      style={{ width: layout.width, height: layout.height }}
    >
      <TreeEdges key={`tree-${edgeKey}`} layout={layout} byId={byId} />
      {layout.nodes.map((item) => (
        <TopdownNode
          key={item.id}
          item={item}
          highlighted={item.id === activeMatchId || matchSet.has(item.id)}
          selected={item.id === selectedId}
          kenmuSysIds={kenmuSysIds}
          hoveredSysId={cardsWithHovered.has(item.id) ? hoveredSysId : null}
          onHoverMember={setHoveredSysId}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          onHover={onHover}
        />
      ))}
      <KenmuLinks
        key={`kenmu-${edgeKey}`}
        layout={layout}
        byId={byId}
        anchorY={anchorY}
        focusId={focusId}
        hoveredSysId={hoveredSysId}
        showAll={showAllKenmu}
      />
    </div>
  );
}
