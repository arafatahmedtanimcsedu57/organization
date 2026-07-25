import type { MouseEvent } from 'react';
import type { Member } from '@org-chart/domain';
import { MAX_MANAGER_ROWS, STAFF_NAMES_PER_LINE } from '../../../constants/chartLayout';
import type { ChartNode } from '../../../store/api/chartNode';
import { MemberName } from './MemberName';
import { chunk, groupByTitle, memberListKey } from '../rosterGroups';

/** One roster line. Its height must match `ROSTER_LINE_HEIGHT` in the layout's height model. */
const ROW = 'h-[22px] flex items-center gap-2 text-[12px] overflow-hidden';
const TITLE_CELL = 'shrink-0 w-[52px] text-[10.5px] text-sub font-semibold';
const NAMES_CELL = 'truncate font-jp text-ink flex gap-x-[7px]';

export interface NodeRosterProps {
  node: ChartNode;
  /** Whether this card renders its roster in full (print or user-expanded). */
  fullRoster: boolean;
  /** Everyone holding a 兼務 posting; their rows here become hover-linkable. */
  kenmuSysIds?: ReadonlySet<string>;
  hoveredSysId?: string | null;
  onHoverMember?: (sysId: string | null) => void;
  onExpand: (event: MouseEvent) => void;
}

/**
 * The card body: one line per manager title-group, then the staff - either listed in full
 * or collapsed behind a `×N` row. Surplus title-groups hide behind a `＋N` expander.
 *
 * Row counts here mirror `cardHeight()` exactly; both read the same constants, because a
 * card whose content outgrows its measured height would overflow its box.
 */
export function NodeRoster({
  node,
  fullRoster,
  kenmuSysIds,
  hoveredSysId = null,
  onHoverMember,
  onExpand,
}: NodeRosterProps) {
  const groups = groupByTitle(node.managers);
  const truncated = !fullRoster && groups.length > MAX_MANAGER_ROWS;
  const visibleGroups = truncated ? groups.slice(0, MAX_MANAGER_ROWS) : groups;
  const hiddenGroupMembers = truncated
    ? groups.slice(MAX_MANAGER_ROWS).reduce((sum, group) => sum + group.members.length, 0)
    : 0;

  const renderName = (member: Member) => (
    <MemberName
      key={member.sysId}
      member={member}
      nodeId={node.id}
      linkable={kenmuSysIds?.has(member.sysId) ?? false}
      highlighted={hoveredSysId != null && member.sysId === hoveredSysId}
      onHoverMember={onHoverMember}
    />
  );

  return (
    <div className="flex-1 px-[13px] py-[10px] flex flex-col overflow-hidden">
      {visibleGroups.map((group) => (
        <div key={memberListKey(group.members, group.title)} className={ROW}>
          <span className={`${TITLE_CELL} truncate`}>{group.title}</span>
          <span className={NAMES_CELL}>{group.members.map(renderName)}</span>
        </div>
      ))}

      {truncated ? (
        <button
          type="button"
          onClick={onExpand}
          className="h-[22px] flex items-center text-[11px] font-semibold text-brand hover:text-brand-dark"
        >
          ＋ {hiddenGroupMembers} 役職者を表示
        </button>
      ) : null}

      {fullRoster ? (
        chunk(node.staff, STAFF_NAMES_PER_LINE).map((row, index) => (
          <div key={memberListKey(row, `staff-${index}`)} className={ROW}>
            <span className={TITLE_CELL}>{index === 0 ? '課員' : ''}</span>
            <span className={NAMES_CELL}>{row.map(renderName)}</span>
          </div>
        ))
      ) : node.staff.length > 0 ? (
        <button
          type="button"
          onClick={onExpand}
          className="h-[22px] flex items-center gap-2 text-[12px] hover:bg-surface-hover rounded"
        >
          <span className={`${TITLE_CELL} text-left`}>課員</span>
          <span className="font-mono text-[11px] text-muted">×{node.staff.length}</span>
          {node.staff.some((member) => member.concurrent) ? (
            <span className="kenmu-mark text-[10.5px] font-bold text-brand-dark">( 兼 )</span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}
