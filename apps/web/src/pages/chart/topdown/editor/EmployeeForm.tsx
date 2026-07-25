import { FIELD, FIELD_ERR, INPUT, LABEL, TWO } from '../../../../design/formStyles';
import { optionList } from '../../../../design/optionList';
import type { Department } from '../../../../store/api/departmentsApi';
import type { Employee } from '../../../../store/api/employeesApi';
import { errorMessage } from '../../../../store/api/errorMessage';
import type { EditorPanel } from '../../../admin/useEditorPanel';
import { FormActions } from './FormActions';
import { TitleSelect } from './TitleSelect';
import type { EmpForm } from './forms';

export interface EmployeeFormProps {
  panel: EditorPanel<Employee, EmpForm>;
  departments: Department[];
  onCancel: () => void;
  onSave: () => void;
}

/** Edit one roster member in place (name, title, home department). */
export function EmployeeForm({ panel, departments, onCancel, onSave }: EmployeeFormProps) {
  const { form, setForm, fieldErrors, attemptedSave } = panel;

  // An inactive department stays listed only while it is this person's own.
  const departmentOptions = optionList(
    departments,
    (department) => department.active || department.id === form.departmentId,
    (department) => (
      <option key={department.id} value={department.id}>
        {department.name}
      </option>
    ),
  );

  return (
    <>
      <div className={TWO}>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="cv-emp-last">
            Last name 姓
          </label>
          <input
            id="cv-emp-last"
            className={INPUT}
            value={form.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
          />
          {attemptedSave && fieldErrors.lastName ? (
            <div className={FIELD_ERR}>{fieldErrors.lastName}</div>
          ) : null}
        </div>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="cv-emp-first">
            First name 名
          </label>
          <input
            id="cv-emp-first"
            className={INPUT}
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
          />
          {attemptedSave && fieldErrors.firstName ? (
            <div className={FIELD_ERR}>{fieldErrors.firstName}</div>
          ) : null}
        </div>
      </div>
      <div className={TWO}>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="cv-emp-title">
            Title 役職
          </label>
          <TitleSelect
            id="cv-emp-title"
            departmentId={form.departmentId}
            value={form.titleId}
            onChange={(titleId) => setForm({ ...form, titleId })}
          />
          {attemptedSave && fieldErrors.titleId ? (
            <div className={FIELD_ERR}>{fieldErrors.titleId}</div>
          ) : null}
        </div>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="cv-emp-dept">
            Home department 部門
          </label>
          <select
            id="cv-emp-dept"
            className={INPUT}
            value={form.departmentId}
            onChange={(event) => setForm({ ...form, departmentId: event.target.value, titleId: '' })}
          >
            <option value="" disabled>
              Select a department…
            </option>
            {departmentOptions}
          </select>
          {attemptedSave && fieldErrors.departmentId ? (
            <div className={FIELD_ERR}>{fieldErrors.departmentId}</div>
          ) : null}
        </div>
      </div>
      {panel.saveError ? <div className={FIELD_ERR}>{errorMessage(panel.saveError)}</div> : null}
      <FormActions saving={panel.saving} onCancel={onCancel} onSave={onSave} />
    </>
  );
}
