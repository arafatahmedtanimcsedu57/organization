import { type Page } from '@playwright/test';

interface Employee {
  sysId: string;
  userId: string;
}
interface Department {
  id: string;
  name: string;
}
interface Assignment {
  id: string;
  employeeSysId: string;
  departmentId: string;
}

/**
 * Deletes every posting for `userId` in the department named `departmentName`, straight
 * through the API (`page.request` rides the app's `/api` proxy). The journeys create
 * postings against the one shared, seeded database; pre-cleaning with this keeps their
 * "exactly one row" assertions valid across repeated suite runs. Doing it over HTTP rather
 * than by clicking through the admin UI avoids the `window.confirm` dance and is deterministic.
 */
export async function removeAssignmentsFor(
  page: Page,
  userId: string,
  departmentName: string,
): Promise<void> {
  const [employees, departments, assignments] = (await Promise.all([
    page.request.get('/api/employees').then((r) => r.json()),
    page.request.get('/api/departments').then((r) => r.json()),
    page.request.get('/api/assignments').then((r) => r.json()),
  ])) as [Employee[], Department[], Assignment[]];

  const employee = employees.find((e) => e.userId === userId);
  const department = departments.find((d) => d.name === departmentName);
  if (!employee || !department) return;

  const targets = assignments.filter(
    (a) => a.employeeSysId === employee.sysId && a.departmentId === department.id,
  );
  for (const assignment of targets) {
    const res = await page.request.delete(`/api/assignments/${assignment.id}`);
    if (!res.ok()) throw new Error(`failed to delete assignment ${assignment.id}: ${res.status()}`);
  }
}
