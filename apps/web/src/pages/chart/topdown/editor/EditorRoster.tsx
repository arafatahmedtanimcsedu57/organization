import { Pen, X } from 'lucide-react';

import type { Member } from '@org-chart/domain';

import { Button } from '../../../../design/components';

export interface EditorRosterProps {
  members: Member[];
  onEdit: (member: Member) => void;
  /** Only primary members can be deactivated; a 兼務 row is removed via its assignment. */
  onDeactivate: (member: Member) => void;
}

/** The selected department's roster as chips, each with its per-person actions. */
export function EditorRoster({ members, onEdit, onDeactivate }: EditorRosterProps) {
  if (members.length === 0) {
    return <span className="text-[12.5px] text-sub">No members in this department.</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {members.map((member) => (
        <span
          key={`${member.sysId}-${member.concurrent ? 'k' : 'p'}`}
          className={`inline-flex items-center gap-1.5 rounded-full border ps-4 pe-2 py-1 text-[12.5px] font-jp ${
            member.concurrent
              ? 'border-dashed border-brand bg-brand-tint text-brand-dark'
              : 'border-line bg-surface-sub text-ink'
          }`}
        >
          {member.concurrent ? <b className="kenmu-mark">兼</b> : null}
          {member.displayName}
          <span className="text-[10.5px] text-sub">{member.title}</span>
          <Button
            variant="plain"
            size="sm"
            className="!h-auto !px-1 py-0"
            onClick={() => onEdit(member)}
          >
            <Pen />
          </Button>
          {!member.concurrent ? (
              <button
                className="
                flex h-4 w-4 items-center justify-center
                rounded-full
                bg-red-500
                text-white
                "
                onClick={() => onDeactivate(member)}
              >
                <X className="h-3 w-3"  />
              </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}
