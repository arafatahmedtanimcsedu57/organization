import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ObjectLiteral, Repository } from 'typeorm';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { OrgChartController } from './org-chart.controller.ts';
import { OrgChartService } from './org-chart.service.ts';
import type { ChartNode } from './chart-node.ts';

/** Minimal in-memory stand-in for the slice of `Repository<T>` the service calls (`.find`). */
function fakeRepo<T extends ObjectLiteral>(rows: T[]): Repository<T> {
  return { find: async () => rows } as unknown as Repository<T>;
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

/**
 * Wires `OrgChartService`/`OrgChartController` against in-memory fixtures (no DB) to exercise
 * the full `org-chart` capability end-to-end: department-tree hierarchy, rank ordering,
 * last-name disambiguation, and 兼務 (concurrent) placement in the JSON the SPA/PDF consume.
 * Mirrors the real-data example from the legacy chart: `(兼)佐藤(悠)` shown as acting 部長 of
 * ソリューション営業部 while 本部長 of 営業本部.
 */
function buildFixtureController(): OrgChartController {
  const departments = [
    dept('1', '営業本部', ''),
    dept('2', 'ソリューション営業部', '営業本部'),
    dept('3', 'システム事業部', ''),
  ];

  const employees = [
    emp('s1', '佐藤', '悠', '本部長', '1'), // home: 営業本部, also concurrent 部長 of ソリューション営業部
    emp('s2', '佐藤', '晃', '課長', '2'), // shares last name with s1 -> disambiguation
    emp('s3', '高橋', '一郎', '担当課長', '2'),
    emp('s4', '鈴木', '太郎', '課員', '2'), // staff-level roster
  ];

  const assignments = [
    { employeeSysId: 's1', departmentId: '2', title: '部長', isPrimary: false, assignmentType: 'concurrent' as const },
  ];

  const service = new OrgChartService(
    fakeRepo(departments),
    fakeRepo(employees),
    fakeRepo(assignments as unknown as Assignment[]),
  );
  return new OrgChartController(service);
}

function findNode(nodes: ChartNode[], name: string): ChartNode | undefined {
  for (const node of nodes) {
    if (node.name === name) return node;
    const found = findNode(node.children, name);
    if (found) return found;
  }
  return undefined;
}

test('GET /chart builds the department hierarchy from parent names', async () => {
  const { roots } = await buildFixtureController().getChart();

  assert.deepEqual(
    roots.map((r) => r.name),
    ['営業本部', 'システム事業部'],
  );
  const eigyouHonbu = roots.find((r) => r.name === '営業本部');
  assert.ok(eigyouHonbu);
  assert.deepEqual(
    eigyouHonbu.children.map((c) => c.name),
    ['ソリューション営業部'],
  );
});

test('GET /chart orders each roster from highest to lowest position rank', async () => {
  const { roots } = await buildFixtureController().getChart();
  const solutionSales = findNode(roots, 'ソリューション営業部');
  assert.ok(solutionSales);

  assert.deepEqual(
    solutionSales.managers.map((m) => m.title),
    ['部長', '課長', '担当課長'],
  );
  assert.deepEqual(
    solutionSales.staff.map((m) => m.title),
    ['課員'],
  );
});

test('GET /chart disambiguates shared last names with a given-name initial', async () => {
  const { roots } = await buildFixtureController().getChart();
  const eigyouHonbu = findNode(roots, '営業本部');
  const solutionSales = findNode(roots, 'ソリューション営業部');
  assert.ok(eigyouHonbu);
  assert.ok(solutionSales);

  const honbucho = eigyouHonbu.managers.find((m) => m.sysId === 's1');
  const kacho = solutionSales.managers.find((m) => m.sysId === 's2');
  assert.equal(honbucho?.displayName, '佐藤(悠)');
  assert.equal(kacho?.displayName, '佐藤(晃)');
});

test('GET /chart places a concurrent (兼務) posting in the target department, sourced from the home post', async () => {
  const { roots } = await buildFixtureController().getChart();
  const eigyouHonbu = findNode(roots, '営業本部');
  const solutionSales = findNode(roots, 'ソリューション営業部');
  assert.ok(eigyouHonbu);
  assert.ok(solutionSales);

  const home = eigyouHonbu.managers.find((m) => m.sysId === 's1');
  assert.equal(home?.concurrent, false);

  const concurrent = solutionSales.managers.find((m) => m.sysId === 's1');
  assert.ok(concurrent);
  assert.equal(concurrent.concurrent, true);
  assert.equal(concurrent.title, '部長');
  assert.equal(concurrent.displayName, '佐藤(悠)');
  assert.equal(concurrent.sourceDepartmentName, '営業本部');
  assert.equal(concurrent.sourceTitle, '本部長');
});

test('GET /chart/warnings surfaces no warnings for a fully-resolved fixture', async () => {
  const { warnings } = await buildFixtureController().getWarnings();
  assert.deepEqual(warnings, []);
});
