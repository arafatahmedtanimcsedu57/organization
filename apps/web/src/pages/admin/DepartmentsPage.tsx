import { useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, ErrorState, IndexTable, LoadingState } from '../../design/components';
import type { IndexTableColumn } from '../../design/components';
import {
  useCreateDepartmentMutation,
  useDeactivateDepartmentMutation,
  useGetDepartmentsQuery,
  useUpdateDepartmentMutation,
  type Department,
} from '../../store/api/departmentsApi';

interface DepartmentFormState {
  name: string;
  parentName: string;
  head: string;
}

const EMPTY_FORM: DepartmentFormState = { name: '', parentName: '', head: '' };

function toFormState(department: Department): DepartmentFormState {
  return { name: department.name, parentName: department.parentName, head: department.head };
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

/** Walks the parent-by-name chain to find every descendant of `name`, so the parent picker can exclude them (would-be cycle). */
function descendantNames(name: string, departments: Department[]): Set<string> {
  const descendants = new Set<string>();
  let frontier = [name];
  while (frontier.length) {
    const children = departments.filter((department) => frontier.includes(department.parentName));
    frontier = children.map((child) => child.name).filter((childName) => !descendants.has(childName));
    frontier.forEach((childName) => descendants.add(childName));
  }
  return descendants;
}

export function DepartmentsPage() {
  const { data: departments, error, isLoading, refetch } = useGetDepartmentsQuery();
  const [createDepartment, createState] = useCreateDepartmentMutation();
  const [updateDepartment, updateState] = useUpdateDepartmentMutation();
  const [deactivateDepartment] = useDeactivateDepartmentMutation();

  const [panel, setPanel] = useState<'create' | string | null>(null);
  const [form, setForm] = useState<DepartmentFormState>(EMPTY_FORM);

  const editingDepartment = panel && panel !== 'create' ? departments?.find((department) => department.id === panel) : undefined;
  const saving = panel === 'create' ? createState.isLoading : updateState.isLoading;
  const saveError = panel === 'create' ? createState.error : updateState.error;

  useEffect(() => {
    if (panel === 'create') {
      setForm(EMPTY_FORM);
    } else if (editingDepartment) {
      setForm(toFormState(editingDepartment));
    }
  }, [panel, editingDepartment]);

  function openCreate() {
    createState.reset();
    setPanel('create');
  }

  function openEdit(department: Department) {
    updateState.reset();
    setPanel(department.id);
  }

  function closePanel() {
    setPanel(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    const body = { name: form.name, parentName: form.parentName, head: form.head };
    if (panel === 'create') {
      const result = await createDepartment(body);
      if (!('error' in result)) closePanel();
    } else if (panel) {
      const result = await updateDepartment({ id: panel, body });
      if (!('error' in result)) closePanel();
    }
  }

  async function handleDeactivate() {
    if (!editingDepartment) return;
    if (!window.confirm(`Deactivate ${editingDepartment.name}? It will no longer appear on the chart.`)) {
      return;
    }
    await deactivateDepartment(editingDepartment.id);
    closePanel();
  }

  const excludedParentNames = editingDepartment
    ? new Set([editingDepartment.name, ...descendantNames(editingDepartment.name, departments ?? [])])
    : new Set<string>();

  const columns: IndexTableColumn<Department>[] = [
    { key: 'id', header: 'ID', width: '90px', render: (department) => <span className="uid">{department.id}</span> },
    {
      key: 'department',
      header: 'Department',
      render: (department) => (
        <span>
          <b style={department.active ? undefined : { color: 'var(--text-sub)' }}>{department.name}</b>
        </span>
      ),
    },
    {
      key: 'parent',
      header: 'Parent',
      render: (department) =>
        department.parentName ? <span className="dept">{department.parentName}</span> : <Badge plain>Root</Badge>,
    },
    { key: 'head', header: 'Head', render: (department) => <span className="dept">{department.head || '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (department) => (department.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="breadcrumb">Home · Maintenance</div>
          <h1>Departments</h1>
        </div>
        <div className="ph-actions">
          <Button variant="primary" onClick={openCreate}>
            Add department
          </Button>
        </div>
      </div>

      <Card>
        <Card.Header title={departments ? `${departments.length} departments` : 'Departments'} />
        {isLoading ? (
          <Card.Body>
            <LoadingState message="Loading departments…" />
          </Card.Body>
        ) : error ? (
          <Card.Body>
            <ErrorState description="Could not load departments." onRetry={refetch} />
          </Card.Body>
        ) : (
          <IndexTable
            columns={columns}
            rows={departments ?? []}
            rowKey={(department) => department.id}
            highlightedKeys={panel && panel !== 'create' ? new Set([panel]) : undefined}
            rowActions={(department) => (
              <button type="button" className="btn plain sm" onClick={() => openEdit(department)}>
                Edit
              </button>
            )}
            emptyState={<EmptyState title="No departments yet" description="Add a department to get started." />}
          />
        )}
      </Card>

      {panel ? (
        <Card>
          <Card.Header
            title={panel === 'create' ? 'Add department' : 'Edit department'}
            actions={editingDepartment ? <Badge plain>{editingDepartment.id}</Badge> : undefined}
          />
          <Card.Section>
            <div className="field">
              <label htmlFor="dept-name">Name 部門名</label>
              <input
                id="dept-name"
                className="inp"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="dept-parent">Parent department</label>
              <select
                id="dept-parent"
                className="inp"
                value={form.parentName}
                onChange={(event) => setForm({ ...form, parentName: event.target.value })}
              >
                <option value="">No parent (root)</option>
                {(departments ?? [])
                  .filter((department) => (department.active || department.name === form.parentName) && !excludedParentNames.has(department.name))
                  .map((department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="dept-head">Department head 部門長</label>
              <input
                id="dept-head"
                className="inp"
                value={form.head}
                onChange={(event) => setForm({ ...form, head: event.target.value })}
              />
            </div>
            {saveError ? <div className="err">{errorMessage(saveError)}</div> : null}
          </Card.Section>
          <Card.Footer>
            {editingDepartment?.active ? (
              <Button variant="plain" onClick={handleDeactivate}>
                Deactivate
              </Button>
            ) : null}
            <span style={{ flex: 1 }} />
            <Button variant="secondary" onClick={closePanel} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Card.Footer>
        </Card>
      ) : null}
    </div>
  );
}
