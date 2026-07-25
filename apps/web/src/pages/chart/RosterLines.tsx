import { useState } from 'react';
import { Button } from '../../design/components';
import type { Member } from '@org-chart/domain';
import { groupByTitle, memberListKey } from './rosterGroups';

/** Above this many people in one title group, the interactive view collapses the
 * surplus behind a `＋N` expand affordance; print mode (9.8) always renders in full. */
const ROSTER_TRUNCATE_THRESHOLD = 12;

export interface RosterLinesProps {
  managers: Member[];
  staff: Member[];
  /** Print/PDF mode (9.8): every roster renders in full, so the `＋N` expand affordance never
   * appears and no member is left out of the DOM (unlike the interactive view's truncation). */
  printMode?: boolean;
}

/** `.roster` - the department card's rank-ordered lines: one per title group, managers then staff. */
export function RosterLines({ managers, staff, printMode = false }: RosterLinesProps) {
  const groups = [...groupByTitle(managers), ...groupByTitle(staff)];
  // Keyed by the group's first member: stable when a refetch reorders the roster, unlike
  // the group's position in the list.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  if (groups.length === 0) return null;

  return (
    <div className="pt-[6px] px-[13px] pb-[11px] flex flex-col">
      {groups.map((group) => {
        const groupKey = memberListKey(group.members, group.title);
        const isTruncated =
          !printMode &&
          !expanded.has(groupKey) &&
          group.members.length > ROSTER_TRUNCATE_THRESHOLD;
        const visible = isTruncated
          ? group.members.slice(0, ROSTER_TRUNCATE_THRESHOLD)
          : group.members;
        const hiddenCount = group.members.length - visible.length;

        return (
          <div
            className="line grid grid-cols-[96px_1fr] gap-3 items-baseline py-1 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-2"
            key={groupKey}
          >
            <span className="pos text-[11.5px] text-sub font-semibold">{group.title}</span>
            <div className="flex flex-wrap gap-x-[10px] gap-y-[5px] items-center">
              {visible.map((member) =>
                member.concurrent ? (
                  <span
                    className="p kenmu font-jp text-[13.5px] inline-flex items-baseline gap-1 pl-2 pr-2.5 py-0.5 border border-dashed border-brand rounded-full bg-brand-tint text-brand-dark"
                    key={member.sysId}
                  >
                    <span className="kenmu-mark font-bold">兼</span> {member.displayName}
                    <span className="kenmu-src text-[11px] font-normal text-sub">
                      ← {member.sourceDepartmentName} {member.sourceTitle}
                    </span>
                  </span>
                ) : (
                  <span className="p font-jp text-[13.5px] text-ink" key={member.sysId}>
                    {member.displayName}
                  </span>
                ),
              )}
              {hiddenCount > 0 ? (
                <Button
                  variant="plain"
                  size="sm"
                  className="!h-auto py-0.5 !rounded-full"
                  onClick={() => setExpanded((prev) => new Set(prev).add(groupKey))}
                >
                  ＋{hiddenCount} {group.title}
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
