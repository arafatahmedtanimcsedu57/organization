import type { Member } from '@org-chart/domain';
import type { ChartNode } from '../../../store/api/chartNode';
import { branchColorFor } from '../branchColor';
import { groupByTitle } from './reportUtils';

export interface ReportNodeProps {
  node: ChartNode;
  /** Department name -> breadcrumb path, for the "concurrent from …" line. */
  ancestry: ReadonlyMap<string, string>;
}

/** One title row: the role label, then every person holding it as a chip. */
export function RoleRow({ title, members, rail }: { title: string; members: Member[]; rail: string }) {
  return (
    <div className="report-row">
      <span className="report-role" style={{ color: rail }}>
        {title}
      </span>
      <div className="report-chips">
        {members.map((member) => (
          <span key={member.sysId} className="report-chip">
            {member.displayName}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A 兼務 posting rendered as its own callout (never grouped with primary postings): the badge
 * icon, the title held here, and - resolved through `ancestry` - a plain-language "concurrent
 * from …" line naming the source department's full path and the person's home title there.
 */
export function ConcurrentCallout({
  member,
  rail,
  tint,
  badgeBg,
  ancestry,
}: {
  member: Member;
  rail: string;
  tint: string;
  badgeBg: string;
  ancestry: ReadonlyMap<string, string>;
}) {
  const source = member.sourceDepartmentName
    ? (ancestry.get(member.sourceDepartmentName) ?? member.sourceDepartmentName)
    : null;
  return (
    <div className="report-kenmu" style={{ borderColor: rail, background: tint }}>
      <span className="report-kenmu-badge" style={{ background: badgeBg }} aria-hidden="true">
        兼
      </span>
      <div>
        <p className="report-kenmu-title">
          {member.title} · <b>{member.displayName}</b>
        </p>
        {source ? (
          <p className="report-kenmu-sub">
            concurrent from {source}
            {member.sourceTitle ? ` — ${member.sourceTitle}` : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Header (bullet + name, plus an inline pill when a single person holds the node's top-ranked
 * own position) and body (兼務 callouts, then grouped role rows, or an empty-state) shared by
 * `DepartmentCard` and `GroupPanel` - the only difference between the two is the outer wrapper.
 */
function NodeHeadAndBody({
  node,
  ancestry,
  heading: Heading,
}: ReportNodeProps & { heading: 'h3' | 'h4' }) {
  const { rail, tint } = branchColorFor(node.branchId);
  const badgeBg = `color-mix(in srgb, ${rail} 78%, black)`;

  const concurrentOwn = [...node.managers, ...node.staff].filter((m) => m.concurrent);
  // Pill eligibility only ever looks at `managers` - a 課員-level (staff) person must never
  // headline a card, even when they're the only person directly on this node.
  const primaryManagers = node.managers.filter((m) => !m.concurrent);
  const primaryStaff = node.staff.filter((m) => !m.concurrent);

  // A single person at the top rank headlines the card as an inline pill instead of a row.
  let pillMember: Member | null = null;
  let rowManagers = primaryManagers;
  if (primaryManagers.length > 0) {
    const topRank = primaryManagers[0]!.rank;
    const topGroup = primaryManagers.filter((m) => m.rank === topRank);
    if (topGroup.length === 1) {
      pillMember = topGroup[0]!;
      rowManagers = primaryManagers.slice(1);
    }
  }

  const rows = groupByTitle([...rowManagers, ...primaryStaff]);
  const isEmpty = !pillMember && concurrentOwn.length === 0 && rows.length === 0;

  return (
    <>
      <div className="report-node-head">
        <span className="report-bullet" style={{ background: rail }} aria-hidden="true" />
        <Heading>{node.name}</Heading>
        {pillMember ? (
          <span className="report-pill" style={{ borderColor: rail, background: tint, color: rail }}>
            <span className="lbl">{pillMember.title}</span> <b>{pillMember.displayName}</b>
          </span>
        ) : null}
      </div>
      {isEmpty ? (
        <p className="report-empty">— No members currently assigned —</p>
      ) : (
        <div className="report-body">
          {concurrentOwn.map((member) => (
            <ConcurrentCallout
              key={`${member.sysId}-${member.title}`}
              member={member}
              rail={rail}
              tint={tint}
              badgeBg={badgeBg}
              ancestry={ancestry}
            />
          ))}
          {rows.map((row) => (
            <RoleRow key={row.title} title={row.title} members={row.members} rail={rail} />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * A department (division's direct child, depth 1): its own bordered card, connected to its
 * siblings by the division's rail (see `.report-tree` in `TopdownPrint`). Any deeper (group-tier)
 * children nest as tinted sub-panels *inside* this same card - see `GroupPanel`.
 */
export function DepartmentCard({ node, ancestry }: ReportNodeProps) {
  return (
    <div className="report-card">
      <NodeHeadAndBody node={node} ancestry={ancestry} heading="h3" />
      {node.children.length > 0 ? (
        <div className="report-panels">
          {node.children.map((child) => (
            <GroupPanel key={child.id} node={child} ancestry={ancestry} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A group (depth ≥ 2): an inset tinted panel nested inside its parent's card, recursing for
 * any further nesting rather than breaking out into its own top-level card. */
export function GroupPanel({ node, ancestry }: ReportNodeProps) {
  const { tint } = branchColorFor(node.branchId);
  return (
    <div className="report-panel" style={{ background: tint }}>
      <NodeHeadAndBody node={node} ancestry={ancestry} heading="h4" />
      {node.children.length > 0 ? (
        <div className="report-panels nested">
          {node.children.map((child) => (
            <GroupPanel key={child.id} node={child} ancestry={ancestry} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
