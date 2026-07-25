import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ObjectLiteral, Repository } from 'typeorm';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { EmployeesService } from '../employees/employees.service.ts';
import { DepartmentsService } from '../departments/departments.service.ts';
import { OrgChartService } from './org-chart.service.ts';
import { OrgChartController } from './org-chart.controller.ts';
import type { ChartPdfService } from './chart-pdf.service.ts';
import type { ChartNode } from './chart-node.ts';

/**
 * Minimal in-memory stand-in for the slice of `Repository<T>` the
 * employees/departments services call, backed by a mutable array so writes
 * made through `EmployeesService`/`DepartmentsService` are visible to a
 * subsequent `OrgChartService.buildOrgModel()` call - proving master edits
 * actually reach chart regeneration, per spec `master-data-management`
 * ("Update an employee" / "Non-destructive deactivation" scenarios).
 */
function fakeMutableRepo<T extends ObjectLiteral>(rows: T[]): Repository<T> {
  const asRecord = (row: T) => row as unknown as Record<string, unknown>;

  return {
    find: async (options?: { where?: Partial<T> }) => {
      if (!options?.where) return rows;
      const entries = Object.entries(options.where);
      return rows.filter((row) => entries.every(([key, value]) => asRecord(row)[key] === value));
    },
    findOne: async (options: { where: Partial<T> }) => {
      const entries = Object.entries(options.where);
      return rows.find((row) => entries.every(([key, value]) => asRecord(row)[key] === value)) ?? null;
    },
    create: (partial: Partial<T>) => ({ ...partial }) as T,
    save: async (entity: T) => {
      const index = rows.findIndex(
        (row) => asRecord(row).sysId === asRecord(entity).sysId || asRecord(row).id === asRecord(entity).id,
      );
      if (index === -1) {
        rows.push(entity);
      } else {
        rows[index] = { ...rows[index], ...entity };
      }
      return entity;
    },
  } as unknown as Repository<T>;
}

function dept(id: string, name: string, parentName: string): Department {
  return { id, name, parentName, head: '', sysId: id, active: true };
}

function emp(sysId: string, lastName: string, firstName: string, title: string, departmentId: string): Employee {
  return {
    sysId,
    userId: sysId,
    lastName,
    firstName,
    title,
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
  const departments = [dept('1', '営業本部', ''), dept('2', 'システム事業部', '')];
  const employees = [emp('e1', '山田', '太郎', '課長', '1')];
  const assignments: Assignment[] = [];

  const departmentRepo = fakeMutableRepo(departments);
  const employeeRepo = fakeMutableRepo(employees);
  const assignmentRepo = fakeMutableRepo(assignments);

  const employeesService = new EmployeesService(employeeRepo, departmentRepo);
  const departmentsService = new DepartmentsService(departmentRepo);
  const orgChartService = new OrgChartService(departmentRepo, employeeRepo, assignmentRepo);
  const orgChartController = new OrgChartController(orgChartService, {} as ChartPdfService);

  return { employeesService, departmentsService, orgChartController };
}

test('editing an employee (title/department) is reflected the next time the chart is built', async () => {
  const { employeesService, orgChartController } = buildHarness();

  const before = await orgChartController.getChart();
  const eigyouBefore = findNode(before.roots, '営業本部');
  assert.equal(eigyouBefore?.managers.find((m) => m.sysId === 'e1')?.title, '課長');

  await employeesService.update('e1', { title: '部長', departmentId: '2' });

  const after = await orgChartController.getChart();
  const eigyouAfter = findNode(after.roots, '営業本部');
  const systemAfter = findNode(after.roots, 'システム事業部');
  assert.equal(eigyouAfter?.managers.find((m) => m.sysId === 'e1'), undefined);
  assert.equal(systemAfter?.managers.find((m) => m.sysId === 'e1')?.title, '部長');
});

test('deactivating an employee removes them from the chart but keeps the record queryable', async () => {
  const { employeesService, orgChartController } = buildHarness();

  await employeesService.deactivate('e1');

  const chart = await orgChartController.getChart();
  const eigyou = findNode(chart.roots, '営業本部');
  assert.equal(eigyou?.managers.find((m) => m.sysId === 'e1'), undefined);

  const stillStored = await employeesService.findOne('e1');
  assert.equal(stillStored.active, false);
  assert.equal(stillStored.lastName, '山田');
});

test('deactivating a department removes it and its members from the chart, keeping the record queryable', async () => {
  const { departmentsService, orgChartController } = buildHarness();

  await departmentsService.deactivate('1');

  const chart = await orgChartController.getChart();
  assert.equal(findNode(chart.roots, '営業本部'), undefined);

  const stillStored = await departmentsService.findOne('1');
  assert.equal(stillStored.active, false);
  assert.equal(stillStored.name, '営業本部');
});
