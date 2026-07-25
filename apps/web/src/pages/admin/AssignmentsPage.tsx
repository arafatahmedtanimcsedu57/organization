import {
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IndexTable,
  LoadingState,
  SaveBar,
} from '../../design/components';
import { PAGE, PAGE_HEAD, PH_ACTIONS, PAGE_TITLE } from '../../design/formStyles';
import {
  useCreateAssignmentMutation,
  useGetAssignmentsQuery,
  useRemoveAssignmentMutation,
  useUpdateAssignmentMutation,
  type Assignment,
} from '../../store/api/assignmentsApi';
import { useGetEmployeesQuery } from '../../store/api/employeesApi';
import { useGetDepartmentsQuery } from '../../store/api/departmentsApi';
import { useEditorPanel } from './useEditorPanel';
import { AssignmentFields } from './assignments/AssignmentFields';
import { assignmentColumns } from './assignments/assignmentColumns';
import {
  EMPTY_FORM,
  personName,
  toFormState,
  validate,
  type AssignmentFormState,
} from './assignments/assignmentForm';

/**
 * `/admin/assignments` — the 兼務 master: every user ↔ department ↔ title posting, with the
 * primary/concurrent flag and validity dates. The page owns the panel state machine and the
 * mutations; the table columns and the form fields live beside it.
 */
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
    const confirmed = window.confirm(
      `Remove this posting for ${personName(employee, editingAssignment.employeeSysId)}?`,
    );
    if (!confirmed) return;
    await removeAssignment(editingAssignment.id);
    closePanel();
  }

  const columns = assignmentColumns({ employees, departments });

  return (
    <div className={PAGE}>
      {panel && isDirty ? (
        <SaveBar
          message={
            isCreating ? 'Adding a new posting — unsaved changes' : 'Editing posting — unsaved changes'
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
            <AssignmentFields
              form={form}
              setForm={setForm}
              fieldErrors={fieldErrors}
              attemptedSave={attemptedSave}
              isCreating={isCreating}
              employees={employees}
              departments={departments}
              saveError={saveError}
            />
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
