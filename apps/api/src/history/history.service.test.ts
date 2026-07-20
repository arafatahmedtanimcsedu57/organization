import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { FindManyOptions, ObjectLiteral, Repository } from 'typeorm';
import { HistoryService } from './history.service.ts';
import type { ChangeLog } from './change-log.entity.ts';

/** Captures the `find()` options the service builds, and returns canned rows. */
function fakeRepo<T extends ObjectLiteral>(rows: T[]): { repo: Repository<T>; calls: FindManyOptions<T>[] } {
  const calls: FindManyOptions<T>[] = [];
  const repo = {
    find: async (options: FindManyOptions<T>) => {
      calls.push(options);
      return rows;
    },
  } as unknown as Repository<T>;
  return { repo, calls };
}

function entry(overrides: Partial<ChangeLog>): ChangeLog {
  return {
    id: 'c1',
    entity: 'employee',
    entityId: 'e1',
    action: 'update',
    actor: 'system',
    changedAt: new Date('2026-01-01T00:00:00Z'),
    before: null,
    after: null,
    ...overrides,
  } as ChangeLog;
}

test('findAll with no filters queries all entries ordered reverse-chronologically', async () => {
  const { repo, calls } = fakeRepo<ChangeLog>([entry({})]);
  const service = new HistoryService(repo);

  const result = await service.findAll({});

  assert.equal(result.length, 1);
  assert.deepEqual(calls[0]?.where, {});
  assert.deepEqual(calls[0]?.order, { changedAt: 'DESC' });
});

test('findAll filters by entity and entityId', async () => {
  const { repo, calls } = fakeRepo<ChangeLog>([]);
  const service = new HistoryService(repo);

  await service.findAll({ entity: 'department', entityId: '24100' });

  assert.deepEqual(calls[0]?.where, { entity: 'department', entityId: '24100' });
});

test('findAll with only `from` builds a MoreThanOrEqual bound', async () => {
  const { repo, calls } = fakeRepo<ChangeLog>([]);
  const service = new HistoryService(repo);

  await service.findAll({ from: '2026-01-01T00:00:00Z' });

  const where = calls[0]?.where as Record<string, { _type: string }>;
  assert.equal(where.changedAt?._type, 'moreThanOrEqual');
});

test('findAll with `from` and `to` builds a Between bound', async () => {
  const { repo, calls } = fakeRepo<ChangeLog>([]);
  const service = new HistoryService(repo);

  await service.findAll({ from: '2026-01-01T00:00:00Z', to: '2026-01-31T00:00:00Z' });

  const where = calls[0]?.where as Record<string, { _type: string }>;
  assert.equal(where.changedAt?._type, 'between');
});
