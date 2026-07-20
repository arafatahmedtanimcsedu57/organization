import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { ChartNode } from '../../store/api/chartNode';
import { branchColorFor } from './branchColor';
import { computeNetworkLayout, NODE_HEIGHT, NODE_WIDTH } from './networkLayout';

/** `.network` — the Tree ⇄ Network alternative (9.9): department nodes positioned by a
 * dendrogram layout, solid branch-colored reporting lines for parent→child, and dashed
 * brand-green arrows for 兼務 postings (source department → target department, labeled
 * with the person + their source title) so provenance is traceable at a glance. */
export function NetworkView({ roots }: { roots: ChartNode[] }) {
  const layout = useMemo(() => computeNetworkLayout(roots), [roots]);
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout.nodes]);

  return (
    <div className="network" style={{ width: layout.width, height: layout.height }}>
      <svg className="network-lines" width={layout.width} height={layout.height} aria-hidden="true">
        <defs>
          <marker id="kenmu-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="kenmu-arrowhead" />
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
              className="network-edge"
              d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
              stroke={rail}
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
                className="network-kenmu-edge"
                d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                markerEnd="url(#kenmu-arrow)"
              />
              <text x={midX} y={midY - 5} className="network-kenmu-label" textAnchor="middle">
                兼 {edge.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="network-nodes">
        {layout.nodes.map((node) => {
          const { rail, tint } = branchColorFor(node.branchId);
          const style = {
            left: node.x,
            top: node.y - NODE_HEIGHT / 2,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            '--rail': rail,
            '--tint': tint,
          } as CSSProperties;
          return (
            <div key={node.id} className={`network-node network-node--${node.tier}`} style={style}>
              <span className="dot" aria-hidden="true" />
              <span className="nn-name">{node.name}</span>
              {node.nameEn ? <span className="nn-en">{node.nameEn}</span> : null}
              <span className="nn-count">{node.memberCount}名</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
