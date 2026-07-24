import { useCallback, useState } from 'react';
import { POSITION_RANK } from '@org-chart/domain';
import type { Member } from '@org-chart/domain';
import { Badge, Button, Card } from '../../../design/components';
import { FIELD, LABEL, INPUT, FIELD_ERR, TWO } from '../../../design/formStyles';
import type { ChartNode } from '../../../store/api/chartNode';
import { chartApi } from '../../../store/api/chartApi';
import { errorMessage } from '../../../store/api/errorMessage';
import {
  useCreateDepartmentMutation,
  useDeactivateDepartmentMutation,
  useGetDepartmentsQuery,
  useUpdateDepartmentMutation,
  type Department,
} from '../../../store/api/departmentsApi';
import {
  useDeactivateEmployeeMutation,
  useGetEmployeesQuery,
  useUpdateEmployeeMutation,
  type Employee,
} from '../../../store/api/employeesApi';
import { useCreateAssignmentMutation, type AssignmentType } from '../../../store/api/assignmentsApi';
import { useAppDispatch } from '../../../store/store';
import { useEditorPanel, type FieldErrors } from '../../admin/useEditorPanel';

/* ---------- form models (mirroring the admin pages) ---------- */

interface DeptForm {
  name: string;
  parentName: string;
  head: string;
}
const DEPT_EMPTY: DeptForm = { name: '', parentName: '', head: '' };
const deptValidate = (form: DeptForm): FieldErrors<DeptForm> =>
  form.name.trim() ? {} : { name: 'Name is required.' };

interface EmpForm {
  lastName: string;
  firstName: string;
  title: string;
  departmentId: string;
}
const EMP_EMPTY: EmpForm = { lastName: '', firstName: '', title: '', departmentId: '' };
function empValidate(form: EmpForm): FieldErrors<EmpForm> {
  const errors: FieldErrors<EmpForm> = {};
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!form.firstName.trim()) errors.firstName = 'First name is required.';
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (!form.departmentId) errors.departmentId = 'Department is required.';
  return errors;
}

interface AsnForm {
  employeeSysId: string;
  departmentId: string;
  title: string;
  assignmentType: AssignmentType;
  isPrimary: boolean;
  validFrom: string;
  validTo: string;
}
const ASN_EMPTY: AsnForm = {
  employeeSysId: '',
  departmentId: '',
  title: '',
  assignmentType: 'concurrent',
  isPrimary: false,
  validFrom: '',
  validTo: '',
};
function asnValidate(form: AsnForm): FieldErrors<AsnForm> {
  const errors: FieldErrors<AsnForm> = {};
  if (!form.employeeSysId) errors.employeeSysId = 'Person is required.';
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
    errors.validTo = 'Valid-to must be on or after valid-from.';
  }
  return errors;
}

type ActiveEditor = 'dept' | 'emp' | 'asn' | null;

export interface CanvasEditorProps {
  node: ChartNode;
  onClose: () => void;
}

/**
 * `.canvas-editor` — inline CRUD for the selected canvas node (`chart-canvas` capability):
 * edit / deactivate the department, add a sub-department, add a 兼務 posting, and edit /
 * deactivate roster people — all through the same `useEditorPanel` + RTK Query mutations
 * the admin pages use. `chartApi` is a separate slice whose `Chart` tag the master-data
 * mutations do NOT invalidate, so every successful save here explicitly invalidates it —
 * that is what makes the canvas refresh without a manual reload (task 6.3).
 */
export function CanvasEditor({ node, onClose }: CanvasEditorProps) {
  const dispatch = useAppDispatch();
  const { data: departments } = useGetDepartmentsQuery();
  const { data: employees } = useGetEmployeesQuery();

  const [createDepartment, deptCreateState] = useCreateDepartmentMutation();
  const [updateDepartment, deptUpdateState] = useUpdateDepartmentMutation();
  const [deactivateDepartment] = useDeactivateDepartmentMutation();
  const [updateEmployee, empUpdateState] = useUpdateEmployeeMutation();
  const [deactivateEmployee] = useDeactivateEmployeeMutation();
  const [createAssignment, asnCreateState] = useCreateAssignmentMutation();

  const [active, setActive] = useState<ActiveEditor>(null);
  // Dynamic empty forms so "Add sub-department" / "Add posting" open prefilled.
  const [deptEmpty, setDeptEmpty] = useState<DeptForm>(DEPT_EMPTY);
  const [asnEmpty, setAsnEmpty] = useState<AsnForm>(ASN_EMPTY);

  const refreshChart = useCallback(
    () => dispatch(chartApi.util.invalidateTags(['Chart'])),
    [dispatch],
  );

  const dept = useEditorPanel<Department, DeptForm>({
    emptyForm: deptEmpty,
    resolveRow: (id) => departments?.find((d) => d.id === id),
    toFormState: (d) => ({ name: d.name, parentName: d.parentName, head: d.head }),
    validate: deptValidate,
    createState: deptCreateState,
    updateState: deptUpdateState,
  });

  const emp = useEditorPanel<Employee, EmpForm>({
    emptyForm: EMP_EMPTY,
    resolveRow: (sysId) => employees?.find((e) => e.sysId === sysId),
    toFormState: (e) => ({
      lastName: e.lastName,
      firstName: e.firstName,
      title: e.title,
      departmentId: e.departmentId,
    }),
    validate: empValidate,
    createState: empUpdateState, // employee creation stays in the admin pages
    updateState: empUpdateState,
  });

  const asn = useEditorPanel<never, AsnForm>({
    emptyForm: asnEmpty,
    resolveRow: () => undefined,
    toFormState: () => asnEmpty,
    validate: asnValidate,
    createState: asnCreateState,
    updateState: asnCreateState, // create-only editor
  });

  const closeAll = useCallback(() => {
    dept.closePanel();
    emp.closePanel();
    asn.closePanel();
    setActive(null);
  }, [dept, emp, asn]);

  /* ---------- open handlers (task 6.1) ---------- */

  const openDeptEdit = () => {
    closeAll();
    setActive('dept');
    dept.openEdit(node.id);
  };
  const openDeptCreate = () => {
    closeAll();
    setDeptEmpty({ ...DEPT_EMPTY, parentName: node.name });
    setActive('dept');
    dept.openCreate();
  };
  const openAsnCreate = () => {
    closeAll();
    setAsnEmpty({ ...ASN_EMPTY, departmentId: node.id });
    setActive('asn');
    asn.openCreate();
  };
  const openEmpEdit = (member: Member) => {
    closeAll();
    setActive('emp');
    emp.openEdit(member.sysId);
  };

  /* ---------- saves / deactivations (tasks 6.2, 6.3) ---------- */

  async function saveDept() {
    const values = dept.beginSave();
    if (!values) return;
    const body = { name: values.name, parentName: values.parentName, head: values.head };
    const result = dept.isCreating
      ? await createDepartment(body)
      : await updateDepartment({ id: node.id, body });
    if (!('error' in result)) {
      refreshChart();
      closeAll();
    }
  }

  async function saveEmp() {
    const values = emp.beginSave();
    if (!values || !emp.panel || emp.isCreating) return;
    const result = await updateEmployee({ sysId: emp.panel, body: values });
    if (!('error' in result)) {
      refreshChart();
      closeAll();
    }
  }

  async function saveAsn() {
    const values = asn.beginSave();
    if (!values) return;
    const result = await createAssignment({
      employeeSysId: values.employeeSysId,
      departmentId: node.id,
      title: values.title,
      assignmentType: values.assignmentType,
      isPrimary: values.isPrimary,
      validFrom: values.validFrom || undefined,
      validTo: values.validTo || undefined,
    });
    if (!('error' in result)) {
      refreshChart();
      closeAll();
    }
  }

  async function deactivateDept() {
    if (!window.confirm(`Deactivate ${node.name}? It will no longer appear on the chart.`)) return;
    await deactivateDepartment(node.id);
    refreshChart();
    onClose();
  }

  async function deactivatePerson(member: Member) {
    if (!window.confirm(`Deactivate ${member.displayName}? They will no longer appear on the chart.`)) {
      return;
    }
    await deactivateEmployee(member.sysId);
    refreshChart();
  }

  const roster: Member[] = [...node.managers, ...node.staff];

  return (
    <Card className="canvas-editor no-print">
      <Card.Header
        title={
          <span className="font-jp">
            {node.name}
            {node.nameEn ? <span className="ml-2 text-[11.5px] text-sub">{node.nameEn}</span> : null}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={openDeptEdit}>
              Edit department
            </Button>
            <Button variant="secondary" size="sm" onClick={openDeptCreate}>
              Add sub-department
            </Button>
            <Button variant="secondary" size="sm" onClick={openAsnCreate}>
              Add posting (兼務)
            </Button>
            <Button variant="plain" size="sm" onClick={deactivateDept}>
              Deactivate
            </Button>
            <Button variant="plain" size="sm" onClick={onClose} aria-label="Close panel">
              ✕
            </Button>
          </>
        }
      />

      {/* Roster with per-person actions */}
      <Card.Section>
        <div className="flex flex-wrap gap-2">
          {roster.length === 0 ? (
            <span className="text-[12.5px] text-sub">No members in this department.</span>
          ) : (
            roster.map((member) => (
              <span
                key={`${member.sysId}-${member.concurrent ? 'k' : 'p'}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-jp ${
                  member.concurrent
                    ? 'border-dashed border-brand bg-brand-tint text-brand-dark'
                    : 'border-line bg-surface-sub text-ink'
                }`}
              >
                {member.concurrent ? <b className="kenmu-mark">兼</b> : null}
                {member.displayName}
                <span className="text-[10.5px] text-sub">{member.title}</span>
                <Button variant="plain" size="sm" className="!h-auto !px-1 py-0" onClick={() => openEmpEdit(member)}>
                  Edit
                </Button>
                {!member.concurrent ? (
                  <Button
                    variant="plain"
                    size="sm"
                    className="!h-auto !px-1 py-0"
                    onClick={() => deactivatePerson(member)}
                  >
                    Deactivate
                  </Button>
                ) : null}
              </span>
            ))
          )}
        </div>
      </Card.Section>

      {/* Department editor — for edits, render only once the department row resolved,
          so the form can never be shown (or saved) unpopulated while /departments loads. */}
      {active === 'dept' && dept.panel && (dept.isCreating || dept.editingRow) ? (
        <Card.Section>
          <h3 className="text-[13px] font-semibold mb-3">
            {dept.isCreating ? `Add sub-department under ${node.name}` : 'Edit department'}
          </h3>
          <div className={TWO}>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="cv-dept-name">
                Name 部門名
              </label>
              <input
                id="cv-dept-name"
                className={INPUT}
                value={dept.form.name}
                onChange={(e) => dept.setForm({ ...dept.form, name: e.target.value })}
              />
              {dept.attemptedSave && dept.fieldErrors.name ? (
                <div className={FIELD_ERR}>{dept.fieldErrors.name}</div>
              ) : null}
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="cv-dept-parent">
                Parent department
              </label>
              <select
                id="cv-dept-parent"
                className={INPUT}
                value={dept.form.parentName}
                onChange={(e) => dept.setForm({ ...dept.form, parentName: e.target.value })}
              >
                <option value="">No parent (root)</option>
                {(departments ?? [])
                  .filter((d) => (d.active || d.name === dept.form.parentName) && d.id !== node.id)
                  .map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className={FIELD}>
            <label className={LABEL} htmlFor="cv-dept-head">
              Department head 部門長
            </label>
            <input
              id="cv-dept-head"
              className={INPUT}
              value={dept.form.head}
              onChange={(e) => dept.setForm({ ...dept.form, head: e.target.value })}
            />
          </div>
          {dept.saveError ? <div className={FIELD_ERR}>{errorMessage(dept.saveError)}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeAll} disabled={dept.saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveDept} disabled={dept.saving}>
              {dept.saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Card.Section>
      ) : null}

      {/* Employee editor */}
      {active === 'emp' && emp.panel && emp.editingRow ? (
        <Card.Section>
          <h3 className="text-[13px] font-semibold mb-3">
            Edit employee <Badge plain>{emp.editingRow.userId}</Badge>
          </h3>
          <div className={TWO}>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="cv-emp-last">
                Last name 姓
              </label>
              <input
                id="cv-emp-last"
                className={INPUT}
                value={emp.form.lastName}
                onChange={(e) => emp.setForm({ ...emp.form, lastName: e.target.value })}
              />
              {emp.attemptedSave && emp.fieldErrors.lastName ? (
                <div className={FIELD_ERR}>{emp.fieldErrors.lastName}</div>
              ) : null}
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="cv-emp-first">
                First name 名
              </label>
              <input
                id="cv-emp-first"
                className={INPUT}
                value={emp.form.firstName}
                onChange={(e) => emp.setForm({ ...emp.form, firstName: e.target.value })}
              />
              {emp.attemptedSave && emp.fieldErrors.firstName ? (
                <div className={FIELD_ERR}>{emp.fieldErrors.firstName}</div>
              ) : null}
            </div>
          </div>
          <div className={TWO}>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="cv-emp-title">
                Title 役職
              </label>
              <input
                id="cv-emp-title"
                className={INPUT}
                list="position-ranks"
                value={emp.form.title}
                onChange={(e) => emp.setForm({ ...emp.form, title: e.target.value })}
              />
              <datalist id="position-ranks">
                {POSITION_RANK.map((rank) => (
                  <option key={rank} value={rank} />
                ))}
              </datalist>
              {emp.attemptedSave && emp.fieldErrors.title ? (
                <div className={FIELD_ERR}>{emp.fieldErrors.title}</div>
              ) : null}
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="cv-emp-dept">
                Home department 部門
              </label>
              <select
                id="cv-emp-dept"
                className={INPUT}
                value={emp.form.departmentId}
                onChange={(e) => emp.setForm({ ...emp.form, departmentId: e.target.value })}
              >
                <option value="" disabled>
                  Select a department…
                </option>
                {(departments ?? [])
                  .filter((d) => d.active || d.id === emp.form.departmentId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
              {emp.attemptedSave && emp.fieldErrors.departmentId ? (
                <div className={FIELD_ERR}>{emp.fieldErrors.departmentId}</div>
              ) : null}
            </div>
          </div>
          {emp.saveError ? <div className={FIELD_ERR}>{errorMessage(emp.saveError)}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeAll} disabled={emp.saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEmp} disabled={emp.saving}>
              {emp.saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Card.Section>
      ) : null}

      {/* Assignment (兼務) creator */}
      {active === 'asn' && asn.panel ? (
        <Card.Section>
          <h3 className="text-[13px] font-semibold mb-3">
            Add posting in <span className="font-jp">{node.name}</span>
          </h3>
          <div className={TWO}>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="cv-asn-person">
                Person
              </label>
              <select
                id="cv-asn-person"
                className={INPUT}
                value={asn.form.employeeSysId}
                onChange={(e) => asn.setForm({ ...asn.form, employeeSysId: e.target.value })}
              >
                <option value="" disabled>
                  Select a person…
                </option>
                {(employees ?? [])
                  .filter((e) => e.active)
                  .map((e) => (
                    <option key={e.sysId} value={e.sysId}>
                      {e.lastName} {e.firstName} ({e.userId})
                    </option>
                  ))}
              </select>
              {asn.attemptedSave && asn.fieldErrors.employeeSysId ? (
                <div className={FIELD_ERR}>{asn.fieldErrors.employeeSysId}</div>
              ) : null}
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="cv-asn-title">
                Title in this department 役職
              </label>
              <input
                id="cv-asn-title"
                className={INPUT}
                list="position-ranks"
                value={asn.form.title}
                onChange={(e) => asn.setForm({ ...asn.form, title: e.target.value })}
              />
              {asn.attemptedSave && asn.fieldErrors.title ? (
                <div className={FIELD_ERR}>{asn.fieldErrors.title}</div>
              ) : null}
            </div>
          </div>
          <div className={TWO}>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="cv-asn-from">
                Valid from
              </label>
              <input
                id="cv-asn-from"
                type="date"
                className={INPUT}
                value={asn.form.validFrom}
                onChange={(e) => asn.setForm({ ...asn.form, validFrom: e.target.value })}
              />
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="cv-asn-to">
                Valid to
              </label>
              <input
                id="cv-asn-to"
                type="date"
                className={INPUT}
                value={asn.form.validTo}
                onChange={(e) => asn.setForm({ ...asn.form, validTo: e.target.value })}
              />
              {asn.attemptedSave && asn.fieldErrors.validTo ? (
                <div className={FIELD_ERR}>{asn.fieldErrors.validTo}</div>
              ) : null}
            </div>
          </div>
          {asn.saveError ? <div className={FIELD_ERR}>{errorMessage(asn.saveError)}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeAll} disabled={asn.saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveAsn} disabled={asn.saving}>
              {asn.saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Card.Section>
      ) : null}
    </Card>
  );
}
