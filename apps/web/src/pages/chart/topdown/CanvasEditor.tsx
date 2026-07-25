import { useCallback, useState } from 'react';

import { Button, Card } from '../../../design/components';
import { useEditorPanel } from '../../admin/useEditorPanel';
import { AssignmentForm } from './editor/AssignmentForm';
import { DepartmentForm } from './editor/DepartmentForm';
import { EditorRoster } from './editor/EditorRoster';
import { EmployeeForm } from './editor/EmployeeForm';
import {
  ASN_EMPTY,
  DEPT_EMPTY,
  EMP_EMPTY,
  asnValidate,
  deptValidate,
  empValidate,
  type ActiveEditor,
  type AsnForm,
  type DeptForm,
  type EmpForm,
} from './editor/forms';

import { useAppDispatch } from '../../../store/store';
import {
  useDeactivateEmployeeMutation,
  useGetEmployeesQuery,
  useUpdateEmployeeMutation,
  type Employee,
} from '../../../store/api/employeesApi';
import { useCreateAssignmentMutation } from '../../../store/api/assignmentsApi';
import type { ChartNode } from '../../../store/api/chartNode';
import { chartApi } from '../../../store/api/chartApi';
import {
  useCreateDepartmentMutation,
  useDeactivateDepartmentMutation,
  useGetDepartmentsQuery,
  useUpdateDepartmentMutation,
  type Department,
} from '../../../store/api/departmentsApi';

import type { Member } from '@org-chart/domain';

const NO_DEPARTMENTS: Department[] = [];
const NO_EMPLOYEES: Employee[] = [];

export interface CanvasEditorProps {
  node: ChartNode;
  onClose: () => void;
}

/**
 * `.canvas-editor` - inline CRUD for the selected canvas node (`chart-canvas` capability):
 * edit / deactivate the department, add a sub-department, add a 兼務 posting, and edit /
 * deactivate roster people - all through the same `useEditorPanel` + RTK Query mutations the
 * admin pages use.
 *
 * This shell owns the panel state machines and the mutations; the three forms are
 * presentational. `chartApi` is a separate slice whose `Chart` tag the master-data mutations
 * do NOT invalidate, so every successful save here explicitly invalidates it - that is what
 * makes the canvas refresh without a manual reload.
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
    resolveRow: (id) => departments?.find((row) => row.id === id),
    toFormState: (row) => ({ name: row.name, parentName: row.parentName, head: row.head }),
    validate: deptValidate,
    createState: deptCreateState,
    updateState: deptUpdateState,
  });

  const emp = useEditorPanel<Employee, EmpForm>({
    emptyForm: EMP_EMPTY,
    resolveRow: (sysId) => employees?.find((row) => row.sysId === sysId),
    toFormState: (row) => ({
      lastName: row.lastName,
      firstName: row.firstName,
      titleId: row.titleId ?? '',
      departmentId: row.departmentId,
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

  /* ---------- open handlers ---------- */

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

  /* ---------- saves / deactivations ---------- */

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
      titleId: values.titleId,
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
    const confirmed = window.confirm(
      `Deactivate ${member.displayName}? They will no longer appear on the chart.`,
    );
    if (!confirmed) return;
    await deactivateEmployee(member.sysId);
    refreshChart();
  }

  const roster: Member[] = [...node.managers, ...node.staff];
  const departmentRows = departments ?? NO_DEPARTMENTS;
  const employeeRows = employees ?? NO_EMPLOYEES;

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

      <Card.Section>
        <EditorRoster members={roster} onEdit={openEmpEdit} onDeactivate={deactivatePerson} />
      </Card.Section>

      {/* For edits, render only once the department row resolved, so the form can never be
          shown (or saved) unpopulated while /departments is still loading. */}
      {active === 'dept' && dept.panel && (dept.isCreating || dept.editingRow) ? (
        <Card.Section>
          <DepartmentForm
            panel={dept}
            departments={departmentRows}
            nodeId={node.id}
            nodeName={node.name}
            onCancel={closeAll}
            onSave={saveDept}
          />
        </Card.Section>
      ) : null}

      {active === 'emp' && emp.panel && emp.editingRow ? (
        <Card.Section>
          <EmployeeForm
            panel={emp}
            departments={departmentRows}
            employee={emp.editingRow}
            onCancel={closeAll}
            onSave={saveEmp}
          />
        </Card.Section>
      ) : null}

      {active === 'asn' && asn.panel ? (
        <Card.Section>
          <AssignmentForm
            panel={asn}
            employees={employeeRows}
            nodeName={node.name}
            onCancel={closeAll}
            onSave={saveAsn}
          />
        </Card.Section>
      ) : null}
    </Card>
  );
}
