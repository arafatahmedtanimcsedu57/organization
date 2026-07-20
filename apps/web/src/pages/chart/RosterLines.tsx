import { useState } from 'react';
import type { Member } from '@org-chart/domain';
import { Button } from '../../design/components';

interface RosterLineGroup {
  title: string;
  members: Member[];
}

/** Above this many people in one title group, the interactive view collapses the
 * surplus behind a `＋N` expand affordance; print mode (9.8) always renders in full. */
const ROSTER_TRUNCATE_THRESHOLD = 12;

/** Collapses consecutive same-title members (rank-ordered, so same-title runs are adjacent)
 * into one roster line, e.g. a `課長 / 主任` line listing both position holders. */
function groupByTitle(members: Member[]): RosterLineGroup[] {
  const groups: RosterLineGroup[] = [];
  for (const member of members) {
    const last = groups[groups.length - 1];
    if (last && last.title === member.title) {
      last.members.push(member);
    } else {
      groups.push({ title: member.title, members: [member] });
    }
  }
  return groups;
}

export interface RosterLinesProps {
  managers: Member[];
  staff: Member[];
  /** Print/PDF mode (9.8): every roster renders in full, so the `＋N` expand affordance never
   * appears and no member is left out of the DOM (unlike the interactive view's truncation). */
  printMode?: boolean;
}

/** `.roster` — the department card's rank-ordered lines: one per title group, managers then staff. */
export function RosterLines({ managers, staff, printMode = false }: RosterLinesProps) {
  const groups = [...groupByTitle(managers), ...groupByTitle(staff)];
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  if (groups.length === 0) return null;

  return (
    <div className="roster">
      {groups.map((group, i) => {
        const isTruncated = !printMode && !expanded.has(i) && group.members.length > ROSTER_TRUNCATE_THRESHOLD;
        const visible = isTruncated ? group.members.slice(0, ROSTER_TRUNCATE_THRESHOLD) : group.members;
        const hiddenCount = group.members.length - visible.length;

        return (
          <div className="line" key={`${group.title}-${i}`}>
            <span className="pos">{group.title}</span>
            <div className="ppl">
              {visible.map((member) =>
                member.concurrent ? (
                  <span className="p kenmu" key={member.sysId}>
                    <span className="kenmu-mark">兼</span> {member.displayName}
                    <span className="kenmu-src">
                      ← {member.sourceDepartmentName} {member.sourceTitle}
                    </span>
                  </span>
                ) : (
                  <span className="p" key={member.sysId}>
                    {member.displayName}
                  </span>
                ),
              )}
              {hiddenCount > 0 ? (
                <Button
                  variant="plain"
                  size="sm"
                  className="roster-expand"
                  onClick={() => setExpanded((prev) => new Set(prev).add(i))}
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
