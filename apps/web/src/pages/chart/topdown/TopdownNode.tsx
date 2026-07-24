import type { CSSProperties, MouseEvent } from 'react';
import type { Member } from '@org-chart/domain';
import type { ChartTier } from '../../../store/api/chartNode';
import { branchColorFor } from '../branchColor';
import { MAX_MANAGER_ROWS, type LayoutNode } from './topdownLayout';

/** Consecutive same-title members share one line (rosters arrive rank-ordered). */
function groupByTitle(members: Member[]): { title: string; members: Member[] }[] {
  const groups: { title: string; members: Member[] }[] = [];
  for (const member of members) {
    const last = groups[groups.length - 1];
    if (last && last.title === member.title) last.members.push(member);
    else groups.push({ title: member.title, members: [member] });
  }
  return groups;
}

/** Chunk staff into fixed rows so the rendered height matches the layout's height model. */
function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** Must equal `STAFF_NAMES_PER_LINE` in topdownLayout.ts (the card-height model). */
const STAFF_PER_ROW = 3;

const NAME_TIER: Record<ChartTier, string> = {
  division: 'text-[15px] font-bold',
  department: 'text-[13.5px] font-bold',
  group: 'text-[12.5px] font-semibold',
};

function MemberName({ member }: { member: Member }) {
  if (!member.concurrent) {
    return <span className="p font-jp">{member.displayName}</span>;
  }
  return (
    <span className="p kenmu font-jp text-brand-dark" title={`兼務 ← ${member.sourceDepartmentName ?? ''} ${member.sourceTitle ?? ''}`}>
      <span className="kenmu-mark font-bold">兼</span> {member.displayName}
    </span>
  );
}

export interface TopdownNodeProps {
  item: LayoutNode;
  highlighted?: boolean;
  selected?: boolean;
  onSelect?: (item: LayoutNode) => void;
  onToggleExpand?: (id: string) => void;
  /** Hover in/out — drives the canvas's 兼務 link spotlight. */
  onHover?: (id: string | null) => void;
}

/** One department card, absolutely positioned in diagram coordinates by the canvas. */
export function TopdownNode({ item, highlighted = false, selected = false, onSelect, onToggleExpand, onHover }: TopdownNodeProps) {
  const { node, fullRoster } = item;
  const { rail, tint } = branchColorFor(item.branchId);
  const groups = groupByTitle(node.managers);
  const truncated = !fullRoster && groups.length > MAX_MANAGER_ROWS;
  const visibleGroups = truncated ? groups.slice(0, MAX_MANAGER_ROWS) : groups;
  const hiddenGroupMembers = truncated
    ? groups.slice(MAX_MANAGER_ROWS).reduce((sum, g) => sum + g.members.length, 0)
    : 0;
  const memberCount = node.managers.length + node.staff.length;

  const style: CSSProperties = {
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
    ['--rail' as string]: rail,
    ['--tint' as string]: tint,
  };

  const handleExpand = (event: MouseEvent) => {
    event.stopPropagation();
    onToggleExpand?.(node.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-node-id={node.id}
      aria-label={`${node.name} — ${memberCount}名`}
      onClick={() => onSelect?.(item)}
      onMouseEnter={() => onHover?.(node.id)}
      onMouseLeave={() => onHover?.(null)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(item);
        }
      }}
      style={style}
      className={`topdown-node absolute cursor-pointer text-left flex flex-col overflow-hidden rounded-lg border bg-surface shadow-1 transition-shadow duration-150 ease-brand hover:shadow-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        highlighted || selected ? 'ring-2 ring-brand shadow-2 border-brand' : 'border-line'
      }`}
    >
      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--rail,var(--color-line-strong))]" />
      <div
        className={`flex items-center gap-2 pl-[13px] pr-[10px] py-[8px] border-b border-line-2 shrink-0 ${
          node.tier === 'division' ? 'bg-[var(--tint,var(--color-surface-sub))]' : 'bg-surface-sub'
        }`}
      >
        <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0 bg-[var(--rail,var(--color-line-strong))]" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className={`dn block truncate font-jp text-strong ${NAME_TIER[node.tier]}`}>{node.name}</span>
          <span className="block truncate text-[10.5px] text-sub">{node.nameEn || node.head || ' '}</span>
        </span>
        <button
          type="button"
          onClick={handleExpand}
          title={fullRoster ? 'Collapse roster' : 'Expand roster'}
          className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-muted hover:text-ink"
        >
          {memberCount}名
        </button>
      </div>
      <div className="flex-1 px-[13px] py-[10px] flex flex-col overflow-hidden">
        {visibleGroups.map((group, i) => (
          <div key={`${group.title}-${i}`} className="h-[22px] flex items-center gap-2 text-[12px] overflow-hidden">
            <span className="shrink-0 w-[52px] truncate text-[10.5px] text-sub font-semibold">{group.title}</span>
            <span className="truncate font-jp text-ink flex gap-x-[7px]">
              {group.members.map((m) => (
                <MemberName key={m.sysId} member={m} />
              ))}
            </span>
          </div>
        ))}
        {truncated ? (
          <button
            type="button"
            onClick={handleExpand}
            className="h-[22px] flex items-center text-[11px] font-semibold text-brand hover:text-brand-dark"
          >
            ＋{hiddenGroupMembers} 役職者を表示
          </button>
        ) : null}
        {fullRoster ? (
          chunk(node.staff, STAFF_PER_ROW).map((row, i) => (
            <div key={`staff-${i}`} className="h-[22px] flex items-center gap-2 text-[12px] overflow-hidden">
              <span className="shrink-0 w-[52px] text-[10.5px] text-sub font-semibold">{i === 0 ? '課員' : ''}</span>
              <span className="truncate font-jp text-ink flex gap-x-[7px]">
                {row.map((m) => (
                  <MemberName key={m.sysId} member={m} />
                ))}
              </span>
            </div>
          ))
        ) : node.staff.length > 0 ? (
          <button
            type="button"
            onClick={handleExpand}
            className="h-[22px] flex items-center gap-2 text-[12px] hover:bg-surface-hover rounded"
          >
            <span className="shrink-0 w-[52px] text-left text-[10.5px] text-sub font-semibold">課員</span>
            <span className="font-mono text-[11px] text-muted">×{node.staff.length}</span>
            {node.staff.some((m) => m.concurrent) ? (
              <span className="kenmu-mark text-[10.5px] font-bold text-brand-dark">兼</span>
            ) : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}
