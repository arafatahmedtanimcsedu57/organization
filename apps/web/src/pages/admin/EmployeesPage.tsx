import { useEffect, useState } from 'react';
import { POSITION_RANK } from '@org-chart/domain';
import { Badge, Button, Card, EmptyState, ErrorState, IndexTable, LoadingState, SaveBar } from '../../design/components';
import type { IndexTableColumn } from '../../design/components';
import {
  useCreateEmployeeMutation,
  useDeactivateEmployeeMutation,
  useGetEmployeesQuery,
  useUpdateEmployeeMutation,
  type Employee,
} from '../../store/api/employeesApi';
import { useGetDepartmentsQuery } from '../../store/api/departmentsApi';

interface EmployeeFormState {
  lastName: string;
  firstName: string;
  title: string;
  departmentId: string;
}

const EMPTY_FORM: EmployeeFormState = { lastName: '', firstName: '', title: '', departmentId: '' };

function toFormState(employee: Employee): EmployeeFormState {
  return {
    lastName: employee.lastName,
    firstName: employee.firstName,
    title: employee.title,
    departmentId: employee.departmentId,
  };
}

/** Extracts a Nest `ValidationPipe`/`BadRequestException` message out of an RTK Query error. */
function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
    }
  }
  return 'Something went wrong. Please try again.';
}

function initials(employee: Employee): string {
  return employee.lastName.slice(0, 1);
}

type EmployeeFieldErrors = Partial<Record<keyof EmployeeFormState, string>>;

function validate(form: EmployeeFormState): EmployeeFieldErrors {
  const errors: EmployeeFieldErrors = {};
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!form.firstName.trim()) errors.firstName = 'First name is required.';
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (!form.departmentId) errors.departmentId = 'Department is required.';
  return errors;
}

export function EmployeesPage() {
  const { data: employees, error, isLoading, refetch } = useGetEmployeesQuery();
  const { data: departments } = useGetDepartmentsQuery();
  const [createEmployee, createState] = useCreateEmployeeMutation();
  const [updateEmployee, updateState] = useUpdateEmployeeMutation();
  const [deactivateEmployee] = useDeactivateEmployeeMutation();

  const [panel, setPanel] = useState<'create' | string | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState<EmployeeFormState>(EMPTY_FORM);
  const [attemptedSave, setAttemptedSave] = useState(false);

  const editingEmployee = panel && panel !== 'create' ? employees?.find((employee) => employee.sysId === panel) : undefined;
  const saving = panel === 'create' ? createState.isLoading : updateState.isLoading;
  const saveError = panel === 'create' ? createState.error : updateState.error;
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const fieldErrors = validate(form);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  useEffect(() => {
    if (panel === 'create') {
      setForm(EMPTY_FORM);
      setBaseline(EMPTY_FORM);
      setAttemptedSave(false);
    } else if (editingEmployee) {
      const state = toFormState(editingEmployee);
      setForm(state);
      setBaseline(state);
      setAttemptedSave(false);
    }
  }, [panel, editingEmployee]);

  function openCreate() {
    createState.reset();
    setPanel('create');
  }

  function openEdit(employee: Employee) {
    updateState.reset();
    setPanel(employee.sysId);
  }

  function closePanel() {
    setPanel(null);
    setForm(EMPTY_FORM);
    setBaseline(EMPTY_FORM);
    setAttemptedSave(false);
  }

  function discardChanges() {
    setForm(baseline);
    setAttemptedSave(false);
  }

  async function handleSave() {
    setAttemptedSave(true);
    if (hasFieldErrors) return;
    if (panel === 'create') {
      const result = await createEmployee(form);
      if (!('error' in result)) closePanel();
    } else if (panel) {
      const result = await updateEmployee({ sysId: panel, body: form });
      if (!('error' in result)) closePanel();
    }
  }

  async function handleDeactivate() {
    if (!editingEmployee) return;
    if (!window.confirm(`Deactivate ${editingEmployee.lastName} ${editingEmployee.firstName}? They will no longer appear on the chart.`)) {
      return;
    }
    await deactivateEmployee(editingEmployee.sysId);
    closePanel();
  }

  const departmentName = (departmentId: string) => departments?.find((department) => department.id === departmentId)?.name ?? departmentId;

  const columns: IndexTableColumn<Employee>[] = [
    { key: 'uid', header: 'UID', width: '90px', render: (employee) => <span className="uid">{employee.userId}</span> },
    {
      key: 'employee',
      header: 'Employee',
      render: (employee) => (
        <div className="person">
          <span className="avatar">{initials(employee)}</span>
          <span>
            <b style={employee.active ? undefined : { color: 'var(--text-sub)' }}>
              {employee.lastName} {employee.firstName}
            </b>
            <small>{employee.active ? `Sys ${employee.sysId.slice(0, 6)}…` : 'Deactivated'}</small>
          </span>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (employee) => (
        <Badge plain style={{ background: 'var(--neutral-bg)' }}>
          {employee.title}
        </Badge>
      ),
    },
    { key: 'department', header: 'Department', render: (employee) => <span className="dept">{departmentName(employee.departmentId)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (employee) => (employee.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>),
    },
  ];

  return (
    <div className="page">
      {panel && isDirty ? (
        <SaveBar
          message={
            panel === 'create'
              ? 'Adding a new employee — unsaved changes'
              : `Editing ${editingEmployee?.lastName ?? ''} ${editingEmployee?.firstName ?? ''} — unsaved changes`
          }
          saving={saving}
          onSave={handleSave}
          onDiscard={discardChanges}
        />
      ) : null}
      <div className="page-head">
        <div>
          <div className="breadcrumb">Home · Maintenance</div>
          <h1>Employees</h1>
        </div>
        <div className="ph-actions">
          <Button variant="primary" onClick={openCreate}>
            Add employee
          </Button>
        </div>
      </div>

      <Card>
        <Card.Header title={employees ? `${employees.length} employees` : 'Employees'} />
        {isLoading ? (
          <Card.Body>
            <LoadingState message="Loading employees…" />
          </Card.Body>
        ) : error ? (
          <Card.Body>
            <ErrorState description="Could not load employees." onRetry={refetch} />
          </Card.Body>
        ) : (
          <IndexTable
            columns={columns}
            rows={employees ?? []}
            rowKey={(employee) => employee.sysId}
            highlightedKeys={panel && panel !== 'create' ? new Set([panel]) : undefined}
            rowActions={(employee) => (
              <button type="button" className="btn plain sm" onClick={() => openEdit(employee)}>
                Edit
              </button>
            )}
            emptyState={<EmptyState title="No employees yet" description="Add an employee to get started." />}
          />
        )}
      </Card>

      {panel ? (
        <Card>
          <Card.Header
            title={panel === 'create' ? 'Add employee' : 'Edit employee'}
            actions={editingEmployee ? <Badge plain>{editingEmployee.userId}</Badge> : undefined}
          />
          <Card.Section>
            <div className="two">
              <div className="field">
                <label htmlFor="emp-last-name">Last name 姓</label>
                <input
                  id="emp-last-name"
                  className="inp"
                  value={form.lastName}
                  onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                />
                {attemptedSave && fieldErrors.lastName ? <div className="err">{fieldErrors.lastName}</div> : null}
              </div>
              <div className="field">
                <label htmlFor="emp-first-name">First name 名</label>
                <input
                  id="emp-first-name"
                  className="inp"
                  value={form.firstName}
                  onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                />
                {attemptedSave && fieldErrors.firstName ? <div className="err">{fieldErrors.firstName}</div> : null}
              </div>
            </div>
            <div className="field">
              <label htmlFor="emp-title">Title 役職</label>
              <input
                id="emp-title"
                className="inp"
                list="position-ranks"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <datalist id="position-ranks">
                {POSITION_RANK.map((rank) => (
                  <option key={rank} value={rank} />
                ))}
              </datalist>
              {attemptedSave && fieldErrors.title ? <div className="err">{fieldErrors.title}</div> : null}
            </div>
            <div className="field">
              <label htmlFor="emp-department">Home department 部門</label>
              <select
                id="emp-department"
                className="inp"
                value={form.departmentId}
                onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
              >
                <option value="" disabled>
                  Select a department…
                </option>
                {(departments ?? [])
                  .filter((department) => department.active || department.id === form.departmentId)
                  .map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
              </select>
              {attemptedSave && fieldErrors.departmentId ? <div className="err">{fieldErrors.departmentId}</div> : null}
            </div>
            {saveError ? <div className="err">{errorMessage(saveError)}</div> : null}
          </Card.Section>
          <Card.Footer>
            {editingEmployee?.active ? (
              <Button variant="plain" onClick={handleDeactivate}>
                Deactivate
              </Button>
            ) : null}
            <span style={{ flex: 1 }} />
            <Button variant="secondary" onClick={closePanel} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Card.Footer>
        </Card>
      ) : null}
    </div>
  );
}
