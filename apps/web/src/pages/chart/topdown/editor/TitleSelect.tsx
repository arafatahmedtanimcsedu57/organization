import { INPUT } from '../../../../design/formStyles';
import { useGetDepartmentTitlesQuery } from '../../../../store/api/titlesApi';

export interface TitleSelectProps {
  id: string;
  /** The department whose assigned titles are selectable. */
  departmentId: string;
  /** Selected title id. */
  value: string;
  onChange: (titleId: string) => void;
  className?: string;
}

/**
 * Title picker constrained to the titles assigned to `departmentId` - a person can
 * only hold a title pre-defined and assigned to their department. Disabled until a
 * department is chosen; parents clear the selection when the department changes.
 */
export function TitleSelect({ id, departmentId, value, onChange, className = INPUT }: TitleSelectProps) {
  const { data: titles } = useGetDepartmentTitlesQuery(departmentId, { skip: !departmentId });

  return (
    <select
      id={id}
      className={className}
      value={value}
      disabled={!departmentId}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="" disabled>
        {departmentId ? 'Select a title…' : 'Choose a department first'}
      </option>
      {(titles ?? []).map((title) => (
        <option key={title.id} value={title.id}>
          {title.name}
        </option>
      ))}
    </select>
  );
}
