import { Badge } from '../../../design/components';
import type { IndexTableColumn } from '../../../design/components';
import { DEPT, PERSON } from '../../../design/formStyles';
import type { Assignment } from '../../../store/api/assignmentsApi';
import type { Department } from '../../../store/api/departmentsApi';
import type { Employee } from '../../../store/api/employeesApi';
import { personName } from './assignmentForm';

export interface AssignmentColumnsOptions {
  employees: Employee[] | undefined;
  departments: Department[] | undefined;
}

/** A posting whose valid-to date has passed - stays visible for record-keeping, but no longer holds. */
function isEnded(assignment: Assignment, today: string): boolean {
  return Boolean(assignment.validTo && assignment.validTo < today);
}

/**
 * The postings table's columns. The two name lookups are indexed once per render rather
 * than scanned per cell, so the table stays linear in the number of postings.
 */
export function assignmentColumns({
  employees,
  departments,
}: AssignmentColumnsOptions): IndexTableColumn<Assignment>[] {
  const employeeBySysId = new Map((employees ?? []).map((employee) => [employee.sysId, employee]));
  const departmentById = new Map(
    (departments ?? []).map((department) => [department.id, department]),
  );
  const today = new Date().toISOString().slice(0, 10);

  return [
    {
      key: 'person',
      header: 'Person',
      render: (assignment) => (
        <span className={PERSON}>
          {personName(employeeBySysId.get(assignment.employeeSysId), assignment.employeeSysId)}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (assignment) => (
        <span className={DEPT}>
          {departmentById.get(assignment.departmentId)?.name ?? assignment.departmentId}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (assignment) => <Badge plain>{assignment.title}</Badge>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (assignment) =>
        assignment.assignmentType === 'concurrent' ? (
          <Badge tone="kenmu">兼務</Badge>
        ) : (
          <Badge tone="brand">Primary</Badge>
        ),
    },
    {
      key: 'valid',
      header: 'Valid from / to',
      render: (assignment) => (
        <span
          className="font-jp text-ink text-[13px]"
          style={isEnded(assignment, today) ? { color: 'var(--color-sub)' } : undefined}
        >
          {assignment.validFrom ?? '-'} → {assignment.validTo ?? '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (assignment) =>
        isEnded(assignment, today) ? <Badge>Ended</Badge> : <Badge tone="success">Active</Badge>,
    },
  ];
}
