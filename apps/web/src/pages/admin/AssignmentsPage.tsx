import { useEffect, useState } from 'react';
import { POSITION_RANK } from '@org-chart/domain';
import { Badge, Button, Card, EmptyState, ErrorState, IndexTable, LoadingState, SaveBar } from '../../design/components';
import type { IndexTableColumn } from '../../design/components';
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

function personName(employee: Employee | undefined, sysId: string): string {
  return employee ? `${employee.lastName} ${employee.firstName}` : sysId;
}

type AssignmentFieldErrors = Partial<Record<keyof AssignmentFormState, string>>;

function validate(form: AssignmentFormState): AssignmentFieldErrors {
  const errors: AssignmentFieldErrors = {};
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

  const [panel, setPanel] = useState<'create' | string | null>(null);
  const [form, setForm] = useState<AssignmentFormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState<AssignmentFormState>(EMPTY_FORM);
  const [attemptedSave, setAttemptedSave] = useState(false);

  const editingAssignment = panel && panel !== 'create' ? assignments?.find((assignment) => assignment.id === panel) : undefined;
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
    } else if (editingAssignment) {
      const state = toFormState(editingAssignment);
      setForm(state);
      setBaseline(state);
      setAttemptedSave(false);
    }
  }, [panel, editingAssignment]);

  function openCreate() {
    createState.reset();
    setPanel('create');
  }

  function openEdit(assignment: Assignment) {
    updateState.reset();
    setPanel(assignment.id);
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
    const body = {
      employeeSysId: form.employeeSysId,
      departmentId: form.departmentId,
      title: form.title,
      assignmentType: form.assignmentType,
      isPrimary: form.isPrimary,
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
    };
    if (panel === 'create') {
      const result = await createAssignment(body);
      if (!('error' in result)) closePanel();
    } else if (panel) {
      const result = await updateAssignment({
        id: panel,
        body: {
          title: form.title,
          assignmentType: form.assignmentType,
          isPrimary: form.isPrimary,
          validFrom: form.validFrom || null,
          validTo: form.validTo || null,
        },
      });
      if (!('error' in result)) closePanel();
    }
  }

  async function handleRemove() {
    if (!editingAssignment) return;
    const employee = employees?.find((candidate) => candidate.sysId === editingAssignment.employeeSysId);
    if (!window.confirm(`Remove this posting for ${personName(employee, editingAssignment.employeeSysId)}?`)) {
      return;
    }
    await removeAssignment(editingAssignment.id);
    closePanel();
  }

  const employeeName = (sysId: string) => personName(employees?.find((employee) => employee.sysId === sysId), sysId);
  const departmentName = (departmentId: string) => departments?.find((department) => department.id === departmentId)?.name ?? departmentId;

  const columns: IndexTableColumn<Assignment>[] = [
    {
      key: 'person',
      header: 'Person',
      render: (assignment) => <span className="person">{employeeName(assignment.employeeSysId)}</span>,
    },
    { key: 'department', header: 'Department', render: (assignment) => <span className="dept">{departmentName(assignment.departmentId)}</span> },
    {
      key: 'title',
      header: 'Title',
      render: (assignment) => (
        <Badge plain style={{ background: 'var(--neutral-bg)' }}>
          {assignment.title}
        </Badge>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (assignment) =>
        assignment.assignmentType === 'concurrent' ? <Badge tone="kenmu">兼務</Badge> : <Badge tone="brand">Primary</Badge>,
    },
    {
      key: 'valid',
      header: 'Valid from / to',
      render: (assignment) => (
        <span className="dept">
          {assignment.validFrom ?? '—'} → {assignment.validTo ?? '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="page">
      {panel && isDirty ? (
        <SaveBar
          message={panel === 'create' ? 'Adding a new posting — unsaved changes' : `Editing posting — unsaved changes`}
          saving={saving}
          onSave={handleSave}
          onDiscard={discardChanges}
        />
      ) : null}
      <div className="page-head">
        <div>
          <div className="breadcrumb">Home · Maintenance</div>
          <h1>Concurrent duties (兼務)</h1>
        </div>
        <div className="ph-actions">
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
            highlightedKeys={panel && panel !== 'create' ? new Set([panel]) : undefined}
            rowActions={(assignment) => (
              <button type="button" className="btn plain sm" onClick={() => openEdit(assignment)}>
                Edit
              </button>
            )}
            emptyState={<EmptyState title="No postings yet" description="Add a posting to place someone on a second department." />}
          />
        )}
      </Card>

      {panel ? (
        <Card>
          <Card.Header title={panel === 'create' ? 'Add posting' : 'Edit posting'} />
          <Card.Section>
            <div className="two">
              <div className="field">
                <label htmlFor="asn-person">Person</label>
                <select
                  id="asn-person"
                  className="inp"
                  value={form.employeeSysId}
                  disabled={panel !== 'create'}
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
                {attemptedSave && fieldErrors.employeeSysId ? <div className="err">{fieldErrors.employeeSysId}</div> : null}
              </div>
              <div className="field">
                <label htmlFor="asn-department">Department</label>
                <select
                  id="asn-department"
                  className="inp"
                  value={form.departmentId}
                  disabled={panel !== 'create'}
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
            </div>
            <div className="field">
              <label htmlFor="asn-title">Title in this department 役職</label>
              <input
                id="asn-title"
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
            <div className="two">
              <div className="field">
                <label htmlFor="asn-type">Posting type</label>
                <select
                  id="asn-type"
                  className="inp"
                  value={form.assignmentType}
                  onChange={(event) => {
                    const assignmentType = event.target.value as AssignmentType;
                    setForm({ ...form, assignmentType, isPrimary: assignmentType === 'primary' ? form.isPrimary : false });
                  }}
                >
                  <option value="concurrent">Concurrent (兼務)</option>
                  <option value="primary">Primary</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="asn-is-primary">
                  <input
                    id="asn-is-primary"
                    type="checkbox"
                    checked={form.isPrimary}
                    disabled={form.assignmentType !== 'primary'}
                    onChange={(event) => setForm({ ...form, isPrimary: event.target.checked })}
                    style={{ marginRight: 6 }}
                  />
                  Primary posting (home department)
                </label>
              </div>
            </div>
            <div className="two">
              <div className="field">
                <label htmlFor="asn-valid-from">Valid from</label>
                <input
                  id="asn-valid-from"
                  type="date"
                  className="inp"
                  value={form.validFrom}
                  onChange={(event) => setForm({ ...form, validFrom: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="asn-valid-to">Valid to</label>
                <input
                  id="asn-valid-to"
                  type="date"
                  className="inp"
                  value={form.validTo}
                  onChange={(event) => setForm({ ...form, validTo: event.target.value })}
                />
                {attemptedSave && fieldErrors.validTo ? <div className="err">{fieldErrors.validTo}</div> : null}
              </div>
            </div>
            {saveError ? <div className="err">{errorMessage(saveError)}</div> : null}
          </Card.Section>
          <Card.Footer>
            {panel !== 'create' ? (
              <Button variant="plain" onClick={handleRemove}>
                Remove
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
