import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ObjectLiteral, Repository } from 'typeorm';
import { CANONICAL_TITLES, findTitleByLabel } from '@org-chart/domain';
import { Department } from '../departments/department.entity.ts';
import { DepartmentTitle } from '../departments/department-title.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { Title } from '../titles/title.entity.ts';
import { AssignmentsService } from '../assignments/assignments.service.ts';
import { OrgChartService } from './org-chart.service.ts';
import { OrgChartController } from './org-chart.controller.ts';
import type { ChartPdfService } from './chart-pdf.service.ts';
import type { ChartNode } from './chart-node.ts';
import { fakeConfigService } from '../test/fake-config.ts';

/** Mirrors `new-concurrent-posting-reflected.integration.test.ts`'s in-memory repo stand-in. */
function fakeMutableRepo<T extends ObjectLiteral>(rows: T[]): Repository<T> {
  const asRecord = (row: T) => row as unknown as Record<string, unknown>;

  return {
    find: async (options?: { where?: Partial<T>; order?: unknown }) => {
      if (!options?.where) return rows;
      const entries = Object.entries(options.where);
      return rows.filter((row) => entries.every(([key, value]) => asRecord(row)[key] === value));
    },
    findOne: async (options: { where: Partial<T> }) => {
      const entries = Object.entries(options.where);
      return (
        rows.find((row) => entries.every(([key, value]) => asRecord(row)[key] === value)) ?? null
      );
    },
    create: (partial: Partial<T>) => ({ ...partial }) as T,
    save: async (entity: T) => {
      const index = rows.findIndex(
        (row) => asRecord(row).id !== undefined && asRecord(row).id === asRecord(entity).id,
      );
      if (index === -1 || asRecord(entity).id === undefined) {
        const withId =
          asRecord(entity).id === undefined ? { ...entity, id: `a${rows.length + 1}` } : entity;
        rows.push(withId as T);
      } else {
        rows[index] = { ...rows[index], ...entity };
      }
      return entity;
    },
  } as unknown as Repository<T>;
}

function dept(id: string, name: string, parentName: string): Department {
  return { id, name, parentName, head: '', headSysId: null, sysId: id, active: true };
}

function emp(
  sysId: string,
  lastName: string,
  firstName: string,
  title: string,
  departmentId: string,
): Employee {
  return {
    sysId,
    userId: sysId,
    lastName,
    firstName,
    title,
    titleId: findTitleByLabel(CANONICAL_TITLES, title)?.id ?? null,
    departmentId,
    department: undefined as unknown as Department,
    active: true,
  };
}

function findNode(nodes: ChartNode[], name: string): ChartNode | undefined {
  for (const node of nodes) {
    if (node.name === name) return node;
    const found = findNode(node.children, name);
    if (found) return found;
  }
  return undefined;
}

function buildHarness() {
  const departments = [dept('1', '営業本部', ''), dept('2', 'ソリューション営業部', '営業本部')];
  const employees = [emp('s1', '佐藤', '悠', '本部長', '1')];
  const assignments: Assignment[] = [];

  const titles = CANONICAL_TITLES as unknown as Title[];
  const departmentTitles = ['1', '2'].flatMap((departmentId) =>
    CANONICAL_TITLES.map((t) => ({ departmentId, titleId: t.id })),
  ) as unknown as DepartmentTitle[];

  const departmentRepo = fakeMutableRepo(departments);
  const employeeRepo = fakeMutableRepo(employees);
  const assignmentRepo = fakeMutableRepo(assignments);
  const titleRepo = fakeMutableRepo(titles);
  const departmentTitleRepo = fakeMutableRepo(departmentTitles);

  const assignmentsService = new AssignmentsService(
    assignmentRepo,
    employeeRepo,
    departmentRepo,
    titleRepo,
    departmentTitleRepo,
  );
  const orgChartService = new OrgChartService(
    departmentRepo,
    employeeRepo,
    assignmentRepo,
    titleRepo,
    fakeConfigService(),
  );
  const orgChartController = new OrgChartController(orgChartService, {} as ChartPdfService);

  return { assignmentsService, orgChartController };
}

test("editing a concurrent posting's valid-to date into the past removes it from the chart", async () => {
  const { assignmentsService, orgChartController } = buildHarness();

  await assignmentsService.create({
    employeeSysId: 's1',
    departmentId: '2',
    titleId: 'general-manager',
    assignmentType: 'concurrent',
  });

  const before = await orgChartController.getChart();
  assert.ok(findNode(before.roots, 'ソリューション営業部')?.managers.find((m) => m.sysId === 's1'));

  // The fake repo's `save()` doesn't hand back the id it assigns, so re-fetch the row.
  const [created] = await assignmentsService.findAll();
  assert.ok(created);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await assignmentsService.update(created.id, { validTo: yesterday });

  const after = await orgChartController.getChart();
  const solutionSales = findNode(after.roots, 'ソリューション営業部');
  assert.ok(solutionSales);
  assert.equal(
    solutionSales.managers.find((m) => m.sysId === 's1'),
    undefined,
  );
});

test('a concurrent posting with a future valid-from date is not yet placed', async () => {
  const { assignmentsService, orgChartController } = buildHarness();

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await assignmentsService.create({
    employeeSysId: 's1',
    departmentId: '2',
    titleId: 'general-manager',
    assignmentType: 'concurrent',
    validFrom: tomorrow,
  });

  const chart = await orgChartController.getChart();
  const solutionSales = findNode(chart.roots, 'ソリューション営業部');
  assert.ok(solutionSales);
  assert.equal(
    solutionSales.managers.find((m) => m.sysId === 's1'),
    undefined,
  );
});
