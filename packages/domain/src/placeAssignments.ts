/**
 * Places each concurrent (兼務) assignment into the referenced department's roster,
 * marked `concurrent` and carrying the person's home department + title so the
 * sourced `(兼)` chip can name where they came from. Rank/staff-level/label come from
 * the managed `Title` records (via `Assignment.titleId`); primary placement is handled
 * separately by `placeEmployees`.
 */
import { type Lang } from './config.ts';
import { computeDisplayNames } from './disambiguateNames.ts';
import { titleLabel, UNKNOWN_RANK } from './placeMembers.ts';
import type { DepartmentTree } from './buildTree.ts';
import type { Assignment, BuildWarning, Employee, Member, Title } from './model.ts';

const byRankThenName = (a: Member, b: Member): number =>
  a.rank - b.rank || a.displayName.localeCompare(b.displayName, 'ja');

/**
 * Place every `concurrent` assignment into its target department node (looked up by
 * `Assignment.departmentId`), carrying the employee's home department name and title
 * for the sourced chip. `primary` rows are skipped (the primary posting is placed by
 * `placeEmployees`). Assignments referencing an unknown employee or department are
 * reported as warnings and skipped; a `titleId` resolving to no title is still placed
 * (sorted last) but reported as a warning.
 */
export function placeAssignments(
  tree: DepartmentTree,
  employees: Employee[],
  assignments: Assignment[],
  titles: readonly Title[],
  lang: Lang = 'ja',
): BuildWarning[] {
  const warnings: BuildWarning[] = [];
  const displayNames = computeDisplayNames(employees, lang);
  const employeeBySysId = new Map(employees.map((e) => [e.sysId, e]));
  const titleById = new Map(titles.map((t) => [t.id, t]));

  let touched = false;
  for (const assignment of assignments) {
    if (assignment.type !== 'concurrent') continue;

    const employee = employeeBySysId.get(assignment.employeeSysId);
    if (!employee) {
      warnings.push({
        kind: 'unknown-assignment-user',
        message: `Assignment references unknown employee sysId "${assignment.employeeSysId}".`,
      });
      continue;
    }

    const node = tree.byId.get(assignment.departmentId);
    if (!node) {
      warnings.push({
        kind: 'unknown-assignment-department',
        message: `Assignment for ${employee.lastName} ${employee.firstName} references unknown departmentId "${assignment.departmentId}".`,
      });
      continue;
    }

    const title = titleById.get(assignment.titleId);
    if (!title) {
      warnings.push({
        kind: 'unknown-title',
        message: `Unknown title "${assignment.title || assignment.titleId}" for ${employee.lastName} ${employee.firstName}'s concurrent posting; sorted last.`,
      });
    }
    const homeTitle = titleById.get(employee.titleId);

    const member: Member = {
      displayName: displayNames.get(employee.sysId) ?? employee.lastName,
      title: title ? titleLabel(title, lang) : assignment.title || employee.title,
      rank: title ? title.rank : UNKNOWN_RANK,
      concurrent: true,
      sysId: employee.sysId,
      sourceDepartmentName: employee.departmentName,
      sourceTitle: homeTitle ? titleLabel(homeTitle, lang) : employee.title,
    };
    // Unknown title (no matching record) falls into the staff grid, sorted last.
    if (title ? title.staffLevel : true) node.staff.push(member);
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
