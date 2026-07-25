import type { Member } from '@org-chart/domain';
import type { ChartNode } from '../../../store/api/chartNode';

/** Recursive headcount (managers + staff) under `node`, inclusive. */
export function countMembers(node: ChartNode): number {
  let count = node.managers.length + node.staff.length;
  for (const child of node.children) count += countMembers(child);
  return count;
}

/** Cover-page stats: how many top-level divisions and how many positions overall. */
export function totalStats(roots: ChartNode[]): { divisions: number; positions: number } {
  return {
    divisions: roots.length,
    positions: roots.reduce((sum, root) => sum + countMembers(root), 0),
  };
}

/** Whether any 兼務 posting exists anywhere in the tree - gates the legend on the cover page. */
export function hasAnyConcurrent(roots: ChartNode[]): boolean {
  const visit = (node: ChartNode): boolean =>
    node.managers.some((m) => m.concurrent) ||
    node.staff.some((m) => m.concurrent) ||
    node.children.some(visit);
  return roots.some(visit);
}

/**
 * Department name -> breadcrumb path from its division down to it (e.g. "IT Support Division ·
 * Business Unit"), for every department in the tree. A concurrent posting's `sourceDepartmentName`
 * is just the bare name (see `packages/domain`'s `placeAssignments`); this turns it into a
 * reader-friendly path for the report's "concurrent from …" line, regardless of which division the
 * source department happens to live in.
 */
export function buildAncestryIndex(roots: ChartNode[]): Map<string, string> {
  const index = new Map<string, string>();
  const visit = (node: ChartNode, trail: string[]) => {
    const path = [...trail, node.name];
    index.set(node.name, path.join(' · '));
    for (const child of node.children) visit(child, path);
  };
  for (const root of roots) visit(root, []);
  return index;
}

/** Consecutive same-title members collapsed into one row, preserving the domain's rank order. */
export function groupByTitle(members: Member[]): { title: string; members: Member[] }[] {
  const rows: { title: string; members: Member[] }[] = [];
  for (const member of members) {
    const last = rows[rows.length - 1];
    if (last && last.title === member.title) last.members.push(member);
    else rows.push({ title: member.title, members: [member] });
  }
  return rows;
}

/** "Effective July 2026" - the report's generation month, formatted for the cover + footer. */
export function effectiveDateLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

/** "DIVISION 01", "DIVISION 02", … - zero-padded to 2 digits. */
export function divisionEyebrow(index: number): string {
  return `DIVISION ${String(index + 1).padStart(2, '0')}`;
}
