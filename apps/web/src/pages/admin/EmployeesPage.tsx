import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IndexTable,
  LoadingState,
  Modal,
  SaveBar,
} from '../../design/components';
import { TitleSelect } from '../chart/topdown/editor/TitleSelect';
import type { IndexTableColumn } from '../../design/components';
import {
  PAGE,
  PAGE_HEAD,
  PH_ACTIONS,
  PAGE_TITLE,
  FIELD,
  LABEL,
  INPUT,
  FIELD_ERR,
  TWO,
  UID,
  PERSON,
  PERSON_AVATAR,
  PERSON_NAME,
  PERSON_SUB,
  DEPT,
} from '../../design/formStyles';
import { optionList } from '../../design/optionList';
import {
  useCreateEmployeeMutation,
  useDeactivateEmployeeMutation,
  useGetEmployeesQuery,
  useUpdateEmployeeMutation,
  type Employee,
} from '../../store/api/employeesApi';
import { useGetDepartmentsQuery } from '../../store/api/departmentsApi';
import { errorMessage } from '../../store/api/errorMessage';
import { useEditorPanel, type FieldErrors } from './useEditorPanel';

interface EmployeeFormState {
  lastName: string;
  firstName: string;
  titleId: string;
  departmentId: string;
}

const EMPTY_FORM: EmployeeFormState = { lastName: '', firstName: '', titleId: '', departmentId: '' };

function toFormState(employee: Employee): EmployeeFormState {
  return {
    lastName: employee.lastName,
    firstName: employee.firstName,
    titleId: employee.titleId ?? '',
    departmentId: employee.departmentId,
  };
}

function initials(employee: Employee): string {
  return employee.lastName.slice(0, 1);
}

function validate(form: EmployeeFormState): FieldErrors<EmployeeFormState> {
  const errors: FieldErrors<EmployeeFormState> = {};
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!form.firstName.trim()) errors.firstName = 'First name is required.';
  if (!form.departmentId) errors.departmentId = 'Department is required.';
  if (!form.titleId) errors.titleId = 'Title is required.';
  return errors;
}

export function EmployeesPage() {
  const { data: employees, error, isLoading, refetch } = useGetEmployeesQuery();
  const { data: departments } = useGetDepartmentsQuery();
  const [createEmployee, createState] = useCreateEmployeeMutation();
  const [updateEmployee, updateState] = useUpdateEmployeeMutation();
  const [deactivateEmployee] = useDeactivateEmployeeMutation();

  const {
    panel,
    editingRow: editingEmployee,
    isCreating,
    form,
    setForm,
    attemptedSave,
    isDirty,
    fieldErrors,
    saving,
    saveError,
    openCreate,
    openEdit,
    closePanel,
    discardChanges,
    beginSave,
  } = useEditorPanel<Employee, EmployeeFormState>({
    emptyForm: EMPTY_FORM,
    resolveRow: (sysId) => employees?.find((employee) => employee.sysId === sysId),
    toFormState,
    validate,
    createState,
    updateState,
  });

  async function handleSave() {
    const values = beginSave();
    if (!values) return;
    if (isCreating) {
      const result = await createEmployee(values);
      if (!('error' in result)) closePanel();
    } else if (panel) {
      const result = await updateEmployee({ sysId: panel, body: values });
      if (!('error' in result)) closePanel();
    }
  }

  async function handleDeactivate() {
    if (!editingEmployee) return;
    if (
      !window.confirm(
        `Deactivate ${editingEmployee.lastName} ${editingEmployee.firstName}? They will no longer appear on the chart.`,
      )
    ) {
      return;
    }
    await deactivateEmployee(editingEmployee.sysId);
    closePanel();
  }

  const departmentName = (departmentId: string) =>
    departments?.find((department) => department.id === departmentId)?.name ?? departmentId;

  const columns: IndexTableColumn<Employee>[] = [
    {
      key: 'uid',
      header: 'UID',
      width: '90px',
      render: (employee) => <span className={UID}>{employee.userId}</span>,
    },
    {
      key: 'employee',
      header: 'Employee',
      render: (employee) => (
        <div className={PERSON}>
          <span className={PERSON_AVATAR}>{initials(employee)}</span>
          <span>
            <b
              className={PERSON_NAME}
              style={employee.active ? undefined : { color: 'var(--color-sub)' }}
            >
              {employee.lastName} {employee.firstName}
            </b>
            <small className={PERSON_SUB}>
              {employee.active ? `Sys ${employee.sysId.slice(0, 6)}…` : 'Deactivated'}
            </small>
          </span>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (employee) => <Badge plain>{employee.title}</Badge>,
    },
    {
      key: 'department',
      header: 'Department',
      render: (employee) => <span className={DEPT}>{departmentName(employee.departmentId)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (employee) =>
        employee.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>,
    },
  ];

  return (
    <div className={PAGE}>
      <div className={PAGE_HEAD}>
        <div>
          <Breadcrumb
            items={[
              { label: 'Home', to: '/' },
              { label: 'Maintenance', to: '/admin' },
              { label: 'Employees' },
            ]}
          />
          <h1 className={PAGE_TITLE}>Employees</h1>
        </div>
        <div className={PH_ACTIONS}>
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
            highlightedKeys={panel && !isCreating ? new Set([panel]) : undefined}
            rowActions={(employee) => (
              <Button variant="plain" size="sm" onClick={() => openEdit(employee.sysId)}>
                Edit
              </Button>
            )}
            emptyState={
              <EmptyState title="No employees yet" description="Add an employee to get started." />
            }
          />
        )}
      </Card>

      {panel ? (
        <Modal aria-label={isCreating ? 'Add employee' : 'Edit employee'} onClose={closePanel}>
          {isDirty ? (
            <div className="px-3 pt-3">
              <SaveBar
                message={
                  isCreating
                    ? 'Adding a new employee - unsaved changes'
                    : `Editing ${editingEmployee?.lastName ?? ''} ${editingEmployee?.firstName ?? ''} - unsaved changes`
                }
                saving={saving}
                onSave={handleSave}
                onDiscard={discardChanges}
              />
            </div>
          ) : null}
          <Modal.Header
            title={isCreating ? 'Add employee' : 'Edit employee'}
            actions={editingEmployee ? <Badge plain>{editingEmployee.userId}</Badge> : undefined}
          />
          <Modal.Section>
            <div className={TWO}>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="emp-last-name">
                  Last name 姓
                </label>
                <input
                  id="emp-last-name"
                  className={INPUT}
                  value={form.lastName}
                  onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                />
                {attemptedSave && fieldErrors.lastName ? (
                  <div className={FIELD_ERR}>{fieldErrors.lastName}</div>
                ) : null}
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="emp-first-name">
                  First name 名
                </label>
                <input
                  id="emp-first-name"
                  className={INPUT}
                  value={form.firstName}
                  onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                />
                {attemptedSave && fieldErrors.firstName ? (
                  <div className={FIELD_ERR}>{fieldErrors.firstName}</div>
                ) : null}
              </div>
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="emp-title">
                Title 役職
              </label>
              <TitleSelect
                id="emp-title"
                departmentId={form.departmentId}
                value={form.titleId}
                onChange={(titleId) => setForm({ ...form, titleId })}
              />
              {attemptedSave && fieldErrors.titleId ? (
                <div className={FIELD_ERR}>{fieldErrors.titleId}</div>
              ) : null}
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="emp-department">
                Home department 部門
              </label>
              <select
                id="emp-department"
                className={INPUT}
                value={form.departmentId}
                onChange={(event) => setForm({ ...form, departmentId: event.target.value, titleId: '' })}
              >
                <option value="" disabled>
                  Select a department…
                </option>
                {optionList(
                  departments,
                  (department) => department.active || department.id === form.departmentId,
                  (department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ),
                )}
              </select>
              {attemptedSave && fieldErrors.departmentId ? (
                <div className={FIELD_ERR}>{fieldErrors.departmentId}</div>
              ) : null}
            </div>
            {saveError ? <div className={FIELD_ERR}>{errorMessage(saveError)}</div> : null}
          </Modal.Section>
          <Modal.Footer>
            {editingEmployee?.active ? (
              <Button variant="plain" onClick={handleDeactivate}>
                Deactivate
              </Button>
            ) : null}
            <span className="flex-1" />
            <Button variant="secondary" onClick={closePanel} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Modal.Footer>
        </Modal>
      ) : null}
    </div>
  );
}
