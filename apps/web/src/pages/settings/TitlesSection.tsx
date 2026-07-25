import { Pen, Plus } from 'lucide-react';

import {
  Badge,
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
  FIELD, 
  FIELD_ERR, 
  INPUT, 
  LABEL, 
  TWO 
} from '../../design/formStyles';
import {
  useCreateTitleMutation,
  useDeactivateTitleMutation,
  useGetTitlesQuery,
  useUpdateTitleMutation,
  type Title,
} from '../../store/api/titlesApi';
import { errorMessage } from '../../store/api/errorMessage';
import { useEditorPanel, type FieldErrors } from '../admin/useEditorPanel';

interface TitleFormState {
  name: string;
  nameEn: string;
  rank: number;
  staffLevel: boolean;
}

const EMPTY_FORM: TitleFormState = { name: '', nameEn: '', rank: 0, staffLevel: false };

function toFormState(title: Title): TitleFormState {
  return { name: title.name, nameEn: title.nameEn, rank: title.rank, staffLevel: title.staffLevel };
}

function validate(form: TitleFormState): FieldErrors<TitleFormState> {
  const errors: FieldErrors<TitleFormState> = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  if (!Number.isFinite(form.rank)) errors.rank = 'Rank must be a number.';
  return errors;
}

/** Manage the position/title catalog: create, rename/re-rank, and deactivate titles. */
export function TitlesSection() {
  const { data: titles, error, isLoading, refetch } = useGetTitlesQuery();
  const [createTitle, createState] = useCreateTitleMutation();
  const [updateTitle, updateState] = useUpdateTitleMutation();
  const [deactivateTitle] = useDeactivateTitleMutation();

  const {
    panel,
    editingRow: editingTitle,
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
  } = useEditorPanel<Title, TitleFormState>({
    emptyForm: EMPTY_FORM,
    createState,
    updateState,
    validate,
    toFormState,
    resolveRow: (id) => titles?.find((title) => title.id === id),
  });

  async function handleSave() {
    const values = beginSave();
    if (!values) return;
    const body = { name: values.name, nameEn: values.nameEn, rank: values.rank, staffLevel: values.staffLevel };
    if (isCreating) {
      const result = await createTitle(body);
      if (!('error' in result)) closePanel();
    } else if (panel) {
      const result = await updateTitle({ id: panel, body });
      if (!('error' in result)) closePanel();
    }
  }

  async function handleDeactivate() {
    if (!editingTitle) return;
    if (!window.confirm(`Deactivate "${editingTitle.name}"? It will disappear from the title pickers.`)) {
      return;
    }
    await deactivateTitle(editingTitle.id);
    closePanel();
  }

  const columns: IndexTableColumn<Title>[] = [
    { key: 'rank', header: 'Rank', width: '70px', render: (title) => <span>{title.rank}</span> },
    {
      key: 'name',
      header: 'Title',
      render: (title) => (
        <span>
          <b className="font-jp" style={title.active ? undefined : { color: 'var(--color-sub)' }}>
            {title.name}
          </b>
          {title.nameEn ? <small style={{ color: 'var(--color-sub)' }}> · {title.nameEn}</small> : null}
        </span>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      render: (title) => (title.staffLevel ? <Badge>Staff</Badge> : <Badge plain>Manager</Badge>),
    },
    {
      key: 'status',
      header: 'Status',
      render: (title) => (title.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>),
    },
  ];

  return (
    <>
      <Card>
        <Card.Header
          title={titles ? `${titles.length} titles` : 'Titles'}
          actions={
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus/> Add title
            </Button>
          }
        />
        {isLoading ? (
          <Card.Body>
            <LoadingState message="Loading titles…" />
          </Card.Body>
        ) : error ? (
          <Card.Body>
            <ErrorState description="Could not load titles." onRetry={refetch} />
          </Card.Body>
        ) : (
          <IndexTable
            columns={columns}
            rows={titles ?? []}
            rowKey={(title) => title.id}
            highlightedKeys={panel && !isCreating ? new Set([panel]) : undefined}
            rowActions={(title) => (
              <Button variant="plain" size="sm" onClick={() => openEdit(title.id)}>
                <Pen/>
              </Button>
            )}
            emptyState={<EmptyState title="No titles yet" description="Add a title to get started." />}
          />
        )}
      </Card>

      {panel ? (
        <Modal aria-label={isCreating ? 'Add title' : 'Edit title'} onClose={closePanel}>
          {isDirty ? (
            <div className="px-3 pt-3">
              <SaveBar
                message={
                  isCreating
                    ? 'Adding a title - unsaved changes'
                    : `Editing ${editingTitle?.name ?? ''} - unsaved changes`
                }
                saving={saving}
                onSave={handleSave}
                onDiscard={discardChanges}
              />
            </div>
          ) : null}
          <Modal.Header title={isCreating ? 'Add title' : 'Edit title'} />
          <Modal.Section>
            <div className={TWO}>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="title-name">
                  Name 役職
                </label>
                <input
                  id="title-name"
                  className={INPUT}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
                {attemptedSave && fieldErrors.name ? <div className={FIELD_ERR}>{fieldErrors.name}</div> : null}
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="title-name-en">
                  English label
                </label>
                <input
                  id="title-name-en"
                  className={INPUT}
                  value={form.nameEn}
                  onChange={(event) => setForm({ ...form, nameEn: event.target.value })}
                />
              </div>
            </div>
            <div className={TWO}>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="title-rank">
                  Rank (lower = higher)
                </label>
                <input
                  id="title-rank"
                  type="number"
                  className={INPUT}
                  value={form.rank}
                  onChange={(event) => setForm({ ...form, rank: Number(event.target.value) })}
                />
                {attemptedSave && fieldErrors.rank ? <div className={FIELD_ERR}>{fieldErrors.rank}</div> : null}
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="title-staff">
                  <input
                    id="title-staff"
                    type="checkbox"
                    className="mr-1.5"
                    checked={form.staffLevel}
                    onChange={(event) => setForm({ ...form, staffLevel: event.target.checked })}
                  />
                  Staff level (課員 grid)
                </label>
              </div>
            </div>
            {saveError ? <div className={FIELD_ERR}>{errorMessage(saveError)}</div> : null}
          </Modal.Section>
          <Modal.Footer>
            {editingTitle?.active ? (
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
    </>
  );
}
