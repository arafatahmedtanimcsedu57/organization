import type { Assignment, AssignmentType } from '../../../store/api/assignmentsApi';
import type { Employee } from '../../../store/api/employeesApi';
import type { FieldErrors } from '../useEditorPanel';

export interface AssignmentFormState {
  employeeSysId: string;
  departmentId: string;
  title: string;
  assignmentType: AssignmentType;
  isPrimary: boolean;
  validFrom: string;
  validTo: string;
}

export const EMPTY_FORM: AssignmentFormState = {
  employeeSysId: '',
  departmentId: '',
  title: '',
  assignmentType: 'concurrent',
  isPrimary: false,
  validFrom: '',
  validTo: '',
};

export function toFormState(assignment: Assignment): AssignmentFormState {
  return {
    employeeSysId: assignment.employeeSysId,
    departmentId: assignment.departmentId,
    title: assignment.title,
    assignmentType: assignment.assignmentType,
    isPrimary: assignment.isPrimary,
    validFrom: assignment.validFrom ?? '',
    validTo: assignment.validTo ?? '',
  };
}

/** Display name for a posting's holder, falling back to the raw id if they were purged. */
export function personName(employee: Employee | undefined, sysId: string): string {
  return employee ? `${employee.lastName} ${employee.firstName}` : sysId;
}

export function validate(form: AssignmentFormState): FieldErrors<AssignmentFormState> {
  const errors: FieldErrors<AssignmentFormState> = {};
  if (!form.employeeSysId) errors.employeeSysId = 'Person is required.';
  if (!form.departmentId) errors.departmentId = 'Department is required.';
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
    errors.validTo = 'Valid-to must be on or after valid-from.';
  }
  return errors;
}
