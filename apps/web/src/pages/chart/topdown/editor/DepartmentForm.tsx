import { FIELD, FIELD_ERR, INPUT, LABEL, TWO } from '../../../../design/formStyles';
import { optionList } from '../../../../design/optionList';
import type { Department } from '../../../../store/api/departmentsApi';
import { errorMessage } from '../../../../store/api/errorMessage';
import type { EditorPanel } from '../../../admin/useEditorPanel';
import { FormActions } from './FormActions';
import type { DeptForm } from './forms';

export interface DepartmentFormProps {
  panel: EditorPanel<Department, DeptForm>;
  departments: Department[];
  /** The selected node — excluded from the parent list so a department cannot parent itself. */
  nodeId: string;
  nodeName: string;
  onCancel: () => void;
  onSave: () => void;
}

/** Edit the selected department, or add a sub-department beneath it. */
export function DepartmentForm({
  panel,
  departments,
  nodeId,
  nodeName,
  onCancel,
  onSave,
}: DepartmentFormProps) {
  const { form, setForm, fieldErrors, attemptedSave } = panel;

  // An inactive department stays listed only while it is the current parent; the selected
  // node itself is excluded so a department cannot become its own parent.
  const parentOptions = optionList(
    departments,
    (department) =>
      department.id !== nodeId && (department.active || department.name === form.parentName),
    (department) => (
      <option key={department.id} value={department.name}>
        {department.name}
      </option>
    ),
  );

  return (
    <>
      <h3 className="text-[13px] font-semibold mb-3">
        {panel.isCreating ? `Add sub-department under ${nodeName}` : 'Edit department'}
      </h3>
      <div className={TWO}>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="cv-dept-name">
            Name 部門名
          </label>
          <input
            id="cv-dept-name"
            className={INPUT}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          {attemptedSave && fieldErrors.name ? (
            <div className={FIELD_ERR}>{fieldErrors.name}</div>
          ) : null}
        </div>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="cv-dept-parent">
            Parent department
          </label>
          <select
            id="cv-dept-parent"
            className={INPUT}
            value={form.parentName}
            onChange={(event) => setForm({ ...form, parentName: event.target.value })}
          >
            <option value="">No parent (root)</option>
            {parentOptions}
          </select>
        </div>
      </div>
      <div className={FIELD}>
        <label className={LABEL} htmlFor="cv-dept-head">
          Department head 部門長
        </label>
        <input
          id="cv-dept-head"
          className={INPUT}
          value={form.head}
          onChange={(event) => setForm({ ...form, head: event.target.value })}
        />
      </div>
      {panel.saveError ? <div className={FIELD_ERR}>{errorMessage(panel.saveError)}</div> : null}
      <FormActions saving={panel.saving} onCancel={onCancel} onSave={onSave} />
    </>
  );
}
