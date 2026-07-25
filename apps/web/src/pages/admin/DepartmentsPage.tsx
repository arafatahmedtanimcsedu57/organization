import { useMemo, useState } from 'react';
import { Pen, Plus } from 'lucide-react';
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
  UID,
  DEPT,
} from '../../design/formStyles';
import { optionList } from '../../design/optionList';
import {
  useCreateDepartmentMutation,
  useDeactivateDepartmentMutation,
  useGetDepartmentsQuery,
  useUpdateDepartmentMutation,
  type Department,
} from '../../store/api/departmentsApi';
import { errorMessage } from '../../store/api/errorMessage';
import { useEditorPanel, type FieldErrors } from './useEditorPanel';

interface DepartmentFormState {
  name: string;
  parentName: string;
  head: string;
}

const EMPTY_FORM: DepartmentFormState = { name: '', parentName: '', head: '' };

function toFormState(department: Department): DepartmentFormState {
  return { name: department.name, parentName: department.parentName, head: department.head };
}

function validate(form: DepartmentFormState): FieldErrors<DepartmentFormState> {
  const errors: FieldErrors<DepartmentFormState> = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  return errors;
}

/** Walks the parent-by-name chain to find every descendant of `name`, so the parent picker can exclude them (would-be cycle). */
function descendantNames(name: string, departments: Department[]): Set<string> {
  const descendants = new Set<string>();
  let frontier = [name];
  while (frontier.length) {
    const nextFrontier: string[] = [];
    for (const department of departments) {
      if (!frontier.includes(department.parentName)) continue;
      if (descendants.has(department.name)) continue;
      nextFrontier.push(department.name);
    }
    frontier = nextFrontier;
    for (const childName of frontier) descendants.add(childName);
  }
  return descendants;
}

export function DepartmentsPage() {
  const { data: departments, error, isLoading, refetch } = useGetDepartmentsQuery();
  const [createDepartment, createState] = useCreateDepartmentMutation();
  const [updateDepartment, updateState] = useUpdateDepartmentMutation();
  const [deactivateDepartment] = useDeactivateDepartmentMutation();

  const {
    panel,
    editingRow: editingDepartment,
    isCreating,
    form,
    attemptedSave,
    isDirty,
    fieldErrors,
    saving,
    saveError,
    setForm,
    openCreate,
    openEdit,
    closePanel,
    discardChanges,
    beginSave,
  } = useEditorPanel<Department, DepartmentFormState>({
    emptyForm: EMPTY_FORM,
    createState,
    updateState,
    validate,
    toFormState,
    resolveRow: (id) => departments?.find((department) => department.id === id),
  });

  const [search, setSearch] = useState('');
  const [parentFilter, setParentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (departments ?? []).filter((department) => {
      if (parentFilter === '__root__' && department.parentName) return false;
      if (parentFilter && parentFilter !== '__root__' && department.parentName !== parentFilter) {
        return false;
      }
      if (statusFilter === 'active' && !department.active) return false;
      if (statusFilter === 'inactive' && department.active) return false;
      if (query) {
        const haystack = `${department.name}${department.head}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [departments, search, parentFilter, statusFilter]);

  const hasFilters = Boolean(search || parentFilter || statusFilter);

  function clearFilters() {
    setSearch('');
    setParentFilter('');
    setStatusFilter('');
  }

  async function handleSave() {
    const values = beginSave();
    if (!values) return;
    const body = { name: values.name, parentName: values.parentName, head: values.head };
    if (isCreating) {
      const result = await createDepartment(body);
      if (!('error' in result)) closePanel();
    } else if (panel) {
      const result = await updateDepartment({ id: panel, body });
      if (!('error' in result)) closePanel();
    }
  }

  async function handleDeactivate() {
    if (!editingDepartment) return;
    if (
      !window.confirm(
        `Deactivate ${editingDepartment.name}? It will no longer appear on the chart.`,
      )
    ) {
      return;
    }
    await deactivateDepartment(editingDepartment.id);
    closePanel();
  }

  const excludedParentNames = editingDepartment
    ? new Set([
        editingDepartment.name,
        ...descendantNames(editingDepartment.name, departments ?? []),
      ])
    : new Set<string>();

  const columns: IndexTableColumn<Department>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '90px',
      render: (department) => <span className={UID}>{department.id}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      render: (department) => (
        <span>
          <b style={department.active ? undefined : { color: 'var(--color-sub)' }}>
            {department.name}
          </b>
        </span>
      ),
    },
    {
      key: 'parent',
      header: 'Parent',
      render: (department) =>
        department.parentName ? (
          <span className={DEPT}>{department.parentName}</span>
        ) : (
          <Badge plain>Root</Badge>
        ),
    },
    {
      key: 'head',
      header: 'Head',
      render: (department) => <span className={DEPT}>{department.head || '-'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (department) =>
        department.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>,
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
              { label: 'Departments' },
            ]}
          />
          <h1 className={PAGE_TITLE}>Departments</h1>
        </div>
        <div className={PH_ACTIONS}>
          <Button variant="primary" onClick={openCreate}>
            <Plus /> Add department
          </Button>
        </div>
      </div>

      <Card>
        <Card.Header title="Filters" />
        <Card.Section>
          <div className="grid grid-cols-3 gap-3">
            <div className={FIELD}>
              <label className={LABEL} htmlFor="dept-search">
                Search
              </label>
              <input
                id="dept-search"
                type="search"
                className={INPUT}
                placeholder="Name or head…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="dept-filter-parent">
                Parent
              </label>
              <select
                id="dept-filter-parent"
                className={INPUT}
                value={parentFilter}
                onChange={(event) => setParentFilter(event.target.value)}
              >
                <option value="">All departments</option>
                <option value="__root__">Root (no parent)</option>
                {(departments ?? []).map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="dept-filter-status">
                Status
              </label>
              <select
                id="dept-filter-status"
                className={INPUT}
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as '' | 'active' | 'inactive')
                }
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          {hasFilters ? (
            <Button variant="plain" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </Card.Section>
      </Card>

      <Card>
        <Card.Header
          title={
            departments
              ? filteredDepartments.length === departments.length
                ? `${departments.length} departments`
                : `${filteredDepartments.length} of ${departments.length} departments`
              : 'Departments'
          }
        />
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
            rows={filteredDepartments}
            rowKey={(department) => department.id}
            highlightedKeys={panel && !isCreating ? new Set([panel]) : undefined}
            rowActions={(department) => (
              <Button variant="plain" size="sm" onClick={() => openEdit(department.id)}>
                <Pen />
              </Button>
            )}
            emptyState={
              hasFilters ? (
                <EmptyState
                  title="No matches"
                  description="Try a different search, or clear filters."
                />
              ) : (
                <EmptyState
                  title="No departments yet"
                  description="Add a department to get started."
                />
              )
            }
          />
        )}
      </Card>

      {panel ? (
        <Modal aria-label={isCreating ? 'Add department' : 'Edit department'} onClose={closePanel}>
          {isDirty ? (
            <div className="px-3 pt-3">
              <SaveBar
                message={
                  isCreating
                    ? 'Adding a new department - unsaved changes'
                    : `Editing ${editingDepartment?.name ?? ''} - unsaved changes`
                }
                saving={saving}
                onSave={handleSave}
                onDiscard={discardChanges}
              />
            </div>
          ) : null}
          <Modal.Header
            title={isCreating ? 'Add department' : 'Edit department'}
            actions={editingDepartment ? <Badge plain>{editingDepartment.id}</Badge> : undefined}
          />
          <Modal.Section>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="dept-name">
                Name 部門名
              </label>
              <input
                id="dept-name"
                className={INPUT}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              {attemptedSave && fieldErrors.name ? (
                <div className={FIELD_ERR}>{fieldErrors.name}</div>
              ) : null}
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="dept-parent">
                Parent department
              </label>
              <select
                id="dept-parent"
                className={INPUT}
                value={form.parentName}
                onChange={(event) => setForm({ ...form, parentName: event.target.value })}
              >
                <option value="">No parent (root)</option>
                {optionList(
                  departments,
                  (department) =>
                    (department.active || department.name === form.parentName) &&
                    !excludedParentNames.has(department.name),
                  (department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="dept-head">
                Department head 部門長
              </label>
              <input
                id="dept-head"
                className={INPUT}
                value={form.head}
                onChange={(event) => setForm({ ...form, head: event.target.value })}
              />
            </div>
            {saveError ? <div className={FIELD_ERR}>{errorMessage(saveError)}</div> : null}
          </Modal.Section>
          <Modal.Footer>
            {editingDepartment?.active ? (
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
