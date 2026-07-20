import type { Member } from '@org-chart/domain';

interface RosterLineGroup {
  title: string;
  members: Member[];
}

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
}

/** `.roster` — the department card's rank-ordered lines: one per title group, managers then staff. */
export function RosterLines({ managers, staff }: RosterLinesProps) {
  const groups = [...groupByTitle(managers), ...groupByTitle(staff)];
  if (groups.length === 0) return null;

  return (
    <div className="roster">
      {groups.map((group, i) => (
        <div className="line" key={`${group.title}-${i}`}>
          <span className="pos">{group.title}</span>
          <div className="ppl">
            {group.members.map((member) =>
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
          </div>
        </div>
      ))}
    </div>
  );
}
