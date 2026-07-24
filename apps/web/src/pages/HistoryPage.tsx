import { useMemo, useState } from 'react';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IndexTable,
  LoadingState,
} from '../design/components';
import type { IndexTableColumn } from '../design/components';
import {
  PAGE,
  PAGE_HEAD,
  PAGE_TITLE,
  FIELD,
  LABEL,
  INPUT,
  PERSON,
  PERSON_NAME,
  PERSON_SUB,
} from '../design/formStyles';
import {
  useGetHistoryQuery,
  type ChangeLogAction,
  type ChangeLogEntityType,
  type ChangeLogEntry,
  type HistoryFilter,
} from '../store/api/historyApi';
import { useGetEmployeesQuery } from '../store/api/employeesApi';
import { useGetDepartmentsQuery } from '../store/api/departmentsApi';
import { useGetAssignmentsQuery, type Assignment } from '../store/api/assignmentsApi';

const ENTITY_LABEL: Record<ChangeLogEntityType, string> = {
  employee: 'Employee',
  department: 'Department',
  assignment: 'Concurrent duty',
};

const ACTION_LABEL: Record<ChangeLogAction, string> = {
  create: 'Created',
  update: 'Updated',
  deactivate: 'Deactivated',
};

const ACTION_TONE: Record<ChangeLogAction, 'success' | 'info' | 'warn'> = {
  create: 'success',
  update: 'info',
  deactivate: 'warn',
};

/** Human-readable label for a snapshot field; falls back to a camelCase → "Camel Case" split. */
const FIELD_LABEL: Record<string, string> = {
  lastName: 'Last name',
  firstName: 'First name',
  title: 'Title',
  departmentId: 'Department',
  active: 'Active',
  name: 'Name',
  parentName: 'Parent department',
  head: 'Department head',
  employeeSysId: 'Employee',
  isPrimary: 'Primary',
  assignmentType: 'Type',
  validFrom: 'Valid from',
  validTo: 'Valid to',
};

function fieldLabel(key: string): string {
  return (
    FIELD_LABEL[key] ??
    key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
  );
}

/** Snapshot keys that identify the row itself rather than describing a change. */
const IDENTITY_KEYS = new Set(['id', 'sysId', 'entityId', 'userId']);

interface FieldDiff {
  key: string;
  before: unknown;
  after: unknown;
}

/** Diffs two entity snapshots field-by-field; a `null` side (create/hard-delete) shows every remaining field as the change. */
function diffSnapshots(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): FieldDiff[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const diffs: FieldDiff[] = [];
  for (const key of keys) {
    if (IDENTITY_KEYS.has(key)) continue;
    const b = before?.[key];
    const a = after?.[key];
    if (JSON.stringify(b) !== JSON.stringify(a)) diffs.push({ key, before: b, after: a });
  }
  return diffs;
}

interface NameLookups {
  employeeName: (sysId: string) => string;
  departmentName: (id: string) => string;
}

function formatValue(key: string, value: unknown, lookups: NameLookups): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'departmentId') return lookups.departmentName(String(value));
  if (key === 'employeeSysId') return lookups.employeeName(String(value));
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function entityDisplayName(
  entry: ChangeLogEntry,
  lookups: NameLookups,
  assignments: Assignment[] | undefined,
): string {
  if (entry.entity === 'employee') return lookups.employeeName(entry.entityId);
  if (entry.entity === 'department') return lookups.departmentName(entry.entityId);

  const assignment = assignments?.find((row) => row.id === entry.entityId);
  if (assignment)
    return `${lookups.employeeName(assignment.employeeSysId)} @ ${lookups.departmentName(assignment.departmentId)}`;

  const snapshot = entry.after ?? entry.before;
  const employeeSysId = snapshot?.employeeSysId as string | undefined;
  const departmentId = snapshot?.departmentId as string | undefined;
  if (employeeSysId && departmentId)
    return `${lookups.employeeName(employeeSysId)} @ ${lookups.departmentName(departmentId)}`;
  return entry.entityId;
}

export function HistoryPage() {
  const [entity, setEntity] = useState<'' | ChangeLogEntityType>('');
  const [entityId, setEntityId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filter: HistoryFilter = useMemo(() => {
    const result: HistoryFilter = {};
    if (entity) result.entity = entity;
    if (entityId) result.entityId = entityId;
    if (from) result.from = new Date(`${from}T00:00:00.000Z`).toISOString();
    if (to) result.to = new Date(`${to}T23:59:59.999Z`).toISOString();
    return result;
  }, [entity, entityId, from, to]);

  const { data: entries, error, isLoading, refetch } = useGetHistoryQuery(filter);
  const { data: employees } = useGetEmployeesQuery();
  const { data: departments } = useGetDepartmentsQuery();
  const { data: assignments } = useGetAssignmentsQuery();

  const lookups: NameLookups = {
    employeeName: (sysId) => {
      const employee = employees?.find((row) => row.sysId === sysId);
      return employee ? `${employee.lastName} ${employee.firstName}` : sysId;
    },
    departmentName: (id) => departments?.find((row) => row.id === id)?.name ?? id,
  };

  function handleEntityChange(next: '' | ChangeLogEntityType) {
    setEntity(next);
    setEntityId('');
  }

  function clearFilters() {
    setEntity('');
    setEntityId('');
    setFrom('');
    setTo('');
  }

  const hasFilters = Boolean(entity || entityId || from || to);

  const columns: IndexTableColumn<ChangeLogEntry>[] = [
    {
      key: 'when',
      header: 'When',
      width: '170px',
      render: (entry) => <span>{new Date(entry.changedAt).toLocaleString()}</span>,
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (entry) => (
        <div className={PERSON}>
          <span>
            <b className={PERSON_NAME}>{entityDisplayName(entry, lookups, assignments)}</b>
            <small className={PERSON_SUB}>{ENTITY_LABEL[entry.entity]}</small>
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: '110px',
      render: (entry) => (
        <Badge tone={ACTION_TONE[entry.action]}>{ACTION_LABEL[entry.action]}</Badge>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      width: '100px',
      render: (entry) => <span>{entry.actor}</span>,
    },
    {
      key: 'changes',
      header: 'What changed',
      render: (entry) => {
        const diffs = diffSnapshots(entry.before, entry.after);
        if (diffs.length === 0) return <span className="text-sub">No field changes</span>;
        return (
          <ul className="m-0 pl-4 text-[12.5px]">
            {diffs.map((diff) => (
              <li key={diff.key}>
                <b>{fieldLabel(diff.key)}:</b>{' '}
                {entry.before === null
                  ? formatValue(diff.key, diff.after, lookups)
                  : `${formatValue(diff.key, diff.before, lookups)} → ${formatValue(diff.key, diff.after, lookups)}`}
              </li>
            ))}
          </ul>
        );
      },
    },
  ];

  const entityIdOptions =
    entity === 'employee'
      ? (employees ?? []).map((employee) => ({
          value: employee.sysId,
          label: `${employee.lastName} ${employee.firstName} (${employee.userId})`,
        }))
      : entity === 'department'
        ? (departments ?? []).map((department) => ({
            value: department.id,
            label: department.name,
          }))
        : entity === 'assignment'
          ? (assignments ?? []).map((assignment) => ({
              value: assignment.id,
              label: `${lookups.employeeName(assignment.employeeSysId)} @ ${lookups.departmentName(assignment.departmentId)}`,
            }))
          : [];

  return (
    <div className={PAGE}>
      <div className={PAGE_HEAD}>
        <div>
          <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Change history' }]} />
          <h1 className={PAGE_TITLE}>Change history</h1>
        </div>
      </div>

      <Card>
        <Card.Header title="Filters" />
        <Card.Section>
          <div className="grid grid-cols-4 gap-3">
            <div className={FIELD}>
              <label className={LABEL} htmlFor="hist-entity">
                Entity type
              </label>
              <select
                id="hist-entity"
                className={INPUT}
                value={entity}
                onChange={(event) =>
                  handleEntityChange(event.target.value as '' | ChangeLogEntityType)
                }
              >
                <option value="">All</option>
                <option value="employee">Employee</option>
                <option value="department">Department</option>
                <option value="assignment">Concurrent duty</option>
              </select>
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="hist-entity-id">
                Specific record
              </label>
              <select
                id="hist-entity-id"
                className={INPUT}
                value={entityId}
                onChange={(event) => setEntityId(event.target.value)}
                disabled={!entity}
              >
                <option value="">
                  All {entity ? ENTITY_LABEL[entity].toLowerCase() + 's' : 'records'}
                </option>
                {entityIdOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="hist-from">
                From
              </label>
              <input
                id="hist-from"
                type="date"
                className={INPUT}
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className={FIELD}>
              <label className={LABEL} htmlFor="hist-to">
                To
              </label>
              <input
                id="hist-to"
                type="date"
                className={INPUT}
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          </div>
          {hasFilters ? (
            <Button variant="plain" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </Card.Section>
      </Card>

      <Card>
        <Card.Header title={entries ? `${entries.length} changes` : 'Change history'} />
        {isLoading ? (
          <Card.Body>
            <LoadingState message="Loading history…" />
          </Card.Body>
        ) : error ? (
          <Card.Body>
            <ErrorState description="Could not load change history." onRetry={refetch} />
          </Card.Body>
        ) : (
          <IndexTable
            columns={columns}
            rows={entries ?? []}
            rowKey={(entry) => entry.id}
            emptyState={
              <EmptyState
                title="No history yet"
                description="Changes to employees, departments, and concurrent duties will appear here."
              />
            }
          />
        )}
      </Card>
    </div>
  );
}
