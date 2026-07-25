import { FIELD, FIELD_ERR, INPUT, LABEL, TWO } from '../../../design/formStyles';
import { optionList } from '../../../design/optionList';
import type { AssignmentType } from '../../../store/api/assignmentsApi';
import type { Department } from '../../../store/api/departmentsApi';
import type { Employee } from '../../../store/api/employeesApi';
import { errorMessage } from '../../../store/api/errorMessage';
import { TitleSelect } from '../../chart/topdown/editor/TitleSelect';
import type { FieldErrors } from '../useEditorPanel';
import type { AssignmentFormState } from './assignmentForm';

export interface AssignmentFieldsProps {
  form: AssignmentFormState;
  setForm: (form: AssignmentFormState) => void;
  fieldErrors: FieldErrors<AssignmentFormState>;
  attemptedSave: boolean;
  /** Person and department are fixed once a posting exists - edit its terms, not its identity. */
  isCreating: boolean;
  employees: Employee[] | undefined;
  departments: Department[] | undefined;
  saveError: unknown;
}

/** The posting editor's fields: who, where, what title, primary vs. 兼務, and validity dates. */
export function AssignmentFields({
  form,
  setForm,
  fieldErrors,
  attemptedSave,
  isCreating,
  employees,
  departments,
  saveError,
}: AssignmentFieldsProps) {
  return (
    <>
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
            {optionList(
              employees,
              (employee) => employee.active || employee.sysId === form.employeeSysId,
              (employee) => (
                <option key={employee.sysId} value={employee.sysId}>
                  {employee.lastName} {employee.firstName} ({employee.userId})
                </option>
              ),
            )}
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
            onChange={(event) => setForm({ ...form, departmentId: event.target.value, titleId: '' })}
          >
            <option value="" disabled>
              Select a department…
            </option>
            {optionList(
              departments,
              (department) => department.active || department.id === form.departmentId,
              (department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ),
            )}
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
        <TitleSelect
          id="asn-title"
          departmentId={form.departmentId}
          value={form.titleId}
          onChange={(titleId) => setForm({ ...form, titleId })}
        />
        {attemptedSave && fieldErrors.titleId ? (
          <div className={FIELD_ERR}>{fieldErrors.titleId}</div>
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
                // "Home department" is meaningless on a concurrent posting.
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
    </>
  );
}
