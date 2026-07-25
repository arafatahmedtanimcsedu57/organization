import { POSITION_RANK } from '@org-chart/domain';
import { Badge } from '../../../../design/components';
import { FIELD, FIELD_ERR, INPUT, LABEL, TWO } from '../../../../design/formStyles';
import { optionList } from '../../../../design/optionList';
import type { Department } from '../../../../store/api/departmentsApi';
import type { Employee } from '../../../../store/api/employeesApi';
import { errorMessage } from '../../../../store/api/errorMessage';
import type { EditorPanel } from '../../../admin/useEditorPanel';
import { FormActions } from './FormActions';
import type { EmpForm } from './forms';

export interface EmployeeFormProps {
  panel: EditorPanel<Employee, EmpForm>;
  departments: Department[];
  /** Always set - the shell renders this form only once the row has resolved. */
  employee: Employee;
  onCancel: () => void;
  onSave: () => void;
}

/** Edit one roster member in place (name, title, home department). */
export function EmployeeForm({
  panel,
  departments,
  employee,
  onCancel,
  onSave,
}: EmployeeFormProps) {
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
      <h3 className="text-[13px] font-semibold mb-3">
        Edit employee <Badge plain>{employee.userId}</Badge>
      </h3>
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
          <input
            id="cv-emp-title"
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
        <div className={FIELD}>
          <label className={LABEL} htmlFor="cv-emp-dept">
            Home department 部門
          </label>
          <select
            id="cv-emp-dept"
            className={INPUT}
            value={form.departmentId}
            onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
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
