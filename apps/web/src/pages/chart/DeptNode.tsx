import type { CSSProperties } from 'react';
import type { ChartNode } from '../../store/api/chartNode';
import { branchColorFor } from './branchColor';
import { RosterLines } from './RosterLines';

/** `.node` — one department card plus its indented children, recursing down the tree.
 * The branch color is set as `--rail`/`--tint` CSS custom properties once, on the top-level
 * division node; because custom properties inherit, every descendant's rail, accent stripe,
 * and marker pick it up via `var(--rail, …)` without re-setting it at each level. */
export function DeptNode({ node }: { node: ChartNode }) {
  let branchStyle: CSSProperties | undefined;
  if (node.tier === 'division') {
    const { rail, tint } = branchColorFor(node.branchId);
    branchStyle = { '--rail': rail, '--tint': tint } as CSSProperties;
  }

  return (
    <div className="node" style={branchStyle}>
      <div className="dept">
        <div className="dept-hd">
          <span className="dot" aria-hidden="true" />
          <span className="dn">{node.name}</span>
          {node.nameEn ? <span className="en">{node.nameEn}</span> : null}
          <span className="did">{node.id}</span>
        </div>
        <RosterLines managers={node.managers} staff={node.staff} />
      </div>
      {node.children.length > 0 ? (
        <div className="children">
          {node.children.map((child) => (
            <DeptNode key={child.id} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
