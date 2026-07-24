import type { CSSProperties } from 'react';
import type { ChartNode, ChartTier } from '../../store/api/chartNode';
import { branchColorFor } from './branchColor';
import { RosterLines } from './RosterLines';

/** `.node` — one department card plus its indented children, recursing down the tree.
 * The branch color is set as `--rail`/`--tint` CSS custom properties once, on the top-level
 * division node; because custom properties inherit, every descendant's rail, accent stripe,
 * and marker pick it up via `var(--rail, …)` without re-setting it at each level. */

const NODE_BASE = 'node relative';
/** Connector rails for a nested node: the elbow (`::before`) into the card and the vertical rail
 * (`::after`) that a non-last sibling extends down to the next elbow (so it stops at the last child). */
const NODE_RAILS =
  "before:content-[''] before:absolute before:left-[-26px] before:top-[26px] before:w-[22px] before:h-[2px] before:rounded-[2px] before:bg-[var(--rail,var(--color-line-strong))] " +
  "after:content-[''] after:absolute after:left-[-26px] after:top-[-14px] after:w-[2px] after:h-[40px] after:rounded-[2px] after:bg-[var(--rail,var(--color-line-strong))] " +
  '[&:not(:last-child)]:after:h-[calc(100%+14px)]';

const DEPT =
  "dept relative border border-line rounded-lg bg-surface shadow-1 overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[var(--rail,transparent)]";

const DEPT_HEAD_BASE = 'flex items-center gap-2.5 pl-[15px] pr-[13px] border-b border-line-2';

/** Tier styling — division cards are elevated (tinted header, larger name) above department and
 * group cards, so the org tier reads at a glance without reading the labels. */
const HEAD_TIER: Record<ChartTier, string> = {
  division: 'py-[13px] bg-[var(--tint,var(--color-surface-sub))]',
  department: 'py-[10px] bg-surface-sub',
  group: 'py-2 bg-surface-sub',
};

const NAME_TIER: Record<ChartTier, string> = {
  division: 'text-[16px] font-bold',
  department: 'text-[14px] font-bold',
  group: 'text-[12.5px] font-semibold',
};

export function DeptNode({
  node,
  printMode = false,
  nested = false,
}: {
  node: ChartNode;
  printMode?: boolean;
  nested?: boolean;
}) {
  let branchStyle: CSSProperties | undefined;
  if (node.tier === 'division') {
    const { rail, tint } = branchColorFor(node.branchId);
    branchStyle = { '--rail': rail, '--tint': tint } as CSSProperties;
  }

  return (
    <div className={nested ? `${NODE_BASE} ${NODE_RAILS}` : NODE_BASE} style={branchStyle}>
      <div className={DEPT}>
        <div className={`${DEPT_HEAD_BASE} ${HEAD_TIER[node.tier]}`}>
          <span
            className="w-2 h-2 rounded-full shrink-0 bg-[var(--rail,var(--color-line-strong))] shadow-[0_0_0_3px_color-mix(in_srgb,var(--rail,transparent)_18%,transparent)]"
            aria-hidden="true"
          />
          <span className={`dn font-jp text-strong ${NAME_TIER[node.tier]}`}>{node.name}</span>
          {node.nameEn ? <span className="text-[11.5px] text-sub">{node.nameEn}</span> : null}
          <span className="ml-auto font-mono text-[11px] text-muted">{node.id}</span>
        </div>
        <RosterLines managers={node.managers} staff={node.staff} printMode={printMode} />
      </div>
      {node.children.length > 0 ? (
        <div className="children ml-[26px] pl-[26px] flex flex-col gap-[14px] mt-[14px]">
          {node.children.map((child) => (
            <DeptNode key={child.id} node={child} printMode={printMode} nested />
          ))}
        </div>
      ) : null}
    </div>
  );
}
