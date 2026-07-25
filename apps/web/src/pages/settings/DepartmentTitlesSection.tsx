import { useState } from 'react';
import { Card } from '../../design/components';
import { FIELD, INPUT, LABEL } from '../../design/formStyles';
import { useGetDepartmentsQuery } from '../../store/api/departmentsApi';
import {
  useAssignDepartmentTitleMutation,
  useGetDepartmentTitlesQuery,
  useGetTitlesQuery,
  useUnassignDepartmentTitleMutation,
} from '../../store/api/titlesApi';
import { errorMessage } from '../../store/api/errorMessage';

/**
 * Assign/unassign which titles are usable in each department. Employees and 兼務
 * postings can then only be given a title checked here for their department.
 */
export function DepartmentTitlesSection() {
  const { data: departments } = useGetDepartmentsQuery();
  const { data: allTitles } = useGetTitlesQuery();
  const [departmentId, setDepartmentId] = useState('');
  const { data: assigned } = useGetDepartmentTitlesQuery(departmentId, { skip: !departmentId });
  const [assign] = useAssignDepartmentTitleMutation();
  const [unassign] = useUnassignDepartmentTitleMutation();
  const [error, setError] = useState<string | null>(null);

  const assignedIds = new Set((assigned ?? []).map((title) => title.id));
  const activeTitles = (allTitles ?? []).filter((title) => title.active);

  async function toggle(titleId: string, isAssigned: boolean) {
    setError(null);
    const result = isAssigned
      ? await unassign({ departmentId, titleId })
      : await assign({ departmentId, titleId });
    if ('error' in result && result.error) setError(errorMessage(result.error));
  }

  return (
    <Card>
      <Card.Header title="Titles per department" />
      <Card.Section>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="dt-dept">
            Department 部門
          </label>
          <select
            id="dt-dept"
            className={INPUT}
            value={departmentId}
            onChange={(event) => {
              setDepartmentId(event.target.value);
              setError(null);
            }}
          >
            <option value="" disabled>
              Select a department…
            </option>
            {(departments ?? [])
              .filter((department) => department.active)
              .map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
          </select>
        </div>

        {departmentId ? (
          <div className="mt-3 flex flex-col gap-1.5">
            {activeTitles.map((title) => {
              const isAssigned = assignedIds.has(title.id);
              return (
                <label key={title.id} className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={isAssigned} onChange={() => toggle(title.id, isAssigned)} />
                  <span className="font-jp">{title.name}</span>
                  <small style={{ color: 'var(--color-sub)' }}>
                    rank {title.rank}
                    {title.nameEn ? ` · ${title.nameEn}` : ''}
                  </small>
                </label>
              );
            })}
            {activeTitles.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--color-sub)' }}>
                No active titles - add some above first.
              </p>
            ) : null}
            {error ? (
              <div className="text-[13px]" style={{ color: 'var(--color-critical)' }}>
                {error}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: 'var(--color-sub)' }}>
            Pick a department to choose which titles its employees and postings may use.
          </p>
        )}
      </Card.Section>
    </Card>
  );
}
