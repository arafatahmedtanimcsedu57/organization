import type { ChangeLogAction } from '../history/change-log.entity.ts';

/**
 * Maps a TypeORM update's changed column names to the audit action: flipping
 * `active` to `false` is a deactivation, anything else is a plain update.
 * Pure so it can be unit-tested without a database (change-history spec,
 * "A deactivate is logged").
 */
export function resolveUpdateAction(
  updatedColumnNames: readonly string[],
  after: Record<string, unknown>,
): ChangeLogAction {
  if (updatedColumnNames.includes('active') && after.active === false) {
    return 'deactivate';
  }
  return 'update';
}

/** Keys a change-log entry on the audited entity's primary key (`sysId` for employees, `id` for the rest). */
export function entityIdOf(entity: Record<string, unknown>): string {
  const id = entity.sysId ?? entity.id;
  if (id === undefined || id === null) {
    throw new Error('Audited entity has no sysId/id to key the change-log entry on');
  }
  return String(id);
}
