import type { ChartNode } from '../../store/api/chartNode';
import { DeptNode } from './DeptNode';

/** `.tree` — the recursive tree of department cards built from the `/chart` JSON's roots.
 * The `tree` class is kept as an E2E hook; roots render un-nested (no connector rail). */
export function OrgTree({ roots, printMode = false }: { roots: ChartNode[]; printMode?: boolean }) {
  return (
    <div className="tree pt-[22px] px-5 pb-[26px] overflow-x-auto flex flex-col gap-[22px]">
      {roots.map((root) => (
        <DeptNode key={root.id} node={root} printMode={printMode} />
      ))}
    </div>
  );
}
