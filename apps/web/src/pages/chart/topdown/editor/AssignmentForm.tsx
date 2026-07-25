import { FIELD, FIELD_ERR, INPUT, LABEL, TWO } from '../../../../design/formStyles';
import { optionList } from '../../../../design/optionList';
import type { Employee } from '../../../../store/api/employeesApi';
import { errorMessage } from '../../../../store/api/errorMessage';
import type { EditorPanel } from '../../../admin/useEditorPanel';
import { FormActions } from './FormActions';
import { TitleSelect } from './TitleSelect';
import type { AsnForm } from './forms';

export interface AssignmentFormProps {
  panel: EditorPanel<never, AsnForm>;
  employees: Employee[];
  onCancel: () => void;
  onSave: () => void;
}

/** Create a 兼務 posting: an active person gains a second title in the selected department. */
export function AssignmentForm({ panel, employees, onCancel, onSave }: AssignmentFormProps) {
  const { form, setForm, fieldErrors, attemptedSave } = panel;

  // Only active people can take a new posting.
  const personOptions = optionList(
    employees,
    (employee) => employee.active,
    (employee) => (
      <option key={employee.sysId} value={employee.sysId}>
        {employee.lastName} {employee.firstName} ({employee.userId})
      </option>
    ),
  );

  return (
    <>
      <div className={TWO}>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="cv-asn-person">
            Person
          </label>
          <select
            id="cv-asn-person"
            className={INPUT}
            value={form.employeeSysId}
            onChange={(event) => setForm({ ...form, employeeSysId: event.target.value })}
          >
            <option value="" disabled>
              Select a person…
            </option>
            {personOptions}
          </select>
          {attemptedSave && fieldErrors.employeeSysId ? (
            <div className={FIELD_ERR}>{fieldErrors.employeeSysId}</div>
          ) : null}
        </div>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="cv-asn-title">
            Title in this department 役職
          </label>
          <TitleSelect
            id="cv-asn-title"
            departmentId={form.departmentId}
            value={form.titleId}
            onChange={(titleId) => setForm({ ...form, titleId })}
          />
          {attemptedSave && fieldErrors.titleId ? (
            <div className={FIELD_ERR}>{fieldErrors.titleId}</div>
          ) : null}
        </div>
      </div>
      <div className={TWO}>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="cv-asn-from">
            Valid from
          </label>
          <input
            id="cv-asn-from"
            type="date"
            lang="ja"
            className={INPUT}
            value={form.validFrom}
            onChange={(event) => setForm({ ...form, validFrom: event.target.value })}
          />
        </div>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="cv-asn-to">
            Valid to
          </label>
          <input
            id="cv-asn-to"
            type="date"
            lang="ja"
            className={INPUT}
            value={form.validTo}
            onChange={(event) => setForm({ ...form, validTo: event.target.value })}
          />
          {attemptedSave && fieldErrors.validTo ? (
            <div className={FIELD_ERR}>{fieldErrors.validTo}</div>
          ) : null}
        </div>
      </div>
      {panel.saveError ? <div className={FIELD_ERR}>{errorMessage(panel.saveError)}</div> : null}
      <FormActions saving={panel.saving} onCancel={onCancel} onSave={onSave} />
    </>
  );
}
