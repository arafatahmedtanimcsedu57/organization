import type { ChartNode } from '../../store/api/chartNode';
import { DeptNode } from './DeptNode';

/** `.tree` — the recursive tree of department cards built from the `/chart` JSON's roots. */
export function OrgTree({ roots, printMode = false }: { roots: ChartNode[]; printMode?: boolean }) {
  return (
    <div className="tree">
      {roots.map((root) => (
        <DeptNode key={root.id} node={root} printMode={printMode} />
      ))}
    </div>
  );
}
