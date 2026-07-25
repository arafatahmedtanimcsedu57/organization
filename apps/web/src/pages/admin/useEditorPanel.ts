import { useLayoutEffect, useRef, useState } from 'react';

/** Field-level validation errors keyed by form field. */
export type FieldErrors<Form> = Partial<Record<keyof Form, string>>;

/**
 * `'create'` while adding a new record, the record's id while editing it, or
 * `null` when the editor panel is closed.
 */
export type PanelState = 'create' | string | null;

/**
 * The subset of an RTK Query mutation-result tuple's state object that the panel needs.
 * `error` is optional because RTK only includes it on the union's error branch.
 */
interface MutationState {
  isLoading: boolean;
  error?: unknown;
  reset: () => void;
}

export interface UseEditorPanelOptions<Row, Form> {
  /** Blank form used for the "create" panel and when the panel is closed. */
  emptyForm: Form;
  /** Resolves the row currently being edited from its id (typically `data?.find(...)`). */
  resolveRow: (id: string) => Row | undefined;
  /** Maps a row into editable form state when an edit panel opens. */
  toFormState: (row: Row) => Form;
  /** Synchronous field validation, re-run on every keystroke. */
  validate: (form: Form) => FieldErrors<Form>;
  /** Create mutation's state - drives `saving`/`saveError` and is reset when a panel opens. */
  createState: MutationState;
  /** Update mutation's state - drives `saving`/`saveError` and is reset when a panel opens. */
  updateState: MutationState;
}

export interface EditorPanel<Row, Form> {
  /** `'create'`, an id, or `null`. */
  panel: PanelState;
  /** The row being edited, or `undefined` while creating / closed. */
  editingRow: Row | undefined;
  /** `true` when the "create" panel is open. */
  isCreating: boolean;
  form: Form;
  setForm: (form: Form) => void;
  /** Set once the user first attempts to save - gates when field errors are shown. */
  attemptedSave: boolean;
  /** `true` when `form` differs from the baseline it was opened with. */
  isDirty: boolean;
  fieldErrors: FieldErrors<Form>;
  hasFieldErrors: boolean;
  /** In-flight state of the relevant (create vs. update) mutation. */
  saving: boolean;
  /** Error of the relevant (create vs. update) mutation. */
  saveError: unknown;
  openCreate: () => void;
  openEdit: (id: string) => void;
  closePanel: () => void;
  /** Reverts the form back to the values the panel was opened with. */
  discardChanges: () => void;
  /**
   * Flags a save attempt and validates: returns the current form when valid so the
   * caller can build its request body, or `null` when there are field errors.
   */
  beginSave: () => Form | null;
}

/**
 * The create/edit "panel" state machine shared by every admin master-data page
 * (employees, departments, concurrent duties). Owns the panel identity, the working
 * form and its dirty-tracking baseline, deferred validation, and the open/close/
 * discard/save lifecycle - so each page only declares its form shape, validation,
 * and mutation wiring.
 */
export function useEditorPanel<Row, Form>({
  emptyForm,
  resolveRow,
  toFormState,
  validate,
  createState,
  updateState,
}: UseEditorPanelOptions<Row, Form>): EditorPanel<Row, Form> {
  const [panel, setPanel] = useState<PanelState>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [baseline, setBaseline] = useState<Form>(emptyForm);
  const [attemptedSave, setAttemptedSave] = useState(false);

  const isCreating = panel === 'create';
  const editingRow = panel && !isCreating ? resolveRow(panel) : undefined;

  const saving = isCreating ? createState.isLoading : updateState.isLoading;
  const saveError = isCreating ? createState.error : updateState.error;
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const fieldErrors = validate(form);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  // `toFormState` is a pure row→form mapping that callers declare inline, so its identity
  // changes every render. Holding the latest one here keeps it out of the seeding effect's
  // dependencies - listing it would re-seed on every render and wipe whatever the user is
  // typing. Declared first so this layout effect runs before the seeding one below.
  const toFormStateRef = useRef(toFormState);
  useLayoutEffect(() => {
    toFormStateRef.current = toFormState;
  });

  // Seeding the draft from the record the panel points at: opening a panel, and the row
  // arriving later if the list was still loading. `useLayoutEffect`, not `useEffect`: a
  // passive effect runs after paint, so opening an editor would show one frame of the
  // *previous* record's values before the seed lands.
  //
  // The draft is an editable copy of server data, so it cannot be derived during render,
  // and the row it comes from can resolve after the panel opens. React's alternative is
  // remounting the form via a `key` per record; that means splitting this hook's panel
  // identity from its form state across all five screens that use it, which is a bigger
  // change than this warning is worth right now.
  /* eslint-disable react-hooks/set-state-in-effect -- seeding a draft from server data, see above */
  useLayoutEffect(() => {
    if (isCreating) {
      setForm(emptyForm);
      setBaseline(emptyForm);
      setAttemptedSave(false);
    } else if (editingRow) {
      const state = toFormStateRef.current(editingRow);
      setForm(state);
      setBaseline(state);
      setAttemptedSave(false);
    }
  }, [isCreating, editingRow, emptyForm]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function openCreate() {
    createState.reset();
    setPanel('create');
  }

  function openEdit(id: string) {
    updateState.reset();
    setPanel(id);
  }

  function closePanel() {
    setPanel(null);
    setForm(emptyForm);
    setBaseline(emptyForm);
    setAttemptedSave(false);
  }

  function discardChanges() {
    setForm(baseline);
    setAttemptedSave(false);
  }

  function beginSave(): Form | null {
    setAttemptedSave(true);
    return hasFieldErrors ? null : form;
  }

  return {
    panel,
    editingRow,
    isCreating,
    form,
    setForm,
    attemptedSave,
    isDirty,
    fieldErrors,
    hasFieldErrors,
    saving,
    saveError,
    openCreate,
    openEdit,
    closePanel,
    discardChanges,
    beginSave,
  };
}
