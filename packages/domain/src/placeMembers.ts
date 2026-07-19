/**
 * Places each employee's primary posting into their department's roster, ordered by
 * position rank and split into managers vs. staff (課員). Ported from the legacy
 * `src/buildOrg.ts` (rank-ordering / manager-staff-split portion only — concurrent
 * (兼務) placement and last-name disambiguation are handled separately).
 */
import { normalizeTitle, POSITION_RANK, STAFF_RANK } from "./config.ts";
import type { DepartmentTree } from "./buildTree.ts";
import type { BuildWarning, Employee, Member } from "./model.ts";

/** Rank index for a title (normalized); unknown titles sort last. */
export function rankOf(title: string): number {
  const idx = POSITION_RANK.indexOf(normalizeTitle(title));
  return idx === -1 ? POSITION_RANK.length : idx;
}

const byRankThenName = (a: Member, b: Member): number =>
  a.rank - b.rank || a.displayName.localeCompare(b.displayName, "ja");

/**
 * Place every employee's primary posting into their department node (looked up by
 * `Employee.departmentName`), then sort each roster by rank. Employees whose
 * department has no match are reported as `unmatched-department` warnings and
 * skipped; employees whose title is not a known rank are still placed (sorted
 * last) but reported as `unknown-title` warnings.
 */
export function placeEmployees(tree: DepartmentTree, employees: Employee[]): BuildWarning[] {
  const warnings: BuildWarning[] = [];

  for (const employee of employees) {
    const node = tree.byName.get(employee.departmentName);
    if (!node) {
      warnings.push({
        kind: "unmatched-department",
        message: `Employee ${employee.lastName} ${employee.firstName} has department "${employee.departmentName}" not found in the department master.`,
      });
      continue;
    }

    const rank = rankOf(employee.title);
    if (rank === POSITION_RANK.length) {
      warnings.push({
        kind: "unknown-title",
        message: `Unknown title "${employee.title}" for ${employee.lastName} ${employee.firstName}; sorted last.`,
      });
    }

    const member: Member = {
      displayName: employee.lastName,
      title: employee.title,
      rank,
      concurrent: false,
      sysId: employee.sysId,
    };
    if (rank >= STAFF_RANK) node.staff.push(member);
    else node.managers.push(member);
  }

  for (const node of tree.byName.values()) {
    node.managers.sort(byRankThenName);
    node.staff.sort(byRankThenName);
  }

  return warnings;
}
