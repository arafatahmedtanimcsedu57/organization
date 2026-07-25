import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { ObjectLiteral, Repository } from 'typeorm';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { AssignmentsService } from '../assignments/assignments.service.ts';
import { OrgChartService } from './org-chart.service.ts';
import { OrgChartController } from './org-chart.controller.ts';
import type { ChartPdfService } from './chart-pdf.service.ts';
import type { ChartNode } from './chart-node.ts';

/**
 * Minimal in-memory stand-in for the slice of `Repository<T>` the assignments/org-chart
 * services call, backed by a mutable array so a posting created through
 * `AssignmentsService.create()` is visible to a subsequent
 * `OrgChartService.buildOrgModel()` call - proving a new concurrent posting actually
 * reaches chart regeneration, per spec `concurrent-duties` ("Add a concurrent posting":
 * the person appears in the target department prefixed with `(兼)`).
 */
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
      return rows.find((row) => entries.every(([key, value]) => asRecord(row)[key] === value)) ?? null;
    },
    create: (partial: Partial<T>) => ({ ...partial }) as T,
    save: async (entity: T) => {
      const index = rows.findIndex(
        (row) => asRecord(row).id !== undefined && asRecord(row).id === asRecord(entity).id,
      );
      if (index === -1 || asRecord(entity).id === undefined) {
        const withId = asRecord(entity).id === undefined ? { ...entity, id: `a${rows.length + 1}` } : entity;
        rows.push(withId as T);
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
  const departments = [dept('1', '営業本部', ''), dept('2', 'ソリューション営業部', '営業本部')];
  const employees = [emp('s1', '佐藤', '悠', '本部長', '1')];
  const assignments: Assignment[] = [];

  const departmentRepo = fakeMutableRepo(departments);
  const employeeRepo = fakeMutableRepo(employees);
  const assignmentRepo = fakeMutableRepo(assignments);

  const assignmentsService = new AssignmentsService(assignmentRepo, employeeRepo, departmentRepo);
  const orgChartService = new OrgChartService(departmentRepo, employeeRepo, assignmentRepo);
  const orgChartController = new OrgChartController(orgChartService, {} as ChartPdfService);

  return { assignmentsService, orgChartController };
}

test('adding a concurrent posting makes the person appear in the target department as a sourced (兼) chip', async () => {
  const { assignmentsService, orgChartController } = buildHarness();

  const before = await orgChartController.getChart();
  const solutionSalesBefore = findNode(before.roots, 'ソリューション営業部');
  assert.ok(solutionSalesBefore);
  assert.equal(solutionSalesBefore.managers.find((m) => m.sysId === 's1'), undefined);

  await assignmentsService.create({
    employeeSysId: 's1',
    departmentId: '2',
    title: '部長',
    assignmentType: 'concurrent',
  });

  const after = await orgChartController.getChart();
  const eigyouHonbu = findNode(after.roots, '営業本部');
  const solutionSales = findNode(after.roots, 'ソリューション営業部');
  assert.ok(eigyouHonbu);
  assert.ok(solutionSales);

  const home = eigyouHonbu.managers.find((m) => m.sysId === 's1');
  assert.equal(home?.concurrent, false);

  const posting = solutionSales.managers.find((m) => m.sysId === 's1');
  assert.ok(posting);
  assert.equal(posting.concurrent, true);
  assert.equal(posting.title, '部長');
  assert.equal(posting.displayName, '佐藤');
  assert.equal(posting.sourceDepartmentName, '営業本部');
  assert.equal(posting.sourceTitle, '本部長');
});
