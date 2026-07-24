import type { ChartNode } from '../../store/api/chartNode';
import { DeptNode } from './DeptNode';

/** `.tree` — the Horizontal (secondary) view: the recursive indented tree of department
 * cards, re-themed onto the organogram's dotted-grid canvas. The `tree` class is kept as
 * an E2E hook; roots render un-nested (no connector rail). */
export function OrgTree({ roots, printMode = false }: { roots: ChartNode[]; printMode?: boolean }) {
  return (
    <div className="tree pt-[22px] px-5 pb-[26px] overflow-x-auto flex flex-col gap-[22px] bg-[radial-gradient(circle,var(--color-line)_1px,transparent_1px)] [background-size:22px_22px]">
      {roots.map((root) => (
        <DeptNode key={root.id} node={root} printMode={printMode} />
      ))}
    </div>
  );
}
