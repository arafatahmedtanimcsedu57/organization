import type { Department, Employee } from '@org-chart/domain';

/**
 * Non-fatal data drift found while importing the masters. Collected during
 * `npm run seed` and logged at the end of the run - the import never aborts
 * because of these (see data-import spec, "Report data-drift as warnings").
 */
export interface ImportWarning {
  kind: 'unmatched-department' | 'phantom-department-head';
  message: string;
}

/**
 * An employee is still imported even when their `Department` name matches no
 * row in `cmn_department` (see `upsertEmployees`'s doc comment) - but skipping
 * it silently would hide the drift, so it's reported here as a warning.
 */
export function findUnmatchedDepartmentWarnings(
  employees: Employee[],
  departmentIdByName: ReadonlyMap<string, string>,
): ImportWarning[] {
  return employees
    .filter((e) => !departmentIdByName.has(e.departmentName))
    .map((e) => ({
      kind: 'unmatched-department' as const,
      message: `Employee ${e.lastName}${e.firstName} (Sys ID ${e.sysId}) references unknown department "${e.departmentName}"`,
    }));
}

/**
 * `cmn_department.Department head` stores a free-text "First Last" name with
 * no FK to `sys_user`, so it can drift - this is the same phantom-name problem
 * the legacy hand-made chart has (names like 芹澤/岡本/河合 that appear on the
 * chart but nowhere in the master). When a head name matches no imported
 * employee, it's reported as a warning instead of silently ignored.
 */
export function findPhantomDepartmentHeadWarnings(departments: Department[], employees: Employee[]): ImportWarning[] {
  const employeeNames = new Set(employees.map((e) => `${e.firstName}${e.lastName}`));
  return departments
    .filter((d) => d.head !== '' && !employeeNames.has(d.head.replace(/\s+/g, '')))
    .map((d) => ({
      kind: 'phantom-department-head' as const,
      message: `Department "${d.name}" (ID ${d.id}) head "${d.head}" matches no employee in the master`,
    }));
}
