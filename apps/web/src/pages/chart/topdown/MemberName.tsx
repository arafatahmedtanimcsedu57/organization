import type { Member } from '@org-chart/domain';

export interface MemberNameProps {
  member: Member;
  nodeId: string;
  /** True when this person holds a 兼務 posting — their row becomes hover-linkable. */
  linkable?: boolean;
  /** True when this person is the one currently hovered (spotlight their every row). */
  highlighted?: boolean;
  onHoverMember?: (sysId: string | null) => void;
}

/**
 * One name in a roster row. `data-member-anchor` is what `useMemberAnchors` measures, so the
 * 兼務 curves can start and end at the person's actual row rather than the card's center.
 *
 * Highlight styling is deliberately layout-neutral (color / underline / background only, no
 * box change) so spotlighting a person never moves the anchor it is measured from.
 */
export function MemberName({
  member,
  nodeId,
  linkable = false,
  highlighted = false,
  onHoverMember,
}: MemberNameProps) {
  const highlight = highlighted
    ? 'rounded-[2px] bg-brand-tint text-brand-dark underline decoration-brand decoration-2 underline-offset-2'
    : '';
  const cursor = linkable ? 'cursor-help' : '';
  const hoverProps = linkable
    ? {
        onMouseEnter: () => onHoverMember?.(member.sysId),
        onMouseLeave: () => onHoverMember?.(null),
      }
    : undefined;

  if (!member.concurrent) {
    return (
      <span
        data-member-anchor={`${nodeId}:${member.sysId}`}
        className={`p font-jp ${cursor} ${highlight}`}
        {...hoverProps}
      >
        {member.displayName}
      </span>
    );
  }

  return (
    <span
      data-member-anchor={`${nodeId}:${member.sysId}`}
      className={`p kenmu font-jp text-brand-dark ${cursor} ${highlight}`}
      title={`兼務 ← ${member.sourceDepartmentName ?? ''} ${member.sourceTitle ?? ''}`}
      {...hoverProps}
    >
      <span className="kenmu-mark font-bold">兼</span> {member.displayName}
    </span>
  );
}
