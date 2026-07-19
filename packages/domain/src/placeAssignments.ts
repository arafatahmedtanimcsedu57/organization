/**
 * Places each concurrent (兼務) assignment into the referenced department's roster,
 * marked `concurrent` and carrying the person's home department + title so the
 * sourced `(兼)` chip can name where they came from. Ported from the legacy
 * `src/buildOrg.ts` (the `user_assignments` / concurrent-entries portion); primary
 * placement is handled separately by `placeEmployees`.
 */
import { POSITION_RANK, STAFF_RANK } from "./config.ts";
import { computeDisplayNames } from "./disambiguateNames.ts";
import { rankOf } from "./placeMembers.ts";
import type { DepartmentTree } from "./buildTree.ts";
import type { Assignment, BuildWarning, Employee, Member } from "./model.ts";

const byRankThenName = (a: Member, b: Member): number =>
  a.rank - b.rank || a.displayName.localeCompare(b.displayName, "ja");

/**
 * Place every `concurrent` assignment into its target department node (looked up by
 * `Assignment.departmentId`), carrying the employee's home department name and title
 * for the sourced chip. `primary` rows are skipped (the primary posting is placed by
 * `placeEmployees` from `Employee.departmentName`). Assignments referencing an unknown
 * employee or department are reported as warnings and skipped; an unknown title is
 * still placed (sorted last) but reported as a warning.
 */
export function placeAssignments(
  tree: DepartmentTree,
  employees: Employee[],
  assignments: Assignment[],
): BuildWarning[] {
  const warnings: BuildWarning[] = [];
  const displayNames = computeDisplayNames(employees);
  const employeeBySysId = new Map(employees.map((e) => [e.sysId, e]));

  let touched = false;
  for (const assignment of assignments) {
    if (assignment.type !== "concurrent") continue;

    const employee = employeeBySysId.get(assignment.employeeSysId);
    if (!employee) {
      warnings.push({
        kind: "unknown-assignment-user",
        message: `Assignment references unknown employee sysId "${assignment.employeeSysId}".`,
      });
      continue;
    }

    const node = tree.byId.get(assignment.departmentId);
    if (!node) {
      warnings.push({
        kind: "unknown-assignment-department",
        message: `Assignment for ${employee.lastName} ${employee.firstName} references unknown departmentId "${assignment.departmentId}".`,
      });
      continue;
    }

    const title = assignment.title || employee.title;
    const rank = rankOf(title);
    if (rank === POSITION_RANK.length) {
      warnings.push({
        kind: "unknown-title",
        message: `Unknown title "${title}" for ${employee.lastName} ${employee.firstName}'s concurrent posting; sorted last.`,
      });
    }

    const member: Member = {
      displayName: displayNames.get(employee.sysId) ?? employee.lastName,
      title,
      rank,
      concurrent: true,
      sysId: employee.sysId,
      sourceDepartmentName: employee.departmentName,
      sourceTitle: employee.title,
    };
    if (rank >= STAFF_RANK) node.staff.push(member);
    else node.managers.push(member);
    touched = true;
  }

  if (touched) {
    for (const node of tree.byName.values()) {
      node.managers.sort(byRankThenName);
      node.staff.sort(byRankThenName);
    }
  }

  return warnings;
}
