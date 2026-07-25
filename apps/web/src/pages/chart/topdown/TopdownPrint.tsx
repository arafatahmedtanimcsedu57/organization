import { useMemo } from 'react';
import type { Member } from '@org-chart/domain';
import type { ChartNode } from '../../../store/api/chartNode';
import {
  BranchColorProvider,
  branchTextInk,
  createBranchColorResolver,
  useBranchColor,
} from '../branchColor';
import { ConcurrentCallout, DepartmentCard, RoleRow } from './ReportNode';
import {
  buildAncestryIndex,
  countMembers,
  divisionEyebrow,
  effectiveDateLabel,
  groupByTitle,
  totalStats,
} from './reportUtils';

/**
 * `.report` - the print/PDF rendering of the chart (`?print=1`). Deliberately **not** the
 * interactive canvas: the PDF is a **document report** (A4 portrait), so it renders each
 * division as a readable outline - a colored badge for its own leadership, then its departments
 * as bordered cards connected by a branch-colored rail, each holding role rows (chips) and any
 * deeper groups as nested tinted panels. 兼務 postings get their own callout naming the source
 * department in full and the role held there. Every division starts on a fresh page; the cover
 * block (company name, title, totals, legend) renders once, above the first division's own
 * content. The running company header / page-number footer are drawn by `ChartPdfService`.
 */

function ReportCover({ roots }: { roots: ChartNode[] }) {
  const { divisions, positions } = totalStats(roots);
  return (
    <div className="report-cover">
      <div className="report-cover-top">
        <div className="report-brand">
          <p className="jp">株式会社シスラボ</p>
          <p className="en">SYSLAB CO., LTD.</p>
        </div>
        <div className="report-meta">
          <p className="date">Effective {effectiveDateLabel()}</p>
          <p>{divisions} Divisions</p>
          <p>{positions} Positions Listed</p>
        </div>
      </div>
    </div>
  );
}

/** The division's own directly-assigned people: its top rank as large colored badges (the
 * division's "leadership line"), any remaining own members as ordinary rows below. */
function DivisionSelf({ node, ancestry }: { node: ChartNode; ancestry: ReadonlyMap<string, string> }) {
  const resolveBranchColor = useBranchColor();
  const { rail, tint } = resolveBranchColor(node.branchId);
  const badgeBg = `color-mix(in srgb, ${rail} 78%, black)`;

  if (node.managers.length === 0 && node.staff.length === 0) return null;
  const concurrentOwn = [...node.managers, ...node.staff].filter((m) => m.concurrent);
  // The badge line only ever pulls from `managers` - staff (課員) never headline a division.
  const primaryManagers = node.managers.filter((m) => !m.concurrent);
  const primaryStaff = node.staff.filter((m) => !m.concurrent);
  const topRank = primaryManagers[0]?.rank;
  const topGroup: Member[] = topRank !== undefined ? primaryManagers.filter((m) => m.rank === topRank) : [];
  const restRows = groupByTitle([...primaryManagers.slice(topGroup.length), ...primaryStaff]);

  if (topGroup.length === 0 && concurrentOwn.length === 0 && restRows.length === 0) return null;

  return (
    <div className="report-division-self">
      {topGroup.length > 0 ? (
        <div className="report-badges">
          {topGroup.map((member) => (
            <div key={member.sysId} className="report-badge" style={{ background: badgeBg }}>
              <span className="lbl">{member.title}</span>
              <span className="nm">{member.displayName}</span>
            </div>
          ))}
        </div>
      ) : null}
      {concurrentOwn.length > 0 || restRows.length > 0 ? (
        <div className="report-body report-division-extra">
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
          {restRows.map((row) => (
            <RoleRow key={row.title} title={row.title} members={row.members} rail={rail} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface DivisionPageProps {
  root: ChartNode;
  index: number;
  roots: ChartNode[];
  ancestry: ReadonlyMap<string, string>;
}

/** One division: its own page, starting with the cover block if this is the first. */
function DivisionPage({ root, index, roots, ancestry }: DivisionPageProps) {
  const resolveBranchColor = useBranchColor();
  const { rail } = resolveBranchColor(root.branchId);

  return (
    <div className="topdown-print-page">
      {index === 0 ? <ReportCover roots={roots} /> : null}

      <header className="report-division-head">
        <p className="report-eyebrow" style={{ color: branchTextInk(rail) }}>
          {divisionEyebrow(index)}
        </p>
        <div className="report-division-title-row">
          <h2>{root.name}</h2>
          <span className="report-count">{countMembers(root)} listed</span>
        </div>
        <div className="report-division-rule" style={{ background: `linear-gradient(to right, ${rail}, transparent)` }} />
      </header>

      <DivisionSelf node={root} ancestry={ancestry} />

      {root.children.length > 0 ? (
        <div className="report-tree" style={{ borderColor: rail }}>
          {root.children.map((child) => (
            <DepartmentCard key={child.id} node={child} ancestry={ancestry} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TopdownPrint({ roots }: { roots: ChartNode[] }) {
  const ancestry = useMemo(() => buildAncestryIndex(roots), [roots]);
  const resolveBranchColor = useMemo(
    () => createBranchColorResolver(roots.map((root) => root.branchId)),
    [roots],
  );
  if (roots.length === 0) return null;
  return (
    <BranchColorProvider value={resolveBranchColor}>
      <div className="topdown-print report">
        {roots.map((root, index) => (
          <DivisionPage key={root.id} root={root} index={index} roots={roots} ancestry={ancestry} />
        ))}
      </div>
    </BranchColorProvider>
  );
}
