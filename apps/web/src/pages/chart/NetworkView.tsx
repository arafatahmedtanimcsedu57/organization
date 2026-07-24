import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { ChartNode } from '../../store/api/chartNode';
import { branchColorFor } from './branchColor';
import { computeNetworkLayout, NODE_HEIGHT, NODE_WIDTH } from './networkLayout';

const NODE_BASE =
  "network-node absolute flex items-center gap-[7px] px-3 border border-line rounded-sm shadow-1 overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[var(--rail,var(--color-line-strong))]";

/** `.network` — the Tree ⇄ Network alternative (9.9): department nodes positioned by a
 * dendrogram layout, solid branch-colored reporting lines for parent→child, and dashed
 * brand-green arrows for 兼務 postings (source department → target department, labeled
 * with the person + their source title) so provenance is traceable at a glance. */
export function NetworkView({ roots }: { roots: ChartNode[] }) {
  const layout = useMemo(() => computeNetworkLayout(roots), [roots]);
  const nodeById = useMemo(
    () => new Map(layout.nodes.map((node) => [node.id, node])),
    [layout.nodes],
  );

  return (
    <div
      className="network relative mt-[22px] mx-5 mb-[26px]"
      style={{ width: layout.width, height: layout.height }}
    >
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
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" className="fill-brand" />
          </marker>
        </defs>
        {layout.edges.map((edge) => {
          const from = nodeById.get(edge.fromId);
          const to = nodeById.get(edge.toId);
          if (!from || !to) return null;
          const { rail } = branchColorFor(to.branchId);
          const x1 = from.x + NODE_WIDTH;
          const y1 = from.y;
          const x2 = to.x;
          const y2 = to.y;
          const midX = (x1 + x2) / 2;
          return (
            <path
              key={edge.id}
              className="fill-none stroke-2 opacity-85"
              d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
              style={{ stroke: rail }}
            />
          );
        })}
        {layout.kenmuEdges.map((edge) => {
          const from = nodeById.get(edge.fromId);
          const to = nodeById.get(edge.toId);
          if (!from || !to) return null;
          const x1 = from.x + NODE_WIDTH / 2;
          const y1 = from.y + NODE_HEIGHT / 2;
          const x2 = to.x + NODE_WIDTH / 2;
          const y2 = to.y - NODE_HEIGHT / 2;
          const midY = (y1 + y2) / 2;
          const midX = (x1 + x2) / 2;
          return (
            <g key={edge.id}>
              <path
                className="fill-none stroke-brand [stroke-width:1.75] [stroke-dasharray:5_4]"
                d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                markerEnd="url(#kenmu-arrow)"
              />
              <text
                x={midX}
                y={midY - 5}
                className="font-jp text-[10.5px] fill-brand-dark"
                textAnchor="middle"
              >
                兼 {edge.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="relative">
        {layout.nodes.map((node) => {
          const { rail, tint } = branchColorFor(node.branchId);
          const isDivision = node.tier === 'division';
          const style = {
            left: node.x,
            top: node.y - NODE_HEIGHT / 2,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            '--rail': rail,
            '--tint': tint,
          } as CSSProperties;
          return (
            <div
              key={node.id}
              className={`${NODE_BASE} ${isDivision ? 'bg-[var(--tint,var(--color-surface-sub))]' : 'bg-surface'}`}
              style={style}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 bg-[var(--rail,var(--color-line-strong))]"
                aria-hidden="true"
              />
              <span
                className={`font-jp font-bold text-strong whitespace-nowrap overflow-hidden text-ellipsis ${isDivision ? 'text-[14px]' : 'text-[13px]'}`}
              >
                {node.name}
              </span>
              {node.nameEn ? (
                <span className="text-[10.5px] text-sub whitespace-nowrap overflow-hidden text-ellipsis">
                  {node.nameEn}
                </span>
              ) : null}
              <span className="ml-auto font-mono text-[11px] text-muted shrink-0">
                {node.memberCount}名
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
