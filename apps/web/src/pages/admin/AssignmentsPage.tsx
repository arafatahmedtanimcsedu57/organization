import { POSITION_RANK } from '@org-chart/domain';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IndexTable,
  LoadingState,
  SaveBar,
} from '../../design/components';
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
  PERSON,
  DEPT,
} from '../../design/formStyles';
import {
  useCreateAssignmentMutation,
  useGetAssignmentsQuery,
  useRemoveAssignmentMutation,
  useUpdateAssignmentMutation,
  type Assignment,
  type AssignmentType,
} from '../../store/api/assignmentsApi';
import { useGetEmployeesQuery, type Employee } from '../../store/api/employeesApi';
import { useGetDepartmentsQuery } from '../../store/api/departmentsApi';
import { errorMessage } from '../../store/api/errorMessage';
import { useEditorPanel, type FieldErrors } from './useEditorPanel';

interface AssignmentFormState {
  employeeSysId: string;
  departmentId: string;
  title: string;
  assignmentType: AssignmentType;
  isPrimary: boolean;
  validFrom: string;
  validTo: string;
}

const EMPTY_FORM: AssignmentFormState = {
  employeeSysId: '',
  departmentId: '',
  title: '',
  assignmentType: 'concurrent',
  isPrimary: false,
  validFrom: '',
  validTo: '',
};

function toFormState(assignment: Assignment): AssignmentFormState {
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

function personName(employee: Employee | undefined, sysId: string): string {
  return employee ? `${employee.lastName} ${employee.firstName}` : sysId;
}

function validate(form: AssignmentFormState): FieldErrors<AssignmentFormState> {
  const errors: FieldErrors<AssignmentFormState> = {};
  if (!form.employeeSysId) errors.employeeSysId = 'Person is required.';
  if (!form.departmentId) errors.departmentId = 'Department is required.';
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
    errors.validTo = 'Valid-to must be on or after valid-from.';
  }
  return errors;
}

export function AssignmentsPage() {
  const { data: assignments, error, isLoading, refetch } = useGetAssignmentsQuery();
  const { data: employees } = useGetEmployeesQuery();
  const { data: departments } = useGetDepartmentsQuery();
  const [createAssignment, createState] = useCreateAssignmentMutation();
  const [updateAssignment, updateState] = useUpdateAssignmentMutation();
  const [removeAssignment] = useRemoveAssignmentMutation();

  const {
    panel,
    editingRow: editingAssignment,
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
  } = useEditorPanel<Assignment, AssignmentFormState>({
    emptyForm: EMPTY_FORM,
    resolveRow: (id) => assignments?.find((assignment) => assignment.id === id),
    toFormState,
    validate,
    createState,
    updateState,
  });

  async function handleSave() {
    const values = beginSave();
    if (!values) return;
    if (isCreating) {
      const result = await createAssignment({
        employeeSysId: values.employeeSysId,
        departmentId: values.departmentId,
        title: values.title,
        assignmentType: values.assignmentType,
        isPrimary: values.isPrimary,
        validFrom: values.validFrom || undefined,
        validTo: values.validTo || undefined,
      });
      if (!('error' in result)) closePanel();
    } else if (panel) {
      const result = await updateAssignment({
        id: panel,
        body: {
          title: values.title,
          assignmentType: values.assignmentType,
          isPrimary: values.isPrimary,
          validFrom: values.validFrom || null,
          validTo: values.validTo || null,
        },
      });
      if (!('error' in result)) closePanel();
    }
  }

  async function handleRemove() {
    if (!editingAssignment) return;
    const employee = employees?.find(
      (candidate) => candidate.sysId === editingAssignment.employeeSysId,
    );
    if (
      !window.confirm(
        `Remove this posting for ${personName(employee, editingAssignment.employeeSysId)}?`,
      )
    ) {
      return;
    }
    await removeAssignment(editingAssignment.id);
    closePanel();
  }

  const employeeName = (sysId: string) =>
    personName(
      employees?.find((employee) => employee.sysId === sysId),
      sysId,
    );
  const departmentName = (departmentId: string) =>
    departments?.find((department) => department.id === departmentId)?.name ?? departmentId;

  const columns: IndexTableColumn<Assignment>[] = [
    {
      key: 'person',
      header: 'Person',
      render: (assignment) => (
        <span className={PERSON}>{employeeName(assignment.employeeSysId)}</span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (assignment) => (
        <span className={DEPT}>{departmentName(assignment.departmentId)}</span>
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
        <span className="font-jp text-ink text-[13px]">
          {assignment.validFrom ?? '—'} → {assignment.validTo ?? '—'}
        </span>
      ),
    },
  ];

  return (
    <div className={PAGE}>
      {panel && isDirty ? (
        <SaveBar
          message={
            isCreating
              ? 'Adding a new posting — unsaved changes'
              : `Editing posting — unsaved changes`
          }
          saving={saving}
          onSave={handleSave}
          onDiscard={discardChanges}
        />
      ) : null}
      <div className={PAGE_HEAD}>
        <div>
          <Breadcrumb
            items={[
              { label: 'Home', to: '/' },
              { label: 'Maintenance', to: '/admin' },
              { label: 'Concurrent duties (兼務)' },
            ]}
          />
          <h1 className={PAGE_TITLE}>Concurrent duties (兼務)</h1>
        </div>
        <div className={PH_ACTIONS}>
          <Button variant="primary" onClick={openCreate}>
            Add posting
          </Button>
        </div>
      </div>

      <Card>
        <Card.Header title={assignments ? `${assignments.length} postings` : 'Postings'} />
        {isLoading ? (
          <Card.Body>
            <LoadingState message="Loading postings…" />
          </Card.Body>
        ) : error ? (
          <Card.Body>
            <ErrorState description="Could not load postings." onRetry={refetch} />
          </Card.Body>
        ) : (
          <IndexTable
            columns={columns}
            rows={assignments ?? []}
            rowKey={(assignment) => assignment.id}
            highlightedKeys={panel && !isCreating ? new Set([panel]) : undefined}
            rowActions={(assignment) => (
              <Button variant="plain" size="sm" onClick={() => openEdit(assignment.id)}>
                Edit
              </Button>
            )}
            emptyState={
              <EmptyState
                title="No postings yet"
                description="Add a posting to place someone on a second department."
              />
            }
          />
        )}
      </Card>

      {panel ? (
        <Card>
          <Card.Header title={isCreating ? 'Add posting' : 'Edit posting'} />
          <Card.Section>
            <div className={TWO}>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="asn-person">
                  Person
                </label>
                <select
                  id="asn-person"
                  className={INPUT}
                  value={form.employeeSysId}
                  disabled={!isCreating}
                  onChange={(event) => setForm({ ...form, employeeSysId: event.target.value })}
                >
                  <option value="" disabled>
                    Select a person…
                  </option>
                  {(employees ?? [])
                    .filter((employee) => employee.active || employee.sysId === form.employeeSysId)
                    .map((employee) => (
                      <option key={employee.sysId} value={employee.sysId}>
                        {employee.lastName} {employee.firstName} ({employee.userId})
                      </option>
                    ))}
                </select>
                {attemptedSave && fieldErrors.employeeSysId ? (
                  <div className={FIELD_ERR}>{fieldErrors.employeeSysId}</div>
                ) : null}
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="asn-department">
                  Department
                </label>
                <select
                  id="asn-department"
                  className={INPUT}
                  value={form.departmentId}
                  disabled={!isCreating}
                  onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                >
                  <option value="" disabled>
                    Select a department…
                  </option>
                  {(departments ?? [])
                    .filter(
                      (department) => department.active || department.id === form.departmentId,
                    )
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
                {attemptedSave && fieldErrors.departmentId ? (
                  <div className={FIELD_ERR}>{fieldErrors.departmentId}</div>
                ) : null}
              </div>
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="asn-title">
                Title in this department 役職
              </label>
              <input
                id="asn-title"
                className={INPUT}
                list="position-ranks"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <datalist id="position-ranks">
                {POSITION_RANK.map((rank) => (
                  <option key={rank} value={rank} />
                ))}
              </datalist>
              {attemptedSave && fieldErrors.title ? (
                <div className={FIELD_ERR}>{fieldErrors.title}</div>
              ) : null}
            </div>
            <div className={TWO}>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="asn-type">
                  Posting type
                </label>
                <select
                  id="asn-type"
                  className={INPUT}
                  value={form.assignmentType}
                  onChange={(event) => {
                    const assignmentType = event.target.value as AssignmentType;
                    setForm({
                      ...form,
                      assignmentType,
                      isPrimary: assignmentType === 'primary' ? form.isPrimary : false,
                    });
                  }}
                >
                  <option value="concurrent">Concurrent (兼務)</option>
                  <option value="primary">Primary</option>
                </select>
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="asn-is-primary">
                  <input
                    id="asn-is-primary"
                    type="checkbox"
                    checked={form.isPrimary}
                    disabled={form.assignmentType !== 'primary'}
                    onChange={(event) => setForm({ ...form, isPrimary: event.target.checked })}
                    className="mr-1.5"
                  />
                  Primary posting (home department)
                </label>
              </div>
            </div>
            <div className={TWO}>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="asn-valid-from">
                  Valid from
                </label>
                <input
                  id="asn-valid-from"
                  type="date"
                  className={INPUT}
                  value={form.validFrom}
                  onChange={(event) => setForm({ ...form, validFrom: event.target.value })}
                />
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="asn-valid-to">
                  Valid to
                </label>
                <input
                  id="asn-valid-to"
                  type="date"
                  className={INPUT}
                  value={form.validTo}
                  onChange={(event) => setForm({ ...form, validTo: event.target.value })}
                />
                {attemptedSave && fieldErrors.validTo ? (
                  <div className={FIELD_ERR}>{fieldErrors.validTo}</div>
                ) : null}
              </div>
            </div>
            {saveError ? <div className={FIELD_ERR}>{errorMessage(saveError)}</div> : null}
          </Card.Section>
          <Card.Footer>
            {!isCreating ? (
              <Button variant="plain" onClick={handleRemove}>
                Remove
              </Button>
            ) : null}
            <span className="flex-1" />
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
