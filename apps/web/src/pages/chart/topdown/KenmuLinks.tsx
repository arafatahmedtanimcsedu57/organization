import { kenmuGeometry } from './canvasGeometry';
import type { LayoutNode, TopdownLayout } from './topdownLayout';

export interface KenmuLinksProps {
  layout: TopdownLayout;
  byId: ReadonlyMap<string, LayoutNode>;
  /** `"<nodeId>:<sysId>"` → row y, from `useMemberAnchors`. */
  anchorY: ReadonlyMap<string, number>;
  /** The card whose links are spotlighted (hover / selection / search). */
  focusId: string | null;
  /** The person whose links are spotlighted (name hover). */
  hoveredSysId: string | null;
  /** Print: no hover exists, so every link renders fully labeled. */
  showAll?: boolean;
}

/**
 * The 兼務 layer — name-to-name curves drawn **on top** of the cards, so a link crossing a
 * card is never hidden behind it. Quiet dotted bead-curves by default; the hovered person's
 * or card's links light up with an arrowhead, a source dot, and a haloed label, while
 * unrelated links recede. `pointer-events-none` keeps the name rows underneath hoverable.
 */
export function KenmuLinks({
  layout,
  byId,
  anchorY,
  focusId,
  hoveredSysId,
  showAll = false,
}: KenmuLinksProps) {
  const anyFocus = focusId !== null || hoveredSysId !== null;

  return (
    <svg
      className="edges-morph absolute top-0 left-0 overflow-visible pointer-events-none"
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
      {layout.kenmu.map((link) => {
        const from = byId.get(link.fromId);
        const to = byId.get(link.toId);
        if (!from || !to) return null;
        const active =
          showAll ||
          link.sysId === hoveredSysId ||
          link.fromId === focusId ||
          link.toId === focusId;
        const fromY = from.y + (anchorY.get(`${link.fromId}:${link.sysId}`) ?? from.height / 2);
        const toY = to.y + (anchorY.get(`${link.toId}:${link.sysId}`) ?? to.height / 2);
        const geometry = kenmuGeometry(from, to, fromY, toY);
        return (
          <g
            key={link.id}
            className={`kenmu-link transition-opacity duration-150 ${
              active ? 'opacity-100' : anyFocus && !showAll ? 'opacity-[0.08]' : 'opacity-30'
            }`}
          >
            <path
              className={`fill-none stroke-brand [stroke-linecap:round] ${
                active
                  ? '[stroke-width:2] [stroke-dasharray:1_6]'
                  : '[stroke-width:1.5] [stroke-dasharray:0.1_7]'
              }`}
              d={geometry.d}
              markerEnd={active ? 'url(#kenmu-arrow)' : undefined}
            />
            {active ? (
              <>
                <circle cx={geometry.x1} cy={geometry.y1} r={3} className="fill-brand" />
                <text
                  x={geometry.lx}
                  y={geometry.ly - 7}
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
  );
}
