import assert from 'node:assert/strict';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { ObjectLiteral, Repository } from 'typeorm';
import { test } from 'vitest';

import { Title } from './title.entity.ts';
import { TitlesService } from './titles.service.ts';
import { DepartmentTitle } from '../departments/department-title.entity.ts';
import { DepartmentTitlesService } from '../departments/department-titles.service.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';

/**
 * `master-data-management` capability: title CRUD and the Department↔Title assignment,
 * exercised against in-memory repositories (the runnable convention used by the other
 * `org-chart` integration tests, since DB-backed feature tests need Docker/CI). Focuses
 * on the logic unique to this feature: slug-id generation and the unassign in-use guard.
 */
function fakeRepo<T extends ObjectLiteral>(rows: T[]): Repository<T> {
  const rec = (row: T) => row as unknown as Record<string, unknown>;
  const matches = (row: T, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => rec(row)[key] === value);

  return {
    find: async (opts?: { where?: Record<string, unknown>; order?: Record<string, 'ASC' | 'DESC'> }) => {
      let out = opts?.where ? rows.filter((row) => matches(row, opts.where!)) : [...rows];
      const order = opts?.order;
      if (order) {
        const [key, dir] = Object.entries(order)[0]!;
        out = [...out].sort((a, b) => Number(rec(a)[key]) - Number(rec(b)[key]));
        if (dir === 'DESC') out.reverse();
      }
      return out;
    },
    findOne: async (opts: { where: Record<string, unknown> }) =>
      rows.find((row) => matches(row, opts.where)) ?? null,
    create: (partial: Partial<T>) => ({ ...partial }) as T,
    save: async (entity: T) => {
      const id = rec(entity).id;
      const index = id !== undefined ? rows.findIndex((row) => rec(row).id === id) : -1;
      if (index === -1) rows.push(entity);
      else rows[index] = { ...rows[index], ...entity };
      return entity;
    },
    delete: async (where: Record<string, unknown>) => {
      for (let i = rows.length - 1; i >= 0; i -= 1) if (matches(rows[i]!, where)) rows.splice(i, 1);
      return { affected: 1 };
    },
  } as unknown as Repository<T>;
}

function title(id: string, name: string, rank: number): Title {
  return { id, name, nameEn: name, rank, staffLevel: false, active: true } as Title;
}

test('TitlesService.create derives a slug id from the English name', async () => {
  const titles = new TitlesService(fakeRepo<Title>([]));
  const created = await titles.create({ name: '顧問', nameEn: 'Senior Advisor', rank: 3 });
  assert.equal(created.id, 'senior-advisor');
  assert.equal(created.active, true);
  assert.equal(created.staffLevel, false);
});

test('TitlesService.deactivate soft-hides the title', async () => {
  const rows = [title('manager', '課長', 4)];
  const titles = new TitlesService(fakeRepo(rows));
  const result = await titles.deactivate('manager');
  assert.equal(result.active, false);
});

test('DepartmentTitlesService.assign rejects an unknown title', async () => {
  const service = new DepartmentTitlesService(
    fakeRepo<DepartmentTitle>([]),
    fakeRepo<Title>([]),
    fakeRepo<Employee>([]),
    fakeRepo<Assignment>([]),
  );
  await assert.rejects(() => service.assign('d1', 'ghost'), BadRequestException);
});

test('DepartmentTitlesService.unassign removes a link that is not in use', async () => {
  const links = [{ departmentId: 'd1', titleId: 'manager' } as DepartmentTitle];
  const service = new DepartmentTitlesService(
    fakeRepo(links),
    fakeRepo([title('manager', '課長', 4)]),
    fakeRepo<Employee>([]),
    fakeRepo<Assignment>([]),
  );
  await service.unassign('d1', 'manager');
  assert.equal(links.length, 0);
});

test('DepartmentTitlesService.unassign is blocked (409) when an active employee uses the title', async () => {
  const service = new DepartmentTitlesService(
    fakeRepo([{ departmentId: 'd1', titleId: 'manager' } as DepartmentTitle]),
    fakeRepo([title('manager', '課長', 4)]),
    fakeRepo([{ sysId: 'e1', departmentId: 'd1', titleId: 'manager', active: true } as unknown as Employee]),
    fakeRepo<Assignment>([]),
  );
  await assert.rejects(() => service.unassign('d1', 'manager'), ConflictException);
});

test('DepartmentTitlesService.unassign is blocked (409) when a 兼務 posting uses the title', async () => {
  const service = new DepartmentTitlesService(
    fakeRepo([{ departmentId: 'd1', titleId: 'general-manager' } as DepartmentTitle]),
    fakeRepo([title('general-manager', '部長', 3)]),
    fakeRepo<Employee>([]),
    fakeRepo([{ id: 'a1', departmentId: 'd1', titleId: 'general-manager' } as unknown as Assignment]),
  );
  await assert.rejects(() => service.unassign('d1', 'general-manager'), ConflictException);
});
