import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { DataSource, InsertEvent, RemoveEvent, UpdateEvent } from 'typeorm';
import { AuditSubscriber } from './audit.subscriber.ts';
import { ChangeLog } from '../history/change-log.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Department } from '../departments/department.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';

/** Captures whatever the subscriber inserts into the `ChangeLog` repository. */
function harness() {
  const inserted: Record<string, unknown>[] = [];
  const manager = {
    getRepository: () => ({
      insert: async (row: Record<string, unknown>) => {
        inserted.push(row);
      },
    }),
  };
  const dataSource = { subscribers: [] } as unknown as DataSource;
  const subscriber = new AuditSubscriber(dataSource);
  return { subscriber, manager, inserted };
}

test('an employee create is logged with action, actor, timestamp-generating fields, and after-only JSON', async () => {
  const { subscriber, manager, inserted } = harness();
  const employee = { sysId: 'e1', lastName: '山田', title: '課長', active: true };

  await subscriber.afterInsert({
    metadata: { target: Employee },
    entity: employee,
    manager,
  } as unknown as InsertEvent<unknown>);

  assert.equal(inserted.length, 1);
  const row = inserted[0]!;
  assert.equal(row.entity, 'employee');
  assert.equal(row.entityId, 'e1');
  assert.equal(row.action, 'create');
  assert.equal(row.actor, 'system');
  assert.equal(row.before, null);
  assert.deepEqual(row.after, employee);
  // changedAt is left to `@CreateDateColumn`'s DB default, not set by the subscriber.
  assert.equal('changedAt' in row, false);
});

test('a department field update is logged as action "update" with before and after JSON', async () => {
  const { subscriber, manager, inserted } = harness();
  const before = { id: '1', name: '営業本部', head: '山田', active: true };
  const after = { id: '1', name: '営業本部', head: '佐藤', active: true };

  await subscriber.afterUpdate({
    metadata: { target: Department },
    entity: after,
    databaseEntity: before,
    updatedColumns: [{ propertyName: 'head' }],
    manager,
  } as unknown as UpdateEvent<unknown>);

  assert.equal(inserted.length, 1);
  const row = inserted[0]!;
  assert.equal(row.entity, 'department');
  assert.equal(row.entityId, '1');
  assert.equal(row.action, 'update');
  assert.equal(row.actor, 'system');
  assert.deepEqual(row.before, before);
  assert.deepEqual(row.after, after);
});

test('flipping an employee to inactive is logged as action "deactivate"', async () => {
  const { subscriber, manager, inserted } = harness();
  const before = { sysId: 'e1', lastName: '山田', active: true };
  const after = { sysId: 'e1', lastName: '山田', active: false };

  await subscriber.afterUpdate({
    metadata: { target: Employee },
    entity: after,
    databaseEntity: before,
    updatedColumns: [{ propertyName: 'active' }],
    manager,
  } as unknown as UpdateEvent<unknown>);

  assert.equal(inserted.length, 1);
  const row = inserted[0]!;
  assert.equal(row.entity, 'employee');
  assert.equal(row.action, 'deactivate');
  assert.deepEqual(row.before, before);
  assert.deepEqual(row.after, after);
});

test('removing an assignment (its only delete-like write) is logged as action "deactivate" with after null', async () => {
  const { subscriber, manager, inserted } = harness();
  const removed = { id: 'a1', employeeSysId: 'e1', departmentId: '2', title: '部長' };

  await subscriber.afterRemove({
    metadata: { target: Assignment },
    entity: undefined,
    databaseEntity: removed,
    manager,
  } as unknown as RemoveEvent<unknown>);

  assert.equal(inserted.length, 1);
  const row = inserted[0]!;
  assert.equal(row.entity, 'assignment');
  assert.equal(row.entityId, 'a1');
  assert.equal(row.action, 'deactivate');
  assert.equal(row.actor, 'system');
  assert.deepEqual(row.before, removed);
  assert.equal(row.after, null);
});

test('entities outside the audited set (e.g. ChangeLog itself) are not logged', async () => {
  const { subscriber, manager, inserted } = harness();

  await subscriber.afterInsert({
    metadata: { target: ChangeLog },
    entity: { id: 'x', entity: 'employee' },
    manager,
  } as unknown as InsertEvent<unknown>);

  assert.equal(inserted.length, 0);
});
