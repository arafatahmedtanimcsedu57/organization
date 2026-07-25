import type { AssignmentType } from '../../../../store/api/assignmentsApi';
import type { FieldErrors } from '../../../admin/useEditorPanel';

/* ---------- form models (mirroring the admin pages) ---------- */

export interface DeptForm {
  name: string;
  parentName: string;
  head: string;
}

export const DEPT_EMPTY: DeptForm = { name: '', parentName: '', head: '' };

export const deptValidate = (form: DeptForm): FieldErrors<DeptForm> =>
  form.name.trim() ? {} : { name: 'Name is required.' };

export interface EmpForm {
  lastName: string;
  firstName: string;
  titleId: string;
  departmentId: string;
}

export const EMP_EMPTY: EmpForm = { lastName: '', firstName: '', titleId: '', departmentId: '' };

export function empValidate(form: EmpForm): FieldErrors<EmpForm> {
  const errors: FieldErrors<EmpForm> = {};
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!form.firstName.trim()) errors.firstName = 'First name is required.';
  if (!form.departmentId) errors.departmentId = 'Department is required.';
  if (!form.titleId) errors.titleId = 'Title is required.';
  return errors;
}

export interface AsnForm {
  employeeSysId: string;
  departmentId: string;
  titleId: string;
  assignmentType: AssignmentType;
  isPrimary: boolean;
  validFrom: string;
  validTo: string;
}

export const ASN_EMPTY: AsnForm = {
  employeeSysId: '',
  departmentId: '',
  titleId: '',
  assignmentType: 'concurrent',
  isPrimary: false,
  validFrom: '',
  validTo: '',
};

export function asnValidate(form: AsnForm): FieldErrors<AsnForm> {
  const errors: FieldErrors<AsnForm> = {};
  if (!form.employeeSysId) errors.employeeSysId = 'Person is required.';
  if (!form.departmentId) errors.departmentId = 'Department is required.';
  if (!form.titleId) errors.titleId = 'Title is required.';
  if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
    errors.validTo = 'Valid-to must be on or after valid-from.';
  }
  return errors;
}

/** Which inline editor the canvas panel currently shows. */
export type ActiveEditor = 'dept' | 'emp' | 'asn' | null;
