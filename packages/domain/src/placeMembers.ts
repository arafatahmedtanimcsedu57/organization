/**
 * Places each employee's primary posting into their department's roster, ordered by
 * the title's `rank` and split into managers vs. staff (課員). Rank, staff-level, and
 * the display label all come from the managed `Title` records passed in - not from a
 * compile-time list - so a maintainer can add/rename/reorder titles from the Settings
 * UI. Concurrent (兼務) placement is handled separately by `placeAssignments`.
 */
import { type Lang } from './config.ts';
import { computeDisplayNames } from './disambiguateNames.ts';
import type { DepartmentTree } from './buildTree.ts';
import type { BuildWarning, Employee, Member, Title } from './model.ts';

/** Rank sentinel for a title that resolves to no managed record; sorts last. */
export const UNKNOWN_RANK = Number.MAX_SAFE_INTEGER;

/** The title's display label in the dataset's language. */
export function titleLabel(title: Title, lang: Lang): string {
  return lang === 'en' ? title.nameEn : title.name;
}

const byRankThenName = (a: Member, b: Member): number =>
  a.rank - b.rank || a.displayName.localeCompare(b.displayName, 'ja');

/**
 * Place every employee's primary posting into their department node (looked up by
 * `Employee.departmentName`), then sort each roster by rank. Employees whose
 * department has no match are reported as `unmatched-department` warnings and
 * skipped; employees whose `titleId` resolves to no title are still placed (sorted
 * last, in the manager list) but reported as `unknown-title` warnings.
 */
export function placeEmployees(
  tree: DepartmentTree,
  employees: Employee[],
  titles: readonly Title[],
  lang: Lang = 'ja',
): BuildWarning[] {
  const warnings: BuildWarning[] = [];
  const displayNames = computeDisplayNames(employees, lang);
  const titleById = new Map(titles.map((t) => [t.id, t]));

  for (const employee of employees) {
    const node = tree.byName.get(employee.departmentName);
    if (!node) {
      warnings.push({
        kind: 'unmatched-department',
        message: `Employee ${employee.lastName} ${employee.firstName} has department "${employee.departmentName}" not found in the department master.`,
      });
      continue;
    }

    const title = titleById.get(employee.titleId);
    if (!title) {
      warnings.push({
        kind: 'unknown-title',
        message: `Unknown title "${employee.title || employee.titleId}" for ${employee.lastName} ${employee.firstName}; sorted last.`,
      });
    }

    const member: Member = {
      displayName: displayNames.get(employee.sysId) ?? employee.lastName,
      title: title ? titleLabel(title, lang) : employee.title,
      rank: title ? title.rank : UNKNOWN_RANK,
      concurrent: false,
      sysId: employee.sysId,
    };
    // Unknown title (no matching record) falls into the staff grid, sorted last.
    if (title ? title.staffLevel : true) node.staff.push(member);
    else node.managers.push(member);
  }

  for (const node of tree.byName.values()) {
    node.managers.sort(byRankThenName);
    node.staff.sort(byRankThenName);
  }

  return warnings;
}
