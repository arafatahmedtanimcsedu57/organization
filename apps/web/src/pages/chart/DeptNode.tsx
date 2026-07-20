import type { ChartNode } from '../../store/api/chartNode';
import { RosterLines } from './RosterLines';

/** `.node` — one department card plus its indented children, recursing down the tree. */
export function DeptNode({ node }: { node: ChartNode }) {
  return (
    <div className="node">
      <div className="dept">
        <div className="dept-hd">
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
